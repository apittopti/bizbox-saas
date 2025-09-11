import { fileTypeFromBuffer } from 'file-type';
import mimeTypes from 'mime-types';
import crypto from 'crypto';
import path from 'path';
import { z } from 'zod';

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  detectedMimeType?: string;
  detectedExtension?: string;
  fileSize: number;
  checksum: string;
  metadata: {
    actualMimeType?: string;
    claimedMimeType?: string;
    extensionMismatch?: boolean;
    hasEmbeddedContent?: boolean;
    suspiciousPatterns?: string[];
  };
}

export interface ValidationConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  blockedMimeTypes: string[];
  allowedExtensions: string[];
  blockedExtensions: string[];
  maxFilenameLength: number;
  allowExecutableFiles: boolean;
  checkMagicNumbers: boolean;
  scanForMalware: boolean;
  allowEmbeddedContent: boolean;
  maxImageDimensions?: {
    width: number;
    height: number;
  };
  maxVideoDuration?: number; // in seconds
}

export interface SecurityScanResult {
  safe: boolean;
  threats: Array<{
    type: 'virus' | 'malware' | 'suspicious' | 'policy_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    details?: any;
  }>;
  scanTime: number;
  scannerUsed: string;
}

// Default validation configuration
const DEFAULT_CONFIG: ValidationConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    // Audio
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    // Documents
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
  blockedMimeTypes: [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-msi',
    'application/x-dosexec',
    'application/x-winexe',
    'text/x-shellscript',
    'application/x-sh',
    'application/javascript',
    'text/javascript',
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff',
    '.mp4', '.webm', '.mov', '.avi', '.wmv',
    '.mp3', '.m4a', '.wav', '.ogg',
    '.pdf', '.txt', '.csv', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.7z',
  ],
  blockedExtensions: [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar',
    '.msi', '.deb', '.rpm', '.dmg', '.app', '.pkg',
    '.sh', '.bash', '.ps1', '.php', '.asp', '.jsp',
  ],
  maxFilenameLength: 255,
  allowExecutableFiles: false,
  checkMagicNumbers: true,
  scanForMalware: true,
  allowEmbeddedContent: false,
  maxImageDimensions: {
    width: 10000,
    height: 10000,
  },
  maxVideoDuration: 3600, // 1 hour
};

export class FileValidator {
  private config: ValidationConfig;
  private suspiciousPatterns: RegExp[];

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Compile suspicious patterns
    this.suspiciousPatterns = [
      /script\s*:/i,
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /\x00/g, // Null bytes
      /%00/g, // URL encoded null bytes
      /\.\.[\\/]/g, // Directory traversal
      /__MACOSX/i, // macOS metadata
      /desktop\.ini/i, // Windows desktop.ini
      /thumbs\.db/i, // Windows thumbnail cache
    ];
  }

  /**
   * Validate a file buffer and filename
   */
  async validateFile(
    buffer: Buffer,
    filename: string,
    claimedMimeType?: string
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checksum = this.calculateChecksum(buffer);

    // Basic filename validation
    const filenameValidation = this.validateFilename(filename);
    if (!filenameValidation.valid) {
      errors.push(...filenameValidation.errors);
      warnings.push(...filenameValidation.warnings);
    }

    // File size validation
    if (buffer.length > this.config.maxFileSize) {
      errors.push(`File size ${this.formatFileSize(buffer.length)} exceeds maximum allowed size of ${this.formatFileSize(this.config.maxFileSize)}`);
    }

    if (buffer.length === 0) {
      errors.push('File is empty');
    }

    // MIME type detection and validation
    const detectedType = await fileTypeFromBuffer(buffer);
    const detectedMimeType = detectedType?.mime;
    const detectedExtension = detectedType?.ext;
    
    const extension = this.getFileExtension(filename);
    const mimeFromExtension = mimeTypes.lookup(filename) || undefined;

    // MIME type validation
    const mimeValidation = this.validateMimeType(
      detectedMimeType,
      claimedMimeType,
      mimeFromExtension,
      extension
    );
    
    errors.push(...mimeValidation.errors);
    warnings.push(...mimeValidation.warnings);

    // Content analysis
    const contentAnalysis = await this.analyzeContent(buffer, detectedMimeType);
    errors.push(...contentAnalysis.errors);
    warnings.push(...contentAnalysis.warnings);

    // Magic number validation
    if (this.config.checkMagicNumbers && detectedMimeType) {
      const magicValidation = this.validateMagicNumbers(buffer, detectedMimeType);
      if (!magicValidation.valid) {
        warnings.push(...magicValidation.warnings);
      }
    }

    const result: FileValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      detectedMimeType,
      detectedExtension,
      fileSize: buffer.length,
      checksum,
      metadata: {
        actualMimeType: detectedMimeType,
        claimedMimeType,
        extensionMismatch: mimeValidation.extensionMismatch,
        hasEmbeddedContent: contentAnalysis.hasEmbeddedContent,
        suspiciousPatterns: contentAnalysis.suspiciousPatterns,
      },
    };

    return result;
  }

  /**
   * Scan file for security threats
   */
  async scanForThreats(
    buffer: Buffer,
    filename: string
  ): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const threats: SecurityScanResult['threats'] = [];

    // Basic security checks
    const basicThreats = await this.performBasicSecurityChecks(buffer, filename);
    threats.push(...basicThreats);

    // Pattern-based malware detection
    const patternThreats = this.detectSuspiciousPatterns(buffer, filename);
    threats.push(...patternThreats);

    // Embedded content detection
    const embeddedThreats = this.detectEmbeddedContent(buffer);
    threats.push(...embeddedThreats);

    // File structure analysis
    const structuralThreats = await this.analyzeFileStructure(buffer, filename);
    threats.push(...structuralThreats);

    const scanTime = Date.now() - startTime;

    return {
      safe: threats.filter(t => t.severity === 'high' || t.severity === 'critical').length === 0,
      threats,
      scanTime,
      scannerUsed: 'BizBox Built-in Scanner v1.0',
    };
  }

  /**
   * Validate filename for security and compliance
   */
  private validateFilename(filename: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length check
    if (filename.length > this.config.maxFilenameLength) {
      errors.push(`Filename too long (${filename.length} > ${this.config.maxFilenameLength})`);
    }

    // Character validation
    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(filename)) {
      errors.push('Filename contains invalid characters');
    }

    // Reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(filename)) {
      errors.push('Filename uses reserved system name');
    }

    // Extension validation
    const extension = this.getFileExtension(filename);
    if (extension) {
      if (this.config.blockedExtensions.includes(extension)) {
        errors.push(`File extension '${extension}' is not allowed`);
      }
      
      if (this.config.allowedExtensions.length > 0 && 
          !this.config.allowedExtensions.includes(extension)) {
        errors.push(`File extension '${extension}' is not in allowed list`);
      }
    }

    // Double extension check
    const doubleExtension = /\.[a-zA-Z0-9]{1,4}\.[a-zA-Z0-9]{1,4}$/;
    if (doubleExtension.test(filename)) {
      warnings.push('Filename has double extension, which may be suspicious');
    }

    // Hidden file check
    if (filename.startsWith('.')) {
      warnings.push('Hidden file detected');
    }

    // Suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(filename)) {
        warnings.push('Filename contains suspicious patterns');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate MIME type consistency
   */
  private validateMimeType(
    detectedMimeType: string | undefined,
    claimedMimeType: string | undefined,
    mimeFromExtension: string | undefined,
    extension: string | undefined
  ): { errors: string[]; warnings: string[]; extensionMismatch: boolean } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let extensionMismatch = false;

    // Check if detected MIME type is allowed
    if (detectedMimeType) {
      if (this.config.blockedMimeTypes.includes(detectedMimeType)) {
        errors.push(`File type '${detectedMimeType}' is blocked`);
      }
      
      if (this.config.allowedMimeTypes.length > 0 && 
          !this.config.allowedMimeTypes.includes(detectedMimeType)) {
        errors.push(`File type '${detectedMimeType}' is not allowed`);
      }
    }

    // Check MIME type consistency
    if (detectedMimeType && mimeFromExtension) {
      if (detectedMimeType !== mimeFromExtension) {
        extensionMismatch = true;
        warnings.push(`File extension doesn't match detected type: ${detectedMimeType} vs ${mimeFromExtension}`);
      }
    }

    // Check claimed vs detected MIME type
    if (claimedMimeType && detectedMimeType && claimedMimeType !== detectedMimeType) {
      warnings.push(`Claimed MIME type '${claimedMimeType}' doesn't match detected type '${detectedMimeType}'`);
    }

    // Unknown file type
    if (!detectedMimeType && extension) {
      warnings.push('Could not detect file type from content');
    }

    return { errors, warnings, extensionMismatch };
  }

  /**
   * Analyze file content for suspicious patterns
   */
  private async analyzeContent(
    buffer: Buffer,
    mimeType: string | undefined
  ): Promise<{ errors: string[]; warnings: string[]; hasEmbeddedContent: boolean; suspiciousPatterns: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suspiciousPatterns: string[] = [];
    let hasEmbeddedContent = false;

    // Convert buffer to string for text analysis
    const content = buffer.toString('binary');

    // Check for suspicious patterns
    for (let i = 0; i < this.suspiciousPatterns.length; i++) {
      const pattern = this.suspiciousPatterns[i];
      if (pattern.test(content)) {
        suspiciousPatterns.push(`Pattern ${i + 1}`);
      }
    }

    // Check for embedded scripts in images
    if (mimeType?.startsWith('image/')) {
      if (content.includes('<script') || content.includes('javascript:')) {
        hasEmbeddedContent = true;
        if (!this.config.allowEmbeddedContent) {
          errors.push('Image contains embedded scripts');
        }
      }
    }

    // Check for polyglot files (files that are valid in multiple formats)
    const polyglotSignatures = [
      'PK\x03\x04', // ZIP signature
      'GIF89a',     // GIF signature
      '\xFF\xD8\xFF', // JPEG signature
    ];

    let signatureCount = 0;
    for (const signature of polyglotSignatures) {
      if (content.includes(signature)) {
        signatureCount++;
      }
    }

    if (signatureCount > 1) {
      warnings.push('File may be a polyglot (valid in multiple formats)');
    }

    // Check for excessive entropy (possible encryption/compression)
    const entropy = this.calculateEntropy(buffer);
    if (entropy > 7.5) {
      warnings.push('File has high entropy, may be encrypted or compressed');
    }

    if (suspiciousPatterns.length > 0) {
      warnings.push(`Found ${suspiciousPatterns.length} suspicious pattern(s)`);
    }

    return { errors, warnings, hasEmbeddedContent, suspiciousPatterns };
  }

  /**
   * Validate magic numbers
   */
  private validateMagicNumbers(buffer: Buffer, mimeType: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Define magic number signatures
    const magicNumbers: Record<string, Buffer[]> = {
      'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
      'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
      'application/pdf': [Buffer.from('%PDF')],
      'application/zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
      'video/mp4': [Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])],
    };

    const expectedSignatures = magicNumbers[mimeType];
    if (!expectedSignatures) {
      return { valid: true, warnings }; // No signature to check
    }

    const hasValidSignature = expectedSignatures.some(signature => 
      buffer.subarray(0, signature.length).equals(signature)
    );

    if (!hasValidSignature) {
      warnings.push(`File doesn't have expected magic number for ${mimeType}`);
    }

    return { valid: hasValidSignature, warnings };
  }

  /**
   * Perform basic security checks
   */
  private async performBasicSecurityChecks(
    buffer: Buffer,
    filename: string
  ): Promise<SecurityScanResult['threats']> {
    const threats: SecurityScanResult['threats'] = [];

    // Check file size limits per type
    const extension = this.getFileExtension(filename);
    const typeLimits = {
      '.jpg': 50 * 1024 * 1024, // 50MB
      '.jpeg': 50 * 1024 * 1024,
      '.png': 50 * 1024 * 1024,
      '.pdf': 100 * 1024 * 1024, // 100MB
      '.mp4': 500 * 1024 * 1024, // 500MB
    };

    const limit = typeLimits[extension as keyof typeof typeLimits];
    if (limit && buffer.length > limit) {
      threats.push({
        type: 'policy_violation',
        severity: 'medium',
        description: `File exceeds size limit for ${extension} files`,
        details: { size: buffer.length, limit },
      });
    }

    // Check for ZIP bombs (highly compressed files)
    if (extension === '.zip' || extension === '.rar' || extension === '.7z') {
      const compressionRatio = buffer.length / this.getUncompressedSize(buffer);
      if (compressionRatio > 100) {
        threats.push({
          type: 'suspicious',
          severity: 'high',
          description: 'Highly compressed archive detected (possible ZIP bomb)',
          details: { compressionRatio },
        });
      }
    }

    return threats;
  }

  /**
   * Detect suspicious patterns in file content
   */
  private detectSuspiciousPatterns(buffer: Buffer, filename: string): SecurityScanResult['threats'] {
    const threats: SecurityScanResult['threats'] = [];
    const content = buffer.toString('binary');

    // Malware signatures (simplified examples)
    const malwareSignatures = [
      { pattern: /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/, name: 'EICAR Test File' },
      { pattern: /<script[^>]*>[\s\S]*?<\/script>/gi, name: 'Embedded JavaScript' },
      { pattern: /eval\s*\(/gi, name: 'JavaScript eval() function' },
      { pattern: /powershell/gi, name: 'PowerShell reference' },
      { pattern: /cmd\.exe/gi, name: 'Command prompt reference' },
    ];

    for (const signature of malwareSignatures) {
      if (signature.pattern.test(content)) {
        threats.push({
          type: 'suspicious',
          severity: 'medium',
          description: `Suspicious pattern detected: ${signature.name}`,
        });
      }
    }

    return threats;
  }

  /**
   * Detect embedded content in files
   */
  private detectEmbeddedContent(buffer: Buffer): SecurityScanResult['threats'] {
    const threats: SecurityScanResult['threats'] = [];
    const content = buffer.toString('binary');

    // Look for embedded executables
    const executableSignatures = [
      'MZ', // DOS/Windows executable
      '\x7fELF', // Linux executable
      '\xfe\xed\xfa', // macOS executable
    ];

    for (const signature of executableSignatures) {
      if (content.includes(signature)) {
        threats.push({
          type: 'suspicious',
          severity: 'high',
          description: 'Embedded executable detected',
        });
        break;
      }
    }

    return threats;
  }

  /**
   * Analyze file structure for anomalies
   */
  private async analyzeFileStructure(buffer: Buffer, filename: string): SecurityScanResult['threats'] {
    const threats: SecurityScanResult['threats'] = [];

    // Check for truncated files
    const extension = this.getFileExtension(filename);
    if (extension === '.jpg' || extension === '.jpeg') {
      // JPEG files should end with FFD9
      const lastTwoBytes = buffer.subarray(-2);
      if (!lastTwoBytes.equals(Buffer.from([0xFF, 0xD9]))) {
        threats.push({
          type: 'suspicious',
          severity: 'low',
          description: 'JPEG file appears to be truncated or corrupted',
        });
      }
    }

    return threats;
  }

  /**
   * Helper methods
   */
  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private calculateEntropy(buffer: Buffer): number {
    const frequencies = new Map<number, number>();
    
    for (const byte of buffer) {
      frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }

    let entropy = 0;
    for (const count of frequencies.values()) {
      const probability = count / buffer.length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private getUncompressedSize(buffer: Buffer): number {
    // Simplified estimation - in reality, you'd need to actually decompress
    // For demonstration, assume 10:1 compression ratio as baseline
    return buffer.length * 10;
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }
}
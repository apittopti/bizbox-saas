import { describe, it, expect, beforeEach } from '@jest/globals';
import { FileValidator } from '../security/file-validator';

describe('FileValidator', () => {
  let fileValidator: FileValidator;

  beforeEach(() => {
    fileValidator = new FileValidator({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'text/plain',
      ],
      scanForMalware: true,
    });
  });

  describe('validateFile', () => {
    it('should accept valid JPEG file', async () => {
      // Create a mock JPEG buffer with proper magic numbers
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG magic numbers
        ...Array(100).fill(0), // Padding
        0xFF, 0xD9, // JPEG end marker
      ]);

      const result = await fileValidator.validateFile(jpegBuffer, 'test.jpg');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileSize).toBe(jpegBuffer.length);
      expect(result.checksum).toBeDefined();
    });

    it('should reject empty files', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await fileValidator.validateFile(emptyBuffer, 'empty.jpg');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject oversized files', async () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB

      const result = await fileValidator.validateFile(largeBuffer, 'large.jpg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('exceeds maximum'))).toBe(true);
    });

    it('should reject files with invalid filenames', async () => {
      const testBuffer = Buffer.from('test content');

      const result = await fileValidator.validateFile(testBuffer, 'invalid<>file.jpg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid filename'))).toBe(true);
    });

    it('should reject blocked file extensions', async () => {
      const testBuffer = Buffer.from('malicious content');

      const result = await fileValidator.validateFile(testBuffer, 'malware.exe');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
    });

    it('should warn about double extensions', async () => {
      const testBuffer = Buffer.from('test content');

      const result = await fileValidator.validateFile(testBuffer, 'file.jpg.txt');

      expect(result.warnings.some(warning => warning.includes('double extension'))).toBe(true);
    });

    it('should validate filename length', async () => {
      const testBuffer = Buffer.from('test content');
      const longFilename = 'a'.repeat(300) + '.jpg';

      const result = await fileValidator.validateFile(testBuffer, longFilename);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Filename too long'))).toBe(true);
    });

    it('should detect reserved filenames', async () => {
      const testBuffer = Buffer.from('test content');

      const result = await fileValidator.validateFile(testBuffer, 'CON.txt');

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('reserved system name'))).toBe(true);
    });
  });

  describe('scanForThreats', () => {
    it('should pass clean files', async () => {
      const cleanBuffer = Buffer.from('This is a clean file');

      const result = await fileValidator.scanForThreats(cleanBuffer, 'clean.txt');

      expect(result.safe).toBe(true);
      expect(result.threats).toHaveLength(0);
      expect(result.scanTime).toBeGreaterThan(0);
    });

    it('should detect EICAR test string', async () => {
      const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const eicarBuffer = Buffer.from(eicarString);

      const result = await fileValidator.scanForThreats(eicarBuffer, 'eicar.txt');

      expect(result.safe).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats[0].description).toContain('EICAR Test File');
    });

    it('should detect suspicious JavaScript patterns', async () => {
      const suspiciousBuffer = Buffer.from('<script>eval("malicious code")</script>');

      const result = await fileValidator.scanForThreats(suspiciousBuffer, 'suspicious.html');

      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats.some(t => t.description.includes('JavaScript'))).toBe(true);
    });

    it('should detect PowerShell references', async () => {
      const psBuffer = Buffer.from('powershell.exe -ExecutionPolicy Bypass');

      const result = await fileValidator.scanForThreats(psBuffer, 'script.txt');

      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats.some(t => t.description.includes('PowerShell'))).toBe(true);
    });

    it('should handle binary files safely', async () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD]);

      const result = await fileValidator.scanForThreats(binaryBuffer, 'binary.bin');

      // Should complete without crashing
      expect(result.scanTime).toBeGreaterThan(0);
      expect(result.scannerUsed).toBeDefined();
    });
  });

  describe('content analysis', () => {
    it('should calculate entropy correctly', async () => {
      // High entropy content (random-like)
      const highEntropyBuffer = Buffer.from(Array(1000).fill(0).map(() => 
        Math.floor(Math.random() * 256)
      ));

      const result = await fileValidator.validateFile(highEntropyBuffer, 'random.bin');

      expect(result.warnings.some(w => w.includes('high entropy'))).toBe(true);
    });

    it('should detect embedded scripts in images', async () => {
      // Simulate an image with embedded JavaScript
      const maliciousImageBuffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.from('<script>alert("xss")</script>'),
        Buffer.from([0xFF, 0xD9]), // JPEG end
      ]);

      const result = await fileValidator.validateFile(maliciousImageBuffer, 'malicious.jpg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('embedded scripts'))).toBe(true);
    });

    it('should warn about polyglot files', async () => {
      // Create a buffer that looks like both ZIP and GIF
      const polyglotBuffer = Buffer.concat([
        Buffer.from('GIF89a'), // GIF signature
        Buffer.from('PK\x03\x04'), // ZIP signature
        Buffer.from(Array(100).fill(0)), // Padding
      ]);

      const result = await fileValidator.validateFile(polyglotBuffer, 'polyglot.gif');

      expect(result.warnings.some(w => w.includes('polyglot'))).toBe(true);
    });
  });

  describe('magic number validation', () => {
    it('should validate PNG magic numbers', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        ...Array(100).fill(0), // Padding
      ]);

      const result = await fileValidator.validateFile(pngBuffer, 'test.png');

      // Should not warn about magic numbers for properly formed PNG
      expect(result.warnings.every(w => !w.includes('magic number'))).toBe(true);
    });

    it('should warn about mismatched magic numbers', async () => {
      // JPEG extension but PNG content
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        ...Array(100).fill(0), // Padding
      ]);

      const result = await fileValidator.validateFile(pngBuffer, 'fake.jpg');

      expect(result.warnings.some(w => 
        w.includes("doesn't match detected type")
      )).toBe(true);
    });
  });

  describe('security patterns', () => {
    it('should detect directory traversal attempts', async () => {
      const testBuffer = Buffer.from('normal content');

      const result = await fileValidator.validateFile(testBuffer, '../../../etc/passwd');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid filename'))).toBe(true);
    });

    it('should detect null byte injection', async () => {
      const nullByteBuffer = Buffer.from('normal content\x00malicious.exe');

      const result = await fileValidator.validateFile(nullByteBuffer, 'normal.txt');

      expect(result.warnings.some(w => w.includes('suspicious patterns'))).toBe(true);
    });

    it('should handle URL encoding attacks', async () => {
      const encodedBuffer = Buffer.from('content with %00 null byte');

      const result = await fileValidator.validateFile(encodedBuffer, 'encoded.txt');

      expect(result.warnings.some(w => w.includes('suspicious patterns'))).toBe(true);
    });
  });

  describe('performance', () => {
    it('should handle large files efficiently', async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024, 'a'); // 5MB of 'a'

      const startTime = Date.now();
      const result = await fileValidator.validateFile(largeBuffer, 'large.txt');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.fileSize).toBe(largeBuffer.length);
    });

    it('should handle many small files', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const smallBuffer = Buffer.from(`file ${i} content`);
        promises.push(fileValidator.validateFile(smallBuffer, `file${i}.txt`));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(results.every(r => r.valid)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('configuration', () => {
    it('should respect custom file size limits', () => {
      const customValidator = new FileValidator({
        maxFileSize: 1024, // 1KB
        allowedMimeTypes: ['text/plain'],
      });

      const largeBuffer = Buffer.alloc(2048); // 2KB
      
      return customValidator.validateFile(largeBuffer, 'large.txt').then(result => {
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('exceeds'))).toBe(true);
      });
    });

    it('should respect custom allowed types', () => {
      const restrictiveValidator = new FileValidator({
        allowedMimeTypes: ['text/plain'],
      });

      const testBuffer = Buffer.from('test content');
      
      return restrictiveValidator.validateFile(testBuffer, 'test.jpg').then(result => {
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
      });
    });

    it('should handle disabled malware scanning', () => {
      const noScanValidator = new FileValidator({
        scanForMalware: false,
      });

      const eicarBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
      
      return noScanValidator.scanForThreats(eicarBuffer, 'eicar.txt').then(result => {
        // Should still detect patterns but not fail completely
        expect(result.scannerUsed).toBeDefined();
      });
    });
  });
});
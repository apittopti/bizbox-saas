import { z } from 'zod';

export interface MediaFile {
  id: string;
  tenantId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number; // for videos/audio
  url: string;
  thumbnailUrl?: string;
  folder?: string;
  tags: string[];
  alt?: string;
  caption?: string;
  metadata: Record<string, any>;
  usage: MediaUsage[];
  isPublic: boolean;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaFolder {
  id: string;
  tenantId: string;
  name: string;
  parentId?: string;
  path: string;
  description?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaUsage {
  id: string;
  context: string; // 'website', 'product', 'service', etc.
  contextId: string;
  usageType: 'primary' | 'gallery' | 'thumbnail' | 'background';
  createdAt: Date;
}

export interface UploadOptions {
  folder?: string;
  tags?: string[];
  alt?: string;
  caption?: string;
  isPublic?: boolean;
  generateThumbnail?: boolean;
  optimizeImage?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface ImageOptimization {
  format: 'webp' | 'jpeg' | 'png';
  quality: number;
  width?: number;
  height?: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export const mediaFileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().min(0),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).default([]),
  alt: z.string().max(255).optional(),
  caption: z.string().max(1000).optional(),
  metadata: z.record(z.any()).default({}),
  usage: z.array(z.any()).default([]),
  isPublic: z.boolean().default(false),
  uploadedBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export class MediaManager {
  private files: Map<string, MediaFile> = new Map();
  private folders: Map<string, MediaFolder> = new Map();
  private storageProvider: StorageProvider;

  constructor(storageProvider: StorageProvider) {
    this.storageProvider = storageProvider;
  }

  /**
   * Upload a file
   */
  async uploadFile(
    tenantId: string,
    file: File | Buffer,
    originalName: string,
    uploadedBy: string,
    options: UploadOptions = {}
  ): Promise<{
    success: boolean;
    file?: MediaFile;
    error?: string;
  }> {
    try {
      // Validate file
      const validation = await this.validateFile(file, originalName);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate unique filename
      const filename = this.generateFilename(originalName);
      const mimeType = this.getMimeType(originalName);

      // Check if folder exists
      if (options.folder) {
        const folder = await this.getFolder(tenantId, options.folder);
        if (!folder) {
          return { success: false, error: 'Folder not found' };
        }
      }

      // Process image if needed
      let processedFile = file;
      let metadata: Record<string, any> = {};

      if (this.isImage(mimeType)) {
        const imageProcessing = await this.processImage(
          file,
          {
            generateThumbnail: options.generateThumbnail ?? true,
            optimize: options.optimizeImage ?? true,
            maxWidth: options.maxWidth,
            maxHeight: options.maxHeight,
            quality: options.quality ?? 85,
          }
        );
        
        processedFile = imageProcessing.file;
        metadata = imageProcessing.metadata;
      }

      // Upload to storage
      const uploadResult = await this.storageProvider.upload(
        tenantId,
        filename,
        processedFile,
        {
          mimeType,
          isPublic: options.isPublic ?? false,
          folder: options.folder,
        }
      );

      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Create media file record
      const mediaFile: MediaFile = {
        id: this.generateId(),
        tenantId,
        filename,
        originalName,
        mimeType,
        size: this.getFileSize(processedFile),
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        url: uploadResult.url!,
        thumbnailUrl: uploadResult.thumbnailUrl,
        folder: options.folder,
        tags: options.tags || [],
        alt: options.alt,
        caption: options.caption,
        metadata,
        usage: [],
        isPublic: options.isPublic ?? false,
        uploadedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.files.set(mediaFile.id, mediaFile);

      return { success: true, file: mediaFile };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get file by ID
   */
  async getFile(id: string): Promise<MediaFile | null> {
    return this.files.get(id) || null;
  }

  /**
   * Get files by tenant
   */
  async getFilesByTenant(
    tenantId: string,
    filters?: {
      folder?: string;
      mimeType?: string;
      tags?: string[];
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    files: MediaFile[];
    total: number;
  }> {
    let files = Array.from(this.files.values()).filter(
      file => file.tenantId === tenantId
    );

    if (filters) {
      if (filters.folder) {
        files = files.filter(f => f.folder === filters.folder);
      }
      if (filters.mimeType) {
        files = files.filter(f => f.mimeType.startsWith(filters.mimeType!));
      }
      if (filters.tags && filters.tags.length > 0) {
        files = files.filter(f => 
          filters.tags!.some(tag => f.tags.includes(tag))
        );
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        files = files.filter(f => 
          f.originalName.toLowerCase().includes(searchLower) ||
          f.alt?.toLowerCase().includes(searchLower) ||
          f.caption?.toLowerCase().includes(searchLower)
        );
      }
    }

    const total = files.length;
    
    if (filters?.offset) {
      files = files.slice(filters.offset);
    }
    if (filters?.limit) {
      files = files.slice(0, filters.limit);
    }

    return {
      files: files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      total,
    };
  }

  /**
   * Update file metadata
   */
  async updateFile(
    id: string,
    updates: {
      alt?: string;
      caption?: string;
      tags?: string[];
      folder?: string;
      isPublic?: boolean;
    }
  ): Promise<MediaFile | null> {
    const file = this.files.get(id);
    if (!file) {
      return null;
    }

    const updatedFile: MediaFile = {
      ...file,
      ...updates,
      updatedAt: new Date(),
    };

    this.files.set(id, updatedFile);
    return updatedFile;
  }

  /**
   * Delete file
   */
  async deleteFile(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const file = this.files.get(id);
    if (!file) {
      return { success: false, error: 'File not found' };
    }

    // Check if file is in use
    if (file.usage.length > 0) {
      return { 
        success: false, 
        error: 'File is in use and cannot be deleted' 
      };
    }

    // Delete from storage
    const deleteResult = await this.storageProvider.delete(file.tenantId, file.filename);
    if (!deleteResult.success) {
      return { success: false, error: deleteResult.error };
    }

    this.files.delete(id);
    return { success: true };
  }

  /**
   * Create folder
   */
  async createFolder(
    tenantId: string,
    name: string,
    createdBy: string,
    parentId?: string
  ): Promise<{
    success: boolean;
    folder?: MediaFolder;
    error?: string;
  }> {
    // Validate folder name
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return { 
        success: false, 
        error: 'Folder name can only contain letters, numbers, hyphens, and underscores' 
      };
    }

    // Check if folder already exists
    const existingFolder = Array.from(this.folders.values()).find(
      f => f.tenantId === tenantId && f.name === name && f.parentId === parentId
    );

    if (existingFolder) {
      return { success: false, error: 'Folder already exists' };
    }

    // Build path
    let path = name;
    if (parentId) {
      const parent = this.folders.get(parentId);
      if (!parent) {
        return { success: false, error: 'Parent folder not found' };
      }
      path = `${parent.path}/${name}`;
    }

    const folder: MediaFolder = {
      id: this.generateId(),
      tenantId,
      name,
      parentId,
      path,
      isPublic: false,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.folders.set(folder.id, folder);
    return { success: true, folder };
  }

  /**
   * Get folder by path
   */
  async getFolder(tenantId: string, path: string): Promise<MediaFolder | null> {
    return Array.from(this.folders.values()).find(
      f => f.tenantId === tenantId && f.path === path
    ) || null;
  }

  /**
   * Get folders by tenant
   */
  async getFoldersByTenant(tenantId: string): Promise<MediaFolder[]> {
    return Array.from(this.folders.values())
      .filter(f => f.tenantId === tenantId)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Track file usage
   */
  async trackUsage(
    fileId: string,
    context: string,
    contextId: string,
    usageType: MediaUsage['usageType']
  ): Promise<boolean> {
    const file = this.files.get(fileId);
    if (!file) {
      return false;
    }

    // Check if usage already exists
    const existingUsage = file.usage.find(
      u => u.context === context && u.contextId === contextId && u.usageType === usageType
    );

    if (!existingUsage) {
      const usage: MediaUsage = {
        id: this.generateId(),
        context,
        contextId,
        usageType,
        createdAt: new Date(),
      };

      file.usage.push(usage);
      file.updatedAt = new Date();
      this.files.set(fileId, file);
    }

    return true;
  }

  /**
   * Remove usage tracking
   */
  async removeUsage(
    fileId: string,
    context: string,
    contextId: string,
    usageType?: MediaUsage['usageType']
  ): Promise<boolean> {
    const file = this.files.get(fileId);
    if (!file) {
      return false;
    }

    file.usage = file.usage.filter(u => {
      if (u.context !== context || u.contextId !== contextId) {
        return true;
      }
      if (usageType && u.usageType !== usageType) {
        return true;
      }
      return false;
    });

    file.updatedAt = new Date();
    this.files.set(fileId, file);
    return true;
  }

  /**
   * Get file usage analytics
   */
  async getUsageAnalytics(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    usedFiles: number;
    unusedFiles: number;
    byMimeType: Record<string, number>;
    byFolder: Record<string, number>;
  }> {
    const files = Array.from(this.files.values()).filter(f => f.tenantId === tenantId);
    
    const analytics = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      usedFiles: files.filter(f => f.usage.length > 0).length,
      unusedFiles: files.filter(f => f.usage.length === 0).length,
      byMimeType: {} as Record<string, number>,
      byFolder: {} as Record<string, number>,
    };

    files.forEach(file => {
      // Count by MIME type
      const mimeCategory = file.mimeType.split('/')[0];
      analytics.byMimeType[mimeCategory] = (analytics.byMimeType[mimeCategory] || 0) + 1;

      // Count by folder
      const folder = file.folder || 'root';
      analytics.byFolder[folder] = (analytics.byFolder[folder] || 0) + 1;
    });

    return analytics;
  }

  /**
   * Generate optimized image URL
   */
  generateOptimizedUrl(
    file: MediaFile,
    optimization: ImageOptimization
  ): string {
    if (!this.isImage(file.mimeType)) {
      return file.url;
    }

    // Generate optimized URL with parameters
    const params = new URLSearchParams();
    params.set('format', optimization.format);
    params.set('quality', optimization.quality.toString());
    params.set('fit', optimization.fit);
    
    if (optimization.width) {
      params.set('w', optimization.width.toString());
    }
    if (optimization.height) {
      params.set('h', optimization.height.toString());
    }

    return `${file.url}?${params.toString()}`;
  }

  private async validateFile(file: File | Buffer, originalName: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mp3', 'audio/wav',
      'application/pdf',
      'text/plain',
    ];

    const size = this.getFileSize(file);
    const mimeType = this.getMimeType(originalName);

    if (size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!allowedTypes.includes(mimeType)) {
      return { valid: false, error: 'File type not allowed' };
    }

    // Check filename for security
    if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return { valid: false, error: 'Invalid filename' };
    }

    return { valid: true };
  }

  private async processImage(
    file: File | Buffer,
    options: {
      generateThumbnail: boolean;
      optimize: boolean;
      maxWidth?: number;
      maxHeight?: number;
      quality: number;
    }
  ): Promise<{
    file: File | Buffer;
    metadata: Record<string, any>;
  }> {
    // In a real implementation, this would use Sharp or similar library
    // For now, return the original file with mock metadata
    return {
      file,
      metadata: {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        hasAlpha: false,
      },
    };
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mp3',
      wav: 'audio/wav',
      pdf: 'application/pdf',
      txt: 'text/plain',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private getFileSize(file: File | Buffer): number {
    if (file instanceof Buffer) {
      return file.length;
    }
    return file.size;
  }

  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const ext = originalName.split('.').pop();
    return `${timestamp}_${random}.${ext}`;
  }

  private generateId(): string {
    return 'media_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// Storage provider interface
export interface StorageProvider {
  upload(
    tenantId: string,
    filename: string,
    file: File | Buffer,
    options: {
      mimeType: string;
      isPublic: boolean;
      folder?: string;
    }
  ): Promise<{
    success: boolean;
    url?: string;
    thumbnailUrl?: string;
    error?: string;
  }>;

  delete(tenantId: string, filename: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  getUrl(tenantId: string, filename: string, isPublic: boolean): string;
}

// Mock storage provider for development
export class MockStorageProvider implements StorageProvider {
  async upload(
    tenantId: string,
    filename: string,
    file: File | Buffer,
    options: {
      mimeType: string;
      isPublic: boolean;
      folder?: string;
    }
  ): Promise<{
    success: boolean;
    url?: string;
    thumbnailUrl?: string;
    error?: string;
  }> {
    const baseUrl = 'https://cdn.bizbox.com';
    const path = options.folder ? `${tenantId}/${options.folder}/${filename}` : `${tenantId}/${filename}`;
    
    return {
      success: true,
      url: `${baseUrl}/${path}`,
      thumbnailUrl: options.mimeType.startsWith('image/') ? `${baseUrl}/thumbs/${path}` : undefined,
    };
  }

  async delete(tenantId: string, filename: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return { success: true };
  }

  getUrl(tenantId: string, filename: string, isPublic: boolean): string {
    const baseUrl = 'https://cdn.bizbox.com';
    return `${baseUrl}/${tenantId}/${filename}`;
  }
}

export const mediaManager = new MediaManager(new MockStorageProvider());
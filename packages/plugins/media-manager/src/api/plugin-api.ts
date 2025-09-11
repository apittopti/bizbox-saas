import { MediaService, UploadFileOptions } from '../services/media-service';
import { StorageManager } from '../storage/storage-manager';
import { ImageProcessor, ImageTransformOptions } from '../processing/image-processor';
import { VideoProcessor, VideoTransformOptions, ThumbnailOptions } from '../processing/video-processor';
import { FileValidator } from '../security/file-validator';
import { MediaFile, MediaFolder } from '../schema/media';

/**
 * Plugin API interface that other plugins can use to interact with the Media Manager
 */
export interface MediaManagerAPI {
  // File operations
  uploadFile(
    buffer: Buffer,
    options: UploadFileOptions,
    uploadedBy: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    file?: MediaFile;
    processingJob?: any;
    error?: string;
  }>;

  getFile(fileId: string, tenantId: string): Promise<MediaFile | null>;
  
  updateFile(
    fileId: string,
    tenantId: string,
    updates: {
      alt?: string;
      caption?: string;
      tags?: string[];
      isPublic?: boolean;
      folderId?: string;
    },
    updatedBy: string
  ): Promise<MediaFile | null>;

  deleteFile(
    fileId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<{ success: boolean; error?: string }>;

  // Folder operations
  createFolder(
    tenantId: string,
    name: string,
    createdBy: string,
    parentId?: string,
    description?: string
  ): Promise<{ success: boolean; folder?: MediaFolder; error?: string }>;

  getFolderByPath(tenantId: string, path: string): Promise<MediaFolder | null>;

  // Processing operations
  processImage(buffer: Buffer, options: ImageTransformOptions): Promise<any>;
  processVideo(buffer: Buffer, options: VideoTransformOptions): Promise<any>;
  generateVideoThumbnails(buffer: Buffer, options?: ThumbnailOptions): Promise<any>;

  // URL generation
  getPublicUrl(tenantId: string, filepath: string): string;
  getSignedUrl(
    tenantId: string,
    filepath: string,
    options?: { expiresIn?: number }
  ): Promise<string>;

  // Usage tracking
  trackUsage(
    fileId: string,
    tenantId: string,
    context: string,
    contextId: string,
    usageType: 'primary' | 'gallery' | 'thumbnail' | 'background'
  ): Promise<boolean>;

  removeUsage(
    fileId: string,
    tenantId: string,
    context: string,
    contextId: string,
    usageType?: string
  ): Promise<boolean>;

  // Validation
  validateFile(
    buffer: Buffer,
    filename: string,
    claimedMimeType?: string
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    detectedMimeType?: string;
    fileSize: number;
    checksum: string;
  }>;

  // Search and analytics
  searchFiles(
    tenantId: string,
    options: {
      query?: string;
      mimeType?: string;
      tags?: string[];
      folderId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    files: MediaFile[];
    total: number;
    hasMore: boolean;
  }>;

  getUsageAnalytics(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    sizeByType: Record<string, number>;
    storageUsage: any;
    recentActivity: any[];
  }>;
}

/**
 * Event types that the Media Manager plugin emits
 */
export enum MediaManagerEvents {
  FILE_UPLOADED = 'media:file:uploaded',
  FILE_PROCESSED = 'media:file:processed',
  FILE_DELETED = 'media:file:deleted',
  FILE_UPDATED = 'media:file:updated',
  FOLDER_CREATED = 'media:folder:created',
  FOLDER_DELETED = 'media:folder:deleted',
  USAGE_TRACKED = 'media:usage:tracked',
  USAGE_REMOVED = 'media:usage:removed',
  QUOTA_WARNING = 'media:quota:warning',
  QUOTA_EXCEEDED = 'media:quota:exceeded',
  PROCESSING_STARTED = 'media:processing:started',
  PROCESSING_COMPLETED = 'media:processing:completed',
  PROCESSING_FAILED = 'media:processing:failed',
}

/**
 * Plugin API implementation that wraps the MediaService
 */
export class MediaManagerPluginAPI implements MediaManagerAPI {
  constructor(
    private mediaService: MediaService,
    private storageManager: StorageManager,
    private imageProcessor?: ImageProcessor,
    private videoProcessor?: VideoProcessor,
    private fileValidator?: FileValidator
  ) {}

  async uploadFile(
    buffer: Buffer,
    options: UploadFileOptions,
    uploadedBy: string,
    tenantId: string
  ) {
    return this.mediaService.uploadFile(buffer, options, uploadedBy, tenantId);
  }

  async getFile(fileId: string, tenantId: string) {
    return this.mediaService.getFile(fileId, tenantId);
  }

  async updateFile(
    fileId: string,
    tenantId: string,
    updates: {
      alt?: string;
      caption?: string;
      tags?: string[];
      isPublic?: boolean;
      folderId?: string;
    },
    updatedBy: string
  ) {
    return this.mediaService.updateFile(fileId, tenantId, updates, updatedBy);
  }

  async deleteFile(fileId: string, tenantId: string, deletedBy: string) {
    return this.mediaService.deleteFile(fileId, tenantId, deletedBy);
  }

  async createFolder(
    tenantId: string,
    name: string,
    createdBy: string,
    parentId?: string,
    description?: string
  ) {
    return this.mediaService.createFolder(tenantId, name, createdBy, parentId, description);
  }

  async getFolderByPath(tenantId: string, path: string) {
    return this.mediaService.getFolderByPath(tenantId, path);
  }

  async processImage(buffer: Buffer, options: ImageTransformOptions) {
    if (!this.imageProcessor) {
      throw new Error('Image processor not available');
    }
    return this.imageProcessor.processImage(buffer, options);
  }

  async processVideo(buffer: Buffer, options: VideoTransformOptions) {
    if (!this.videoProcessor) {
      throw new Error('Video processor not available');
    }
    return this.videoProcessor.processVideo(buffer, options);
  }

  async generateVideoThumbnails(buffer: Buffer, options?: ThumbnailOptions) {
    if (!this.videoProcessor) {
      throw new Error('Video processor not available');
    }
    return this.videoProcessor.generateThumbnails(buffer, options);
  }

  getPublicUrl(tenantId: string, filepath: string): string {
    return this.storageManager.getPublicUrl(tenantId, filepath);
  }

  async getSignedUrl(
    tenantId: string,
    filepath: string,
    options?: { expiresIn?: number }
  ): Promise<string> {
    return this.storageManager.getSignedUrl(tenantId, filepath, options);
  }

  async trackUsage(
    fileId: string,
    tenantId: string,
    context: string,
    contextId: string,
    usageType: 'primary' | 'gallery' | 'thumbnail' | 'background'
  ): Promise<boolean> {
    // Implementation would track usage in the database
    // For now, return success
    return true;
  }

  async removeUsage(
    fileId: string,
    tenantId: string,
    context: string,
    contextId: string,
    usageType?: string
  ): Promise<boolean> {
    // Implementation would remove usage from the database
    // For now, return success
    return true;
  }

  async validateFile(
    buffer: Buffer,
    filename: string,
    claimedMimeType?: string
  ) {
    if (!this.fileValidator) {
      throw new Error('File validator not available');
    }
    return this.fileValidator.validateFile(buffer, filename, claimedMimeType);
  }

  async searchFiles(
    tenantId: string,
    options: {
      query?: string;
      mimeType?: string;
      tags?: string[];
      folderId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const searchOptions = {
      search: options.query,
      mimeType: options.mimeType,
      tags: options.tags,
      folder: options.folderId,
      limit: options.limit,
      offset: options.offset,
    };

    return this.mediaService.listFiles(tenantId, searchOptions);
  }

  async getUsageAnalytics(tenantId: string) {
    return this.mediaService.getUsageAnalytics(tenantId);
  }
}

/**
 * Helper functions for other plugins to use
 */
export class MediaManagerHelpers {
  constructor(private api: MediaManagerAPI) {}

  /**
   * Upload multiple files with progress tracking
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string; options?: Partial<UploadFileOptions> }>,
    uploadedBy: string,
    tenantId: string,
    onProgress?: (completed: number, total: number, currentFile: string) => void
  ): Promise<{
    successful: MediaFile[];
    failed: Array<{ filename: string; error: string }>;
  }> {
    const successful: MediaFile[] = [];
    const failed: Array<{ filename: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const { buffer, filename, options = {} } = files[i];

      try {
        if (onProgress) {
          onProgress(i, files.length, filename);
        }

        const result = await this.api.uploadFile(
          buffer,
          { filename, ...options },
          uploadedBy,
          tenantId
        );

        if (result.success && result.file) {
          successful.push(result.file);
        } else {
          failed.push({ filename, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        failed.push({
          filename,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (onProgress) {
      onProgress(files.length, files.length, '');
    }

    return { successful, failed };
  }

  /**
   * Create optimized image variants
   */
  async createImageVariants(
    fileId: string,
    tenantId: string,
    variants: Array<{
      suffix: string;
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp' | 'avif';
    }>
  ): Promise<{
    original: MediaFile;
    variants: Array<{ suffix: string; file: MediaFile }>;
  }> {
    const originalFile = await this.api.getFile(fileId, tenantId);
    if (!originalFile) {
      throw new Error('Original file not found');
    }

    // Get file buffer (this would need to be implemented)
    // const buffer = await this.getFileBuffer(originalFile);

    const variantFiles: Array<{ suffix: string; file: MediaFile }> = [];

    // For each variant, process the image and upload
    // This is a simplified example - full implementation would require buffer access
    /*
    for (const variant of variants) {
      const processedResult = await this.api.processImage(buffer, {
        width: variant.width,
        height: variant.height,
        quality: variant.quality,
        format: variant.format,
      });

      const variantFilename = `${originalFile.filename}_${variant.suffix}`;
      const uploadResult = await this.api.uploadFile(
        processedResult.buffer,
        {
          filename: variantFilename,
          folder: originalFile.folderId,
          alt: originalFile.alt,
          caption: `${originalFile.caption} (${variant.suffix})`,
          tags: [...originalFile.tags, 'variant'],
        },
        originalFile.uploadedBy,
        tenantId
      );

      if (uploadResult.success && uploadResult.file) {
        variantFiles.push({ suffix: variant.suffix, file: uploadResult.file });
      }
    }
    */

    return {
      original: originalFile,
      variants: variantFiles,
    };
  }

  /**
   * Bulk operations helper
   */
  async bulkDelete(
    fileIds: string[],
    tenantId: string,
    deletedBy: string
  ): Promise<{
    successful: string[];
    failed: Array<{ fileId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ fileId: string; error: string }> = [];

    for (const fileId of fileIds) {
      try {
        const result = await this.api.deleteFile(fileId, tenantId, deletedBy);
        if (result.success) {
          successful.push(fileId);
        } else {
          failed.push({ fileId, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        failed.push({
          fileId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get files by usage context
   */
  async getFilesByContext(
    tenantId: string,
    context: string,
    contextId?: string
  ): Promise<MediaFile[]> {
    // This would require a database query to get files by usage
    // For now, return empty array
    return [];
  }

  /**
   * Clean up unused files
   */
  async cleanupUnusedFiles(
    tenantId: string,
    olderThanDays: number = 30
  ): Promise<{
    deletedFiles: number;
    freedSpace: number;
  }> {
    // Implementation would:
    // 1. Find files with no usage records
    // 2. Check if they're older than specified days
    // 3. Delete them and return statistics
    return {
      deletedFiles: 0,
      freedSpace: 0,
    };
  }

  /**
   * Generate usage report
   */
  async generateUsageReport(tenantId: string): Promise<{
    summary: {
      totalFiles: number;
      totalSize: number;
      usedFiles: number;
      unusedFiles: number;
    };
    byType: Record<string, { count: number; size: number }>;
    byContext: Record<string, { count: number; size: number }>;
    topFiles: Array<{
      file: MediaFile;
      usageCount: number;
      contexts: string[];
    }>;
  }> {
    const analytics = await this.api.getUsageAnalytics(tenantId);

    // Transform the data into a comprehensive report
    return {
      summary: {
        totalFiles: analytics.totalFiles,
        totalSize: analytics.totalSize,
        usedFiles: 0, // Would be calculated from usage data
        unusedFiles: 0, // Would be calculated from usage data
      },
      byType: analytics.filesByType,
      byContext: {}, // Would be populated from usage data
      topFiles: [], // Would be populated from usage data
    };
  }
}

/**
 * Type definitions for plugin integration
 */
export interface MediaManagerIntegration {
  api: MediaManagerAPI;
  helpers: MediaManagerHelpers;
  events: typeof MediaManagerEvents;
  components: {
    MediaLibrary: React.ComponentType<any>;
    FileUpload: React.ComponentType<any>;
    MediaPicker: React.ComponentType<any>;
  };
}

/**
 * Factory function to create MediaManager integration for other plugins
 */
export function createMediaManagerIntegration(
  mediaService: MediaService,
  storageManager: StorageManager,
  imageProcessor?: ImageProcessor,
  videoProcessor?: VideoProcessor,
  fileValidator?: FileValidator
): MediaManagerIntegration {
  const api = new MediaManagerPluginAPI(
    mediaService,
    storageManager,
    imageProcessor,
    videoProcessor,
    fileValidator
  );
  const helpers = new MediaManagerHelpers(api);

  return {
    api,
    helpers,
    events: MediaManagerEvents,
    components: {
      // These would be imported from the components directory
      MediaLibrary: {} as any, // MediaLibrary component
      FileUpload: {} as any, // FileUpload component
      MediaPicker: {} as any, // MediaPicker component
    },
  };
}
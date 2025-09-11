import { StorageManager } from '../storage/storage-manager';
import { ImageProcessor, ImageTransformOptions } from '../processing/image-processor';
import { VideoProcessor, VideoTransformOptions, ThumbnailOptions } from '../processing/video-processor';
import { FileValidator } from '../security/file-validator';
import { MediaFile, MediaFolder, MediaUsage, MediaCollection, NewMediaFile, NewMediaFolder } from '../schema/media';
import { MediaManagerConfig } from '../media-manager-plugin';
import { eq, and, like, desc, asc, inArray, sql } from 'drizzle-orm';
import { mediaFiles, mediaFolders, mediaUsage, mediaCollections, mediaCollectionFiles, mediaTransformations, mediaAuditLog } from '../schema/media';

export interface UploadFileOptions {
  filename: string;
  folder?: string;
  alt?: string;
  caption?: string;
  tags?: string[];
  isPublic?: boolean;
  generateThumbnails?: boolean;
  optimizeImage?: boolean;
  processVideo?: boolean;
  transformations?: ImageTransformOptions | VideoTransformOptions;
}

export interface FileListOptions {
  folder?: string;
  mimeType?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeUsage?: boolean;
}

export interface FileProcessingJob {
  id: string;
  fileId: string;
  type: 'image' | 'video' | 'thumbnail';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface MediaServiceDependencies {
  storageManager: StorageManager;
  imageProcessor?: ImageProcessor;
  videoProcessor?: VideoProcessor;
  fileValidator: FileValidator;
  database: any;
  config: MediaManagerConfig;
}

export class MediaService {
  private storageManager: StorageManager;
  private imageProcessor?: ImageProcessor;
  private videoProcessor?: VideoProcessor;
  private fileValidator: FileValidator;
  private database: any;
  private config: MediaManagerConfig;
  private processingJobs = new Map<string, FileProcessingJob>();

  constructor(dependencies: MediaServiceDependencies) {
    this.storageManager = dependencies.storageManager;
    this.imageProcessor = dependencies.imageProcessor;
    this.videoProcessor = dependencies.videoProcessor;
    this.fileValidator = dependencies.fileValidator;
    this.database = dependencies.database;
    this.config = dependencies.config;
  }

  /**
   * Upload a file
   */
  async uploadFile(
    buffer: Buffer,
    options: UploadFileOptions,
    uploadedBy: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    file?: MediaFile;
    processingJob?: FileProcessingJob;
    error?: string;
  }> {
    try {
      // Validate file
      const validation = await this.fileValidator.validateFile(buffer, options.filename);
      if (!validation.valid) {
        return {
          success: false,
          error: `File validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Security scan
      const securityScan = await this.fileValidator.scanForThreats(buffer, options.filename);
      if (!securityScan.safe) {
        const criticalThreats = securityScan.threats.filter(t => t.severity === 'high' || t.severity === 'critical');
        if (criticalThreats.length > 0) {
          return {
            success: false,
            error: `Security scan failed: ${criticalThreats.map(t => t.description).join(', ')}`,
          };
        }
      }

      // Generate unique filename
      const filename = this.generateUniqueFilename(options.filename);
      
      // Validate folder if specified
      if (options.folder) {
        const folder = await this.getFolderByPath(tenantId, options.folder);
        if (!folder) {
          return {
            success: false,
            error: 'Specified folder does not exist',
          };
        }
      }

      // Upload to storage
      const uploadResult = await this.storageManager.upload(buffer, {
        tenantId,
        filename,
        mimeType: validation.detectedMimeType || 'application/octet-stream',
        isPublic: options.isPublic || false,
        folder: options.folder,
        metadata: {
          originalName: options.filename,
          uploadedBy,
          alt: options.alt,
          caption: options.caption,
          tags: options.tags,
        },
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || 'Storage upload failed',
        };
      }

      // Create database record
      const newMediaFile: NewMediaFile = {
        tenantId,
        filename,
        originalName: options.filename,
        path: `${options.folder ? options.folder + '/' : ''}${filename}`,
        mimeType: validation.detectedMimeType || 'application/octet-stream',
        size: buffer.length,
        url: uploadResult.url!,
        checksum: validation.checksum,
        alt: options.alt,
        caption: options.caption,
        tags: JSON.stringify(options.tags || []),
        isPublic: options.isPublic || false,
        uploadedBy,
        metadata: JSON.stringify(validation.metadata),
      };

      // Set folder ID if folder specified
      if (options.folder) {
        const folder = await this.getFolderByPath(tenantId, options.folder);
        if (folder) {
          newMediaFile.folderId = folder.id;
        }
      }

      const [createdFile] = await this.database.insert(mediaFiles).values(newMediaFile).returning();

      // Log audit event
      await this.logAuditEvent({
        tenantId,
        mediaFileId: createdFile.id,
        action: 'upload',
        userId: uploadedBy,
        metadata: {
          filename: options.filename,
          size: buffer.length,
          mimeType: validation.detectedMimeType,
        },
      });

      let processingJob: FileProcessingJob | undefined;

      // Schedule processing if needed
      if (this.shouldProcessFile(validation.detectedMimeType, options)) {
        processingJob = await this.scheduleFileProcessing(createdFile, buffer, options);
      }

      return {
        success: true,
        file: createdFile as MediaFile,
        processingJob,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string, tenantId: string, includeUsage = false): Promise<MediaFile | null> {
    try {
      const query = this.database
        .select()
        .from(mediaFiles)
        .where(and(eq(mediaFiles.id, fileId), eq(mediaFiles.tenantId, tenantId)));

      const [file] = await query;
      
      if (!file) {
        return null;
      }

      // Include usage information if requested
      if (includeUsage) {
        const usage = await this.database
          .select()
          .from(mediaUsage)
          .where(eq(mediaUsage.mediaFileId, fileId));

        (file as any).usage = usage;
      }

      return file as MediaFile;
    } catch (error) {
      console.error('Error getting file:', error);
      return null;
    }
  }

  /**
   * List files with filtering and pagination
   */
  async listFiles(
    tenantId: string,
    options: FileListOptions = {}
  ): Promise<{
    files: MediaFile[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const conditions = [eq(mediaFiles.tenantId, tenantId)];

      // Add filters
      if (options.folder) {
        const folder = await this.getFolderByPath(tenantId, options.folder);
        if (folder) {
          conditions.push(eq(mediaFiles.folderId, folder.id));
        }
      }

      if (options.mimeType) {
        conditions.push(like(mediaFiles.mimeType, `${options.mimeType}%`));
      }

      if (options.search) {
        conditions.push(
          sql`(${mediaFiles.originalName} ILIKE ${`%${options.search}%`} OR 
               ${mediaFiles.alt} ILIKE ${`%${options.search}%`} OR 
               ${mediaFiles.caption} ILIKE ${`%${options.search}%`})`
        );
      }

      // Build query
      let query = this.database
        .select()
        .from(mediaFiles)
        .where(and(...conditions));

      // Add sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      
      if (sortOrder === 'desc') {
        query = query.orderBy(desc(mediaFiles[sortBy as keyof typeof mediaFiles]));
      } else {
        query = query.orderBy(asc(mediaFiles[sortBy as keyof typeof mediaFiles]));
      }

      // Add pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      
      query = query.limit(limit + 1).offset(offset);

      const results = await query;
      const hasMore = results.length > limit;
      const files = hasMore ? results.slice(0, -1) : results;

      // Get total count for pagination
      const [{ count }] = await this.database
        .select({ count: sql`count(*)` })
        .from(mediaFiles)
        .where(and(...conditions));

      return {
        files: files as MediaFile[],
        total: parseInt(count as string),
        hasMore,
      };
    } catch (error) {
      console.error('Error listing files:', error);
      return { files: [], total: 0, hasMore: false };
    }
  }

  /**
   * Update file metadata
   */
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
  ): Promise<MediaFile | null> {
    try {
      const updateData: Partial<MediaFile> = {
        updatedAt: new Date(),
      };

      if (updates.alt !== undefined) updateData.alt = updates.alt;
      if (updates.caption !== undefined) updateData.caption = updates.caption;
      if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
      if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
      if (updates.folderId !== undefined) updateData.folderId = updates.folderId;

      const [updatedFile] = await this.database
        .update(mediaFiles)
        .set(updateData)
        .where(and(eq(mediaFiles.id, fileId), eq(mediaFiles.tenantId, tenantId)))
        .returning();

      if (updatedFile) {
        // Log audit event
        await this.logAuditEvent({
          tenantId,
          mediaFileId: fileId,
          action: 'update',
          userId: updatedBy,
          metadata: updates,
        });
      }

      return updatedFile as MediaFile;
    } catch (error) {
      console.error('Error updating file:', error);
      return null;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(
    fileId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get file details
      const file = await this.getFile(fileId, tenantId, true);
      if (!file) {
        return { success: false, error: 'File not found' };
      }

      // Check if file is in use (if usage tracking is enabled)
      if (this.config.features.auditLog && (file as any).usage?.length > 0) {
        return {
          success: false,
          error: 'Cannot delete file that is currently in use',
        };
      }

      // Delete from storage
      const storageResult = await this.storageManager.delete(tenantId, file.path);
      if (!storageResult.success) {
        return {
          success: false,
          error: storageResult.error || 'Failed to delete from storage',
        };
      }

      // Delete related records
      await this.database.delete(mediaCollectionFiles).where(eq(mediaCollectionFiles.mediaFileId, fileId));
      await this.database.delete(mediaTransformations).where(eq(mediaTransformations.mediaFileId, fileId));
      await this.database.delete(mediaUsage).where(eq(mediaUsage.mediaFileId, fileId));

      // Delete file record
      await this.database.delete(mediaFiles).where(eq(mediaFiles.id, fileId));

      // Log audit event
      await this.logAuditEvent({
        tenantId,
        mediaFileId: fileId,
        action: 'delete',
        userId: deletedBy,
        metadata: {
          filename: file.originalName,
          size: file.size,
        },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create a folder
   */
  async createFolder(
    tenantId: string,
    name: string,
    createdBy: string,
    parentId?: string,
    description?: string
  ): Promise<{ success: boolean; folder?: MediaFolder; error?: string }> {
    try {
      // Validate folder name
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return {
          success: false,
          error: 'Folder name can only contain letters, numbers, hyphens, and underscores',
        };
      }

      // Check if folder already exists
      let parentPath = '';
      if (parentId) {
        const parent = await this.database
          .select()
          .from(mediaFolders)
          .where(eq(mediaFolders.id, parentId))
          .limit(1);
        
        if (!parent[0]) {
          return { success: false, error: 'Parent folder not found' };
        }
        parentPath = parent[0].path + '/';
      }

      const path = parentPath + name;
      const slug = this.generateSlug(name);

      // Check for duplicate
      const existing = await this.database
        .select()
        .from(mediaFolders)
        .where(and(
          eq(mediaFolders.tenantId, tenantId),
          eq(mediaFolders.path, path)
        ))
        .limit(1);

      if (existing[0]) {
        return { success: false, error: 'Folder already exists at this path' };
      }

      const newFolder: NewMediaFolder = {
        tenantId,
        name,
        slug,
        parentId,
        path,
        description,
        createdBy,
      };

      const [createdFolder] = await this.database.insert(mediaFolders).values(newFolder).returning();

      return {
        success: true,
        folder: createdFolder as MediaFolder,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get folder by path
   */
  async getFolderByPath(tenantId: string, path: string): Promise<MediaFolder | null> {
    try {
      const [folder] = await this.database
        .select()
        .from(mediaFolders)
        .where(and(eq(mediaFolders.tenantId, tenantId), eq(mediaFolders.path, path)))
        .limit(1);

      return folder as MediaFolder || null;
    } catch (error) {
      console.error('Error getting folder by path:', error);
      return null;
    }
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    sizeByType: Record<string, number>;
    storageUsage: any;
    recentActivity: any[];
  }> {
    try {
      // Get file statistics
      const files = await this.database
        .select()
        .from(mediaFiles)
        .where(eq(mediaFiles.tenantId, tenantId));

      const analytics = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        filesByType: {} as Record<string, number>,
        sizeByType: {} as Record<string, number>,
        storageUsage: {},
        recentActivity: [],
      };

      // Group by MIME type
      files.forEach(file => {
        const category = file.mimeType.split('/')[0];
        analytics.filesByType[category] = (analytics.filesByType[category] || 0) + 1;
        analytics.sizeByType[category] = (analytics.sizeByType[category] || 0) + file.size;
      });

      // Get storage usage
      analytics.storageUsage = await this.storageManager.getUsageStats(tenantId);

      // Get recent activity
      if (this.config.features.auditLog) {
        analytics.recentActivity = await this.database
          .select()
          .from(mediaAuditLog)
          .where(eq(mediaAuditLog.tenantId, tenantId))
          .orderBy(desc(mediaAuditLog.timestamp))
          .limit(20);
      }

      return analytics;
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        sizeByType: {},
        storageUsage: {},
        recentActivity: [],
      };
    }
  }

  /**
   * Process a file (image/video transformations)
   */
  async processFile(
    fileId: string,
    tenantId: string,
    transformations: any,
    processedBy: string
  ): Promise<{ success: boolean; job?: FileProcessingJob; error?: string }> {
    try {
      const file = await this.getFile(fileId, tenantId);
      if (!file) {
        return { success: false, error: 'File not found' };
      }

      // Create processing job
      const jobId = this.generateId();
      const job: FileProcessingJob = {
        id: jobId,
        fileId,
        type: file.mimeType.startsWith('image/') ? 'image' : 'video',
        status: 'pending',
        progress: 0,
        startedAt: new Date(),
      };

      this.processingJobs.set(jobId, job);

      // Start processing in background
      this.processFileInBackground(file, transformations, job, processedBy).catch(error => {
        console.error('Background processing failed:', error);
        job.status = 'failed';
        job.error = error.message;
      });

      return { success: true, job };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Helper methods
   */
  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
    const baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
    
    return `${baseName}_${timestamp}_${random}${extension}`;
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateId(): string {
    return 'media_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private shouldProcessFile(mimeType: string | undefined, options: UploadFileOptions): boolean {
    if (!mimeType) return false;

    if (mimeType.startsWith('image/') && (options.generateThumbnails || options.optimizeImage)) {
      return true;
    }

    if (mimeType.startsWith('video/') && options.processVideo) {
      return true;
    }

    return false;
  }

  private async scheduleFileProcessing(
    file: MediaFile,
    buffer: Buffer,
    options: UploadFileOptions
  ): Promise<FileProcessingJob> {
    const jobId = this.generateId();
    const job: FileProcessingJob = {
      id: jobId,
      fileId: file.id,
      type: file.mimeType.startsWith('image/') ? 'image' : 'video',
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
    };

    this.processingJobs.set(jobId, job);

    // Process in background
    this.processFileInBackground(file, options.transformations, job, file.uploadedBy, buffer)
      .catch(error => {
        console.error('Background processing failed:', error);
        job.status = 'failed';
        job.error = error.message;
      });

    return job;
  }

  private async processFileInBackground(
    file: MediaFile,
    transformations: any,
    job: FileProcessingJob,
    processedBy: string,
    buffer?: Buffer
  ): Promise<void> {
    try {
      job.status = 'processing';
      job.progress = 10;

      // Get file buffer if not provided
      if (!buffer) {
        // In a real implementation, you'd fetch from storage
        throw new Error('File buffer not available for processing');
      }

      job.progress = 30;

      let result: any;
      
      if (file.mimeType.startsWith('image/') && this.imageProcessor) {
        result = await this.imageProcessor.processImage(buffer, transformations);
      } else if (file.mimeType.startsWith('video/') && this.videoProcessor) {
        result = await this.videoProcessor.processVideo(buffer, transformations);
      }

      job.progress = 80;

      // Save transformation record
      if (result) {
        await this.database.insert(mediaTransformations).values({
          mediaFileId: file.id,
          tenantId: file.tenantId,
          transformationType: job.type,
          parameters: JSON.stringify(transformations),
          resultSize: result.processedSize,
          status: 'completed',
        });
      }

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = result;

      // Log audit event
      await this.logAuditEvent({
        tenantId: file.tenantId,
        mediaFileId: file.id,
        action: 'process',
        userId: processedBy,
        metadata: {
          transformationType: job.type,
          transformations,
        },
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Processing failed';
      console.error('File processing failed:', error);
    }
  }

  private async logAuditEvent(event: {
    tenantId: string;
    mediaFileId?: string;
    action: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    if (!this.config.features.auditLog) return;

    try {
      await this.database.insert(mediaAuditLog).values({
        tenantId: event.tenantId,
        mediaFileId: event.mediaFileId,
        action: event.action,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: JSON.stringify(event.metadata || {}),
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    // Cancel any running processing jobs
    for (const job of this.processingJobs.values()) {
      if (job.status === 'processing') {
        job.status = 'failed';
        job.error = 'Service shutting down';
      }
    }
    this.processingJobs.clear();
  }
}
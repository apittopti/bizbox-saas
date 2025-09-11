import { BasePlugin } from '@bizbox/core-framework';
import type { PluginContext, PluginManifest, PluginRoute, PluginPermission } from '@bizbox/core-framework';
import { StorageManager, StorageManagerConfig } from './storage/storage-manager';
import { ImageProcessor } from './processing/image-processor';
import { VideoProcessor } from './processing/video-processor';
import { FileValidator } from './security/file-validator';
import { MediaService } from './services/media-service';
import { MediaLibraryComponent } from './components/media-library';

export interface MediaManagerConfig {
  storage: StorageManagerConfig;
  processing: {
    image: {
      enabled: boolean;
      maxDimensions: { width: number; height: number };
      defaultQuality: number;
      generateThumbnails: boolean;
      thumbnailSizes: Array<{ width: number; height: number; suffix: string }>;
    };
    video: {
      enabled: boolean;
      maxDuration: number; // in seconds
      generateThumbnails: boolean;
      thumbnailTimestamps: number[]; // timestamps in seconds
      ffmpegPath?: string;
    };
  };
  validation: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    scanForMalware: boolean;
    virusScannerConfig?: any;
  };
  features: {
    collections: boolean;
    transformations: boolean;
    auditLog: boolean;
    quotaManagement: boolean;
  };
}

const DEFAULT_CONFIG: MediaManagerConfig = {
  storage: {
    providers: [
      {
        type: 'local',
        name: 'local-storage',
        enabled: true,
        priority: 1,
        config: {
          basePath: './uploads',
          baseUrl: '/uploads',
          createDirectories: true,
        },
      },
    ],
  },
  processing: {
    image: {
      enabled: true,
      maxDimensions: { width: 10000, height: 10000 },
      defaultQuality: 85,
      generateThumbnails: true,
      thumbnailSizes: [
        { width: 150, height: 150, suffix: 'thumb' },
        { width: 400, height: 300, suffix: 'medium' },
        { width: 1200, height: 800, suffix: 'large' },
      ],
    },
    video: {
      enabled: true,
      maxDuration: 3600, // 1 hour
      generateThumbnails: true,
      thumbnailTimestamps: [0, 30, 60], // First frame, 30s, 60s
    },
  },
  validation: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain', 'text/csv',
    ],
    scanForMalware: true,
  },
  features: {
    collections: true,
    transformations: true,
    auditLog: true,
    quotaManagement: true,
  },
};

export class MediaManagerPlugin extends BasePlugin {
  private config: MediaManagerConfig;
  private storageManager: StorageManager;
  private imageProcessor: ImageProcessor;
  private videoProcessor: VideoProcessor;
  private fileValidator: FileValidator;
  private mediaService: MediaService;

  constructor(config: Partial<MediaManagerConfig> = {}) {
    const manifest: PluginManifest = {
      id: 'media-manager',
      name: 'Media Manager',
      version: '1.0.0',
      description: 'Comprehensive media management plugin for BizBox',
      author: 'BizBox Team',
      dependencies: {
        'core-framework': '1.0.0',
        'core-database': '1.0.0',
      },
      routes: MediaManagerPlugin.getRoutes(),
      permissions: MediaManagerPlugin.getPermissions(),
      tags: ['media', 'files', 'storage', 'images', 'videos'],
      homepage: 'https://bizbox.com/plugins/media-manager',
      license: 'MIT',
    };

    super(manifest);
    
    this.config = { ...DEFAULT_CONFIG, ...config } as MediaManagerConfig;
  }

  async initialize(context: PluginContext): Promise<void> {
    try {
      this.context = context;
      
      this.log('info', 'Initializing Media Manager plugin...');

      // Initialize storage manager
      this.storageManager = new StorageManager(this.config.storage);
      this.log('info', 'Storage manager initialized');

      // Initialize image processor
      if (this.config.processing.image.enabled) {
        this.imageProcessor = new ImageProcessor();
        this.log('info', 'Image processor initialized');
      }

      // Initialize video processor
      if (this.config.processing.video.enabled) {
        this.videoProcessor = new VideoProcessor(this.config.processing.video.ffmpegPath);
        this.log('info', 'Video processor initialized');
      }

      // Initialize file validator
      this.fileValidator = new FileValidator({
        maxFileSize: this.config.validation.maxFileSize,
        allowedMimeTypes: this.config.validation.allowedMimeTypes,
        scanForMalware: this.config.validation.scanForMalware,
      });
      this.log('info', 'File validator initialized');

      // Initialize media service
      this.mediaService = new MediaService({
        storageManager: this.storageManager,
        imageProcessor: this.imageProcessor,
        videoProcessor: this.videoProcessor,
        fileValidator: this.fileValidator,
        database: context.database,
        config: this.config,
      });
      this.log('info', 'Media service initialized');

      // Register event listeners
      this.registerEventListeners();

      // Register hooks
      this.registerPluginHooks();

      // Health check
      const healthCheck = await this.storageManager.healthCheck();
      if (!healthCheck.overall) {
        this.log('warn', 'Storage health check failed', healthCheck);
      }

      this.log('info', 'Media Manager plugin initialized successfully');
      
      // Emit initialization event
      await this.emit('plugin:media-manager:initialized', {
        pluginId: this.id,
        config: this.config,
        timestamp: new Date(),
      });

    } catch (error) {
      this.log('error', 'Failed to initialize Media Manager plugin', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      this.log('info', 'Destroying Media Manager plugin...');

      // Cleanup any running processes
      if (this.mediaService) {
        await this.mediaService.cleanup?.();
      }

      // Emit destruction event
      await this.emit('plugin:media-manager:destroyed', {
        pluginId: this.id,
        timestamp: new Date(),
      });

      this.log('info', 'Media Manager plugin destroyed successfully');
    } catch (error) {
      this.log('error', 'Failed to destroy Media Manager plugin', error);
      throw error;
    }
  }

  /**
   * Get the media service instance for other plugins to use
   */
  getMediaService(): MediaService {
    if (!this.mediaService) {
      throw new Error('Media Manager plugin not initialized');
    }
    return this.mediaService;
  }

  /**
   * Get storage manager instance
   */
  getStorageManager(): StorageManager {
    if (!this.storageManager) {
      throw new Error('Media Manager plugin not initialized');
    }
    return this.storageManager;
  }

  /**
   * Get plugin configuration
   */
  getConfig(): MediaManagerConfig {
    return this.config;
  }

  /**
   * Update plugin configuration
   */
  async updateConfig(newConfig: Partial<MediaManagerConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize services if needed
    if (newConfig.storage) {
      this.storageManager = new StorageManager(this.config.storage);
    }

    if (newConfig.validation) {
      this.fileValidator = new FileValidator({
        maxFileSize: this.config.validation.maxFileSize,
        allowedMimeTypes: this.config.validation.allowedMimeTypes,
        scanForMalware: this.config.validation.scanForMalware,
      });
    }

    await this.emit('plugin:media-manager:config-updated', {
      pluginId: this.id,
      config: this.config,
      timestamp: new Date(),
    });
  }

  /**
   * Get plugin health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      storage: any;
      processing: {
        image: boolean;
        video: boolean;
      };
      validation: boolean;
    };
    lastCheck: Date;
  }> {
    const storageHealth = await this.storageManager.healthCheck();
    
    return {
      status: storageHealth.overall ? 'healthy' : 'degraded',
      details: {
        storage: storageHealth,
        processing: {
          image: !!this.imageProcessor,
          video: !!this.videoProcessor,
        },
        validation: !!this.fileValidator,
      },
      lastCheck: new Date(),
    };
  }

  /**
   * Register event listeners
   */
  private registerEventListeners(): void {
    // Listen for file uploads from other plugins
    this.subscribeToEvent('media:upload-request', async (payload) => {
      try {
        const result = await this.mediaService.uploadFile(payload.file, payload.options);
        await this.emit('media:upload-response', {
          requestId: payload.requestId,
          result,
        });
      } catch (error) {
        await this.emit('media:upload-error', {
          requestId: payload.requestId,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    });

    // Listen for file deletion requests
    this.subscribeToEvent('media:delete-request', async (payload) => {
      try {
        const result = await this.mediaService.deleteFile(payload.fileId);
        await this.emit('media:delete-response', {
          requestId: payload.requestId,
          result,
        });
      } catch (error) {
        await this.emit('media:delete-error', {
          requestId: payload.requestId,
          error: error instanceof Error ? error.message : 'Delete failed',
        });
      }
    });
  }

  /**
   * Register plugin hooks
   */
  private registerPluginHooks(): void {
    // File upload hook
    this.registerHook('media:before-upload', async (file, options) => {
      this.log('info', 'Processing file upload hook', { filename: options.filename });
      return { file, options };
    }, 10);

    // File validation hook
    this.registerHook('media:validate-file', async (file, filename) => {
      return this.fileValidator.validateFile(file, filename);
    }, 10);

    // Image processing hook
    if (this.imageProcessor) {
      this.registerHook('media:process-image', async (buffer, options) => {
        return this.imageProcessor.processImage(buffer, options);
      }, 10);
    }

    // Video processing hook
    if (this.videoProcessor) {
      this.registerHook('media:process-video', async (buffer, options) => {
        return this.videoProcessor.processVideo(buffer, options);
      }, 10);
    }

    // Storage hook
    this.registerHook('media:store-file', async (buffer, options) => {
      return this.storageManager.upload(buffer, options);
    }, 10);
  }

  /**
   * Define plugin routes
   */
  static getRoutes(): PluginRoute[] {
    return [
      // Upload endpoints
      {
        method: 'POST',
        path: '/api/plugins/media-manager/upload',
        handler: 'handleSingleUpload',
        permissions: ['media:upload'],
        description: 'Upload a single file',
      },
      {
        method: 'POST',
        path: '/api/plugins/media-manager/upload/batch',
        handler: 'handleBatchUpload',
        permissions: ['media:upload'],
        description: 'Upload multiple files',
      },
      {
        method: 'POST',
        path: '/api/plugins/media-manager/upload/chunk',
        handler: 'handleChunkUpload',
        permissions: ['media:upload'],
        description: 'Upload file chunks for large files',
      },

      // File management
      {
        method: 'GET',
        path: '/api/plugins/media-manager/files',
        handler: 'handleListFiles',
        permissions: ['media:read'],
        description: 'List files with pagination and filtering',
      },
      {
        method: 'GET',
        path: '/api/plugins/media-manager/files/:id',
        handler: 'handleGetFile',
        permissions: ['media:read'],
        description: 'Get file details',
      },
      {
        method: 'PUT',
        path: '/api/plugins/media-manager/files/:id',
        handler: 'handleUpdateFile',
        permissions: ['media:update'],
        description: 'Update file metadata',
      },
      {
        method: 'DELETE',
        path: '/api/plugins/media-manager/files/:id',
        handler: 'handleDeleteFile',
        permissions: ['media:delete'],
        description: 'Delete a file',
      },

      // Folder management
      {
        method: 'GET',
        path: '/api/plugins/media-manager/folders',
        handler: 'handleListFolders',
        permissions: ['media:read'],
        description: 'List folders',
      },
      {
        method: 'POST',
        path: '/api/plugins/media-manager/folders',
        handler: 'handleCreateFolder',
        permissions: ['media:create'],
        description: 'Create a new folder',
      },
      {
        method: 'PUT',
        path: '/api/plugins/media-manager/folders/:id',
        handler: 'handleUpdateFolder',
        permissions: ['media:update'],
        description: 'Update folder details',
      },
      {
        method: 'DELETE',
        path: '/api/plugins/media-manager/folders/:id',
        handler: 'handleDeleteFolder',
        permissions: ['media:delete'],
        description: 'Delete a folder',
      },

      // Processing endpoints
      {
        method: 'POST',
        path: '/api/plugins/media-manager/process/:id',
        handler: 'handleProcessFile',
        permissions: ['media:process'],
        description: 'Process/transform a file',
      },
      {
        method: 'GET',
        path: '/api/plugins/media-manager/process/:id/status',
        handler: 'handleGetProcessingStatus',
        permissions: ['media:read'],
        description: 'Get processing status',
      },

      // Search and collections
      {
        method: 'GET',
        path: '/api/plugins/media-manager/search',
        handler: 'handleSearchFiles',
        permissions: ['media:read'],
        description: 'Search files',
      },
      {
        method: 'GET',
        path: '/api/plugins/media-manager/collections',
        handler: 'handleListCollections',
        permissions: ['media:read'],
        description: 'List media collections',
      },
      {
        method: 'POST',
        path: '/api/plugins/media-manager/collections',
        handler: 'handleCreateCollection',
        permissions: ['media:create'],
        description: 'Create a media collection',
      },

      // Analytics and management
      {
        method: 'GET',
        path: '/api/plugins/media-manager/analytics',
        handler: 'handleGetAnalytics',
        permissions: ['media:analytics'],
        description: 'Get media usage analytics',
      },
      {
        method: 'GET',
        path: '/api/plugins/media-manager/health',
        handler: 'handleHealthCheck',
        permissions: ['media:admin'],
        description: 'Get plugin health status',
      },

      // UI endpoints
      {
        method: 'GET',
        path: '/media-manager',
        handler: 'handleMediaLibraryUI',
        permissions: ['media:read'],
        description: 'Media library interface',
      },
    ];
  }

  /**
   * Define plugin permissions
   */
  static getPermissions(): PluginPermission[] {
    return [
      {
        resource: 'media',
        actions: ['read', 'create', 'update', 'delete', 'upload', 'process', 'analytics', 'admin'],
        description: 'Media file and folder management permissions',
      },
      {
        resource: 'media_collections',
        actions: ['read', 'create', 'update', 'delete'],
        description: 'Media collection management permissions',
      },
      {
        resource: 'media_transformations',
        actions: ['read', 'create'],
        description: 'Media transformation permissions',
      },
    ];
  }
}

export default MediaManagerPlugin;
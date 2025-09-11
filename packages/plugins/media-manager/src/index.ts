// Main plugin export
export { MediaManagerPlugin as default } from './media-manager-plugin';
export { MediaManagerPlugin } from './media-manager-plugin';

// Services
export { MediaService } from './services/media-service';

// Storage providers
export { StorageManager } from './storage/storage-manager';
export { S3StorageProvider } from './storage/s3-provider';
export { LocalStorageProvider } from './storage/local-provider';
export type {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  AnyStorageConfig,
} from './storage/storage-provider';

// Processing services
export { ImageProcessor } from './processing/image-processor';
export { VideoProcessor } from './processing/video-processor';
export type {
  ImageTransformOptions,
  ImageMetadata,
  VideoTransformOptions,
  VideoMetadata,
  ThumbnailOptions,
} from './processing/image-processor';

// Security and validation
export { FileValidator } from './security/file-validator';
export type {
  FileValidationResult,
  SecurityScanResult,
  ValidationConfig,
} from './security/file-validator';

// Database schema
export type {
  MediaFile,
  MediaFolder,
  MediaUsage,
  MediaCollection,
  MediaTransformation,
  MediaAuditLog,
  NewMediaFile,
  NewMediaFolder,
} from './schema/media';

// API and integration
export {
  MediaManagerPluginAPI,
  MediaManagerHelpers,
  MediaManagerEvents,
  createMediaManagerIntegration,
} from './api/plugin-api';
export type {
  MediaManagerAPI,
  MediaManagerIntegration,
} from './api/plugin-api';

// Components
export { default as MediaLibrary } from './components/MediaLibraryNew';
export type { MediaLibraryProps } from './components/MediaLibraryNew';

// Route handlers
export * from './handlers/upload-handlers';
export * from './handlers/file-handlers';

// Configuration types
export type { MediaManagerConfig } from './media-manager-plugin';
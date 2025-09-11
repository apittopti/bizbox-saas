import { z } from 'zod';

export interface StorageUploadOptions {
  tenantId: string;
  filename: string;
  mimeType: string;
  isPublic?: boolean;
  folder?: string;
  metadata?: Record<string, any>;
  generateThumbnail?: boolean;
  optimizeImage?: boolean;
}

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  size?: number;
  checksum?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface StorageDeleteResult {
  success: boolean;
  error?: string;
}

export interface StorageGetUrlOptions {
  expiresIn?: number; // in seconds
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface StorageListOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface StorageListResult {
  objects: {
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
  }[];
  isTruncated: boolean;
  continuationToken?: string;
}

export interface StorageProvider {
  readonly type: string;
  readonly name: string;

  /**
   * Upload a file to storage
   */
  upload(
    buffer: Buffer,
    options: StorageUploadOptions
  ): Promise<StorageUploadResult>;

  /**
   * Delete a file from storage
   */
  delete(tenantId: string, filepath: string): Promise<StorageDeleteResult>;

  /**
   * Get a public URL for a file
   */
  getPublicUrl(tenantId: string, filepath: string): string;

  /**
   * Get a signed URL for private file access
   */
  getSignedUrl(
    tenantId: string,
    filepath: string,
    options?: StorageGetUrlOptions
  ): Promise<string>;

  /**
   * List objects in storage
   */
  listObjects(
    tenantId: string,
    options?: StorageListOptions
  ): Promise<StorageListResult>;

  /**
   * Check if a file exists
   */
  exists(tenantId: string, filepath: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getMetadata(tenantId: string, filepath: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
    metadata?: Record<string, any>;
  }>;

  /**
   * Copy a file within storage
   */
  copy(
    sourceTenantId: string,
    sourceFilepath: string,
    destTenantId: string,
    destFilepath: string
  ): Promise<StorageUploadResult>;

  /**
   * Move a file within storage
   */
  move(
    sourceTenantId: string,
    sourceFilepath: string,
    destTenantId: string,
    destFilepath: string
  ): Promise<StorageUploadResult>;

  /**
   * Get storage usage statistics
   */
  getUsageStats(tenantId: string): Promise<{
    totalSize: number;
    totalFiles: number;
    byFolder: Record<string, { size: number; files: number }>;
  }>;

  /**
   * Health check for the storage provider
   */
  healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }>;
}

// Configuration schemas
export const storageConfigSchema = z.object({
  type: z.enum(['s3', 'r2', 'local', 'gcs', 'azure']),
  name: z.string(),
  enabled: z.boolean().default(true),
  priority: z.number().default(1),
});

export const s3ConfigSchema = storageConfigSchema.extend({
  type: z.literal('s3'),
  config: z.object({
    region: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    bucket: z.string(),
    endpoint: z.string().optional(),
    forcePathStyle: z.boolean().default(false),
    cdnUrl: z.string().optional(),
    signedUrlExpiry: z.number().default(3600), // 1 hour
  }),
});

export const r2ConfigSchema = storageConfigSchema.extend({
  type: z.literal('r2'),
  config: z.object({
    accountId: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    bucket: z.string(),
    endpoint: z.string(),
    cdnUrl: z.string().optional(),
    signedUrlExpiry: z.number().default(3600),
  }),
});

export const localConfigSchema = storageConfigSchema.extend({
  type: z.literal('local'),
  config: z.object({
    basePath: z.string(),
    baseUrl: z.string(),
    createDirectories: z.boolean().default(true),
  }),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type S3StorageConfig = z.infer<typeof s3ConfigSchema>;
export type R2StorageConfig = z.infer<typeof r2ConfigSchema>;
export type LocalStorageConfig = z.infer<typeof localConfigSchema>;

export type AnyStorageConfig = S3StorageConfig | R2StorageConfig | LocalStorageConfig;

// Storage provider factory interface
export interface StorageProviderFactory {
  create(config: AnyStorageConfig): StorageProvider;
  supports(type: string): boolean;
}
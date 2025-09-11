import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import crypto from 'crypto';
import {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDeleteResult,
  StorageGetUrlOptions,
  StorageListOptions,
  StorageListResult,
  S3StorageConfig,
} from './storage-provider';

export class S3StorageProvider implements StorageProvider {
  public readonly type = 's3';
  public readonly name: string;
  private client: S3Client;
  private config: S3StorageConfig['config'];

  constructor(config: S3StorageConfig) {
    this.name = config.name;
    this.config = config.config;
    
    this.client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
    });
  }

  async upload(
    buffer: Buffer,
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const key = this.buildKey(options.tenantId, options.folder, options.filename);
      const checksum = this.generateChecksum(buffer);

      const putCommand = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.mimeType,
        Metadata: {
          ...options.metadata,
          tenantId: options.tenantId,
          originalFilename: options.filename,
          checksum,
        },
        ServerSideEncryption: 'AES256',
        CacheControl: options.isPublic ? 'public, max-age=31536000' : 'private, max-age=3600',
      });

      if (options.isPublic) {
        putCommand.input.ACL = 'public-read';
      }

      await this.client.send(putCommand);

      const url = options.isPublic
        ? this.getPublicUrl(options.tenantId, this.getFilePath(options.folder, options.filename))
        : await this.getSignedUrl(options.tenantId, this.getFilePath(options.folder, options.filename));

      return {
        success: true,
        url,
        size: buffer.length,
        checksum,
        metadata: options.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async delete(tenantId: string, filepath: string): Promise<StorageDeleteResult> {
    try {
      const key = this.buildKey(tenantId, undefined, filepath);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.client.send(deleteCommand);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  getPublicUrl(tenantId: string, filepath: string): string {
    const key = this.buildKey(tenantId, undefined, filepath);
    
    if (this.config.cdnUrl) {
      return `${this.config.cdnUrl}/${key}`;
    }

    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.config.bucket}/${key}`;
    }

    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(
    tenantId: string,
    filepath: string,
    options: StorageGetUrlOptions = {}
  ): Promise<string> {
    const key = this.buildKey(tenantId, undefined, filepath);

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ResponseContentType: options.responseContentType,
      ResponseContentDisposition: options.responseContentDisposition,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: options.expiresIn || this.config.signedUrlExpiry,
    });
  }

  async listObjects(
    tenantId: string,
    options: StorageListOptions = {}
  ): Promise<StorageListResult> {
    const prefix = this.buildKey(tenantId, undefined, options.prefix || '');

    const command = new ListObjectsV2Command({
      Bucket: this.config.bucket,
      Prefix: prefix,
      MaxKeys: options.maxKeys || 1000,
      ContinuationToken: options.continuationToken,
    });

    const response = await this.client.send(command);

    return {
      objects: (response.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size!,
        lastModified: obj.LastModified!,
        etag: obj.ETag!,
      })),
      isTruncated: response.IsTruncated || false,
      continuationToken: response.NextContinuationToken,
    };
  }

  async exists(tenantId: string, filepath: string): Promise<boolean> {
    try {
      const key = this.buildKey(tenantId, undefined, filepath);

      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(tenantId: string, filepath: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
    metadata?: Record<string, any>;
  }> {
    const key = this.buildKey(tenantId, undefined, filepath);

    const command = new HeadObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      size: response.ContentLength!,
      contentType: response.ContentType!,
      lastModified: response.LastModified!,
      etag: response.ETag!,
      metadata: response.Metadata,
    };
  }

  async copy(
    sourceTenantId: string,
    sourceFilepath: string,
    destTenantId: string,
    destFilepath: string
  ): Promise<StorageUploadResult> {
    try {
      const sourceKey = this.buildKey(sourceTenantId, undefined, sourceFilepath);
      const destKey = this.buildKey(destTenantId, undefined, destFilepath);

      const command = new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${sourceKey}`,
        Key: destKey,
        ServerSideEncryption: 'AES256',
      });

      await this.client.send(command);

      return {
        success: true,
        url: this.getPublicUrl(destTenantId, destFilepath),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Copy failed',
      };
    }
  }

  async move(
    sourceTenantId: string,
    sourceFilepath: string,
    destTenantId: string,
    destFilepath: string
  ): Promise<StorageUploadResult> {
    try {
      // First copy the file
      const copyResult = await this.copy(sourceTenantId, sourceFilepath, destTenantId, destFilepath);
      
      if (!copyResult.success) {
        return copyResult;
      }

      // Then delete the original
      await this.delete(sourceTenantId, sourceFilepath);

      return copyResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Move failed',
      };
    }
  }

  async getUsageStats(tenantId: string): Promise<{
    totalSize: number;
    totalFiles: number;
    byFolder: Record<string, { size: number; files: number }>;
  }> {
    const stats = {
      totalSize: 0,
      totalFiles: 0,
      byFolder: {} as Record<string, { size: number; files: number }>,
    };

    let continuationToken: string | undefined;

    do {
      const listResult = await this.listObjects(tenantId, {
        maxKeys: 1000,
        continuationToken,
      });

      for (const obj of listResult.objects) {
        stats.totalSize += obj.size;
        stats.totalFiles++;

        // Extract folder from key
        const relativePath = obj.key.replace(`tenants/${tenantId}/`, '');
        const folder = path.dirname(relativePath);
        
        if (!stats.byFolder[folder]) {
          stats.byFolder[folder] = { size: 0, files: 0 };
        }
        
        stats.byFolder[folder].size += obj.size;
        stats.byFolder[folder].files++;
      }

      continuationToken = listResult.continuationToken;
    } while (continuationToken);

    return stats;
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        MaxKeys: 1,
      });

      await this.client.send(command);
      
      const latency = Date.now() - startTime;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private buildKey(tenantId: string, folder: string | undefined, filename: string): string {
    const parts = ['tenants', tenantId];
    
    if (folder) {
      parts.push(folder);
    }
    
    parts.push(filename);
    return parts.join('/');
  }

  private getFilePath(folder: string | undefined, filename: string): string {
    if (folder) {
      return `${folder}/${filename}`;
    }
    return filename;
  }

  private generateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { stat, mkdir } from 'fs/promises';
import {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDeleteResult,
  StorageGetUrlOptions,
  StorageListOptions,
  StorageListResult,
  LocalStorageConfig,
} from './storage-provider';

export class LocalStorageProvider implements StorageProvider {
  public readonly type = 'local';
  public readonly name: string;
  private config: LocalStorageConfig['config'];

  constructor(config: LocalStorageConfig) {
    this.name = config.name;
    this.config = config.config;
  }

  async upload(
    buffer: Buffer,
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const filePath = this.buildPath(options.tenantId, options.folder, options.filename);
      const checksum = this.generateChecksum(buffer);

      if (this.config.createDirectories) {
        const dir = path.dirname(filePath);
        await mkdir(dir, { recursive: true });
      }

      await fs.writeFile(filePath, buffer);

      // Create metadata file
      const metadataPath = filePath + '.meta';
      const metadata = {
        ...options.metadata,
        tenantId: options.tenantId,
        originalFilename: options.filename,
        mimeType: options.mimeType,
        checksum,
        uploadedAt: new Date().toISOString(),
        size: buffer.length,
      };
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      const relativePath = this.getRelativePath(options.tenantId, options.folder, options.filename);
      const url = `${this.config.baseUrl}/${relativePath}`;

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
      const fullPath = this.buildPath(tenantId, undefined, filepath);
      const metadataPath = fullPath + '.meta';

      // Delete the file
      try {
        await fs.unlink(fullPath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Delete metadata file
      try {
        await fs.unlink(metadataPath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  getPublicUrl(tenantId: string, filepath: string): string {
    const relativePath = this.getRelativePath(tenantId, undefined, filepath);
    return `${this.config.baseUrl}/${relativePath}`;
  }

  async getSignedUrl(
    tenantId: string,
    filepath: string,
    options: StorageGetUrlOptions = {}
  ): Promise<string> {
    // For local storage, we'll generate a temporary token
    const relativePath = this.getRelativePath(tenantId, undefined, filepath);
    const token = this.generateTempToken(relativePath, options.expiresIn || 3600);
    return `${this.config.baseUrl}/${relativePath}?token=${token}`;
  }

  async listObjects(
    tenantId: string,
    options: StorageListOptions = {}
  ): Promise<StorageListResult> {
    const tenantDir = this.buildPath(tenantId, undefined, '');
    const prefix = options.prefix || '';
    const objects: StorageListResult['objects'] = [];

    try {
      await this.scanDirectory(tenantDir, prefix, objects, options.maxKeys || 1000);
      
      return {
        objects: objects.slice(0, options.maxKeys || 1000),
        isTruncated: objects.length > (options.maxKeys || 1000),
      };
    } catch (error) {
      return {
        objects: [],
        isTruncated: false,
      };
    }
  }

  async exists(tenantId: string, filepath: string): Promise<boolean> {
    try {
      const fullPath = this.buildPath(tenantId, undefined, filepath);
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(tenantId: string, filepath: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
    metadata?: Record<string, any>;
  }> {
    const fullPath = this.buildPath(tenantId, undefined, filepath);
    const metadataPath = fullPath + '.meta';

    const [fileStats, metadataContent] = await Promise.all([
      stat(fullPath),
      this.readMetadataFile(metadataPath),
    ]);

    return {
      size: fileStats.size,
      contentType: metadataContent.mimeType || 'application/octet-stream',
      lastModified: fileStats.mtime,
      etag: metadataContent.checksum || '',
      metadata: metadataContent,
    };
  }

  async copy(
    sourceTenantId: string,
    sourceFilepath: string,
    destTenantId: string,
    destFilepath: string
  ): Promise<StorageUploadResult> {
    try {
      const sourcePath = this.buildPath(sourceTenantId, undefined, sourceFilepath);
      const destPath = this.buildPath(destTenantId, undefined, destFilepath);
      const sourceMetaPath = sourcePath + '.meta';
      const destMetaPath = destPath + '.meta';

      // Create destination directory if needed
      if (this.config.createDirectories) {
        const dir = path.dirname(destPath);
        await mkdir(dir, { recursive: true });
      }

      // Copy file and metadata
      await Promise.all([
        fs.copyFile(sourcePath, destPath),
        fs.copyFile(sourceMetaPath, destMetaPath).catch(() => {
          // Ignore if metadata file doesn't exist
        }),
      ]);

      const relativePath = this.getRelativePath(destTenantId, undefined, destFilepath);
      const url = `${this.config.baseUrl}/${relativePath}`;

      return {
        success: true,
        url,
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
      const copyResult = await this.copy(sourceTenantId, sourceFilepath, destTenantId, destFilepath);
      
      if (!copyResult.success) {
        return copyResult;
      }

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

    const tenantDir = this.buildPath(tenantId, undefined, '');

    try {
      await this.calculateStats(tenantDir, tenantDir, stats);
    } catch {
      // Ignore errors, return empty stats
    }

    return stats;
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Test write access
      const testPath = path.join(this.config.basePath, 'health-check.tmp');
      await fs.writeFile(testPath, 'test');
      await fs.unlink(testPath);
      
      const latency = Date.now() - startTime;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private buildPath(tenantId: string, folder: string | undefined, filename: string): string {
    const parts = [this.config.basePath, 'tenants', tenantId];
    
    if (folder) {
      parts.push(folder);
    }
    
    if (filename) {
      parts.push(filename);
    }
    
    return path.join(...parts);
  }

  private getRelativePath(tenantId: string, folder: string | undefined, filename: string): string {
    const parts = ['tenants', tenantId];
    
    if (folder) {
      parts.push(folder);
    }
    
    if (filename) {
      parts.push(filename);
    }
    
    return parts.join('/');
  }

  private generateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private generateTempToken(filepath: string, expiresIn: number): string {
    const payload = {
      path: filepath,
      exp: Date.now() + (expiresIn * 1000),
    };
    
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', 'local-storage-secret') // In production, use a proper secret
      .update(token)
      .digest('hex');
    
    return `${token}.${signature}`;
  }

  private async readMetadataFile(metadataPath: string): Promise<Record<string, any>> {
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async scanDirectory(
    dirPath: string,
    prefix: string,
    objects: StorageListResult['objects'],
    maxKeys: number,
    basePath: string = dirPath
  ): Promise<void> {
    if (objects.length >= maxKeys) {
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (objects.length >= maxKeys) {
          break;
        }

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, prefix, objects, maxKeys, basePath);
        } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
          if (!prefix || relativePath.startsWith(prefix)) {
            const stats = await stat(fullPath);
            objects.push({
              key: relativePath,
              size: stats.size,
              lastModified: stats.mtime,
              etag: stats.mtime.getTime().toString(),
            });
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  private async calculateStats(
    dirPath: string,
    basePath: string,
    stats: { totalSize: number; totalFiles: number; byFolder: Record<string, { size: number; files: number }> }
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.calculateStats(fullPath, basePath, stats);
        } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
          const fileStats = await stat(fullPath);
          const relativePath = path.relative(basePath, fullPath);
          const folder = path.dirname(relativePath);

          stats.totalSize += fileStats.size;
          stats.totalFiles++;

          if (!stats.byFolder[folder]) {
            stats.byFolder[folder] = { size: 0, files: 0 };
          }

          stats.byFolder[folder].size += fileStats.size;
          stats.byFolder[folder].files++;
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }
}
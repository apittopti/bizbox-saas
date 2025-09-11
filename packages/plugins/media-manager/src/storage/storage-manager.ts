import {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDeleteResult,
  StorageGetUrlOptions,
  StorageListOptions,
  StorageListResult,
  AnyStorageConfig,
  StorageProviderFactory,
} from './storage-provider';
import { S3StorageProvider } from './s3-provider';
import { LocalStorageProvider } from './local-provider';

export class StorageProviderFactoryImpl implements StorageProviderFactory {
  create(config: AnyStorageConfig): StorageProvider {
    switch (config.type) {
      case 's3':
      case 'r2':
        return new S3StorageProvider(config);
      case 'local':
        return new LocalStorageProvider(config);
      default:
        throw new Error(`Unsupported storage provider type: ${(config as any).type}`);
    }
  }

  supports(type: string): boolean {
    return ['s3', 'r2', 'local'].includes(type);
  }
}

export interface StorageManagerConfig {
  providers: AnyStorageConfig[];
  fallbackProvider?: string;
  replicationEnabled?: boolean;
}

/**
 * Storage manager that handles multiple storage providers with failover
 */
export class StorageManager {
  private providers: Map<string, StorageProvider> = new Map();
  private primaryProvider: StorageProvider | null = null;
  private fallbackProvider: StorageProvider | null = null;
  private factory: StorageProviderFactory;

  constructor(config: StorageManagerConfig, factory?: StorageProviderFactory) {
    this.factory = factory || new StorageProviderFactoryImpl();
    this.initializeProviders(config);
  }

  private initializeProviders(config: StorageManagerConfig): void {
    // Sort providers by priority (higher priority first)
    const sortedConfigs = config.providers
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const providerConfig of sortedConfigs) {
      try {
        const provider = this.factory.create(providerConfig);
        this.providers.set(providerConfig.name, provider);

        // Set primary provider (highest priority enabled provider)
        if (!this.primaryProvider) {
          this.primaryProvider = provider;
        }

        // Set fallback provider if specified
        if (config.fallbackProvider === providerConfig.name) {
          this.fallbackProvider = provider;
        }
      } catch (error) {
        console.error(`Failed to initialize storage provider ${providerConfig.name}:`, error);
      }
    }

    if (!this.primaryProvider) {
      throw new Error('No storage providers could be initialized');
    }

    // Set fallback to second provider if not explicitly set
    if (!this.fallbackProvider && this.providers.size > 1) {
      const providers = Array.from(this.providers.values());
      this.fallbackProvider = providers[1];
    }
  }

  /**
   * Upload a file with automatic fallback
   */
  async upload(
    buffer: Buffer,
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    const result = await this.executeWithFallback(
      provider => provider.upload(buffer, options)
    );

    // TODO: Implement replication to other providers if enabled
    
    return result;
  }

  /**
   * Delete a file from all providers
   */
  async delete(tenantId: string, filepath: string): Promise<StorageDeleteResult> {
    const results = await Promise.allSettled(
      Array.from(this.providers.values()).map(provider =>
        provider.delete(tenantId, filepath)
      )
    );

    // Return success if any provider succeeded
    const successResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
    
    if (successResults.length > 0) {
      return { success: true };
    }

    // Return the first error if all failed
    const firstError = results.find(r => r.status === 'fulfilled' && !r.value.success);
    if (firstError && firstError.status === 'fulfilled') {
      return firstError.value;
    }

    return {
      success: false,
      error: 'Delete failed on all providers',
    };
  }

  /**
   * Get public URL from primary provider
   */
  getPublicUrl(tenantId: string, filepath: string): string {
    if (!this.primaryProvider) {
      throw new Error('No primary provider available');
    }
    return this.primaryProvider.getPublicUrl(tenantId, filepath);
  }

  /**
   * Get signed URL with fallback
   */
  async getSignedUrl(
    tenantId: string,
    filepath: string,
    options?: StorageGetUrlOptions
  ): Promise<string> {
    return this.executeWithFallback(
      provider => provider.getSignedUrl(tenantId, filepath, options)
    );
  }

  /**
   * List objects from primary provider
   */
  async listObjects(
    tenantId: string,
    options?: StorageListOptions
  ): Promise<StorageListResult> {
    return this.executeWithFallback(
      provider => provider.listObjects(tenantId, options)
    );
  }

  /**
   * Check if file exists on any provider
   */
  async exists(tenantId: string, filepath: string): Promise<boolean> {
    const results = await Promise.allSettled(
      Array.from(this.providers.values()).map(provider =>
        provider.exists(tenantId, filepath)
      )
    );

    // Return true if any provider has the file
    return results.some(r => r.status === 'fulfilled' && r.value === true);
  }

  /**
   * Get file metadata with fallback
   */
  async getMetadata(tenantId: string, filepath: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
    metadata?: Record<string, any>;
  }> {
    return this.executeWithFallback(
      provider => provider.getMetadata(tenantId, filepath)
    );
  }

  /**
   * Copy file within storage
   */
  async copy(
    sourceTenantId: string,
    sourceFilepath: string,
    destTenantId: string,
    destFilepath: string
  ): Promise<StorageUploadResult> {
    return this.executeWithFallback(
      provider => provider.copy(sourceTenantId, sourceFilepath, destTenantId, destFilepath)
    );
  }

  /**
   * Move file within storage
   */
  async move(
    sourceTenantId: string,
    sourceFilepath: string,
    destTenantId: string,
    destFilepath: string
  ): Promise<StorageUploadResult> {
    return this.executeWithFallback(
      provider => provider.move(sourceTenantId, sourceFilepath, destTenantId, destFilepath)
    );
  }

  /**
   * Get usage statistics from primary provider
   */
  async getUsageStats(tenantId: string): Promise<{
    totalSize: number;
    totalFiles: number;
    byFolder: Record<string, { size: number; files: number }>;
  }> {
    return this.executeWithFallback(
      provider => provider.getUsageStats(tenantId)
    );
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<{
    overall: boolean;
    providers: Record<string, {
      healthy: boolean;
      latency?: number;
      error?: string;
    }>;
  }> {
    const results: Record<string, any> = {};
    let overallHealthy = false;

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
        if (results[name].healthy) {
          overallHealthy = true;
        }
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Health check failed',
        };
      }
    }

    return {
      overall: overallHealthy,
      providers: results,
    };
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): StorageProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get primary provider
   */
  getPrimaryProvider(): StorageProvider | null {
    return this.primaryProvider;
  }

  /**
   * Get all providers
   */
  getAllProviders(): StorageProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Execute operation with automatic fallback
   */
  private async executeWithFallback<T>(
    operation: (provider: StorageProvider) => Promise<T>
  ): Promise<T> {
    // Try primary provider first
    if (this.primaryProvider) {
      try {
        return await operation(this.primaryProvider);
      } catch (error) {
        console.warn('Primary storage provider failed:', error);
      }
    }

    // Try fallback provider
    if (this.fallbackProvider) {
      try {
        return await operation(this.fallbackProvider);
      } catch (error) {
        console.warn('Fallback storage provider failed:', error);
      }
    }

    // Try any remaining providers
    for (const provider of this.providers.values()) {
      if (provider !== this.primaryProvider && provider !== this.fallbackProvider) {
        try {
          return await operation(provider);
        } catch (error) {
          console.warn(`Storage provider ${provider.name} failed:`, error);
        }
      }
    }

    throw new Error('All storage providers failed');
  }
}
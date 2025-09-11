import { ApiConfig, ApiError, CacheEntry } from '../types';

export class ApiClient {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TIMEOUT = 10000;
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private config: ApiConfig) {}

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = `GET:${url}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const response = await this.makeRequest(url, {
      method: 'GET',
      ...options
    });

    const data = await response.json();

    // Cache successful GET requests
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_CACHE_TTL
    });

    return data;
  }

  async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });

    return response.json();
  }

  async put<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });

    return response.json();
  }

  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await this.makeRequest(url, {
      method: 'DELETE',
      ...options
    });

    return response.json();
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(), 
      this.config.timeout || this.DEFAULT_TIMEOUT
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tenant-ID': this.config.tenantId,
          'X-Widget-Origin': window.location.origin,
          ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey }),
          ...options.headers
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ApiError(
          errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      throw new ApiError(`Network error: ${error.message}`, 0);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Preload data for better performance
  async preload(endpoints: string[]): Promise<void> {
    const promises = endpoints.map(endpoint => 
      this.get(endpoint).catch(error => 
        console.warn(`Failed to preload ${endpoint}:`, error)
      )
    );
    
    await Promise.allSettled(promises);
  }
}
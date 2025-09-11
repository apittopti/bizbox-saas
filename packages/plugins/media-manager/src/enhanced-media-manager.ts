import { EventEmitter } from 'events'
import { createHash } from 'crypto'

export interface MediaFile {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  uploadedAt: Date
  uploadedBy: string
  tenantId: string
  folderId?: string
  tags: string[]
  metadata: MediaMetadata
  usage: MediaUsage[]
  status: 'uploading' | 'processing' | 'ready' | 'error'
  checksum: string
  versions: MediaVersion[]
}

export interface MediaMetadata {
  width?: number
  height?: number
  duration?: number // for videos
  format?: string
  colorSpace?: string
  hasAlpha?: boolean
  exif?: Record<string, any>
  customFields?: Record<string, any>
}

export interface MediaVersion {
  id: string
  type: 'thumbnail' | 'small' | 'medium' | 'large' | 'webp' | 'avif'
  url: string
  width?: number
  height?: number
  size: number
  format: string
}

export interface MediaUsage {
  id: string
  type: 'website' | 'email' | 'social' | 'print'
  context: string // page ID, email ID, etc.
  usedAt: Date
}

export interface MediaFolder {
  id: string
  name: string
  parentId?: string
  tenantId: string
  createdAt: Date
  createdBy: string
  description?: string
  isPublic: boolean
  permissions: FolderPermission[]
  metadata: {
    fileCount: number
    totalSize: number
    lastModified: Date
  }
}

export interface FolderPermission {
  userId: string
  role: 'viewer' | 'editor' | 'admin'
  grantedAt: Date
}

export interface UploadOptions {
  folderId?: string
  tags?: string[]
  metadata?: Record<string, any>
  generateVersions?: boolean
  optimizeImages?: boolean
  scanForMalware?: boolean
  watermark?: {
    text?: string
    image?: string
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity: number
  }
}

export interface SearchOptions {
  query?: string
  folderId?: string
  tags?: string[]
  mimeType?: string
  dateRange?: {
    from: Date
    to: Date
  }
  sizeRange?: {
    min: number
    max: number
  }
  sortBy?: 'name' | 'date' | 'size' | 'usage'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface MediaAnalytics {
  totalFiles: number
  totalSize: number
  filesByType: Record<string, number>
  storageUsage: {
    used: number
    limit: number
    percentage: number
  }
  topTags: Array<{
    tag: string
    count: number
  }>
  recentUploads: MediaFile[]
  mostUsedFiles: Array<{
    file: MediaFile
    usageCount: number
  }>
}

interface UploadProgress {
  stage: 'uploading' | 'scanning' | 'processing' | 'optimizing' | 'complete' | 'error'
  progress: number
  message: string
}

export class EnhancedMediaManager extends EventEmitter {
  private files: Map<string, MediaFile> = new Map()
  private folders: Map<string, MediaFolder> = new Map()
  private uploadQueue: Map<string, UploadProgress> = new Map()
  private allowedMimeTypes: Set<string> = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ])
  private maxFileSize = 100 * 1024 * 1024 // 100MB
  private storageLimit = 10 * 1024 * 1024 * 1024 // 10GB per tenant

  constructor() {
    super()
    this.initializeDefaultFolders()
  }

  /**
   * Upload single file with comprehensive processing
   */
  async uploadFile(
    tenantId: string,
    userId: string,
    file: File | Buffer,
    originalName: string,
    options: UploadOptions = {}
  ): Promise<MediaFile> {
    const fileId = this.generateId()
    
    try {
      // Validate file
      await this.validateFile(tenantId, file, originalName)
      
      // Start upload progress tracking
      this.updateUploadProgress(fileId, {
        stage: 'uploading',
        progress: 0,
        message: 'Starting upload...'
      })

      // Generate checksum
      const checksum = await this.generateChecksum(file)
      
      // Check for duplicates
      const existingFile = await this.findDuplicateFile(tenantId, checksum)
      if (existingFile) {
        this.emit('file:duplicate_found', { fileId, existingFile })
        return existingFile
      }

      // Scan for malware if enabled
      if (options.scanForMalware) {
        this.updateUploadProgress(fileId, {
          stage: 'scanning',
          progress: 20,
          message: 'Scanning for malware...'
        })
        await this.scanForMalware(file)
      }

      // Extract metadata
      this.updateUploadProgress(fileId, {
        stage: 'processing',
        progress: 40,
        message: 'Processing file...'
      })
      
      const metadata = await this.extractMetadata(file, originalName)
      const mimeType = this.detectMimeType(file, originalName)
      
      // Upload to storage
      const filename = this.generateFilename(originalName, fileId)
      const url = await this.uploadToStorage(tenantId, file, filename)
      
      this.updateUploadProgress(fileId, {
        stage: 'optimizing',
        progress: 60,
        message: 'Optimizing and generating versions...'
      })

      // Generate versions and thumbnails
      const versions = await this.generateVersions(file, mimeType, options)
      
      // Apply watermark if specified
      if (options.watermark && mimeType.startsWith('image/')) {
        await this.applyWatermark(file, options.watermark)
      }

      // Create media file record
      const mediaFile: MediaFile = {
        id: fileId,
        filename,
        originalName,
        mimeType,
        size: this.getFileSize(file),
        url,
        thumbnailUrl: versions.find(v => v.type === 'thumbnail')?.url,
        uploadedAt: new Date(),
        uploadedBy: userId,
        tenantId,
        folderId: options.folderId,
        tags: options.tags || [],
        metadata,
        usage: [],
        status: 'ready',
        checksum,
        versions
      }

      this.files.set(fileId, mediaFile)
      
      // Update folder metadata
      if (options.folderId) {
        await this.updateFolderMetadata(options.folderId)
      }

      this.updateUploadProgress(fileId, {
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      })

      this.emit('file:uploaded', mediaFile)
      return mediaFile

    } catch (error) {
      this.updateUploadProgress(fileId, {
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed'
      })
      
      this.emit('file:upload_failed', { fileId, error })
      throw error
    }
  }

  /**
   * Upload multiple files with batch processing
   */
  async uploadFiles(
    tenantId: string,
    userId: string,
    files: Array<{ file: File | Buffer; name: string }>,
    options: UploadOptions = {}
  ): Promise<{
    successful: MediaFile[]
    failed: Array<{ name: string; error: string }>
  }> {
    const successful: MediaFile[] = []
    const failed: Array<{ name: string; error: string }> = []

    // Process files in batches to avoid overwhelming the system
    const batchSize = 5
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async ({ file, name }) => {
        try {
          const result = await this.uploadFile(tenantId, userId, file, name, options)
          successful.push(result)
        } catch (error) {
          failed.push({
            name,
            error: error instanceof Error ? error.message : 'Upload failed'
          })
        }
      })

      await Promise.all(batchPromises)
    }

    this.emit('files:batch_uploaded', { successful, failed })
    return { successful, failed }
  }

  /**
   * Search files with advanced filtering
   */
  async searchFiles(
    tenantId: string,
    options: SearchOptions = {}
  ): Promise<{
    files: MediaFile[]
    total: number
    facets: {
      mimeTypes: Record<string, number>
      tags: Record<string, number>
      folders: Record<string, number>
    }
  }> {
    let files = Array.from(this.files.values())
      .filter(file => file.tenantId === tenantId)

    // Apply filters
    if (options.query) {
      const query = options.query.toLowerCase()
      files = files.filter(file =>
        file.originalName.toLowerCase().includes(query) ||
        file.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    if (options.folderId) {
      files = files.filter(file => file.folderId === options.folderId)
    }

    if (options.tags?.length) {
      files = files.filter(file =>
        options.tags!.some(tag => file.tags.includes(tag))
      )
    }

    if (options.mimeType) {
      files = files.filter(file => file.mimeType.startsWith(options.mimeType!))
    }

    if (options.dateRange) {
      files = files.filter(file =>
        file.uploadedAt >= options.dateRange!.from &&
        file.uploadedAt <= options.dateRange!.to
      )
    }

    if (options.sizeRange) {
      files = files.filter(file =>
        file.size >= options.sizeRange!.min &&
        file.size <= options.sizeRange!.max
      )
    }

    // Calculate facets
    const facets = {
      mimeTypes: this.calculateFacets(files, 'mimeType'),
      tags: this.calculateTagFacets(files),
      folders: this.calculateFacets(files, 'folderId')
    }

    // Apply sorting
    files.sort((a, b) => {
      const order = options.sortOrder === 'desc' ? -1 : 1
      
      switch (options.sortBy) {
        case 'name':
          return a.originalName.localeCompare(b.originalName) * order
        case 'size':
          return (a.size - b.size) * order
        case 'usage':
          return (a.usage.length - b.usage.length) * order
        case 'date':
        default:
          return (a.uploadedAt.getTime() - b.uploadedAt.getTime()) * order
      }
    })

    const total = files.length

    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || 50
    files = files.slice(offset, offset + limit)

    return { files, total, facets }
  }

  /**
   * Get file by ID with usage tracking
   */
  async getFile(fileId: string, context?: string): Promise<MediaFile | null> {
    const file = this.files.get(fileId)
    if (!file) return null

    // Track usage if context provided
    if (context) {
      await this.trackUsage(fileId, context)
    }

    return file
  }

  /**
   * Update file metadata and tags
   */
  async updateFile(
    fileId: string,
    updates: {
      tags?: string[]
      metadata?: Record<string, any>
      folderId?: string
    }
  ): Promise<MediaFile | null> {
    const file = this.files.get(fileId)
    if (!file) return null

    if (updates.tags) {
      file.tags = updates.tags
    }

    if (updates.metadata) {
      file.metadata.customFields = {
        ...file.metadata.customFields,
        ...updates.metadata
      }
    }

    if (updates.folderId !== undefined) {
      const oldFolderId = file.folderId
      file.folderId = updates.folderId || undefined
      
      // Update folder metadata
      if (oldFolderId) {
        await this.updateFolderMetadata(oldFolderId)
      }
      if (updates.folderId) {
        await this.updateFolderMetadata(updates.folderId)
      }
    }

    this.emit('file:updated', file)
    return file
  }

  /**
   * Delete file and cleanup
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const file = this.files.get(fileId)
    if (!file) return false

    try {
      // Delete from storage
      await this.deleteFromStorage(file.url)
      
      // Delete versions
      for (const version of file.versions) {
        await this.deleteFromStorage(version.url)
      }

      // Remove from local storage
      this.files.delete(fileId)

      // Update folder metadata
      if (file.folderId) {
        await this.updateFolderMetadata(file.folderId)
      }

      this.emit('file:deleted', file)
      return true
    } catch (error) {
      console.error('Failed to delete file:', error)
      return false
    }
  }

  /**
   * Create folder with permissions
   */
  async createFolder(
    tenantId: string,
    userId: string,
    name: string,
    options: {
      parentId?: string
      description?: string
      isPublic?: boolean
    } = {}
  ): Promise<MediaFolder> {
    const folderId = this.generateId()
    
    const folder: MediaFolder = {
      id: folderId,
      name,
      parentId: options.parentId,
      tenantId,
      createdAt: new Date(),
      createdBy: userId,
      description: options.description,
      isPublic: options.isPublic || false,
      permissions: [{
        userId,
        role: 'admin',
        grantedAt: new Date()
      }],
      metadata: {
        fileCount: 0,
        totalSize: 0,
        lastModified: new Date()
      }
    }

    this.folders.set(folderId, folder)
    this.emit('folder:created', folder)
    return folder
  }

  /**
   * Get folder structure
   */
  async getFolderStructure(tenantId: string, parentId?: string): Promise<{
    folders: MediaFolder[]
    files: MediaFile[]
  }> {
    const folders = Array.from(this.folders.values())
      .filter(folder => 
        folder.tenantId === tenantId && 
        folder.parentId === parentId
      )
      .sort((a, b) => a.name.localeCompare(b.name))

    const files = Array.from(this.files.values())
      .filter(file => 
        file.tenantId === tenantId && 
        file.folderId === parentId
      )
      .sort((a, b) => a.originalName.localeCompare(b.originalName))

    return { folders, files }
  }

  /**
   * Get media analytics
   */
  async getAnalytics(tenantId: string): Promise<MediaAnalytics> {
    const tenantFiles = Array.from(this.files.values())
      .filter(file => file.tenantId === tenantId)

    const totalFiles = tenantFiles.length
    const totalSize = tenantFiles.reduce((sum, file) => sum + file.size, 0)

    const filesByType = tenantFiles.reduce((acc, file) => {
      const type = file.mimeType.split('/')[0]
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const tagCounts = tenantFiles.reduce((acc, file) => {
      file.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    const recentUploads = tenantFiles
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, 10)

    const mostUsedFiles = tenantFiles
      .map(file => ({ file, usageCount: file.usage.length }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)

    return {
      totalFiles,
      totalSize,
      filesByType,
      storageUsage: {
        used: totalSize,
        limit: this.storageLimit,
        percentage: Math.round((totalSize / this.storageLimit) * 100)
      },
      topTags,
      recentUploads,
      mostUsedFiles
    }
  }

  /**
   * Generate versions for different use cases
   */
  private async generateVersions(
    file: File | Buffer,
    mimeType: string,
    options: UploadOptions
  ): Promise<MediaVersion[]> {
    const versions: MediaVersion[] = []

    if (!mimeType.startsWith('image/') || !options.generateVersions) {
      return versions
    }

    // Mock version generation - in real implementation would use image processing library
    const sizes = [
      { type: 'thumbnail', width: 150, height: 150 },
      { type: 'small', width: 400, height: 400 },
      { type: 'medium', width: 800, height: 600 },
      { type: 'large', width: 1200, height: 900 }
    ]

    for (const size of sizes) {
      const versionId = this.generateId()
      const versionUrl = `/storage/versions/${versionId}_${size.type}.jpg`

      versions.push({
        id: versionId,
        type: size.type as any,
        url: versionUrl,
        width: size.width,
        height: size.height,
        size: Math.floor(this.getFileSize(file) * 0.7), // Mock smaller size
        format: 'jpeg'
      })
    }

    return versions
  }

  /**
   * Extract metadata from file
   */
  private async extractMetadata(file: File | Buffer, originalName: string): Promise<MediaMetadata> {
    const metadata: MediaMetadata = {}
    const mimeType = this.detectMimeType(file, originalName)
    
    if (mimeType.startsWith('image/')) {
      // Mock image metadata - in real implementation would use image processing library
      metadata.width = 1920
      metadata.height = 1080
      metadata.format = mimeType.split('/')[1]
      metadata.colorSpace = 'sRGB'
      metadata.hasAlpha = mimeType === 'image/png'
    }

    return metadata
  }

  /**
   * Validate file before upload
   */
  private async validateFile(tenantId: string, file: File | Buffer, originalName: string): Promise<void> {
    const size = this.getFileSize(file)
    const mimeType = this.detectMimeType(file, originalName)

    // Check file size
    if (size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`)
    }

    // Check mime type
    if (!this.allowedMimeTypes.has(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`)
    }

    // Check storage quota
    const analytics = await this.getAnalytics(tenantId)
    if (analytics.storageUsage.used + size > this.storageLimit) {
      throw new Error('Storage quota exceeded')
    }

    // Check filename
    if (originalName.length > 255) {
      throw new Error('Filename is too long')
    }

    // Check for malicious filenames
    if (/[<>:"/\\|?*]/.test(originalName)) {
      throw new Error('Filename contains invalid characters')
    }
  }

  /**
   * Scan file for malware (mock implementation)
   */
  private async scanForMalware(file: File | Buffer): Promise<void> {
    // Mock malware scan
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate random malware detection (very low probability)
    if (Math.random() < 0.001) {
      throw new Error('Malware detected in file')
    }
  }

  /**
   * Generate file checksum for duplicate detection
   */
  private async generateChecksum(file: File | Buffer): Promise<string> {
    const buffer = file instanceof File ? await file.arrayBuffer() : file
    return createHash('sha256').update(Buffer.from(buffer)).digest('hex')
  }

  /**
   * Find duplicate file by checksum
   */
  private async findDuplicateFile(tenantId: string, checksum: string): Promise<MediaFile | null> {
    for (const file of this.files.values()) {
      if (file.tenantId === tenantId && file.checksum === checksum) {
        return file
      }
    }
    return null
  }

  /**
   * Track file usage
   */
  private async trackUsage(fileId: string, context: string): Promise<void> {
    const file = this.files.get(fileId)
    if (!file) return

    // Check if usage already exists for this context
    const existingUsage = file.usage.find(usage => usage.context === context)
    if (existingUsage) {
      existingUsage.usedAt = new Date()
    } else {
      file.usage.push({
        id: this.generateId(),
        type: 'website',
        context,
        usedAt: new Date()
      })
    }

    this.emit('file:usage_tracked', { fileId, context })
  }

  /**
   * Update folder metadata
   */
  private async updateFolderMetadata(folderId: string): Promise<void> {
    const folder = this.folders.get(folderId)
    if (!folder) return

    const folderFiles = Array.from(this.files.values())
      .filter(file => file.folderId === folderId)

    folder.metadata.fileCount = folderFiles.length
    folder.metadata.totalSize = folderFiles.reduce((sum, file) => sum + file.size, 0)
    folder.metadata.lastModified = new Date()
  }

  /**
   * Calculate facets for search results
   */
  private calculateFacets(files: MediaFile[], field: keyof MediaFile): Record<string, number> {
    return files.reduce((acc, file) => {
      const value = String(file[field] || 'uncategorized')
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Calculate tag facets
   */
  private calculateTagFacets(files: MediaFile[]): Record<string, number> {
    return files.reduce((acc, file) => {
      file.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Utility methods
   */
  private getFileSize(file: File | Buffer): number {
    return file instanceof File ? file.size : file.length
  }

  private detectMimeType(file: File | Buffer, originalName: string): string {
    if (file instanceof File) {
      return file.type || this.getMimeTypeFromExtension(originalName)
    }
    return this.getMimeTypeFromExtension(originalName)
  }

  private getMimeTypeFromExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'zip': 'application/zip'
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  private generateFilename(originalName: string, fileId: string): string {
    const ext = originalName.split('.').pop()
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_')
    return `${fileId}_${safeName}.${ext}`
  }

  private async applyWatermark(file: File | Buffer, watermark: any): Promise<void> {
    // Mock watermark application
    console.log('Applying watermark:', watermark)
  }

  private async uploadToStorage(tenantId: string, file: File | Buffer, filename: string): Promise<string> {
    // Mock upload to cloud storage
    return `/storage/${tenantId}/${filename}`
  }

  private async deleteFromStorage(url: string): Promise<void> {
    // Mock deletion from cloud storage
    console.log('Deleting from storage:', url)
  }

  private updateUploadProgress(fileId: string, progress: UploadProgress): void {
    this.uploadQueue.set(fileId, progress)
    this.emit('upload:progress', { fileId, progress })
  }

  private initializeDefaultFolders(): void {
    // Initialize default folder structure
    console.log('Initializing default media folders')
  }

  private generateId(): string {
    return 'media_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }
}

export const enhancedMediaManager = new EnhancedMediaManager()
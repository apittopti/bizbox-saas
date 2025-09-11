import { MediaFile } from '@bizbox/media-manager'

export interface ImageOptimization {
  id: string
  originalFileId: string
  optimizedUrl: string
  optimizations: {
    resize?: {
      width: number
      height: number
      fit: 'cover' | 'contain' | 'fill'
    }
    quality?: number
    format?: 'jpeg' | 'webp' | 'avif' | 'png'
    filters?: {
      brightness?: number
      contrast?: number
      saturation?: number
      blur?: number
    }
    crop?: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  metadata: {
    originalSize: number
    optimizedSize: number
    compressionRatio: number
    processingTime: number
    createdAt: Date
  }
}

export interface OptimizationPreset {
  id: string
  name: string
  description: string
  category: 'web' | 'social' | 'print' | 'email'
  optimizations: ImageOptimization['optimizations']
  targetUse: string[]
}

export interface ResponsiveImageSet {
  id: string
  originalFileId: string
  breakpoints: Array<{
    name: string
    width: number
    url: string
    size: number
  }>
  webpUrls?: Record<string, string>
  avifUrls?: Record<string, string>
}

export class MediaOptimizationService {
  private optimizations: Map<string, ImageOptimization> = new Map()
  private presets: Map<string, OptimizationPreset> = new Map()
  private responsiveImageSets: Map<string, ResponsiveImageSet> = new Map()

  constructor() {
    this.initializePresets()
  }

  /**
   * Optimize image with specified parameters
   */
  async optimizeImage(
    file: MediaFile,
    optimizations: ImageOptimization['optimizations']
  ): Promise<ImageOptimization> {
    const startTime = Date.now()
    
    try {
      // Generate optimized image URL (in real implementation, this would process the image)
      const optimizedUrl = await this.processImage(file, optimizations)
      
      // Calculate file sizes (mock implementation)
      const originalSize = file.size
      const optimizedSize = this.calculateOptimizedSize(originalSize, optimizations)
      const compressionRatio = (originalSize - optimizedSize) / originalSize

      const optimization: ImageOptimization = {
        id: this.generateId(),
        originalFileId: file.id,
        optimizedUrl,
        optimizations,
        metadata: {
          originalSize,
          optimizedSize,
          compressionRatio,
          processingTime: Date.now() - startTime,
          createdAt: new Date()
        }
      }

      this.optimizations.set(optimization.id, optimization)
      return optimization

    } catch (error) {
      console.error('Image optimization failed:', error)
      throw new Error('Failed to optimize image')
    }
  }

  /**
   * Apply optimization preset to image
   */
  async applyPreset(file: MediaFile, presetId: string): Promise<ImageOptimization> {
    const preset = this.presets.get(presetId)
    if (!preset) {
      throw new Error('Optimization preset not found')
    }

    return this.optimizeImage(file, preset.optimizations)
  }

  /**
   * Generate responsive image set for different screen sizes
   */
  async generateResponsiveImageSet(
    file: MediaFile,
    breakpoints: Array<{ name: string; width: number }> = [
      { name: 'mobile', width: 480 },
      { name: 'tablet', width: 768 },
      { name: 'desktop', width: 1200 },
      { name: 'large', width: 1920 }
    ]
  ): Promise<ResponsiveImageSet> {
    const responsiveSet: ResponsiveImageSet = {
      id: this.generateId(),
      originalFileId: file.id,
      breakpoints: [],
      webpUrls: {},
      avifUrls: {}
    }

    // Generate images for each breakpoint
    for (const breakpoint of breakpoints) {
      // Don't upscale images
      const targetWidth = Math.min(breakpoint.width, file.metadata.width || breakpoint.width)
      
      // Generate JPEG version
      const jpegOptimization = await this.optimizeImage(file, {
        resize: {
          width: targetWidth,
          height: Math.round((targetWidth / (file.metadata.width || 1)) * (file.metadata.height || 1)),
          fit: 'contain'
        },
        quality: 85,
        format: 'jpeg'
      })

      responsiveSet.breakpoints.push({
        name: breakpoint.name,
        width: targetWidth,
        url: jpegOptimization.optimizedUrl,
        size: jpegOptimization.metadata.optimizedSize
      })

      // Generate WebP version
      const webpOptimization = await this.optimizeImage(file, {
        resize: {
          width: targetWidth,
          height: Math.round((targetWidth / (file.metadata.width || 1)) * (file.metadata.height || 1)),
          fit: 'contain'
        },
        quality: 85,
        format: 'webp'
      })

      responsiveSet.webpUrls![breakpoint.name] = webpOptimization.optimizedUrl

      // Generate AVIF version for modern browsers
      const avifOptimization = await this.optimizeImage(file, {
        resize: {
          width: targetWidth,
          height: Math.round((targetWidth / (file.metadata.width || 1)) * (file.metadata.height || 1)),
          fit: 'contain'
        },
        quality: 85,
        format: 'avif'
      })

      responsiveSet.avifUrls![breakpoint.name] = avifOptimization.optimizedUrl
    }

    this.responsiveImageSets.set(responsiveSet.id, responsiveSet)
    return responsiveSet
  }

  /**
   * Generate picture element HTML for responsive images
   */
  generatePictureElement(
    responsiveSet: ResponsiveImageSet,
    alt: string,
    className?: string,
    loading: 'lazy' | 'eager' = 'lazy'
  ): string {
    const sources: string[] = []

    // Add AVIF sources
    if (responsiveSet.avifUrls) {
      const avifSrcSet = responsiveSet.breakpoints
        .map(bp => `${responsiveSet.avifUrls![bp.name]} ${bp.width}w`)
        .join(', ')
      
      sources.push(`<source srcset="${avifSrcSet}" type="image/avif">`)
    }

    // Add WebP sources
    if (responsiveSet.webpUrls) {
      const webpSrcSet = responsiveSet.breakpoints
        .map(bp => `${responsiveSet.webpUrls![bp.name]} ${bp.width}w`)
        .join(', ')
      
      sources.push(`<source srcset="${webpSrcSet}" type="image/webp">`)
    }

    // Add JPEG fallback
    const jpegSrcSet = responsiveSet.breakpoints
      .map(bp => `${bp.url} ${bp.width}w`)
      .join(', ')

    const fallbackSrc = responsiveSet.breakpoints[0]?.url || ''

    return `
      <picture>
        ${sources.join('\n        ')}
        <img 
          src="${fallbackSrc}"
          srcset="${jpegSrcSet}"
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
          alt="${alt}"
          loading="${loading}"
          ${className ? `class="${className}"` : ''}
        >
      </picture>
    `.trim()
  }

  /**
   * Get optimization suggestions based on image characteristics
   */
  getOptimizationSuggestions(file: MediaFile, targetUse: string): Array<{
    type: 'resize' | 'quality' | 'format' | 'compression'
    suggestion: string
    impact: 'high' | 'medium' | 'low'
    estimatedSavings: number // percentage
  }> {
    const suggestions: Array<{
      type: 'resize' | 'quality' | 'format' | 'compression'
      suggestion: string
      impact: 'high' | 'medium' | 'low'
      estimatedSavings: number
    }> = []

    // Size-based suggestions
    if (file.metadata.width && file.metadata.width > 1920) {
      suggestions.push({
        type: 'resize',
        suggestion: 'Resize to 1920px width for web use',
        impact: 'high',
        estimatedSavings: 60
      })
    }

    // Format suggestions
    if (file.mimeType === 'image/png' && !file.metadata.hasAlpha) {
      suggestions.push({
        type: 'format',
        suggestion: 'Convert to JPEG for better compression',
        impact: 'high',
        estimatedSavings: 70
      })
    }

    if (file.mimeType === 'image/jpeg') {
      suggestions.push({
        type: 'format',
        suggestion: 'Convert to WebP for modern browsers',
        impact: 'medium',
        estimatedSavings: 30
      })
    }

    // Quality suggestions
    if (file.size > 1024 * 1024) { // > 1MB
      suggestions.push({
        type: 'quality',
        suggestion: 'Reduce quality to 85% for web use',
        impact: 'medium',
        estimatedSavings: 40
      })
    }

    return suggestions
  }

  /**
   * Batch optimize multiple images
   */
  async batchOptimize(
    files: MediaFile[],
    optimizations: ImageOptimization['optimizations'],
    onProgress?: (completed: number, total: number) => void
  ): Promise<ImageOptimization[]> {
    const results: ImageOptimization[] = []
    
    for (let i = 0; i < files.length; i++) {
      try {
        const optimization = await this.optimizeImage(files[i], optimizations)
        results.push(optimization)
        
        if (onProgress) {
          onProgress(i + 1, files.length)
        }
      } catch (error) {
        console.error(`Failed to optimize ${files[i].originalName}:`, error)
      }
    }

    return results
  }

  /**
   * Get optimization by ID
   */
  getOptimization(id: string): ImageOptimization | undefined {
    return this.optimizations.get(id)
  }

  /**
   * Get all optimizations for a file
   */
  getOptimizationsForFile(fileId: string): ImageOptimization[] {
    return Array.from(this.optimizations.values())
      .filter(opt => opt.originalFileId === fileId)
      .sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime())
  }

  /**
   * Get available presets
   */
  getPresets(category?: string): OptimizationPreset[] {
    let presets = Array.from(this.presets.values())
    
    if (category) {
      presets = presets.filter(preset => preset.category === category)
    }
    
    return presets.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Create custom preset
   */
  createPreset(
    name: string,
    description: string,
    category: OptimizationPreset['category'],
    optimizations: ImageOptimization['optimizations'],
    targetUse: string[]
  ): OptimizationPreset {
    const preset: OptimizationPreset = {
      id: this.generateId(),
      name,
      description,
      category,
      optimizations,
      targetUse
    }

    this.presets.set(preset.id, preset)
    return preset
  }

  /**
   * Delete optimization
   */
  deleteOptimization(id: string): boolean {
    return this.optimizations.delete(id)
  }

  /**
   * Process image (mock implementation)
   */
  private async processImage(
    file: MediaFile,
    optimizations: ImageOptimization['optimizations']
  ): Promise<string> {
    // In a real implementation, this would use image processing libraries
    // like Sharp, ImageMagick, or cloud services like Cloudinary
    
    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Generate mock optimized URL
    const params = new URLSearchParams()
    
    if (optimizations.resize) {
      params.set('w', optimizations.resize.width.toString())
      params.set('h', optimizations.resize.height.toString())
      params.set('fit', optimizations.resize.fit)
    }
    
    if (optimizations.quality) {
      params.set('q', optimizations.quality.toString())
    }
    
    if (optimizations.format) {
      params.set('f', optimizations.format)
    }

    return `${file.url}?${params.toString()}`
  }

  /**
   * Calculate optimized file size (mock implementation)
   */
  private calculateOptimizedSize(
    originalSize: number,
    optimizations: ImageOptimization['optimizations']
  ): number {
    let size = originalSize

    // Apply size reduction based on optimizations
    if (optimizations.resize) {
      // Assume 50% size reduction for significant resizing
      size *= 0.5
    }

    if (optimizations.quality && optimizations.quality < 90) {
      // Quality reduction saves space
      const qualityFactor = optimizations.quality / 100
      size *= qualityFactor
    }

    if (optimizations.format === 'webp') {
      // WebP typically 25-30% smaller than JPEG
      size *= 0.7
    } else if (optimizations.format === 'avif') {
      // AVIF typically 50% smaller than JPEG
      size *= 0.5
    }

    return Math.round(size)
  }

  /**
   * Initialize default optimization presets
   */
  private initializePresets(): void {
    const presets: OptimizationPreset[] = [
      {
        id: 'web-hero',
        name: 'Hero Image',
        description: 'Large hero images for website headers',
        category: 'web',
        optimizations: {
          resize: { width: 1920, height: 1080, fit: 'cover' },
          quality: 85,
          format: 'webp'
        },
        targetUse: ['hero-section', 'banner', 'header']
      },
      {
        id: 'web-thumbnail',
        name: 'Thumbnail',
        description: 'Small thumbnails for galleries and previews',
        category: 'web',
        optimizations: {
          resize: { width: 300, height: 300, fit: 'cover' },
          quality: 80,
          format: 'webp'
        },
        targetUse: ['gallery', 'preview', 'card']
      },
      {
        id: 'social-facebook',
        name: 'Facebook Post',
        description: 'Optimized for Facebook sharing',
        category: 'social',
        optimizations: {
          resize: { width: 1200, height: 630, fit: 'cover' },
          quality: 85,
          format: 'jpeg'
        },
        targetUse: ['facebook', 'og-image']
      },
      {
        id: 'social-instagram',
        name: 'Instagram Post',
        description: 'Square format for Instagram',
        category: 'social',
        optimizations: {
          resize: { width: 1080, height: 1080, fit: 'cover' },
          quality: 85,
          format: 'jpeg'
        },
        targetUse: ['instagram', 'square']
      },
      {
        id: 'email-header',
        name: 'Email Header',
        description: 'Email-optimized header image',
        category: 'email',
        optimizations: {
          resize: { width: 600, height: 200, fit: 'cover' },
          quality: 75,
          format: 'jpeg'
        },
        targetUse: ['email', 'newsletter']
      },
      {
        id: 'print-high-res',
        name: 'Print Quality',
        description: 'High resolution for print materials',
        category: 'print',
        optimizations: {
          quality: 95,
          format: 'jpeg'
        },
        targetUse: ['print', 'brochure', 'poster']
      }
    ]

    presets.forEach(preset => {
      this.presets.set(preset.id, preset)
    })
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'opt_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }
}

export const mediaOptimizationService = new MediaOptimizationService()
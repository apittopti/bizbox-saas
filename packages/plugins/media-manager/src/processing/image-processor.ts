import sharp from 'sharp';
import path from 'path';
import { z } from 'zod';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'left top' | 'right top' | 'left bottom' | 'right bottom';
  background?: string;
  crop?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
  sharpen?: boolean;
  blur?: number;
  grayscale?: boolean;
  normalize?: boolean;
  removeAlpha?: boolean;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  density?: number;
  hasAlpha: boolean;
  isAnimated?: boolean;
  pages?: number;
  colorSpace?: string;
  channels: number;
  bitDepth: number;
  exif?: Record<string, any>;
  icc?: boolean;
}

export interface ImageProcessingResult {
  buffer: Buffer;
  metadata: ImageMetadata;
  transformations: string[];
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
}

export interface ImageOptimizationPreset {
  name: string;
  description: string;
  transformations: ImageTransformOptions[];
}

// Validation schemas
export const imageTransformOptionsSchema = z.object({
  width: z.number().int().min(1).max(10000).optional(),
  height: z.number().int().min(1).max(10000).optional(),
  quality: z.number().int().min(1).max(100).optional(),
  format: z.enum(['jpeg', 'png', 'webp', 'avif']).optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
  position: z.string().optional(),
  background: z.string().optional(),
  crop: z.object({
    left: z.number().int().min(0),
    top: z.number().int().min(0),
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  }).optional(),
  rotate: z.number().int().min(-360).max(360).optional(),
  flip: z.boolean().optional(),
  flop: z.boolean().optional(),
  sharpen: z.boolean().optional(),
  blur: z.number().min(0).max(100).optional(),
  grayscale: z.boolean().optional(),
  normalize: z.boolean().optional(),
  removeAlpha: z.boolean().optional(),
});

export class ImageProcessor {
  private static readonly SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'tiff', 'bmp'];
  
  private static readonly OPTIMIZATION_PRESETS: Record<string, ImageOptimizationPreset> = {
    thumbnail: {
      name: 'Thumbnail',
      description: 'Small thumbnail for previews',
      transformations: [
        {
          width: 150,
          height: 150,
          fit: 'cover',
          format: 'webp',
          quality: 80,
        },
      ],
    },
    medium: {
      name: 'Medium',
      description: 'Medium size for galleries',
      transformations: [
        {
          width: 800,
          height: 600,
          fit: 'inside',
          format: 'webp',
          quality: 85,
        },
      ],
    },
    large: {
      name: 'Large',
      description: 'Large size for detailed viewing',
      transformations: [
        {
          width: 1920,
          height: 1080,
          fit: 'inside',
          format: 'webp',
          quality: 90,
        },
      ],
    },
    optimized: {
      name: 'Optimized',
      description: 'Optimized for web delivery',
      transformations: [
        {
          format: 'webp',
          quality: 85,
          normalize: true,
        },
      ],
    },
  };

  /**
   * Check if a file is a supported image format
   */
  static isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return this.SUPPORTED_FORMATS.includes(ext);
  }

  /**
   * Check if a MIME type is a supported image format
   */
  static isImageMimeType(mimeType: string): boolean {
    return mimeType.startsWith('image/') && 
           !mimeType.includes('svg') && // SVG requires special handling
           !mimeType.includes('ico');   // ICO requires special handling
  }

  /**
   * Extract metadata from an image buffer
   */
  async extractMetadata(buffer: Buffer): Promise<ImageMetadata> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      // Extract EXIF data if available
      let exif: Record<string, any> | undefined;
      if (metadata.exif) {
        try {
          const exifData = await this.parseExifData(metadata.exif);
          exif = exifData;
        } catch (error) {
          console.warn('Failed to parse EXIF data:', error);
        }
      }

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha || false,
        isAnimated: metadata.pages ? metadata.pages > 1 : false,
        pages: metadata.pages,
        colorSpace: metadata.space,
        channels: metadata.channels || 0,
        bitDepth: metadata.depth ? parseInt(metadata.depth.replace(/[^0-9]/g, ''), 10) : 8,
        exif,
        icc: metadata.icc !== undefined,
      };
    } catch (error) {
      throw new Error(`Failed to extract image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process an image with given transformations
   */
  async processImage(
    buffer: Buffer,
    options: ImageTransformOptions
  ): Promise<ImageProcessingResult> {
    try {
      // Validate options
      const validatedOptions = imageTransformOptionsSchema.parse(options);
      
      const originalMetadata = await this.extractMetadata(buffer);
      let image = sharp(buffer);
      const transformations: string[] = [];

      // Apply crop first if specified
      if (validatedOptions.crop) {
        image = image.extract({
          left: validatedOptions.crop.left,
          top: validatedOptions.crop.top,
          width: validatedOptions.crop.width,
          height: validatedOptions.crop.height,
        });
        transformations.push(`crop(${validatedOptions.crop.left},${validatedOptions.crop.top},${validatedOptions.crop.width},${validatedOptions.crop.height})`);
      }

      // Apply rotation
      if (validatedOptions.rotate) {
        image = image.rotate(validatedOptions.rotate);
        transformations.push(`rotate(${validatedOptions.rotate})`);
      }

      // Apply flip/flop
      if (validatedOptions.flip) {
        image = image.flip();
        transformations.push('flip');
      }
      if (validatedOptions.flop) {
        image = image.flop();
        transformations.push('flop');
      }

      // Apply resize
      if (validatedOptions.width || validatedOptions.height) {
        const resizeOptions: sharp.ResizeOptions = {
          fit: validatedOptions.fit as sharp.FitEnum || 'cover',
          position: validatedOptions.position as sharp.Position || 'center',
        };
        
        if (validatedOptions.background) {
          resizeOptions.background = validatedOptions.background;
        }

        image = image.resize(validatedOptions.width, validatedOptions.height, resizeOptions);
        transformations.push(`resize(${validatedOptions.width || 'auto'}x${validatedOptions.height || 'auto'})`);
      }

      // Apply filters
      if (validatedOptions.normalize) {
        image = image.normalize();
        transformations.push('normalize');
      }

      if (validatedOptions.sharpen) {
        image = image.sharpen();
        transformations.push('sharpen');
      }

      if (validatedOptions.blur) {
        image = image.blur(validatedOptions.blur);
        transformations.push(`blur(${validatedOptions.blur})`);
      }

      if (validatedOptions.grayscale) {
        image = image.grayscale();
        transformations.push('grayscale');
      }

      // Remove alpha channel if requested
      if (validatedOptions.removeAlpha) {
        image = image.removeAlpha();
        transformations.push('removeAlpha');
      }

      // Apply format and quality
      const outputFormat = validatedOptions.format || 'webp';
      const quality = validatedOptions.quality || 85;

      switch (outputFormat) {
        case 'jpeg':
          image = image.jpeg({ 
            quality,
            progressive: true,
            mozjpeg: true,
          });
          break;
        case 'png':
          image = image.png({ 
            quality,
            progressive: true,
            compressionLevel: 9,
          });
          break;
        case 'webp':
          image = image.webp({ 
            quality,
            effort: 6,
          });
          break;
        case 'avif':
          image = image.avif({ 
            quality,
            effort: 9,
          });
          break;
      }

      transformations.push(`format(${outputFormat})`);
      if (validatedOptions.quality) {
        transformations.push(`quality(${quality})`);
      }

      // Process the image
      const processedBuffer = await image.toBuffer();
      const processedMetadata = await this.extractMetadata(processedBuffer);

      return {
        buffer: processedBuffer,
        metadata: processedMetadata,
        transformations,
        originalSize: originalMetadata.size,
        processedSize: processedMetadata.size,
        compressionRatio: originalMetadata.size / processedMetadata.size,
      };
    } catch (error) {
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate responsive image variants
   */
  async generateResponsiveVariants(
    buffer: Buffer,
    options: {
      sizes: { width: number; height?: number; suffix: string }[];
      format?: 'jpeg' | 'png' | 'webp' | 'avif';
      quality?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }
  ): Promise<{
    variants: Array<{
      suffix: string;
      buffer: Buffer;
      metadata: ImageMetadata;
      width: number;
      height: number;
    }>;
    originalMetadata: ImageMetadata;
  }> {
    const originalMetadata = await this.extractMetadata(buffer);
    const variants = [];

    for (const size of options.sizes) {
      const result = await this.processImage(buffer, {
        width: size.width,
        height: size.height,
        format: options.format || 'webp',
        quality: options.quality || 85,
        fit: options.fit || 'cover',
      });

      variants.push({
        suffix: size.suffix,
        buffer: result.buffer,
        metadata: result.metadata,
        width: result.metadata.width,
        height: result.metadata.height,
      });
    }

    return {
      variants,
      originalMetadata,
    };
  }

  /**
   * Apply optimization preset
   */
  async applyPreset(
    buffer: Buffer,
    presetName: string
  ): Promise<ImageProcessingResult> {
    const preset = ImageProcessor.OPTIMIZATION_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Unknown optimization preset: ${presetName}`);
    }

    // Apply first transformation (presets typically have one transformation)
    const transformation = preset.transformations[0];
    return this.processImage(buffer, transformation);
  }

  /**
   * Get available optimization presets
   */
  static getOptimizationPresets(): Record<string, ImageOptimizationPreset> {
    return { ...this.OPTIMIZATION_PRESETS };
  }

  /**
   * Create a thumbnail
   */
  async createThumbnail(
    buffer: Buffer,
    size: number = 150,
    options: {
      format?: 'jpeg' | 'png' | 'webp' | 'avif';
      quality?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    } = {}
  ): Promise<ImageProcessingResult> {
    return this.processImage(buffer, {
      width: size,
      height: size,
      format: options.format || 'webp',
      quality: options.quality || 80,
      fit: options.fit || 'cover',
    });
  }

  /**
   * Optimize image for web delivery
   */
  async optimizeForWeb(
    buffer: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp' | 'avif';
    } = {}
  ): Promise<ImageProcessingResult> {
    const metadata = await this.extractMetadata(buffer);
    
    const transformOptions: ImageTransformOptions = {
      format: options.format || 'webp',
      quality: options.quality || 85,
      normalize: true,
    };

    // Only resize if image is larger than max dimensions
    const maxWidth = options.maxWidth || 1920;
    const maxHeight = options.maxHeight || 1080;
    
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      transformOptions.width = maxWidth;
      transformOptions.height = maxHeight;
      transformOptions.fit = 'inside';
    }

    return this.processImage(buffer, transformOptions);
  }

  /**
   * Parse EXIF data from buffer
   */
  private async parseExifData(exifBuffer: Buffer): Promise<Record<string, any>> {
    // This is a simplified EXIF parser
    // In a production environment, you'd want to use a library like 'exifr' or 'piexifjs'
    try {
      const exifString = exifBuffer.toString('binary');
      const exifData: Record<string, any> = {};
      
      // Basic EXIF parsing would go here
      // For now, return empty object
      return exifData;
    } catch (error) {
      return {};
    }
  }

  /**
   * Generate image analysis report
   */
  async analyzeImage(buffer: Buffer): Promise<{
    metadata: ImageMetadata;
    fileSize: number;
    estimatedOptimization: {
      webp: { size: number; savings: number };
      avif: { size: number; savings: number };
      optimizedJpeg: { size: number; savings: number };
    };
    recommendations: string[];
  }> {
    const metadata = await this.extractMetadata(buffer);
    const recommendations: string[] = [];

    // Test different optimizations
    const webpResult = await this.processImage(buffer, { format: 'webp', quality: 85 });
    const avifResult = await this.processImage(buffer, { format: 'avif', quality: 85 });
    const jpegResult = await this.processImage(buffer, { format: 'jpeg', quality: 85, normalize: true });

    // Generate recommendations
    if (metadata.width > 1920 || metadata.height > 1080) {
      recommendations.push('Consider resizing image to reduce file size');
    }

    if (metadata.format === 'png' && !metadata.hasAlpha) {
      recommendations.push('Convert PNG to JPEG or WebP for better compression');
    }

    if (webpResult.compressionRatio > 1.5) {
      recommendations.push('Convert to WebP format for better compression');
    }

    if (avifResult.compressionRatio > webpResult.compressionRatio * 1.2) {
      recommendations.push('Consider AVIF format for even better compression');
    }

    return {
      metadata,
      fileSize: buffer.length,
      estimatedOptimization: {
        webp: {
          size: webpResult.processedSize,
          savings: (1 - webpResult.processedSize / buffer.length) * 100,
        },
        avif: {
          size: avifResult.processedSize,
          savings: (1 - avifResult.processedSize / buffer.length) * 100,
        },
        optimizedJpeg: {
          size: jpegResult.processedSize,
          savings: (1 - jpegResult.processedSize / buffer.length) * 100,
        },
      },
      recommendations,
    };
  }
}
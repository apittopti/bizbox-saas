import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';

export interface VideoTransformOptions {
  width?: number;
  height?: number;
  bitrate?: string;
  fps?: number;
  codec?: 'libx264' | 'libx265' | 'libvpx' | 'libvpx-vp9' | 'libaom-av1';
  format?: 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv';
  quality?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  startTime?: number; // in seconds
  duration?: number; // in seconds
  audioCodec?: 'aac' | 'mp3' | 'opus' | 'vorbis' | 'none';
  audioChannels?: number;
  audioBitrate?: string;
  removeAudio?: boolean;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number; // in seconds
  format: string;
  size: number;
  bitrate: number;
  fps: number;
  codec: string;
  audioCodec?: string;
  audioChannels?: number;
  audioBitrate?: number;
  aspectRatio: string;
  rotation?: number;
  hasAudio: boolean;
  hasVideo: boolean;
  streams: Array<{
    type: 'video' | 'audio' | 'subtitle' | 'data';
    codec: string;
    bitrate?: number;
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    language?: string;
  }>;
}

export interface VideoProcessingResult {
  buffer: Buffer;
  metadata: VideoMetadata;
  transformations: string[];
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  processingTime: number;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  timestamp?: number; // in seconds, default to middle of video
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  count?: number; // number of thumbnails to generate
  interval?: number; // interval between thumbnails in seconds
}

export interface VideoOptimizationPreset {
  name: string;
  description: string;
  transformations: VideoTransformOptions;
  useCase: string;
}

// Validation schemas
export const videoTransformOptionsSchema = z.object({
  width: z.number().int().min(1).max(7680).optional(),
  height: z.number().int().min(1).max(4320).optional(),
  bitrate: z.string().optional(),
  fps: z.number().min(1).max(120).optional(),
  codec: z.enum(['libx264', 'libx265', 'libvpx', 'libvpx-vp9', 'libaom-av1']).optional(),
  format: z.enum(['mp4', 'webm', 'mov', 'avi', 'mkv']).optional(),
  quality: z.enum(['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow']).optional(),
  startTime: z.number().min(0).optional(),
  duration: z.number().min(0.1).optional(),
  audioCodec: z.enum(['aac', 'mp3', 'opus', 'vorbis', 'none']).optional(),
  audioChannels: z.number().int().min(1).max(8).optional(),
  audioBitrate: z.string().optional(),
  removeAudio: z.boolean().optional(),
});

export const thumbnailOptionsSchema = z.object({
  width: z.number().int().min(1).max(1920).optional(),
  height: z.number().int().min(1).max(1080).optional(),
  timestamp: z.number().min(0).optional(),
  format: z.enum(['jpeg', 'png', 'webp']).optional(),
  quality: z.number().int().min(1).max(100).optional(),
  count: z.number().int().min(1).max(20).optional(),
  interval: z.number().min(0.1).optional(),
});

export class VideoProcessor {
  private static readonly SUPPORTED_FORMATS = [
    'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v', 'mpg', 'mpeg'
  ];

  private static readonly OPTIMIZATION_PRESETS: Record<string, VideoOptimizationPreset> = {
    web: {
      name: 'Web Optimized',
      description: 'Optimized for web streaming',
      useCase: 'General web use',
      transformations: {
        codec: 'libx264',
        format: 'mp4',
        quality: 'fast',
        bitrate: '2M',
        audioCodec: 'aac',
        audioBitrate: '128k',
      },
    },
    mobile: {
      name: 'Mobile Optimized',
      description: 'Optimized for mobile devices',
      useCase: 'Mobile streaming',
      transformations: {
        width: 720,
        height: 480,
        codec: 'libx264',
        format: 'mp4',
        quality: 'faster',
        bitrate: '1M',
        audioCodec: 'aac',
        audioBitrate: '96k',
      },
    },
    hd: {
      name: 'HD Quality',
      description: 'High definition quality',
      useCase: 'High quality playback',
      transformations: {
        width: 1920,
        height: 1080,
        codec: 'libx264',
        format: 'mp4',
        quality: 'medium',
        bitrate: '5M',
        audioCodec: 'aac',
        audioBitrate: '192k',
      },
    },
    compress: {
      name: 'High Compression',
      description: 'Maximum compression for storage',
      useCase: 'Storage optimization',
      transformations: {
        codec: 'libx265',
        format: 'mp4',
        quality: 'slow',
        bitrate: '1M',
        audioCodec: 'aac',
        audioBitrate: '64k',
      },
    },
  };

  constructor(private ffmpegPath?: string) {
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  }

  /**
   * Check if a file is a supported video format
   */
  static isVideoFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return this.SUPPORTED_FORMATS.includes(ext);
  }

  /**
   * Check if a MIME type is a supported video format
   */
  static isVideoMimeType(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Extract metadata from a video buffer/file
   */
  async extractMetadata(input: Buffer | string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      let tempFile: string | null = null;

      // Create temp file if input is buffer
      const setupInput = async () => {
        if (Buffer.isBuffer(input)) {
          tempFile = path.join(require('os').tmpdir(), `temp_${Date.now()}.mp4`);
          await fs.writeFile(tempFile, input);
          return tempFile;
        }
        return input;
      };

      const cleanup = async () => {
        if (tempFile) {
          try {
            await fs.unlink(tempFile);
          } catch (error) {
            console.warn('Failed to cleanup temp file:', error);
          }
        }
      };

      setupInput()
        .then((inputPath) => {
          ffmpeg(inputPath)
            .ffprobe((error, data) => {
              cleanup().finally(() => {
                if (error) {
                  reject(new Error(`Failed to extract video metadata: ${error.message}`));
                  return;
                }

                try {
                  const videoStream = data.streams.find(s => s.codec_type === 'video');
                  const audioStream = data.streams.find(s => s.codec_type === 'audio');

                  const metadata: VideoMetadata = {
                    width: videoStream?.width || 0,
                    height: videoStream?.height || 0,
                    duration: parseFloat(data.format.duration || '0'),
                    format: data.format.format_name || 'unknown',
                    size: parseInt(data.format.size || '0', 10),
                    bitrate: parseInt(data.format.bit_rate || '0', 10),
                    fps: this.parseFps(videoStream?.r_frame_rate || '0/0'),
                    codec: videoStream?.codec_name || 'unknown',
                    audioCodec: audioStream?.codec_name,
                    audioChannels: audioStream?.channels,
                    audioBitrate: parseInt(audioStream?.bit_rate || '0', 10),
                    aspectRatio: this.calculateAspectRatio(videoStream?.width || 0, videoStream?.height || 0),
                    rotation: this.parseRotation(videoStream?.tags?.rotate),
                    hasAudio: !!audioStream,
                    hasVideo: !!videoStream,
                    streams: data.streams.map(stream => ({
                      type: stream.codec_type as any,
                      codec: stream.codec_name || 'unknown',
                      bitrate: parseInt(stream.bit_rate || '0', 10) || undefined,
                      width: stream.width,
                      height: stream.height,
                      fps: stream.codec_type === 'video' ? this.parseFps(stream.r_frame_rate || '0/0') : undefined,
                      channels: stream.channels,
                      language: stream.tags?.language,
                    })),
                  };

                  resolve(metadata);
                } catch (parseError) {
                  reject(new Error(`Failed to parse video metadata: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
                }
              });
            });
        })
        .catch(reject);
    });
  }

  /**
   * Process a video with given transformations
   */
  async processVideo(
    input: Buffer | string,
    options: VideoTransformOptions
  ): Promise<VideoProcessingResult> {
    const validatedOptions = videoTransformOptionsSchema.parse(options);
    const startTime = Date.now();
    
    let tempInputFile: string | null = null;
    let tempOutputFile: string | null = null;

    try {
      // Setup input
      if (Buffer.isBuffer(input)) {
        tempInputFile = path.join(require('os').tmpdir(), `input_${Date.now()}.mp4`);
        await fs.writeFile(tempInputFile, input);
        input = tempInputFile;
      }

      // Setup output
      const outputFormat = validatedOptions.format || 'mp4';
      tempOutputFile = path.join(require('os').tmpdir(), `output_${Date.now()}.${outputFormat}`);

      const originalMetadata = await this.extractMetadata(input);
      const transformations: string[] = [];

      return new Promise((resolve, reject) => {
        let command = ffmpeg(input as string);

        // Video codec
        if (validatedOptions.codec) {
          command = command.videoCodec(validatedOptions.codec);
          transformations.push(`codec:${validatedOptions.codec}`);
        }

        // Video size
        if (validatedOptions.width || validatedOptions.height) {
          const width = validatedOptions.width || -1;
          const height = validatedOptions.height || -1;
          command = command.size(`${width}x${height}`);
          transformations.push(`size:${width}x${height}`);
        }

        // Video bitrate
        if (validatedOptions.bitrate) {
          command = command.videoBitrate(validatedOptions.bitrate);
          transformations.push(`bitrate:${validatedOptions.bitrate}`);
        }

        // FPS
        if (validatedOptions.fps) {
          command = command.fps(validatedOptions.fps);
          transformations.push(`fps:${validatedOptions.fps}`);
        }

        // Quality preset
        if (validatedOptions.quality) {
          command = command.addOption('-preset', validatedOptions.quality);
          transformations.push(`preset:${validatedOptions.quality}`);
        }

        // Time trimming
        if (validatedOptions.startTime) {
          command = command.seekInput(validatedOptions.startTime);
          transformations.push(`start:${validatedOptions.startTime}s`);
        }

        if (validatedOptions.duration) {
          command = command.duration(validatedOptions.duration);
          transformations.push(`duration:${validatedOptions.duration}s`);
        }

        // Audio processing
        if (validatedOptions.removeAudio) {
          command = command.noAudio();
          transformations.push('removeAudio');
        } else {
          if (validatedOptions.audioCodec && validatedOptions.audioCodec !== 'none') {
            command = command.audioCodec(validatedOptions.audioCodec);
            transformations.push(`audioCodec:${validatedOptions.audioCodec}`);
          }

          if (validatedOptions.audioBitrate) {
            command = command.audioBitrate(validatedOptions.audioBitrate);
            transformations.push(`audioBitrate:${validatedOptions.audioBitrate}`);
          }

          if (validatedOptions.audioChannels) {
            command = command.audioChannels(validatedOptions.audioChannels);
            transformations.push(`audioChannels:${validatedOptions.audioChannels}`);
          }
        }

        // Output format
        command = command.format(outputFormat);
        transformations.push(`format:${outputFormat}`);

        // Execute the command
        command
          .output(tempOutputFile!)
          .on('error', (error) => {
            this.cleanup([tempInputFile, tempOutputFile]).finally(() => {
              reject(new Error(`Video processing failed: ${error.message}`));
            });
          })
          .on('end', async () => {
            try {
              const processedBuffer = await fs.readFile(tempOutputFile!);
              const processedMetadata = await this.extractMetadata(tempOutputFile!);
              const processingTime = Date.now() - startTime;

              const result: VideoProcessingResult = {
                buffer: processedBuffer,
                metadata: processedMetadata,
                transformations,
                originalSize: originalMetadata.size,
                processedSize: processedMetadata.size,
                compressionRatio: originalMetadata.size / processedMetadata.size,
                processingTime,
              };

              await this.cleanup([tempInputFile, tempOutputFile]);
              resolve(result);
            } catch (error) {
              await this.cleanup([tempInputFile, tempOutputFile]);
              reject(error);
            }
          })
          .run();
      });
    } catch (error) {
      await this.cleanup([tempInputFile, tempOutputFile]);
      throw error;
    }
  }

  /**
   * Generate video thumbnail(s)
   */
  async generateThumbnails(
    input: Buffer | string,
    options: ThumbnailOptions = {}
  ): Promise<{
    thumbnails: Array<{
      buffer: Buffer;
      timestamp: number;
      filename: string;
    }>;
    metadata: VideoMetadata;
  }> {
    const validatedOptions = thumbnailOptionsSchema.parse(options);
    
    let tempInputFile: string | null = null;
    const tempOutputFiles: string[] = [];

    try {
      // Setup input
      if (Buffer.isBuffer(input)) {
        tempInputFile = path.join(require('os').tmpdir(), `input_${Date.now()}.mp4`);
        await fs.writeFile(tempInputFile, input);
        input = tempInputFile;
      }

      const metadata = await this.extractMetadata(input);
      const count = validatedOptions.count || 1;
      const format = validatedOptions.format || 'jpeg';
      const quality = validatedOptions.quality || 90;
      const width = validatedOptions.width || 320;
      const height = validatedOptions.height || 240;

      const thumbnails: Array<{
        buffer: Buffer;
        timestamp: number;
        filename: string;
      }> = [];

      // Calculate timestamps
      let timestamps: number[];
      if (count === 1) {
        const timestamp = validatedOptions.timestamp !== undefined 
          ? validatedOptions.timestamp 
          : metadata.duration / 2; // Middle of video
        timestamps = [timestamp];
      } else {
        const interval = validatedOptions.interval || (metadata.duration / (count + 1));
        timestamps = Array.from({ length: count }, (_, i) => interval * (i + 1));
      }

      // Generate thumbnails
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const outputFile = path.join(
          require('os').tmpdir(), 
          `thumb_${Date.now()}_${i}.${format}`
        );
        tempOutputFiles.push(outputFile);

        await new Promise<void>((resolve, reject) => {
          ffmpeg(input as string)
            .seekInput(timestamp)
            .frames(1)
            .size(`${width}x${height}`)
            .format(format === 'jpeg' ? 'mjpeg' : format)
            .addOption('-q:v', quality.toString())
            .output(outputFile)
            .on('error', reject)
            .on('end', () => resolve())
            .run();
        });

        const buffer = await fs.readFile(outputFile);
        thumbnails.push({
          buffer,
          timestamp,
          filename: `thumbnail_${timestamp}s.${format}`,
        });
      }

      return { thumbnails, metadata };
    } finally {
      await this.cleanup([tempInputFile, ...tempOutputFiles]);
    }
  }

  /**
   * Apply optimization preset
   */
  async applyPreset(
    input: Buffer | string,
    presetName: string
  ): Promise<VideoProcessingResult> {
    const preset = VideoProcessor.OPTIMIZATION_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Unknown optimization preset: ${presetName}`);
    }

    return this.processVideo(input, preset.transformations);
  }

  /**
   * Get available optimization presets
   */
  static getOptimizationPresets(): Record<string, VideoOptimizationPreset> {
    return { ...this.OPTIMIZATION_PRESETS };
  }

  /**
   * Convert video to streaming-optimized format
   */
  async optimizeForStreaming(
    input: Buffer | string,
    options: {
      quality?: 'low' | 'medium' | 'high';
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<VideoProcessingResult> {
    const metadata = await this.extractMetadata(input);
    
    const qualitySettings = {
      low: { bitrate: '1M', quality: 'faster' },
      medium: { bitrate: '2M', quality: 'fast' },
      high: { bitrate: '4M', quality: 'medium' },
    };

    const settings = qualitySettings[options.quality || 'medium'];
    const maxWidth = options.maxWidth || 1920;
    const maxHeight = options.maxHeight || 1080;

    const transformOptions: VideoTransformOptions = {
      codec: 'libx264',
      format: 'mp4',
      bitrate: settings.bitrate,
      quality: settings.quality as any,
      audioCodec: 'aac',
      audioBitrate: '128k',
    };

    // Only resize if video is larger than max dimensions
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      transformOptions.width = maxWidth;
      transformOptions.height = maxHeight;
    }

    return this.processVideo(input, transformOptions);
  }

  /**
   * Analyze video for optimization recommendations
   */
  async analyzeVideo(input: Buffer | string): Promise<{
    metadata: VideoMetadata;
    fileSize: number;
    estimatedOptimization: {
      web: { size: number; savings: number };
      mobile: { size: number; savings: number };
      compressed: { size: number; savings: number };
    };
    recommendations: string[];
  }> {
    const metadata = await this.extractMetadata(input);
    const recommendations: string[] = [];

    // Test optimizations (using small duration for speed)
    const testOptions: VideoTransformOptions = { 
      duration: Math.min(10, metadata.duration) // Test with first 10 seconds
    };

    const webResult = await this.processVideo(input, {
      ...testOptions,
      ...VideoProcessor.OPTIMIZATION_PRESETS.web.transformations,
    });

    const mobileResult = await this.processVideo(input, {
      ...testOptions,
      ...VideoProcessor.OPTIMIZATION_PRESETS.mobile.transformations,
    });

    const compressedResult = await this.processVideo(input, {
      ...testOptions,
      ...VideoProcessor.OPTIMIZATION_PRESETS.compress.transformations,
    });

    // Generate recommendations
    if (metadata.width > 1920 || metadata.height > 1080) {
      recommendations.push('Consider reducing resolution for web delivery');
    }

    if (metadata.bitrate > 5000000) { // 5 Mbps
      recommendations.push('Video bitrate is high, consider compression');
    }

    if (metadata.duration > 600) { // 10 minutes
      recommendations.push('Long video, consider breaking into segments');
    }

    if (!metadata.hasAudio) {
      recommendations.push('No audio track detected');
    }

    // Estimate savings based on test results (extrapolate from test duration)
    const scaleFactor = metadata.duration / Math.min(10, metadata.duration);

    return {
      metadata,
      fileSize: metadata.size,
      estimatedOptimization: {
        web: {
          size: webResult.processedSize * scaleFactor,
          savings: (1 - (webResult.processedSize * scaleFactor) / metadata.size) * 100,
        },
        mobile: {
          size: mobileResult.processedSize * scaleFactor,
          savings: (1 - (mobileResult.processedSize * scaleFactor) / metadata.size) * 100,
        },
        compressed: {
          size: compressedResult.processedSize * scaleFactor,
          savings: (1 - (compressedResult.processedSize * scaleFactor) / metadata.size) * 100,
        },
      },
      recommendations,
    };
  }

  /**
   * Helper methods
   */
  private parseFps(frameRate: string): number {
    const [num, den] = frameRate.split('/').map(n => parseInt(n, 10));
    if (den === 0) return 0;
    return Math.round((num / den) * 100) / 100;
  }

  private calculateAspectRatio(width: number, height: number): string {
    if (width === 0 || height === 0) return '0:0';
    
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    
    return `${width / divisor}:${height / divisor}`;
  }

  private parseRotation(rotate: string | undefined): number | undefined {
    if (!rotate) return undefined;
    const rotation = parseInt(rotate, 10);
    return isNaN(rotation) ? undefined : rotation;
  }

  private async cleanup(files: (string | null)[]): Promise<void> {
    await Promise.all(
      files
        .filter((file): file is string => file !== null)
        .map(async (file) => {
          try {
            await fs.unlink(file);
          } catch (error) {
            console.warn(`Failed to cleanup temp file ${file}:`, error);
          }
        })
    );
  }
}
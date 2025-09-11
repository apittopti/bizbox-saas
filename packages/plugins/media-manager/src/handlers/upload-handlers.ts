import { z } from 'zod';
import { MediaService } from '../services/media-service';

// Validation schemas
export const singleUploadSchema = z.object({
  folder: z.string().optional(),
  alt: z.string().max(255).optional(),
  caption: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  generateThumbnails: z.boolean().default(true),
  optimizeImage: z.boolean().default(true),
  processVideo: z.boolean().default(false),
});

export const batchUploadSchema = z.object({
  files: z.array(z.object({
    filename: z.string(),
    folder: z.string().optional(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().default(false),
  })),
  globalOptions: z.object({
    generateThumbnails: z.boolean().default(true),
    optimizeImage: z.boolean().default(true),
    processVideo: z.boolean().default(false),
  }).optional(),
});

export const chunkUploadSchema = z.object({
  filename: z.string(),
  chunkIndex: z.number().int().min(0),
  totalChunks: z.number().int().min(1),
  uploadId: z.string(),
  folder: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
});

export interface UploadHandlerContext {
  mediaService: MediaService;
  tenantId: string;
  userId: string;
  request: any;
  response: any;
}

// Store for chunked uploads
const chunkStore = new Map<string, {
  chunks: Buffer[];
  metadata: any;
  receivedChunks: Set<number>;
  totalChunks: number;
  createdAt: Date;
}>();

// Cleanup old chunk data periodically (in production, use Redis or database)
setInterval(() => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  for (const [uploadId, data] of chunkStore.entries()) {
    if (data.createdAt < cutoff) {
      chunkStore.delete(uploadId);
    }
  }
}, 60 * 60 * 1000); // Run every hour

/**
 * Handle single file upload
 */
export async function handleSingleUpload(context: UploadHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, userId, request, response } = context;

    // Parse multipart form data (assuming express-fileupload or similar)
    if (!request.files || !request.files.file) {
      return response.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const file = Array.isArray(request.files.file) ? request.files.file[0] : request.files.file;
    
    // Validate request body
    const validatedBody = singleUploadSchema.parse(request.body);

    // Upload file
    const result = await mediaService.uploadFile(
      file.data,
      {
        filename: file.name,
        folder: validatedBody.folder,
        alt: validatedBody.alt,
        caption: validatedBody.caption,
        tags: validatedBody.tags,
        isPublic: validatedBody.isPublic,
        generateThumbnails: validatedBody.generateThumbnails,
        optimizeImage: validatedBody.optimizeImage,
        processVideo: validatedBody.processVideo,
      },
      userId,
      tenantId
    );

    if (result.success) {
      response.status(201).json({
        success: true,
        file: result.file,
        processingJob: result.processingJob,
      });
    } else {
      response.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Single upload handler error:', error);
    
    if (error instanceof z.ZodError) {
      return context.response.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Handle batch file upload
 */
export async function handleBatchUpload(context: UploadHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, userId, request, response } = context;

    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    // Validate request body
    const validatedBody = batchUploadSchema.parse(request.body);
    const results = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < validatedBody.files.length; i++) {
      const fileConfig = validatedBody.files[i];
      const fileKey = `file${i}`;
      
      if (!request.files[fileKey]) {
        errors.push({
          index: i,
          filename: fileConfig.filename,
          error: 'File not found in request',
        });
        continue;
      }

      const file = request.files[fileKey];
      
      try {
        const result = await mediaService.uploadFile(
          file.data,
          {
            filename: fileConfig.filename,
            folder: fileConfig.folder,
            alt: fileConfig.alt,
            caption: fileConfig.caption,
            tags: fileConfig.tags,
            isPublic: fileConfig.isPublic,
            generateThumbnails: validatedBody.globalOptions?.generateThumbnails ?? true,
            optimizeImage: validatedBody.globalOptions?.optimizeImage ?? true,
            processVideo: validatedBody.globalOptions?.processVideo ?? false,
          },
          userId,
          tenantId
        );

        if (result.success) {
          results.push({
            index: i,
            success: true,
            file: result.file,
            processingJob: result.processingJob,
          });
        } else {
          errors.push({
            index: i,
            filename: fileConfig.filename,
            error: result.error,
          });
        }
      } catch (fileError) {
        errors.push({
          index: i,
          filename: fileConfig.filename,
          error: fileError instanceof Error ? fileError.message : 'Unknown error',
        });
      }
    }

    const hasErrors = errors.length > 0;
    const status = hasErrors ? (results.length > 0 ? 207 : 400) : 201; // 207 = Multi-Status

    response.status(status).json({
      success: !hasErrors || results.length > 0,
      results,
      errors,
      summary: {
        total: validatedBody.files.length,
        successful: results.length,
        failed: errors.length,
      },
    });

  } catch (error) {
    console.error('Batch upload handler error:', error);
    
    if (error instanceof z.ZodError) {
      return context.response.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Handle chunked file upload
 */
export async function handleChunkUpload(context: UploadHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, userId, request, response } = context;

    if (!request.files || !request.files.chunk) {
      return response.status(400).json({
        success: false,
        error: 'No chunk provided',
      });
    }

    const chunk = request.files.chunk;
    const validatedBody = chunkUploadSchema.parse(request.body);

    const { filename, chunkIndex, totalChunks, uploadId } = validatedBody;

    // Initialize or get chunk data
    if (!chunkStore.has(uploadId)) {
      chunkStore.set(uploadId, {
        chunks: new Array(totalChunks),
        metadata: validatedBody,
        receivedChunks: new Set(),
        totalChunks,
        createdAt: new Date(),
      });
    }

    const chunkData = chunkStore.get(uploadId)!;

    // Validate chunk index
    if (chunkIndex >= totalChunks) {
      return response.status(400).json({
        success: false,
        error: 'Invalid chunk index',
      });
    }

    // Store chunk
    chunkData.chunks[chunkIndex] = chunk.data;
    chunkData.receivedChunks.add(chunkIndex);

    // Check if all chunks received
    const isComplete = chunkData.receivedChunks.size === totalChunks;

    if (isComplete) {
      // Combine all chunks
      const combinedBuffer = Buffer.concat(chunkData.chunks);
      
      // Clean up chunk store
      chunkStore.delete(uploadId);

      // Upload combined file
      const result = await mediaService.uploadFile(
        combinedBuffer,
        {
          filename,
          folder: validatedBody.folder,
          alt: validatedBody.alt,
          caption: validatedBody.caption,
          tags: validatedBody.tags,
          isPublic: validatedBody.isPublic,
          generateThumbnails: true,
          optimizeImage: true,
          processVideo: false,
        },
        userId,
        tenantId
      );

      if (result.success) {
        response.status(201).json({
          success: true,
          complete: true,
          file: result.file,
          processingJob: result.processingJob,
        });
      } else {
        response.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } else {
      // Chunk received, waiting for more
      response.status(200).json({
        success: true,
        complete: false,
        received: chunkData.receivedChunks.size,
        total: totalChunks,
        progress: Math.round((chunkData.receivedChunks.size / totalChunks) * 100),
      });
    }

  } catch (error) {
    console.error('Chunk upload handler error:', error);
    
    if (error instanceof z.ZodError) {
      return context.response.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get chunk upload status
 */
export async function handleChunkUploadStatus(context: UploadHandlerContext): Promise<any> {
  try {
    const { request, response } = context;
    const uploadId = request.params.uploadId;

    if (!uploadId || !chunkStore.has(uploadId)) {
      return response.status(404).json({
        success: false,
        error: 'Upload session not found',
      });
    }

    const chunkData = chunkStore.get(uploadId)!;
    const receivedChunks = Array.from(chunkData.receivedChunks).sort((a, b) => a - b);
    const missingChunks = [];
    
    for (let i = 0; i < chunkData.totalChunks; i++) {
      if (!chunkData.receivedChunks.has(i)) {
        missingChunks.push(i);
      }
    }

    response.status(200).json({
      success: true,
      uploadId,
      totalChunks: chunkData.totalChunks,
      receivedChunks: receivedChunks,
      missingChunks: missingChunks,
      progress: Math.round((receivedChunks.length / chunkData.totalChunks) * 100),
      complete: receivedChunks.length === chunkData.totalChunks,
    });

  } catch (error) {
    console.error('Chunk upload status handler error:', error);
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Cancel chunk upload
 */
export async function handleCancelChunkUpload(context: UploadHandlerContext): Promise<any> {
  try {
    const { request, response } = context;
    const uploadId = request.params.uploadId;

    if (!uploadId || !chunkStore.has(uploadId)) {
      return response.status(404).json({
        success: false,
        error: 'Upload session not found',
      });
    }

    chunkStore.delete(uploadId);

    response.status(200).json({
      success: true,
      message: 'Upload session cancelled',
    });

  } catch (error) {
    console.error('Cancel chunk upload handler error:', error);
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
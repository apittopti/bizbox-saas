import { z } from 'zod';
import { MediaService, FileListOptions } from '../services/media-service';

export const listFilesSchema = z.object({
  folder: z.string().optional(),
  mimeType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'size', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  includeUsage: z.boolean().default(false),
});

export const updateFileSchema = z.object({
  alt: z.string().max(255).optional(),
  caption: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  folderId: z.string().uuid().optional(),
});

export const searchFilesSchema = z.object({
  query: z.string().min(1),
  mimeType: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['relevance', 'name', 'size', 'createdAt', 'updatedAt']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export interface FileHandlerContext {
  mediaService: MediaService;
  tenantId: string;
  userId: string;
  request: any;
  response: any;
}

/**
 * List files with filtering and pagination
 */
export async function handleListFiles(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, request, response } = context;

    // Validate query parameters
    const validatedQuery = listFilesSchema.parse(request.query);

    const options: FileListOptions = {
      folder: validatedQuery.folder,
      mimeType: validatedQuery.mimeType,
      tags: validatedQuery.tags,
      search: validatedQuery.search,
      sortBy: validatedQuery.sortBy,
      sortOrder: validatedQuery.sortOrder,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      includeUsage: validatedQuery.includeUsage,
    };

    const result = await mediaService.listFiles(tenantId, options);

    response.status(200).json({
      success: true,
      files: result.files,
      pagination: {
        total: result.total,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: result.hasMore,
      },
    });

  } catch (error) {
    console.error('List files handler error:', error);
    
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
 * Get file details by ID
 */
export async function handleGetFile(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, request, response } = context;

    const fileId = request.params.id;
    const includeUsage = request.query.includeUsage === 'true';

    if (!fileId) {
      return response.status(400).json({
        success: false,
        error: 'File ID is required',
      });
    }

    const file = await mediaService.getFile(fileId, tenantId, includeUsage);

    if (!file) {
      return response.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    response.status(200).json({
      success: true,
      file,
    });

  } catch (error) {
    console.error('Get file handler error:', error);
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Update file metadata
 */
export async function handleUpdateFile(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, userId, request, response } = context;

    const fileId = request.params.id;

    if (!fileId) {
      return response.status(400).json({
        success: false,
        error: 'File ID is required',
      });
    }

    // Validate request body
    const validatedBody = updateFileSchema.parse(request.body);

    const updatedFile = await mediaService.updateFile(
      fileId,
      tenantId,
      validatedBody,
      userId
    );

    if (!updatedFile) {
      return response.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    response.status(200).json({
      success: true,
      file: updatedFile,
    });

  } catch (error) {
    console.error('Update file handler error:', error);
    
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
 * Delete file
 */
export async function handleDeleteFile(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, userId, request, response } = context;

    const fileId = request.params.id;

    if (!fileId) {
      return response.status(400).json({
        success: false,
        error: 'File ID is required',
      });
    }

    const result = await mediaService.deleteFile(fileId, tenantId, userId);

    if (result.success) {
      response.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } else {
      const statusCode = result.error?.includes('not found') ? 404 : 400;
      response.status(statusCode).json({
        success: false,
        error: result.error,
      });
    }

  } catch (error) {
    console.error('Delete file handler error:', error);
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Search files
 */
export async function handleSearchFiles(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, request, response } = context;

    // Validate query parameters
    const validatedQuery = searchFilesSchema.parse(request.query);

    // Build search options
    const searchOptions: FileListOptions = {
      search: validatedQuery.query,
      mimeType: validatedQuery.mimeType,
      folder: validatedQuery.folder,
      tags: validatedQuery.tags,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
    };

    // For relevance sorting, we'll use the default createdAt desc for now
    // In a production system, you'd implement proper relevance scoring
    if (validatedQuery.sortBy !== 'relevance') {
      searchOptions.sortBy = validatedQuery.sortBy as any;
      searchOptions.sortOrder = validatedQuery.sortOrder;
    }

    const result = await mediaService.listFiles(tenantId, searchOptions);

    response.status(200).json({
      success: true,
      query: validatedQuery.query,
      results: result.files,
      pagination: {
        total: result.total,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: result.hasMore,
      },
    });

  } catch (error) {
    console.error('Search files handler error:', error);
    
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
 * Get file download URL
 */
export async function handleGetFileUrl(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, request, response } = context;

    const fileId = request.params.id;
    const download = request.query.download === 'true';
    const expiresIn = request.query.expiresIn ? parseInt(request.query.expiresIn as string) : 3600;

    if (!fileId) {
      return response.status(400).json({
        success: false,
        error: 'File ID is required',
      });
    }

    const file = await mediaService.getFile(fileId, tenantId);

    if (!file) {
      return response.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    const storageManager = mediaService['storageManager']; // Access private property
    let url: string;

    if (file.isPublic && !download) {
      // For public files, return public URL
      url = storageManager.getPublicUrl(tenantId, file.path);
    } else {
      // For private files or download requests, generate signed URL
      url = await storageManager.getSignedUrl(tenantId, file.path, {
        expiresIn,
        responseContentDisposition: download ? `attachment; filename="${file.originalName}"` : undefined,
      });
    }

    response.status(200).json({
      success: true,
      url,
      expiresAt: download ? new Date(Date.now() + (expiresIn * 1000)) : undefined,
    });

  } catch (error) {
    console.error('Get file URL handler error:', error);
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Batch delete files
 */
export async function handleBatchDeleteFiles(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, userId, request, response } = context;

    const { fileIds } = request.body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return response.status(400).json({
        success: false,
        error: 'File IDs array is required',
      });
    }

    if (fileIds.length > 100) {
      return response.status(400).json({
        success: false,
        error: 'Cannot delete more than 100 files at once',
      });
    }

    const results = [];
    const errors = [];

    // Process each file deletion
    for (const fileId of fileIds) {
      try {
        const result = await mediaService.deleteFile(fileId, tenantId, userId);
        
        if (result.success) {
          results.push({
            fileId,
            success: true,
          });
        } else {
          errors.push({
            fileId,
            error: result.error,
          });
        }
      } catch (fileError) {
        errors.push({
          fileId,
          error: fileError instanceof Error ? fileError.message : 'Unknown error',
        });
      }
    }

    const hasErrors = errors.length > 0;
    const status = hasErrors ? (results.length > 0 ? 207 : 400) : 200; // 207 = Multi-Status

    response.status(status).json({
      success: !hasErrors || results.length > 0,
      results,
      errors,
      summary: {
        total: fileIds.length,
        successful: results.length,
        failed: errors.length,
      },
    });

  } catch (error) {
    console.error('Batch delete files handler error:', error);
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get file metadata and analysis
 */
export async function handleAnalyzeFile(context: FileHandlerContext): Promise<any> {
  try {
    const { mediaService, tenantId, request, response } = context;

    const fileId = request.params.id;

    if (!fileId) {
      return response.status(400).json({
        success: false,
        error: 'File ID is required',
      });
    }

    const file = await mediaService.getFile(fileId, tenantId, true);

    if (!file) {
      return response.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // Basic file analysis
    const analysis = {
      basic: {
        filename: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        dimensions: file.width && file.height ? { width: file.width, height: file.height } : undefined,
        duration: file.duration,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
      storage: {
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        isPublic: file.isPublic,
        checksum: file.checksum,
      },
      usage: (file as any).usage || [],
      metadata: file.metadata,
      recommendations: [],
    };

    // Add optimization recommendations based on file type
    if (file.mimeType.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        analysis.recommendations.push('Consider optimizing image for web to reduce file size');
      }
      if (file.mimeType === 'image/png' && !file.thumbnailUrl) {
        analysis.recommendations.push('Consider converting to WebP format for better compression');
      }
    }

    if (file.mimeType.startsWith('video/')) {
      if (file.size > 100 * 1024 * 1024) { // 100MB
        analysis.recommendations.push('Consider compressing video for web delivery');
      }
      if (file.duration && file.duration > 600) { // 10 minutes
        analysis.recommendations.push('Long video detected - consider breaking into segments');
      }
    }

    response.status(200).json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('Analyze file handler error:', error);
    context.response.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
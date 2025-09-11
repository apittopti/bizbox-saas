import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MediaService } from '../services/media-service';
import { StorageManager } from '../storage/storage-manager';
import { ImageProcessor } from '../processing/image-processor';
import { VideoProcessor } from '../processing/video-processor';
import { FileValidator } from '../security/file-validator';

// Mock dependencies
jest.mock('../storage/storage-manager');
jest.mock('../processing/image-processor');
jest.mock('../processing/video-processor');
jest.mock('../security/file-validator');

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockStorageManager: jest.Mocked<StorageManager>;
  let mockImageProcessor: jest.Mocked<ImageProcessor>;
  let mockVideoProcessor: jest.Mocked<VideoProcessor>;
  let mockFileValidator: jest.Mocked<FileValidator>;
  let mockDatabase: any;

  const testTenantId = 'tenant-123';
  const testUserId = 'user-456';
  const testBuffer = Buffer.from('test file content');

  beforeEach(() => {
    // Setup mocks
    mockStorageManager = {
      upload: jest.fn(),
      delete: jest.fn(),
      getPublicUrl: jest.fn(),
      getSignedUrl: jest.fn(),
      listObjects: jest.fn(),
      exists: jest.fn(),
      getMetadata: jest.fn(),
      copy: jest.fn(),
      move: jest.fn(),
      getUsageStats: jest.fn(),
      healthCheck: jest.fn(),
      getAllProviders: jest.fn(),
      getPrimaryProvider: jest.fn(),
      getProvider: jest.fn(),
    } as any;

    mockImageProcessor = {
      extractMetadata: jest.fn(),
      processImage: jest.fn(),
      generateResponsiveVariants: jest.fn(),
      applyPreset: jest.fn(),
      createThumbnail: jest.fn(),
      optimizeForWeb: jest.fn(),
      analyzeImage: jest.fn(),
    } as any;

    mockVideoProcessor = {
      extractMetadata: jest.fn(),
      processVideo: jest.fn(),
      generateThumbnails: jest.fn(),
      applyPreset: jest.fn(),
      optimizeForStreaming: jest.fn(),
      analyzeVideo: jest.fn(),
    } as any;

    mockFileValidator = {
      validateFile: jest.fn(),
      scanForThreats: jest.fn(),
    } as any;

    mockDatabase = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'file-123',
            tenantId: testTenantId,
            filename: 'test.jpg',
            originalName: 'test.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
            url: 'https://example.com/test.jpg',
            uploadedBy: testUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
          limit: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      }),
    };

    const config = {
      storage: {
        providers: [],
      },
      processing: {
        image: {
          enabled: true,
          maxDimensions: { width: 10000, height: 10000 },
          defaultQuality: 85,
          generateThumbnails: true,
          thumbnailSizes: [],
        },
        video: {
          enabled: true,
          maxDuration: 3600,
          generateThumbnails: true,
          thumbnailTimestamps: [],
        },
      },
      validation: {
        maxFileSize: 100 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        scanForMalware: true,
      },
      features: {
        collections: true,
        transformations: true,
        auditLog: true,
        quotaManagement: true,
      },
    };

    mediaService = new MediaService({
      storageManager: mockStorageManager,
      imageProcessor: mockImageProcessor,
      videoProcessor: mockVideoProcessor,
      fileValidator: mockFileValidator,
      database: mockDatabase,
      config,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a valid file successfully', async () => {
      // Arrange
      mockFileValidator.validateFile.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedMimeType: 'image/jpeg',
        fileSize: 1024,
        checksum: 'abc123',
        metadata: {},
      });

      mockFileValidator.scanForThreats.mockResolvedValue({
        safe: true,
        threats: [],
        scanTime: 100,
        scannerUsed: 'test-scanner',
      });

      mockStorageManager.upload.mockResolvedValue({
        success: true,
        url: 'https://example.com/test.jpg',
        size: 1024,
        checksum: 'abc123',
      });

      // Act
      const result = await mediaService.uploadFile(
        testBuffer,
        {
          filename: 'test.jpg',
          alt: 'Test image',
          tags: ['test'],
        },
        testUserId,
        testTenantId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(mockFileValidator.validateFile).toHaveBeenCalledWith(testBuffer, 'test.jpg');
      expect(mockFileValidator.scanForThreats).toHaveBeenCalledWith(testBuffer, 'test.jpg');
      expect(mockStorageManager.upload).toHaveBeenCalled();
    });

    it('should reject invalid files', async () => {
      // Arrange
      mockFileValidator.validateFile.mockResolvedValue({
        valid: false,
        errors: ['Invalid file type'],
        warnings: [],
        detectedMimeType: 'application/octet-stream',
        fileSize: 1024,
        checksum: 'abc123',
        metadata: {},
      });

      // Act
      const result = await mediaService.uploadFile(
        testBuffer,
        { filename: 'test.exe' },
        testUserId,
        testTenantId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('File validation failed');
      expect(mockStorageManager.upload).not.toHaveBeenCalled();
    });

    it('should reject files with security threats', async () => {
      // Arrange
      mockFileValidator.validateFile.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedMimeType: 'image/jpeg',
        fileSize: 1024,
        checksum: 'abc123',
        metadata: {},
      });

      mockFileValidator.scanForThreats.mockResolvedValue({
        safe: false,
        threats: [
          {
            type: 'virus',
            severity: 'critical',
            description: 'Malware detected',
          },
        ],
        scanTime: 100,
        scannerUsed: 'test-scanner',
      });

      // Act
      const result = await mediaService.uploadFile(
        testBuffer,
        { filename: 'test.jpg' },
        testUserId,
        testTenantId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Security scan failed');
      expect(mockStorageManager.upload).not.toHaveBeenCalled();
    });

    it('should handle storage upload failures', async () => {
      // Arrange
      mockFileValidator.validateFile.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
        detectedMimeType: 'image/jpeg',
        fileSize: 1024,
        checksum: 'abc123',
        metadata: {},
      });

      mockFileValidator.scanForThreats.mockResolvedValue({
        safe: true,
        threats: [],
        scanTime: 100,
        scannerUsed: 'test-scanner',
      });

      mockStorageManager.upload.mockResolvedValue({
        success: false,
        error: 'Storage error',
      });

      // Act
      const result = await mediaService.uploadFile(
        testBuffer,
        { filename: 'test.jpg' },
        testUserId,
        testTenantId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('getFile', () => {
    it('should retrieve a file by id', async () => {
      // Arrange
      const mockFile = {
        id: 'file-123',
        tenantId: testTenantId,
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: 'https://example.com/test.jpg',
      };

      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockFile]),
        }),
      });

      // Act
      const result = await mediaService.getFile('file-123', testTenantId);

      // Assert
      expect(result).toEqual(mockFile);
    });

    it('should return null for non-existent file', async () => {
      // Arrange
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      // Act
      const result = await mediaService.getFile('non-existent', testTenantId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateFile', () => {
    it('should update file metadata', async () => {
      // Arrange
      const updatedFile = {
        id: 'file-123',
        alt: 'Updated alt text',
        updatedAt: new Date(),
      };

      mockDatabase.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedFile]),
          }),
        }),
      });

      // Act
      const result = await mediaService.updateFile(
        'file-123',
        testTenantId,
        { alt: 'Updated alt text' },
        testUserId
      );

      // Assert
      expect(result).toEqual(updatedFile);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      // Arrange
      const mockFile = {
        id: 'file-123',
        path: 'test.jpg',
        originalName: 'test.jpg',
        size: 1024,
      };

      // Mock getFile to return the file
      jest.spyOn(mediaService, 'getFile').mockResolvedValue(mockFile as any);

      mockStorageManager.delete.mockResolvedValue({
        success: true,
      });

      // Act
      const result = await mediaService.deleteFile('file-123', testTenantId, testUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockStorageManager.delete).toHaveBeenCalledWith(testTenantId, mockFile.path);
    });

    it('should fail when file not found', async () => {
      // Arrange
      jest.spyOn(mediaService, 'getFile').mockResolvedValue(null);

      // Act
      const result = await mediaService.deleteFile('non-existent', testTenantId, testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(mockStorageManager.delete).not.toHaveBeenCalled();
    });
  });

  describe('createFolder', () => {
    it('should create a folder successfully', async () => {
      // Arrange
      const newFolder = {
        id: 'folder-123',
        tenantId: testTenantId,
        name: 'test-folder',
        path: 'test-folder',
        createdBy: testUserId,
      };

      // Mock existing folder check
      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]), // No existing folder
          limit: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]), // No existing folder
          }),
        }),
      });

      mockDatabase.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newFolder]),
        }),
      });

      // Act
      const result = await mediaService.createFolder(
        testTenantId,
        'test-folder',
        testUserId
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.folder).toEqual(newFolder);
    });

    it('should reject invalid folder names', async () => {
      // Act
      const result = await mediaService.createFolder(
        testTenantId,
        'invalid name!',
        testUserId
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Folder name can only contain');
    });
  });

  describe('listFiles', () => {
    it('should list files with pagination', async () => {
      // Arrange
      const mockFiles = [
        { id: 'file-1', originalName: 'file1.jpg' },
        { id: 'file-2', originalName: 'file2.jpg' },
      ];

      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockFiles),
              }),
            }),
          }),
        }),
      });

      // Mock count query
      mockDatabase.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: '10' }]),
        }),
      });

      // Act
      const result = await mediaService.listFiles(testTenantId, {
        limit: 2,
        offset: 0,
      });

      // Assert
      expect(result.files).toEqual(mockFiles);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getUsageAnalytics', () => {
    it('should return usage analytics', async () => {
      // Arrange
      const mockFiles = [
        { mimeType: 'image/jpeg', size: 1024 },
        { mimeType: 'video/mp4', size: 2048 },
        { mimeType: 'image/png', size: 512 },
      ];

      mockDatabase.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockFiles),
        }),
      });

      mockStorageManager.getUsageStats.mockResolvedValue({
        totalSize: 3584,
        totalFiles: 3,
        byFolder: {},
      });

      // Act
      const result = await mediaService.getUsageAnalytics(testTenantId);

      // Assert
      expect(result.totalFiles).toBe(3);
      expect(result.totalSize).toBe(3584);
      expect(result.filesByType).toEqual({
        image: 2,
        video: 1,
      });
      expect(result.sizeByType).toEqual({
        image: 1536,
        video: 2048,
      });
    });
  });
});
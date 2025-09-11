# BizBox Media Manager Plugin

A comprehensive media management plugin for the BizBox platform that handles file uploads, storage, optimization, and management for all tenant media assets.

## Features

### 🚀 Core Functionality
- **Multi-file uploads** with drag & drop interface and progress tracking
- **Cloud storage** with S3-compatible providers (AWS S3, Cloudflare R2) and local fallback
- **Image processing** with Sharp for optimization, resizing, and format conversion
- **Video processing** with FFmpeg for thumbnails, compression, and optimization
- **Comprehensive security** with virus scanning, file validation, and threat detection
- **Tenant isolation** with secure storage buckets and database separation

### 📁 File Management
- **Hierarchical folder system** with drag-and-drop organization
- **Advanced search** with full-text search, filtering, and tagging
- **File collections** for curating and organizing media assets
- **Usage tracking** to see where files are being used across the platform
- **Batch operations** for bulk uploads, edits, and deletions

### 🎨 Media Processing
- **Image optimization** with WebP/AVIF conversion and quality control
- **Responsive variants** automatically generated in multiple sizes
- **Video thumbnails** extracted at configurable timestamps
- **Format conversion** supporting all major image and video formats
- **Metadata extraction** including EXIF data, dimensions, and duration

### 🔒 Security & Validation
- **File type validation** with magic number verification
- **Virus scanning** with configurable security policies
- **Size limits** per file type and tenant quotas
- **Content analysis** to detect embedded scripts and malicious patterns
- **Access control** with role-based permissions and signed URLs

### 📊 Analytics & Monitoring
- **Storage usage** tracking and quota management
- **Performance metrics** for uploads and processing
- **Audit logging** for compliance and security monitoring
- **Health checks** for storage providers and processing services

## Installation

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run tests
pnpm test
```

## Configuration

### Basic Configuration

```typescript
import { MediaManagerPlugin } from '@bizbox/plugin-media-manager';

const mediaManager = new MediaManagerPlugin({
  storage: {
    providers: [
      {
        type: 's3',
        name: 'primary-storage',
        enabled: true,
        priority: 1,
        config: {
          region: 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          bucket: 'my-media-bucket',
          cdnUrl: 'https://cdn.example.com',
        },
      },
    ],
  },
  processing: {
    image: {
      enabled: true,
      defaultQuality: 85,
      generateThumbnails: true,
      thumbnailSizes: [
        { width: 150, height: 150, suffix: 'thumb' },
        { width: 400, height: 300, suffix: 'medium' },
        { width: 1200, height: 800, suffix: 'large' },
      ],
    },
    video: {
      enabled: true,
      ffmpegPath: '/usr/bin/ffmpeg',
      generateThumbnails: true,
      thumbnailTimestamps: [0, 30, 60],
    },
  },
  validation: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    scanForMalware: true,
  },
});
```

### Storage Providers

#### AWS S3
```typescript
{
  type: 's3',
  config: {
    region: 'us-east-1',
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
    bucket: 'your-bucket-name',
    cdnUrl: 'https://your-cdn.com', // optional
  }
}
```

#### Cloudflare R2
```typescript
{
  type: 'r2',
  config: {
    accountId: 'your-account-id',
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
    bucket: 'your-bucket-name',
    endpoint: 'https://your-account-id.r2.cloudflarestorage.com',
  }
}
```

#### Local Storage
```typescript
{
  type: 'local',
  config: {
    basePath: './uploads',
    baseUrl: '/uploads',
    createDirectories: true,
  }
}
```

## Usage

### Plugin Integration

```typescript
import { MediaManagerPlugin, createMediaManagerIntegration } from '@bizbox/plugin-media-manager';

// Initialize plugin
const plugin = new MediaManagerPlugin(config);
await plugin.initialize(context);

// Get integration for other plugins
const mediaAPI = createMediaManagerIntegration(
  plugin.getMediaService(),
  plugin.getStorageManager(),
  // ... other services
);
```

### API Usage

#### Upload Files
```typescript
const result = await mediaAPI.api.uploadFile(
  fileBuffer,
  {
    filename: 'example.jpg',
    folder: 'products',
    alt: 'Product image',
    tags: ['product', 'featured'],
    generateThumbnails: true,
    optimizeImage: true,
  },
  userId,
  tenantId
);
```

#### Search Files
```typescript
const results = await mediaAPI.api.searchFiles(tenantId, {
  query: 'product images',
  mimeType: 'image/',
  tags: ['featured'],
  limit: 20,
});
```

#### Process Images
```typescript
const processed = await mediaAPI.api.processImage(buffer, {
  width: 800,
  height: 600,
  format: 'webp',
  quality: 85,
});
```

### React Components

#### Media Library
```tsx
import { MediaLibrary } from '@bizbox/plugin-media-manager';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <MediaLibrary
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      mode="selector"
      multiple={true}
      onSelect={(files) => {
        console.log('Selected files:', files);
      }}
      tenantId="tenant-123"
      userId="user-456"
    />
  );
}
```

## API Endpoints

### File Operations
- `POST /api/plugins/media-manager/upload` - Upload single file
- `POST /api/plugins/media-manager/upload/batch` - Upload multiple files
- `POST /api/plugins/media-manager/upload/chunk` - Chunked upload for large files
- `GET /api/plugins/media-manager/files` - List files with pagination
- `GET /api/plugins/media-manager/files/:id` - Get file details
- `PUT /api/plugins/media-manager/files/:id` - Update file metadata
- `DELETE /api/plugins/media-manager/files/:id` - Delete file

### Folder Operations
- `GET /api/plugins/media-manager/folders` - List folders
- `POST /api/plugins/media-manager/folders` - Create folder
- `PUT /api/plugins/media-manager/folders/:id` - Update folder
- `DELETE /api/plugins/media-manager/folders/:id` - Delete folder

### Processing
- `POST /api/plugins/media-manager/process/:id` - Process/transform file
- `GET /api/plugins/media-manager/process/:id/status` - Get processing status

### Search & Analytics
- `GET /api/plugins/media-manager/search` - Search files
- `GET /api/plugins/media-manager/analytics` - Get usage analytics
- `GET /api/plugins/media-manager/health` - Health check

## Events

The plugin emits various events that other plugins can listen to:

```typescript
import { MediaManagerEvents } from '@bizbox/plugin-media-manager';

// Listen for file uploads
plugin.subscribeToEvent(MediaManagerEvents.FILE_UPLOADED, (payload) => {
  console.log('File uploaded:', payload.file);
});

// Listen for processing completion
plugin.subscribeToEvent(MediaManagerEvents.PROCESSING_COMPLETED, (payload) => {
  console.log('Processing completed:', payload.result);
});
```

## Database Schema

The plugin uses Drizzle ORM with PostgreSQL and includes the following tables:

- **media_files** - File metadata and information
- **media_folders** - Hierarchical folder structure
- **media_usage** - Track where files are used
- **media_collections** - File collections and albums
- **media_transformations** - Processing history
- **media_audit_log** - Security and compliance logging

## Security Features

### File Validation
- Magic number verification
- MIME type validation
- File size limits
- Extension validation
- Content analysis

### Threat Detection
- Virus scanning with ClamAV
- Pattern-based malware detection
- Embedded script detection
- Polyglot file detection
- Entropy analysis

### Access Control
- Tenant isolation
- Role-based permissions
- Signed URLs for private files
- IP-based restrictions
- Rate limiting

## Performance Optimization

### Image Processing
- Automatic WebP conversion
- Progressive JPEG generation
- Multiple size variants
- Lazy loading support
- CDN optimization

### Video Processing
- Automatic compression
- Thumbnail generation
- Format conversion
- Streaming optimization
- Background processing

### Storage Optimization
- Multi-provider failover
- Intelligent tiering
- Compression algorithms
- Deduplication
- Lifecycle policies

## Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test media-service.test.ts
pnpm test file-validator.test.ts

# Run with coverage
pnpm test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- GitHub Issues: [Create an issue](https://github.com/bizbox/bizbox/issues)
- Documentation: [docs.bizbox.com](https://docs.bizbox.com)
- Community: [community.bizbox.com](https://community.bizbox.com)
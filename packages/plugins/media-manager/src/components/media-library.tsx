import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bizbox/shared-ui'
import { Button } from '@bizbox/shared-ui'
import { Badge } from '@bizbox/shared-ui'
import { Input } from '@bizbox/shared-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@bizbox/shared-ui'
import { Progress } from '@bizbox/shared-ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bizbox/shared-ui'
import { 
  Upload, 
  Search, 
  Filter, 
  Grid, 
  List, 
  FolderPlus, 
  Trash2, 
  Download, 
  Eye, 
  Edit, 
  Tag, 
  Image, 
  Video, 
  FileText, 
  Music,
  MoreHorizontal,
  X,
  Check
} from 'lucide-react'
import { 
  MediaFile, 
  MediaFolder, 
  SearchOptions, 
  UploadOptions,
  enhancedMediaManager 
} from '../enhanced-media-manager'

interface MediaLibraryProps {
  tenantId: string
  userId: string
  onFileSelect?: (file: MediaFile) => void
  selectionMode?: 'single' | 'multiple' | 'none'
  allowedTypes?: string[]
  maxSelections?: number
}

interface FileUploadProps {
  onUpload: (files: FileList) => void
  onClose: () => void
  uploading: boolean
  progress: Record<string, number>
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, onClose, uploading, progress }) => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files)
    }
  }, [onUpload])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFiles(e.target.files)
    }
  }

  const handleUpload = () => {
    if (selectedFiles) {
      onUpload(selectedFiles)
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Upload Files</DialogTitle>
        <DialogDescription>
          Drag and drop files here or click to select files
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            {dragActive ? 'Drop files here' : 'Drag files here to upload'}
          </p>
          <p className="text-gray-600 mb-4">
            or click the button below to select files
          </p>
          
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            accept="image/*,video/*,audio/*,.pdf,.txt,.csv,.zip"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" className="cursor-pointer">
              Select Files
            </Button>
          </label>
        </div>

        {selectedFiles && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Files:</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <h4 className="font-medium">Upload Progress:</h4>
            {Object.entries(progress).map(([filename, percent]) => (
              <div key={filename} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{filename}</span>
                  <span>{percent}%</span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFiles || uploading}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

const FilePreview: React.FC<{ 
  file: MediaFile
  onClose: () => void
  onEdit: (file: MediaFile) => void
  onDelete: (file: MediaFile) => void
}> = ({ file, onClose, onEdit, onDelete }) => {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6" />
    if (mimeType.startsWith('video/')) return <Video className="w-6 h-6" />
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6" />
    return <FileText className="w-6 h-6" />
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {getFileIcon(file.mimeType)}
          {file.originalName}
        </DialogTitle>
        <DialogDescription>
          {file.mimeType} • {formatFileSize(file.size)} • Uploaded {file.uploadedAt.toLocaleDateString()}
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="preview" className="flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 overflow-auto">
          <div className="space-y-4">
            {file.mimeType.startsWith('image/') && (
              <div className="flex justify-center">
                <img
                  src={file.url}
                  alt={file.originalName}
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            )}
            
            {file.mimeType.startsWith('video/') && (
              <div className="flex justify-center">
                <video
                  src={file.url}
                  controls
                  className="max-w-full max-h-96 rounded-lg"
                />
              </div>
            )}

            {file.mimeType.startsWith('audio/') && (
              <div className="flex justify-center p-8">
                <audio src={file.url} controls className="w-full max-w-md" />
              </div>
            )}

            {file.mimeType === 'application/pdf' && (
              <div className="text-center p-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">PDF Preview not available</p>
                <Button variant="outline" className="mt-4">
                  <Download className="w-4 h-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}

            {/* File Versions */}
            {file.versions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Available Versions</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {file.versions.map(version => (
                    <Card key={version.id} className="p-3">
                      <div className="text-center">
                        <p className="font-medium text-sm capitalize">{version.type}</p>
                        {version.width && version.height && (
                          <p className="text-xs text-gray-600">
                            {version.width} × {version.height}
                          </p>
                        )}
                        <p className="text-xs text-gray-600">
                          {formatFileSize(version.size)}
                        </p>
                        <Button variant="outline" size="sm" className="mt-2 w-full">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">File Name</label>
                <p className="text-sm text-gray-600">{file.originalName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">File Type</label>
                <p className="text-sm text-gray-600">{file.mimeType}</p>
              </div>
              <div>
                <label className="text-sm font-medium">File Size</label>
                <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Uploaded</label>
                <p className="text-sm text-gray-600">
                  {file.uploadedAt.toLocaleDateString()} at {file.uploadedAt.toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {file.metadata.width && file.metadata.height && (
                <div>
                  <label className="text-sm font-medium">Dimensions</label>
                  <p className="text-sm text-gray-600">
                    {file.metadata.width} × {file.metadata.height} pixels
                  </p>
                </div>
              )}
              {file.metadata.duration && (
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <p className="text-sm text-gray-600">{file.metadata.duration} seconds</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {file.tags.length > 0 ? (
                    file.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No tags</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">Usage History</h4>
            {file.usage.length > 0 ? (
              <div className="space-y-2">
                {file.usage.map(usage => (
                  <div key={usage.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm capitalize">{usage.type}</p>
                      <p className="text-xs text-gray-600">{usage.context}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {usage.usedAt.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No usage recorded yet</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => onEdit(file)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" onClick={() => onDelete(file)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
        <Button variant="outline" onClick={onClose} className="ml-auto">
          Close
        </Button>
      </div>
    </DialogContent>
  )
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  tenantId,
  userId,
  onFileSelect,
  selectionMode = 'none',
  allowedTypes,
  maxSelections = 1
}) => {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [currentFolder, setCurrentFolder] = useState<string | undefined>()
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [showPreview, setShowPreview] = useState<MediaFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Load files and folders
  useEffect(() => {
    loadMedia()
  }, [tenantId, currentFolder, searchQuery])

  const loadMedia = async () => {
    setLoading(true)
    try {
      // Load folder structure
      const folderStructure = await enhancedMediaManager.getFolderStructure(tenantId, currentFolder)
      setFolders(folderStructure.folders)

      // Search files
      const searchOptions: SearchOptions = {
        folderId: currentFolder,
        query: searchQuery || undefined,
        mimeType: allowedTypes?.[0]
      }

      const searchResult = await enhancedMediaManager.searchFiles(tenantId, searchOptions)
      setFiles(searchResult.files)
    } catch (error) {
      console.error('Failed to load media:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (fileList: FileList) => {
    setUploading(true)
    setUploadProgress({})

    try {
      const filesArray = Array.from(fileList).map(file => ({ file, name: file.name }))
      
      // Track upload progress
      enhancedMediaManager.on('upload:progress', ({ fileId, progress }) => {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: progress.progress
        }))
      })

      const result = await enhancedMediaManager.uploadFiles(
        tenantId,
        userId,
        filesArray,
        {
          folderId: currentFolder,
          generateVersions: true,
          optimizeImages: true,
          scanForMalware: true
        }
      )

      if (result.successful.length > 0) {
        await loadMedia() // Reload to show new files
        setShowUpload(false)
      }

      if (result.failed.length > 0) {
        console.error('Some files failed to upload:', result.failed)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
      setUploadProgress({})
    }
  }

  const handleFileSelect = (file: MediaFile) => {
    if (selectionMode === 'none') {
      setShowPreview(file)
      return
    }

    if (onFileSelect) {
      onFileSelect(file)
    }

    if (selectionMode === 'single') {
      setSelectedFiles(new Set([file.id]))
    } else if (selectionMode === 'multiple') {
      const newSelection = new Set(selectedFiles)
      if (newSelection.has(file.id)) {
        newSelection.delete(file.id)
      } else if (newSelection.size < maxSelections) {
        newSelection.add(file.id)
      }
      setSelectedFiles(newSelection)
    }
  }

  const handleFileEdit = (file: MediaFile) => {
    // Open file edit dialog
    console.log('Edit file:', file)
  }

  const handleFileDelete = async (file: MediaFile) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await enhancedMediaManager.deleteFile(file.id)
        await loadMedia()
        setShowPreview(null)
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />
    return <FileText className="w-5 h-5" />
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const FileCard: React.FC<{ file: MediaFile }> = ({ file }) => {
    const isSelected = selectedFiles.has(file.id)
    
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
        onClick={() => handleFileSelect(file)}
      >
        <CardContent className="p-3">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
            {file.mimeType.startsWith('image/') ? (
              <img
                src={file.thumbnailUrl || file.url}
                alt={file.originalName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {getFileIcon(file.mimeType)}
              </div>
            )}
            
            {selectionMode !== 'none' && (
              <div className="absolute top-2 right-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected 
                    ? 'bg-primary border-primary text-white' 
                    : 'bg-white border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="font-medium text-sm truncate" title={file.originalName}>
              {file.originalName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)}
            </p>
            {file.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {file.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {file.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{file.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const FileRow: React.FC<{ file: MediaFile }> = ({ file }) => {
    const isSelected = selectedFiles.has(file.id)
    
    return (
      <div 
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
          isSelected ? 'bg-primary/5 border border-primary' : 'border border-transparent'
        }`}
        onClick={() => handleFileSelect(file)}
      >
        {selectionMode !== 'none' && (
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected 
              ? 'bg-primary border-primary text-white' 
              : 'bg-white border-gray-300'
          }`}>
            {isSelected && <Check className="w-3 h-3" />}
          </div>
        )}
        
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {file.mimeType.startsWith('image/') ? (
            <img
              src={file.thumbnailUrl || file.url}
              alt={file.originalName}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            getFileIcon(file.mimeType)
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.originalName}</p>
          <p className="text-sm text-gray-500">
            {file.mimeType} • {formatFileSize(file.size)}
          </p>
        </div>
        
        <div className="text-sm text-gray-500">
          {file.uploadedAt.toLocaleDateString()}
        </div>
        
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media Library</h2>
          <p className="text-gray-600">
            {files.length} files {currentFolder && 'in current folder'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      {currentFolder && (
        <div className="flex items-center gap-2 text-sm">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setCurrentFolder(undefined)}
          >
            All Files
          </Button>
          <span className="text-gray-400">/</span>
          <span className="font-medium">Current Folder</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders */}
          {folders.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Folders</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {folders.map(folder => (
                  <Card 
                    key={folder.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setCurrentFolder(folder.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <FolderPlus className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <p className="font-medium text-sm truncate">{folder.name}</p>
                      <p className="text-xs text-gray-500">
                        {folder.metadata.fileCount} files
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div className="space-y-3">
            <h3 className="font-medium">Files</h3>
            {files.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {files.map(file => (
                    <FileCard key={file.id} file={file} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map(file => (
                    <FileRow key={file.id} file={file} />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No files found</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowUpload(true)}
                >
                  Upload your first file
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <FileUpload
          onUpload={handleFileUpload}
          onClose={() => setShowUpload(false)}
          uploading={uploading}
          progress={uploadProgress}
        />
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        {showPreview && (
          <FilePreview
            file={showPreview}
            onClose={() => setShowPreview(null)}
            onEdit={handleFileEdit}
            onDelete={handleFileDelete}
          />
        )}
      </Dialog>
    </div>
  )
}
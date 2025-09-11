import React, { useState, useEffect } from 'react'
import { Button } from '@bizbox/shared-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@bizbox/shared-ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bizbox/shared-ui'
import { Badge } from '@bizbox/shared-ui'
import { Input } from '@bizbox/shared-ui'
import { 
  Image, 
  Upload, 
  Search, 
  Grid, 
  List, 
  Check, 
  X, 
  Crop, 
  Palette, 
  Zap,
  Eye,
  Download
} from 'lucide-react'
import { MediaFile, enhancedMediaManager } from '@bizbox/media-manager'

interface MediaSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (file: MediaFile, optimizations?: ImageOptimizations) => void
  allowedTypes?: string[]
  title?: string
  description?: string
  maxSelections?: number
  selectionMode?: 'single' | 'multiple'
  showOptimizations?: boolean
}

interface ImageOptimizations {
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

interface MediaPickerProps {
  onSelect: (file: MediaFile) => void
  placeholder?: string
  selectedFile?: MediaFile
  allowedTypes?: string[]
  className?: string
}

interface OptimizationPanelProps {
  file: MediaFile
  optimizations: ImageOptimizations
  onOptimizationsChange: (optimizations: ImageOptimizations) => void
}

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  file,
  optimizations,
  onOptimizationsChange
}) => {
  const handleResizeChange = (field: keyof NonNullable<ImageOptimizations['resize']>, value: any) => {
    onOptimizationsChange({
      ...optimizations,
      resize: {
        ...optimizations.resize,
        width: optimizations.resize?.width || file.metadata.width || 800,
        height: optimizations.resize?.height || file.metadata.height || 600,
        fit: optimizations.resize?.fit || 'cover',
        [field]: value
      }
    })
  }

  const handleFilterChange = (filter: keyof NonNullable<ImageOptimizations['filters']>, value: number) => {
    onOptimizationsChange({
      ...optimizations,
      filters: {
        ...optimizations.filters,
        [filter]: value
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="space-y-3">
        <h4 className="font-medium">Preview</h4>
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={file.url}
            alt={file.originalName}
            className="w-full h-full object-cover"
            style={{
              filter: `
                brightness(${(optimizations.filters?.brightness || 100)}%)
                contrast(${(optimizations.filters?.contrast || 100)}%)
                saturate(${(optimizations.filters?.saturation || 100)}%)
                blur(${(optimizations.filters?.blur || 0)}px)
              `
            }}
          />
        </div>
      </div>

      {/* Resize Options */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Crop className="w-4 h-4" />
          Resize & Crop
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Width</label>
            <Input
              type="number"
              value={optimizations.resize?.width || file.metadata.width || 800}
              onChange={(e) => handleResizeChange('width', parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Height</label>
            <Input
              type="number"
              value={optimizations.resize?.height || file.metadata.height || 600}
              onChange={(e) => handleResizeChange('height', parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Fit Mode</label>
          <select
            value={optimizations.resize?.fit || 'cover'}
            onChange={(e) => handleResizeChange('fit', e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="cover">Cover (crop to fit)</option>
            <option value="contain">Contain (fit within bounds)</option>
            <option value="fill">Fill (stretch to fit)</option>
          </select>
        </div>
      </div>

      {/* Quality & Format */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quality & Format
        </h4>
        <div>
          <label className="text-sm font-medium">Quality: {optimizations.quality || 85}%</label>
          <input
            type="range"
            min="10"
            max="100"
            value={optimizations.quality || 85}
            onChange={(e) => onOptimizationsChange({
              ...optimizations,
              quality: parseInt(e.target.value)
            })}
            className="w-full mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Format</label>
          <select
            value={optimizations.format || 'jpeg'}
            onChange={(e) => onOptimizationsChange({
              ...optimizations,
              format: e.target.value as any
            })}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="jpeg">JPEG (smaller file size)</option>
            <option value="webp">WebP (modern browsers)</option>
            <option value="avif">AVIF (best compression)</option>
            <option value="png">PNG (lossless)</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Filters
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">
              Brightness: {optimizations.filters?.brightness || 100}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={optimizations.filters?.brightness || 100}
              onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Contrast: {optimizations.filters?.contrast || 100}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={optimizations.filters?.contrast || 100}
              onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Saturation: {optimizations.filters?.saturation || 100}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={optimizations.filters?.saturation || 100}
              onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Blur: {optimizations.filters?.blur || 0}px
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={optimizations.filters?.blur || 0}
              onChange={(e) => handleFilterChange('blur', parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={() => onOptimizationsChange({})}
        className="w-full"
      >
        Reset to Original
      </Button>
    </div>
  )
}

export const MediaSelector: React.FC<MediaSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  allowedTypes = ['image/*'],
  title = 'Select Media',
  description = 'Choose files from your media library',
  maxSelections = 1,
  selectionMode = 'single',
  showOptimizations = true
}) => {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [optimizations, setOptimizations] = useState<ImageOptimizations>({})
  const [activeTab, setActiveTab] = useState('browse')

  useEffect(() => {
    if (isOpen) {
      loadFiles()
    }
  }, [isOpen, searchQuery])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const result = await enhancedMediaManager.searchFiles('tenant-id', {
        query: searchQuery || undefined,
        mimeType: allowedTypes[0]?.replace('/*', ''),
        limit: 50
      })
      setFiles(result.files)
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file: MediaFile) => {
    if (selectionMode === 'single') {
      setSelectedFile(file)
      setSelectedFiles(new Set([file.id]))
      if (showOptimizations && file.mimeType.startsWith('image/')) {
        setActiveTab('optimize')
      }
    } else {
      const newSelection = new Set(selectedFiles)
      if (newSelection.has(file.id)) {
        newSelection.delete(file.id)
      } else if (newSelection.size < maxSelections) {
        newSelection.add(file.id)
      }
      setSelectedFiles(newSelection)
    }
  }

  const handleConfirmSelection = () => {
    if (selectionMode === 'single' && selectedFile) {
      onSelect(selectedFile, showOptimizations ? optimizations : undefined)
    } else {
      // Handle multiple selection
      const selected = files.filter(f => selectedFiles.has(f.id))
      selected.forEach(file => onSelect(file))
    }
    onClose()
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
      <div 
        className={`relative cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg overflow-hidden ${
          isSelected ? 'ring-2 ring-primary' : 'border border-gray-200'
        }`}
        onClick={() => handleFileSelect(file)}
      >
        <div className="aspect-square bg-gray-100 relative">
          {file.mimeType.startsWith('image/') ? (
            <img
              src={file.thumbnailUrl || file.url}
              alt={file.originalName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
          )}
          
          {selectionMode !== 'none' && (
            <div className="absolute top-2 right-2">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                isSelected 
                  ? 'bg-primary border-primary text-white' 
                  : 'bg-white border-gray-300'
              }`}>
                {isSelected && <Check className="w-4 h-4" />}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3">
          <p className="font-medium text-sm truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
          {file.metadata.width && file.metadata.height && (
            <p className="text-xs text-gray-500">
              {file.metadata.width} × {file.metadata.height}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            {showOptimizations && selectedFile && (
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="browse" className="flex-1 overflow-auto space-y-4">
            {/* Search and View Controls */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
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

            {/* Files Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : files.length > 0 ? (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'
                  : 'space-y-2'
              }>
                {files.map(file => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No files found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-auto">
            <div className="text-center py-12">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">Upload functionality would be integrated here</p>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </TabsContent>

          {showOptimizations && selectedFile && (
            <TabsContent value="optimize" className="flex-1 overflow-auto">
              <OptimizationPanel
                file={selectedFile}
                optimizations={optimizations}
                onOptimizationsChange={setOptimizations}
              />
            </TabsContent>
          )}
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedFiles.size > 0 && (
              <span>{selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSelection}
              disabled={selectedFiles.size === 0}
            >
              Select {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onSelect,
  placeholder = 'Select an image',
  selectedFile,
  allowedTypes = ['image/*'],
  className = ''
}) => {
  const [showSelector, setShowSelector] = useState(false)

  const handleFileSelect = (file: MediaFile, optimizations?: ImageOptimizations) => {
    onSelect(file)
    setShowSelector(false)
  }

  return (
    <>
      <div 
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors hover:border-gray-400 ${className}`}
        onClick={() => setShowSelector(true)}
      >
        {selectedFile ? (
          <div className="space-y-3">
            {selectedFile.mimeType.startsWith('image/') && (
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={selectedFile.thumbnailUrl || selectedFile.url}
                  alt={selectedFile.originalName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="text-center">
              <p className="font-medium">{selectedFile.originalName}</p>
              <p className="text-sm text-gray-500">
                {selectedFile.metadata.width && selectedFile.metadata.height && (
                  `${selectedFile.metadata.width} × ${selectedFile.metadata.height} • `
                )}
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 font-medium">{placeholder}</p>
            <p className="text-sm text-gray-500 mt-1">Click to browse your media library</p>
          </div>
        )}
      </div>

      <MediaSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelect={handleFileSelect}
        allowedTypes={allowedTypes}
        title="Select Media"
        description="Choose a file from your media library"
        showOptimizations={true}
      />
    </>
  )
}

// Hook for media integration in components
export const useMediaIntegration = () => {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const [showMediaSelector, setShowMediaSelector] = useState(false)

  const openMediaSelector = () => setShowMediaSelector(true)
  const closeMediaSelector = () => setShowMediaSelector(false)

  const handleMediaSelect = (file: MediaFile, optimizations?: ImageOptimizations) => {
    setSelectedMedia(file)
    closeMediaSelector()
    
    // Apply optimizations if provided
    if (optimizations) {
      // This would trigger image optimization processing
      console.log('Applying optimizations:', optimizations)
    }
  }

  return {
    selectedMedia,
    setSelectedMedia,
    showMediaSelector,
    openMediaSelector,
    closeMediaSelector,
    handleMediaSelect
  }
}

// Component for integrating media selection into form fields
export const MediaFormField: React.FC<{
  label: string
  value?: MediaFile
  onChange: (file: MediaFile | null) => void
  allowedTypes?: string[]
  required?: boolean
  description?: string
}> = ({ label, value, onChange, allowedTypes, required, description }) => {
  const [showSelector, setShowSelector] = useState(false)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      <div className="space-y-3">
        {value ? (
          <div className="relative">
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-3">
                {value.mimeType.startsWith('image/') && (
                  <img
                    src={value.thumbnailUrl || value.url}
                    alt={value.originalName}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{value.originalName}</p>
                  <p className="text-xs text-gray-500">
                    {value.metadata.width && value.metadata.height && (
                      `${value.metadata.width} × ${value.metadata.height} • `
                    )}
                    {(value.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSelector(true)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChange(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowSelector(true)}
            className="w-full h-24 border-dashed"
          >
            <div className="text-center">
              <Image className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <span className="text-sm">Select {label.toLowerCase()}</span>
            </div>
          </Button>
        )}
      </div>

      <MediaSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelect={(file) => {
          onChange(file)
          setShowSelector(false)
        }}
        allowedTypes={allowedTypes}
        title={`Select ${label}`}
        showOptimizations={true}
      />
    </div>
  )
}
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  FiUpload, 
  FiFolder, 
  FiImage, 
  FiVideo, 
  FiFile,
  FiSearch,
  FiGrid,
  FiList,
  FiFilter,
  FiMoreVertical,
  FiTrash2,
  FiEdit3,
  FiDownload,
  FiEye,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiTag,
  FiCopy,
  FiMove,
  FiShare2,
  FiPlay,
  FiPause,
  FiMusic,
  FiCheck,
  FiAlertCircle,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';

// Types
export interface MediaFile {
  id: string;
  tenantId: string;
  filename: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  alt?: string;
  caption?: string;
  tags: string[];
  isPublic: boolean;
  isProcessed: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  checksum: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFolder {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  parentId?: string;
  path: string;
  description?: string;
  isPublic: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'browser' | 'selector';
  acceptedTypes?: string[];
  multiple?: boolean;
  onSelect?: (files: MediaFile[]) => void;
  tenantId: string;
  userId: string;
  apiBaseUrl?: string;
  permissions?: {
    upload: boolean;
    edit: boolean;
    delete: boolean;
    createFolder: boolean;
  };
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({
  isOpen,
  onClose,
  mode = 'browser',
  acceptedTypes,
  multiple = false,
  onSelect,
  tenantId,
  userId,
  apiBaseUrl = '/api/plugins/media-manager',
  permissions = {
    upload: true,
    edit: true,
    delete: true,
    createFolder: true,
  },
}) => {
  // State
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreview, setShowPreview] = useState<MediaFile | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // API functions
  const fetchFiles = async (options: {
    folderId?: string | null;
    search?: string;
    mimeType?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (options.folderId) params.set('folder', options.folderId);
    if (options.search) params.set('search', options.search);
    if (options.mimeType) params.set('mimeType', options.mimeType);
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const response = await fetch(`${apiBaseUrl}/files?${params}`);
    if (!response.ok) throw new Error('Failed to fetch files');
    return response.json();
  };

  const fetchFolders = async () => {
    const response = await fetch(`${apiBaseUrl}/folders`);
    if (!response.ok) throw new Error('Failed to fetch folders');
    return response.json();
  };

  const uploadFile = async (file: File, options: {
    folderId?: string | null;
    alt?: string;
    caption?: string;
    tags?: string[];
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.folderId) formData.append('folder', options.folderId);
    if (options.alt) formData.append('alt', options.alt);
    if (options.caption) formData.append('caption', options.caption);
    if (options.tags) formData.append('tags', JSON.stringify(options.tags));

    const response = await fetch(`${apiBaseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  };

  const deleteFile = async (fileId: string) => {
    const response = await fetch(`${apiBaseUrl}/files/${fileId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Delete failed');
    return response.json();
  };

  // Queries
  const {
    data: filesData,
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useQuery(
    ['files', currentFolderId, searchQuery, sortBy, sortOrder],
    () => fetchFiles({
      folderId: currentFolderId,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
      limit: 100,
    }),
    {
      enabled: isOpen,
      keepPreviousData: true,
    }
  );

  const {
    data: foldersData,
    isLoading: foldersLoading,
    refetch: refetchFolders,
  } = useQuery(
    ['folders'],
    fetchFolders,
    {
      enabled: isOpen,
    }
  );

  // Mutations
  const uploadMutation = useMutation(uploadFile, {
    onSuccess: () => {
      queryClient.invalidateQueries(['files']);
      queryClient.invalidateQueries(['folders']);
    },
  });

  const deleteMutation = useMutation(deleteFile, {
    onSuccess: () => {
      queryClient.invalidateQueries(['files']);
    },
  });

  // Memoized values
  const files = useMemo(() => filesData?.files || [], [filesData]);
  const folders = useMemo(() => foldersData?.folders || [], [foldersData]);
  
  const filteredFiles = useMemo(() => {
    let filtered = files;
    
    if (acceptedTypes && acceptedTypes.length > 0) {
      filtered = filtered.filter((file: MediaFile) =>
        acceptedTypes.some(type => file.mimeType.startsWith(type))
      );
    }
    
    return filtered;
  }, [files, acceptedTypes]);

  // Drag and drop for file upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (!permissions.upload) return;
      
      const newUploadFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
        status: 'pending' as const,
      }));

      setUploadFiles(prev => [...prev, ...newUploadFiles]);
      setShowUploadModal(true);
    }, [permissions.upload]),
    noClick: true,
    noKeyboard: true,
    disabled: !permissions.upload,
  });

  // Handle file selection
  const handleFileSelect = useCallback((file: MediaFile) => {
    if (mode === 'selector') {
      if (multiple) {
        setSelectedFiles(prev => {
          const newSet = new Set(prev);
          if (newSet.has(file.id)) {
            newSet.delete(file.id);
          } else {
            newSet.add(file.id);
          }
          return newSet;
        });
      } else {
        setSelectedFiles(new Set([file.id]));
        if (onSelect) {
          onSelect([file]);
        }
      }
    } else {
      setShowPreview(file);
    }
  }, [mode, multiple, onSelect]);

  // Handle upload
  const handleUpload = useCallback(async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        )
      );

      // Simulate progress (in real implementation, use XMLHttpRequest or similar for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      const result = await uploadMutation.mutateAsync(uploadFile.file, {
        folderId: currentFolderId,
      });

      clearInterval(progressInterval);

      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        )
      );

      // Remove completed files after delay
      setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.id !== uploadFile.id));
      }, 2000);

    } catch (error) {
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
    }
  }, [uploadMutation, currentFolderId]);

  // Handle delete
  const handleDelete = useCallback(async (file: MediaFile) => {
    if (!permissions.delete) return;
    
    if (window.confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      try {
        await deleteMutation.mutateAsync(file.id);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  }, [permissions.delete, deleteMutation]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      // Handle reordering logic here
    }
    
    setActiveId(null);
  };

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FiImage />;
    if (mimeType.startsWith('video/')) return <FiVideo />;
    if (mimeType.startsWith('audio/')) return <FiMusic />;
    return <FiFile />;
  };

  // File component
  const FileItem: React.FC<{ file: MediaFile; draggable?: boolean }> = ({ 
    file, 
    draggable = false 
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: file.id, disabled: !draggable });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const isSelected = selectedFiles.has(file.id);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          relative border rounded-lg overflow-hidden cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }
          ${viewMode === 'grid' ? 'aspect-square' : 'h-20'}
        `}
        onClick={() => handleFileSelect(file)}
      >
        {/* Thumbnail/Preview */}
        <div className={`
          ${viewMode === 'grid' ? 'w-full h-3/4' : 'w-20 h-full absolute left-0 top-0'}
          bg-gray-100 flex items-center justify-center overflow-hidden
        `}>
          {file.mimeType.startsWith('image/') ? (
            <img
              src={file.thumbnailUrl || file.url}
              alt={file.alt || file.originalName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : file.mimeType.startsWith('video/') ? (
            <div className="relative w-full h-full">
              {file.thumbnailUrl ? (
                <img
                  src={file.thumbnailUrl}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <FiVideo className="text-gray-500 text-2xl" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-50 rounded-full p-2">
                  <FiPlay className="text-white text-lg" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-2xl">
              {getFileIcon(file.mimeType)}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className={`
          ${viewMode === 'grid' ? 'absolute bottom-0 left-0 right-0 p-2 bg-white' : 'ml-24 p-2'}
          flex-1 min-w-0
        `}>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.originalName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              {file.processingStatus === 'processing' && (
                <FiRefreshCw className="text-blue-500 text-sm animate-spin" />
              )}
              {permissions.delete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <FiTrash2 className="text-xs" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        {mode === 'selector' && (
          <div className="absolute top-2 right-2">
            <div className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${isSelected 
                ? 'bg-blue-500 border-blue-500' 
                : 'bg-white border-gray-300'
              }
            `}>
              {isSelected && <FiCheck className="text-white text-xs" />}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute inset-4 bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Media Library</h2>
            <p className="text-sm text-gray-500">
              {filteredFiles.length} files
              {currentFolderId && ' in current folder'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {mode === 'selector' && selectedFiles.size > 0 && (
              <button
                onClick={() => {
                  const selectedFileObjects = filteredFiles.filter(f => 
                    selectedFiles.has(f.id)
                  );
                  if (onSelect) {
                    onSelect(selectedFileObjects);
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Select ({selectedFiles.size})
              </button>
            )}
            
            {permissions.upload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
              >
                <FiUpload />
                <span>Upload</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiX className="text-xl" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filters */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              <FiGrid />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
              }`}
            >
              <FiList />
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          {...getRootProps()}
          className={`flex-1 overflow-auto p-4 ${
            isDragActive ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
          }`}
        >
          <input {...getInputProps()} />
          
          {isDragActive && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FiUpload className="text-4xl text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-blue-700">
                  Drop files here to upload
                </p>
              </div>
            </div>
          )}
          
          {!isDragActive && (
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredFiles.map(f => f.id)}
                strategy={rectSortingStrategy}
              >
                {filesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <FiRefreshCw className="text-2xl animate-spin" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FiImage className="text-4xl text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-600">
                        No files found
                      </p>
                      <p className="text-sm text-gray-500">
                        {permissions.upload
                          ? 'Upload files or drag and drop them here'
                          : 'No files available'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`
                    ${viewMode === 'grid' 
                      ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4' 
                      : 'space-y-2'
                    }
                  `}>
                    {filteredFiles.map((file) => (
                      <FileItem key={file.id} file={file} draggable />
                    ))}
                  </div>
                )}
              </SortableContext>
              
              <DragOverlay>
                {activeId ? (
                  <FileItem 
                    file={filteredFiles.find(f => f.id === activeId)!} 
                    draggable={false}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Upload Progress */}
        {uploadFiles.length > 0 && (
          <div className="border-t p-4 bg-gray-50 max-h-48 overflow-y-auto">
            <h3 className="font-medium mb-3">Uploads</h3>
            <div className="space-y-2">
              {uploadFiles.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {uploadFile.status === 'completed' && <FiCheck className="text-green-500" />}
                        {uploadFile.status === 'error' && <FiAlertCircle className="text-red-500" />}
                        {uploadFile.status === 'uploading' && `${uploadFile.progress}%`}
                      </span>
                    </div>
                    {uploadFile.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    )}
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <p className="text-xs text-red-500">{uploadFile.error}</p>
                    )}
                  </div>
                  {uploadFile.status === 'pending' && (
                    <button
                      onClick={() => handleUpload(uploadFile)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Upload
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
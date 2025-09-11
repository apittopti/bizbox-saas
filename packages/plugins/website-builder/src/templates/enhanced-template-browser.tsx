import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bizbox/shared-ui'
import { Button } from '@bizbox/shared-ui'
import { Badge } from '@bizbox/shared-ui'
import { Input } from '@bizbox/shared-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@bizbox/shared-ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bizbox/shared-ui'
import { Star, Heart, Download, Grid, List } from 'lucide-react'
import { SectionTemplate, TemplateFilter, sectionTemplateManager } from './section-templates'

interface TemplateBrowserProps {
  onSelectTemplate: (templateId: string, customizations?: any) => void
  currentIndustry?: string
  existingSections?: string[]
  businessType?: string
  tenantId: string
  userId: string
}

interface TemplatePreviewProps {
  template: SectionTemplate
  onApply: (customizations?: any) => void
  onClose: () => void
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, onApply, onClose }) => {
  const [customizations, setCustomizations] = useState<any>({})
  const [activeTab, setActiveTab] = useState('preview')

  const handleColorChange = (colorKey: string, value: string) => {
    setCustomizations(prev => ({
      ...prev,
      styleOverrides: {
        ...prev.styleOverrides,
        colors: {
          ...prev.styleOverrides?.colors,
          [colorKey]: value
        }
      }
    }))
  }

  const handleFontChange = (fontFamily: string) => {
    setCustomizations(prev => ({
      ...prev,
      styleOverrides: {
        ...prev.styleOverrides,
        typography: {
          ...prev.styleOverrides?.typography,
          fontFamily
        }
      }
    }))
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {template.name}
          {template.metadata.isVerified && (
            <Badge variant="secondary">Verified</Badge>
          )}
        </DialogTitle>
        <DialogDescription>{template.description}</DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 overflow-auto">
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
            <img
              src={template.thumbnail}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onApply(customizations)} className="flex-1">
              Apply Template
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="customize" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Colors</h4>
              <div className="space-y-2">
                {Object.entries(template.styles.colors).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-sm capitalize w-20">{key}:</label>
                    <input
                      type="color"
                      value={customizations.styleOverrides?.colors?.[key] || value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-8 h-8 rounded border"
                    />
                    <span className="text-xs text-gray-500">
                      {customizations.styleOverrides?.colors?.[key] || value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Typography</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm w-20">Font:</label>
                  <select
                    value={customizations.styleOverrides?.typography?.fontFamily || template.styles.typography.fontFamily}
                    onChange={(e) => handleFontChange(e.target.value)}
                    className="flex-1 p-2 border rounded"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="Open Sans, sans-serif">Open Sans</option>
                    <option value="Lato, sans-serif">Lato</option>
                    <option value="Montserrat, sans-serif">Montserrat</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => onApply(customizations)} className="flex-1">
              Apply with Customizations
            </Button>
            <Button variant="outline" onClick={() => setCustomizations({})}>
              Reset
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Category:</strong> {template.category}
            </div>
            <div>
              <strong>Rating:</strong> {template.metadata.rating}/5
            </div>
            <div>
              <strong>Usage Count:</strong> {template.metadata.usageCount}
            </div>
            <div>
              <strong>Created:</strong> {template.metadata.createdAt.toLocaleDateString()}
            </div>
          </div>

          <div>
            <strong>Tags:</strong>
            <div className="flex flex-wrap gap-1 mt-1">
              {template.metadata.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {template.industry && (
            <div>
              <strong>Industries:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.industry.map(industry => (
                  <Badge key={industry} variant="secondary" className="text-xs">
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => onApply(customizations)} className="flex-1">
              Apply Template
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  )
}

export const EnhancedTemplateBrowser: React.FC<TemplateBrowserProps> = ({
  onSelectTemplate,
  currentIndustry,
  existingSections = [],
  businessType,
  tenantId,
  userId
}) => {
  const [templates, setTemplates] = useState<SectionTemplate[]>([])
  const [suggestions, setSuggestions] = useState<SectionTemplate[]>([])
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [filteredTemplates, setFilteredTemplates] = useState<SectionTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'recent'>('rating')
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<SectionTemplate | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTemplates()
  }, [currentIndustry, existingSections, businessType])

  useEffect(() => {
    filterAndSortTemplates()
  }, [templates, searchTerm, selectedCategory, sortBy])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      
      const filter: TemplateFilter = {
        industry: currentIndustry ? [currentIndustry] : undefined,
        isPublic: true
      }

      const context = {
        existingSections,
        businessType,
        currentPage: 'website-builder'
      }

      const result = await sectionTemplateManager.getTemplates(
        tenantId,
        userId,
        filter,
        context
      )

      setTemplates(result.templates)
      setSuggestions(result.suggestions)
      setCategories(result.categories)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortTemplates = () => {
    let filtered = [...templates]

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.metadata.rating - a.metadata.rating
        case 'usage':
          return b.metadata.usageCount - a.metadata.usageCount
        case 'recent':
          return b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime()
        default:
          return 0
      }
    })

    setFilteredTemplates(filtered)
  }

  const handleTemplateSelect = (template: SectionTemplate) => {
    setSelectedTemplate(template)
  }

  const handleApplyTemplate = async (templateId: string, customizations?: any) => {
    try {
      const result = await sectionTemplateManager.applyTemplate(
        tenantId,
        templateId,
        `section_${Date.now()}`,
        customizations
      )

      if (result.success) {
        onSelectTemplate(templateId, {
          components: result.sectionConfig,
          dataBindings: result.dataBindings,
          styles: result.styles
        })
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
    }
  }

  const toggleFavorite = (templateId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(templateId)) {
        newFavorites.delete(templateId)
      } else {
        newFavorites.add(templateId)
      }
      return newFavorites
    })
  }

  const TemplateCard: React.FC<{ template: SectionTemplate; compact?: boolean }> = ({ 
    template, 
    compact = false 
  }) => (
    <Card className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${compact ? 'flex' : ''}`}>
      <div className={compact ? 'w-32 flex-shrink-0' : ''}>
        <div className={`${compact ? 'aspect-square' : 'aspect-video'} bg-gray-100 ${compact ? 'rounded-l-lg' : 'rounded-t-lg'} overflow-hidden`}>
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <CardContent className={`${compact ? 'flex-1' : ''} p-4`}>
        <div className="flex items-start justify-between mb-2">
          <CardTitle className={`${compact ? 'text-base' : 'text-lg'}`}>
            {template.name}
          </CardTitle>
          <div className="flex items-center gap-1">
            {template.metadata.isVerified && (
              <Badge variant="secondary" className="text-xs">
                Verified
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(template.id)
              }}
              className="p-1 h-auto"
            >
              <Heart 
                className={`w-4 h-4 ${favorites.has(template.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
              />
            </Button>
          </div>
        </div>
        
        {!compact && (
          <CardDescription className="mb-3">
            {template.description}
          </CardDescription>
        )}
        
        <div className="flex flex-wrap gap-1 mb-3">
          {template.metadata.tags.slice(0, compact ? 2 : 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{template.metadata.rating}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>{template.metadata.usageCount}</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleTemplateSelect(template)}
          >
            {compact ? 'Use' : 'Use Template'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Suggested for You</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.slice(0, 3).map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 p-2 border rounded"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-32 p-2 border rounded"
          >
            <option value="rating">Rating</option>
            <option value="usage">Popular</option>
            <option value="recent">Recent</option>
          </select>

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

      {/* Templates Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {filteredTemplates.map(template => (
          <TemplateCard 
            key={template.id} 
            template={template} 
            compact={viewMode === 'list'}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No templates found matching your criteria.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('all')
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        {selectedTemplate && (
          <TemplatePreview
            template={selectedTemplate}
            onApply={(customizations) => handleApplyTemplate(selectedTemplate.id, customizations)}
            onClose={() => setSelectedTemplate(null)}
          />
        )}
      </Dialog>
    </div>
  )
}
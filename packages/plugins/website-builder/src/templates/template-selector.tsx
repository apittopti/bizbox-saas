import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bizbox/shared-ui'
import { Button } from '@bizbox/shared-ui'
import { Badge } from '@bizbox/shared-ui'
import { Input } from '@bizbox/shared-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@bizbox/shared-ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@bizbox/shared-ui'
import { Progress } from '@bizbox/shared-ui'
import { CheckCircle, Clock, Star, Zap, Palette, Layout, Eye, ArrowRight } from 'lucide-react'
import { 
  IndustryTemplate, 
  BusinessData, 
  TemplateValidation,
  enhancedIndustryTemplateManager 
} from './enhanced-industry-templates'
import { templatePublisher, TemplateApplicationResult } from '../publishing/template-publisher'

interface TemplateSelectorProps {
  businessData: BusinessData
  onTemplateSelected: (result: TemplateApplicationResult) => void
  onCancel: () => void
}

interface TemplatePreviewProps {
  template: IndustryTemplate
  businessData: BusinessData
  onApply: (customizations: any) => void
  onClose: () => void
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  template, 
  businessData, 
  onApply, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('preview')
  const [validation, setValidation] = useState<TemplateValidation | null>(null)
  const [customizations, setCustomizations] = useState({
    colorScheme: template.customizations.colorSchemes[0]?.id,
    layoutVariant: template.customizations.layoutVariants[0]?.id,
    selectedPages: template.pages.filter(p => p.isRequired).map(p => p.id),
    contentOverrides: {}
  })

  useEffect(() => {
    // Validate business data against template
    const templateValidation = enhancedIndustryTemplateManager.validateBusinessData(template, businessData)
    setValidation(templateValidation)
  }, [template, businessData])

  const handlePageToggle = (pageId: string, required: boolean) => {
    if (required) return // Can't toggle required pages

    setCustomizations(prev => ({
      ...prev,
      selectedPages: prev.selectedPages.includes(pageId)
        ? prev.selectedPages.filter(id => id !== pageId)
        : [...prev.selectedPages, pageId]
    }))
  }

  const handleColorSchemeChange = (schemeId: string) => {
    setCustomizations(prev => ({
      ...prev,
      colorScheme: schemeId
    }))
  }

  const handleContentOverride = (section: string, property: string, value: string) => {
    setCustomizations(prev => ({
      ...prev,
      contentOverrides: {
        ...prev.contentOverrides,
        [`${section}.${property}`]: value
      }
    }))
  }

  const getCompletionChecklist = () => {
    return enhancedIndustryTemplateManager.generateCompletionChecklist(template.id, businessData)
  }

  return (
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {template.name}
            <Badge variant="secondary">{template.industry}</Badge>
            {template.metadata.difficulty === 'beginner' && (
              <Badge variant="outline" className="text-green-600">
                <Zap className="w-3 h-3 mr-1" />
                Easy Setup
              </Badge>
            )}
          </div>
        </DialogTitle>
        <DialogDescription className="flex items-center gap-4">
          <span>{template.description}</span>
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{template.metadata.popularity}/100</span>
            <Clock className="w-4 h-4 ml-2" />
            <span>{template.metadata.estimatedSetupTime} min setup</span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="checklist">Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 overflow-auto">
          <div className="space-y-4">
            {/* Template Preview Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {template.previewImages.map((image, index) => (
                <div key={index} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt={`${template.name} preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Template Features */}
            <div className="space-y-3">
              <h4 className="font-medium">Features Included</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {template.features.map(feature => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="capitalize">{feature.replace('-', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Status */}
            {validation && (
              <div className="space-y-3">
                <h4 className="font-medium">Data Compatibility</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Completion</span>
                    <span className="font-medium">{validation.completionPercentage}%</span>
                  </div>
                  <Progress value={validation.completionPercentage} className="h-2" />
                  
                  {validation.errors.length > 0 && (
                    <div className="text-sm text-red-600">
                      <strong>Required:</strong> {validation.errors.join(', ')}
                    </div>
                  )}
                  
                  {validation.warnings.length > 0 && (
                    <div className="text-sm text-yellow-600">
                      <strong>Recommended:</strong> {validation.warnings.slice(0, 2).join(', ')}
                      {validation.warnings.length > 2 && ` and ${validation.warnings.length - 2} more`}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => onApply(customizations)} 
                className="flex-1"
                disabled={validation && !validation.isValid}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Apply Template
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="customize" className="space-y-6">
          {/* Color Schemes */}
          {template.customizations.colorSchemes.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color Schemes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {template.customizations.colorSchemes.map(scheme => (
                  <Card 
                    key={scheme.id}
                    className={`cursor-pointer transition-all ${
                      customizations.colorScheme === scheme.id 
                        ? 'ring-2 ring-primary' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleColorSchemeChange(scheme.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: scheme.colors.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: scheme.colors.secondary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: scheme.colors.accent }}
                          />
                        </div>
                        <span className="font-medium">{scheme.name}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Layout Variants */}
          {template.customizations.layoutVariants.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Layout Options
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {template.customizations.layoutVariants.map(variant => (
                  <Card 
                    key={variant.id}
                    className={`cursor-pointer transition-all ${
                      customizations.layoutVariant === variant.id 
                        ? 'ring-2 ring-primary' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setCustomizations(prev => ({ ...prev, layoutVariant: variant.id }))}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h5 className="font-medium">{variant.name}</h5>
                        <p className="text-sm text-gray-600">{variant.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {variant.sections.map(section => (
                            <Badge key={section} variant="outline" className="text-xs">
                              {section}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Content Suggestions */}
          <div className="space-y-3">
            <h4 className="font-medium">Content Suggestions</h4>
            <div className="space-y-4">
              {template.customizations.contentSuggestions.slice(0, 3).map(suggestion => (
                <div key={`${suggestion.section}-${suggestion.property}`} className="space-y-2">
                  <label className="text-sm font-medium capitalize">
                    {suggestion.section} {suggestion.property.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestion.suggestions.slice(0, 3).map(text => (
                      <Button
                        key={text}
                        variant="outline"
                        size="sm"
                        className="justify-start text-left h-auto p-3"
                        onClick={() => handleContentOverride(suggestion.section, suggestion.property, text)}
                      >
                        {text}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => onApply(customizations)} className="flex-1">
              Apply with Customizations
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium">Select Pages to Include</h4>
            <div className="space-y-3">
              {template.pages.map(page => (
                <Card key={page.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium">{page.name}</h5>
                          {page.isRequired && (
                            <Badge variant="secondary">Required</Badge>
                          )}
                          {page.dependencies && (
                            <Badge variant="outline">
                              Requires: {page.dependencies.join(', ')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          URL: {page.slug === '/' ? 'Homepage' : page.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={customizations.selectedPages.includes(page.id)}
                          onChange={() => handlePageToggle(page.id, page.isRequired)}
                          disabled={page.isRequired}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={() => onApply(customizations)} className="flex-1">
              Apply Selected Pages
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <div className="space-y-4">
            <h4 className="font-medium">Setup Checklist</h4>
            {getCompletionChecklist().map(category => (
              <div key={category.category} className="space-y-3">
                <h5 className="font-medium text-sm">{category.category}</h5>
                <div className="space-y-2">
                  {category.items.map(item => (
                    <div 
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        item.completed 
                          ? 'bg-green-50 border-green-200' 
                          : item.required 
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            item.required ? 'border-red-400' : 'border-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.title}</span>
                          {item.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              item.priority === 'high' ? 'border-red-300 text-red-700' :
                              item.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                              'border-gray-300 text-gray-700'
                            }`}
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => onApply(customizations)} 
              className="flex-1"
              disabled={validation && !validation.isValid}
            >
              {validation && !validation.isValid ? 'Complete Required Items First' : 'Apply Template'}
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

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  businessData,
  onTemplateSelected,
  onCancel
}) => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [templates, setTemplates] = useState<IndustryTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<IndustryTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  const industries = enhancedIndustryTemplateManager.getIndustries()

  useEffect(() => {
    if (selectedIndustry) {
      loadTemplates()
    }
  }, [selectedIndustry])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm, selectedDifficulty])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const industryTemplates = enhancedIndustryTemplateManager.getTemplatesByIndustry(
        selectedIndustry,
        { sortBy: 'popularity' }
      )
      setTemplates(industryTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = [...templates]

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.metadata.difficulty === selectedDifficulty)
    }

    setFilteredTemplates(filtered)
  }

  const handleTemplateSelect = (template: IndustryTemplate) => {
    setSelectedTemplate(template)
  }

  const handleApplyTemplate = async (customizations: any) => {
    if (!selectedTemplate) return

    setApplying(true)
    try {
      const result = await templatePublisher.applyTemplate(
        'tenant-id', // This would come from context
        selectedTemplate,
        businessData,
        customizations
      )

      onTemplateSelected(result)
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setApplying(false)
    }
  }

  const TemplateCard: React.FC<{ template: IndustryTemplate }> = ({ template }) => {
    const validation = enhancedIndustryTemplateManager.validateBusinessData(template, businessData)
    
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
        <CardHeader className="p-0">
          <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
            <img
              src={template.previewImages[0]}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{template.subCategory}</Badge>
                  <Badge 
                    variant={template.metadata.difficulty === 'beginner' ? 'secondary' : 'outline'}
                  >
                    {template.metadata.difficulty}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{template.metadata.popularity}</span>
              </div>
            </div>

            <CardDescription>{template.description}</CardDescription>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Data Compatibility</span>
                <span className="font-medium">{validation.completionPercentage}%</span>
              </div>
              <Progress value={validation.completionPercentage} className="h-2" />
            </div>

            <div className="flex flex-wrap gap-1">
              {template.features.slice(0, 3).map(feature => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature.replace('-', ' ')}
                </Badge>
              ))}
              {template.features.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.features.length - 3} more
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{template.metadata.estimatedSetupTime} min</span>
              </div>
              <Button
                size="sm"
                onClick={() => handleTemplateSelect(template)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Industry Selection */}
      {!selectedIndustry && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Choose Your Industry</h2>
            <p className="text-gray-600">
              Select your business type to see templates designed specifically for your industry
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {industries.map(industry => (
              <Card 
                key={industry.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200"
                onClick={() => setSelectedIndustry(industry.id)}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="font-semibold text-lg mb-2">{industry.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {industry.subCategories.length} specializations available
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {industry.subCategories.slice(0, 3).map(sub => (
                      <Badge key={sub} variant="outline" className="text-xs">
                        {sub.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Template Selection */}
      {selectedIndustry && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {industries.find(i => i.id === selectedIndustry)?.name} Templates
              </h2>
              <p className="text-gray-600">
                Choose a template that best fits your business needs
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedIndustry('')}>
              Change Industry
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No templates found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedDifficulty('all')
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        {selectedTemplate && (
          <TemplatePreview
            template={selectedTemplate}
            businessData={businessData}
            onApply={handleApplyTemplate}
            onClose={() => setSelectedTemplate(null)}
          />
        )}
      </Dialog>

      {/* Loading Overlay */}
      {applying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Applying template...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
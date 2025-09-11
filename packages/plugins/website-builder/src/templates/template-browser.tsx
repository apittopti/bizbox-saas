import * as React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@bizbox/shared-ui';
import { SectionTemplate, PageTemplate, TemplateManager } from './template-manager';
import { ComponentProps } from '../components/component-library';

export interface TemplateBrowserProps {
  type: 'section' | 'page';
  onApplyTemplate: (components: ComponentProps[]) => void;
  onSaveTemplate?: (name: string, description: string, components: ComponentProps[]) => void;
  businessData?: any;
  existingComponents?: ComponentProps[];
  tenantId?: string;
}

export const TemplateBrowser: React.FC<TemplateBrowserProps> = ({
  type,
  onApplyTemplate,
  onSaveTemplate,
  businessData,
  existingComponents = [],
  tenantId,
}) => {
  const [activeTab, setActiveTab] = React.useState<'browse' | 'suggestions' | 'custom'>('browse');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = React.useState<string>('all');
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);

  // Get templates based on type
  const allTemplates = React.useMemo(() => {
    if (type === 'section') {
      return TemplateManager.getSectionTemplates({
        tenantId,
      });
    } else {
      return TemplateManager.getPageTemplates();
    }
  }, [type, tenantId]);

  // Get suggestions
  const suggestions = React.useMemo(() => {
    if (type === 'section' && existingComponents.length > 0) {
      return TemplateManager.getSuggestions(existingComponents, businessData, {
        industry: businessData?.industry,
      });
    }
    return [];
  }, [type, existingComponents, businessData]);

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    let filtered = allTemplates;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter (for section templates)
    if (type === 'section' && selectedCategory !== 'all') {
      filtered = (filtered as SectionTemplate[]).filter(
        template => template.category === selectedCategory
      );
    }

    // Industry filter
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(template => {
        if (type === 'section') {
          const sectionTemplate = template as SectionTemplate;
          return !sectionTemplate.industry || sectionTemplate.industry.includes(selectedIndustry);
        } else {
          const pageTemplate = template as PageTemplate;
          return pageTemplate.industry === selectedIndustry || pageTemplate.industry === 'general';
        }
      });
    }

    return filtered;
  }, [allTemplates, searchQuery, selectedCategory, selectedIndustry, type]);

  // Get categories for section templates
  const categories = React.useMemo(() => {
    if (type === 'section') {
      const cats = new Set((allTemplates as SectionTemplate[]).map(t => t.category));
      return Array.from(cats);
    }
    return [];
  }, [allTemplates, type]);

  // Get industries
  const industries = React.useMemo(() => {
    const industrySet = new Set<string>();
    
    allTemplates.forEach(template => {
      if (type === 'section') {
        const sectionTemplate = template as SectionTemplate;
        sectionTemplate.industry?.forEach(ind => industrySet.add(ind));
      } else {
        const pageTemplate = template as PageTemplate;
        if (pageTemplate.industry !== 'general') {
          industrySet.add(pageTemplate.industry);
        }
      }
    });
    
    return Array.from(industrySet);
  }, [allTemplates, type]);

  const handleApplyTemplate = (template: SectionTemplate | PageTemplate) => {
    try {
      let components: ComponentProps[];
      
      if (type === 'section') {
        components = TemplateManager.applyTemplate(template.id, businessData);
      } else {
        components = TemplateManager.applyPageTemplate(template.id, businessData);
      }
      
      onApplyTemplate(components);
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  return (
    <div className="template-browser h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {type === 'section' ? 'Section Templates' : 'Page Templates'}
          </h2>
          
          {onSaveTemplate && (
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
            >
              Save Current as Template
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-4">
          <Button
            variant={activeTab === 'browse' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('browse')}
          >
            Browse All
          </Button>
          
          {type === 'section' && suggestions.length > 0 && (
            <Button
              variant={activeTab === 'suggestions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('suggestions')}
            >
              Suggestions ({suggestions.length})
            </Button>
          )}
          
          <Button
            variant={activeTab === 'custom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('custom')}
          >
            My Templates
          </Button>
        </div>

        {/* Filters */}
        {activeTab === 'browse' && (
          <div className="flex space-x-4">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            
            {type === 'section' && categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            )}
            
            {industries.length > 0 && (
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>
                    {industry.charAt(0).toUpperCase() + industry.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'browse' && (
          <TemplateGrid
            templates={filteredTemplates}
            onApply={handleApplyTemplate}
            type={type}
          />
        )}
        
        {activeTab === 'suggestions' && type === 'section' && (
          <div>
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">
                Recommended for your website
              </h3>
              <p className="text-sm text-gray-600">
                Based on your existing content and industry
              </p>
            </div>
            
            <TemplateGrid
              templates={suggestions}
              onApply={handleApplyTemplate}
              type={type}
              showRecommendationReason
            />
          </div>
        )}
        
        {activeTab === 'custom' && (
          <CustomTemplatesTab
            templates={allTemplates.filter(t => 
              type === 'section' ? (t as SectionTemplate).isCustom : false
            )}
            onApply={handleApplyTemplate}
            type={type}
            tenantId={tenantId}
          />
        )}
      </div>

      {/* Save Template Dialog */}
      {showSaveDialog && onSaveTemplate && (
        <SaveTemplateDialog
          onSave={(name, description) => {
            onSaveTemplate(name, description, existingComponents);
            setShowSaveDialog(false);
          }}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
};

const TemplateGrid: React.FC<{
  templates: (SectionTemplate | PageTemplate)[];
  onApply: (template: SectionTemplate | PageTemplate) => void;
  type: 'section' | 'page';
  showRecommendationReason?: boolean;
}> = ({ templates, onApply, type, showRecommendationReason }) => {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No templates found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onApply={() => onApply(template)}
          type={type}
          showRecommendationReason={showRecommendationReason}
        />
      ))}
    </div>
  );
};

const TemplateCard: React.FC<{
  template: SectionTemplate | PageTemplate;
  onApply: () => void;
  type: 'section' | 'page';
  showRecommendationReason?: boolean;
}> = ({ template, onApply, type, showRecommendationReason }) => {
  const isSection = type === 'section';
  const sectionTemplate = isSection ? template as SectionTemplate : null;
  const pageTemplate = !isSection ? template as PageTemplate : null;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
        <img
          src={template.preview}
          alt={template.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-template.jpg';
          }}
        />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>★</span>
            <span>{template.popularity}</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">{template.description}</p>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-xs rounded-full">
              +{template.tags.length - 3}
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {isSection && sectionTemplate?.category && (
              <span className="capitalize">{sectionTemplate.category}</span>
            )}
            {!isSection && pageTemplate?.estimatedSetupTime && (
              <span>~{pageTemplate.estimatedSetupTime} min setup</span>
            )}
          </div>
          
          <Button size="sm" onClick={onApply}>
            Use Template
          </Button>
        </div>
        
        {showRecommendationReason && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            Recommended: Complements your existing content
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CustomTemplatesTab: React.FC<{
  templates: (SectionTemplate | PageTemplate)[];
  onApply: (template: SectionTemplate | PageTemplate) => void;
  type: 'section' | 'page';
  tenantId?: string;
}> = ({ templates, onApply, type, tenantId }) => {
  const customTemplates = templates.filter(t => 
    type === 'section' ? (t as SectionTemplate).isCustom : false
  );

  const handleDelete = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      TemplateManager.deleteTemplate(templateId, tenantId);
      // Trigger re-render by updating parent component
      window.location.reload();
    }
  };

  if (customTemplates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <h3 className="text-lg font-medium mb-2">No Custom Templates</h3>
        <p>Save your current design as a template to reuse it later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {customTemplates.map(template => (
        <Card key={template.id} className="hover:shadow-lg transition-shadow">
          <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
            <img
              src={template.preview}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <p className="text-sm text-gray-600">{template.description}</p>
          </CardHeader>
          
          <CardContent>
            <div className="flex justify-between items-center">
              <Button size="sm" onClick={() => onApply(template)}>
                Use Template
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(template.id)}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const SaveTemplateDialog: React.FC<{
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), description.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Save as Template</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Template Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this template"
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateBrowser;
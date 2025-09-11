import { ComponentProps } from '../components/component-library';
import { BusinessData } from '../rendering/page-renderer';

export interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'hero' | 'services' | 'about' | 'contact' | 'gallery' | 'testimonials' | 'pricing' | 'custom';
  industry?: string[];
  tags: string[];
  components: ComponentProps[];
  preview: string;
  popularity: number;
  isCustom: boolean;
  createdBy?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateLibrary {
  sections: SectionTemplate[];
  pages: PageTemplate[];
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  components: ComponentProps[];
  preview: string;
  tags: string[];
  popularity: number;
  estimatedSetupTime: number;
}

export class TemplateManager {
  private static templates: Map<string, SectionTemplate> = new Map();
  private static pageTemplates: Map<string, PageTemplate> = new Map();

  /**
   * Initialize with built-in templates
   */
  static initialize(): void {
    // Load built-in section templates
    this.loadBuiltInSectionTemplates();
    
    // Load built-in page templates
    this.loadBuiltInPageTemplates();
  }

  /**
   * Get all section templates
   */
  static getSectionTemplates(filters?: {
    category?: string;
    industry?: string;
    tags?: string[];
    tenantId?: string;
  }): SectionTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.category) {
        templates = templates.filter(t => t.category === filters.category);
      }
      
      if (filters.industry) {
        templates = templates.filter(t => 
          !t.industry || t.industry.includes(filters.industry!)
        );
      }
      
      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter(t =>
          filters.tags!.some(tag => t.tags.includes(tag))
        );
      }
      
      if (filters.tenantId) {
        templates = templates.filter(t =>
          !t.tenantId || t.tenantId === filters.tenantId
        );
      }
    }

    return templates.sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Get template by ID
   */
  static getTemplate(id: string): SectionTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Save custom template
   */
  static saveTemplate(
    name: string,
    description: string,
    category: SectionTemplate['category'],
    components: ComponentProps[],
    options: {
      tags?: string[];
      industry?: string[];
      tenantId?: string;
      createdBy?: string;
    } = {}
  ): SectionTemplate {
    const template: SectionTemplate = {
      id: this.generateId(),
      name,
      description,
      category,
      industry: options.industry,
      tags: options.tags || [],
      components: this.cloneComponents(components),
      preview: this.generatePreview(components),
      popularity: 0,
      isCustom: true,
      createdBy: options.createdBy,
      tenantId: options.tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Update existing template
   */
  static updateTemplate(
    id: string,
    updates: Partial<Pick<SectionTemplate, 'name' | 'description' | 'tags' | 'components'>>
  ): SectionTemplate | null {
    const template = this.templates.get(id);
    if (!template || !template.isCustom) {
      return null;
    }

    const updatedTemplate: SectionTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.components) {
      updatedTemplate.components = this.cloneComponents(updates.components);
      updatedTemplate.preview = this.generatePreview(updates.components);
    }

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Delete custom template
   */
  static deleteTemplate(id: string, tenantId?: string): boolean {
    const template = this.templates.get(id);
    if (!template || !template.isCustom) {
      return false;
    }

    // Check ownership
    if (tenantId && template.tenantId !== tenantId) {
      return false;
    }

    return this.templates.delete(id);
  }

  /**
   * Apply template to create new components
   */
  static applyTemplate(
    templateId: string,
    businessData?: BusinessData,
    customizations?: Record<string, any>
  ): ComponentProps[] {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Clone components and apply customizations
    const components = this.cloneComponents(template.components);
    
    // Apply business data binding
    if (businessData) {
      this.applyBusinessData(components, businessData);
    }

    // Apply custom properties
    if (customizations) {
      this.applyCustomizations(components, customizations);
    }

    // Update popularity
    template.popularity += 1;

    return components;
  }

  /**
   * Get contextual template suggestions
   */
  static getSuggestions(
    existingComponents: ComponentProps[],
    businessData?: BusinessData,
    context?: {
      industry?: string;
      pageType?: string;
      userPreferences?: string[];
    }
  ): SectionTemplate[] {
    const existingTypes = new Set(existingComponents.map(c => c.type));
    const suggestions: Array<{ template: SectionTemplate; score: number }> = [];

    for (const template of this.templates.values()) {
      let score = template.popularity * 0.1;

      // Boost score for missing component types
      const templateTypes = new Set(template.components.map(c => c.type));
      const newTypes = Array.from(templateTypes).filter(type => !existingTypes.has(type));
      score += newTypes.length * 10;

      // Industry match
      if (context?.industry && template.industry?.includes(context.industry)) {
        score += 20;
      }

      // User preferences
      if (context?.userPreferences) {
        const matchingTags = template.tags.filter(tag => 
          context.userPreferences!.includes(tag)
        );
        score += matchingTags.length * 5;
      }

      // Avoid suggesting templates with all existing components
      if (newTypes.length === 0) {
        score *= 0.1;
      }

      suggestions.push({ template, score });
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(s => s.template);
  }

  /**
   * Create template from existing components
   */
  static createFromComponents(
    components: ComponentProps[],
    name: string,
    description: string,
    options: {
      category?: SectionTemplate['category'];
      tags?: string[];
      tenantId?: string;
      createdBy?: string;
    } = {}
  ): SectionTemplate {
    const category = options.category || this.detectCategory(components);
    
    return this.saveTemplate(name, description, category, components, {
      tags: options.tags || this.generateTags(components),
      tenantId: options.tenantId,
      createdBy: options.createdBy,
    });
  }

  /**
   * Get page templates
   */
  static getPageTemplates(industry?: string): PageTemplate[] {
    let templates = Array.from(this.pageTemplates.values());
    
    if (industry) {
      templates = templates.filter(t => t.industry === industry || t.industry === 'general');
    }
    
    return templates.sort((a, b) => b.popularity - a.popularity);
  }

  /**
   * Apply page template
   */
  static applyPageTemplate(
    templateId: string,
    businessData?: BusinessData
  ): ComponentProps[] {
    const template = this.pageTemplates.get(templateId);
    if (!template) {
      throw new Error(`Page template not found: ${templateId}`);
    }

    const components = this.cloneComponents(template.components);
    
    if (businessData) {
      this.applyBusinessData(components, businessData);
    }

    // Update popularity
    template.popularity += 1;

    return components;
  }

  /**
   * Export templates for sharing
   */
  static exportTemplates(templateIds: string[]): {
    templates: SectionTemplate[];
    exportedAt: Date;
    version: string;
  } {
    const templates = templateIds
      .map(id => this.templates.get(id))
      .filter(Boolean) as SectionTemplate[];

    return {
      templates: templates.map(t => ({
        ...t,
        tenantId: undefined, // Remove tenant-specific data
        createdBy: undefined,
      })),
      exportedAt: new Date(),
      version: '1.0',
    };
  }

  /**
   * Import templates from export
   */
  static importTemplates(
    exportData: ReturnType<typeof TemplateManager.exportTemplates>,
    tenantId?: string
  ): SectionTemplate[] {
    const imported: SectionTemplate[] = [];

    for (const templateData of exportData.templates) {
      const template: SectionTemplate = {
        ...templateData,
        id: this.generateId(), // Generate new ID
        isCustom: true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        popularity: 0, // Reset popularity
      };

      this.templates.set(template.id, template);
      imported.push(template);
    }

    return imported;
  }

  private static loadBuiltInSectionTemplates(): void {
    const builtInTemplates: Omit<SectionTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Modern Hero',
        description: 'Clean, modern hero section with centered content',
        category: 'hero',
        industry: ['general'],
        tags: ['modern', 'clean', 'centered'],
        components: [
          {
            id: 'hero-1',
            type: 'hero',
            props: {
              title: 'Welcome to Our Business',
              subtitle: 'Professional services you can trust',
              ctaText: 'Get Started',
              backgroundImage: '/templates/modern-hero-bg.jpg',
            },
          },
        ],
        preview: '/templates/modern-hero-preview.jpg',
        popularity: 95,
        isCustom: false,
      },
      {
        name: 'Service Showcase',
        description: 'Professional services grid with pricing',
        category: 'services',
        industry: ['general'],
        tags: ['services', 'grid', 'pricing'],
        components: [
          {
            id: 'services-1',
            type: 'services',
            props: {
              title: 'Our Services',
            },
          },
        ],
        preview: '/templates/services-showcase-preview.jpg',
        popularity: 88,
        isCustom: false,
      },
      {
        name: 'Team Introduction',
        description: 'Meet the team section with photos and bios',
        category: 'about',
        industry: ['beauty', 'hair-salon', 'barbershop'],
        tags: ['team', 'staff', 'personal'],
        components: [
          {
            id: 'staff-1',
            type: 'staff',
            props: {
              title: 'Meet Our Team',
            },
          },
        ],
        preview: '/templates/team-intro-preview.jpg',
        popularity: 82,
        isCustom: false,
      },
      {
        name: 'Before & After Gallery',
        description: 'Showcase your work with before/after images',
        category: 'gallery',
        industry: ['car-valeting', 'beauty', 'bodyshop'],
        tags: ['gallery', 'before-after', 'portfolio'],
        components: [
          {
            id: 'gallery-1',
            type: 'gallery',
            props: {
              title: 'Our Work',
              layout: 'grid',
              columns: 3,
            },
          },
        ],
        preview: '/templates/before-after-preview.jpg',
        popularity: 79,
        isCustom: false,
      },
      {
        name: 'Customer Reviews',
        description: 'Social proof with customer testimonials',
        category: 'testimonials',
        industry: ['general'],
        tags: ['testimonials', 'reviews', 'social-proof'],
        components: [
          {
            id: 'testimonials-1',
            type: 'testimonials',
            props: {
              title: 'What Our Customers Say',
            },
          },
        ],
        preview: '/templates/reviews-preview.jpg',
        popularity: 76,
        isCustom: false,
      },
      {
        name: 'Contact & Location',
        description: 'Complete contact section with form and map',
        category: 'contact',
        industry: ['general'],
        tags: ['contact', 'form', 'location'],
        components: [
          {
            id: 'contact-1',
            type: 'contact',
            props: {
              title: 'Get In Touch',
            },
          },
        ],
        preview: '/templates/contact-location-preview.jpg',
        popularity: 85,
        isCustom: false,
      },
    ];

    builtInTemplates.forEach(templateData => {
      const template: SectionTemplate = {
        ...templateData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.templates.set(template.id, template);
    });
  }

  private static loadBuiltInPageTemplates(): void {
    const pageTemplates: Omit<PageTemplate, 'id'>[] = [
      {
        name: 'Hair Salon Complete',
        description: 'Complete website for modern hair salons',
        industry: 'hair-salon',
        estimatedSetupTime: 15,
        tags: ['complete', 'modern', 'booking'],
        popularity: 92,
        preview: '/templates/hair-salon-complete.jpg',
        components: [
          { id: '1', type: 'hero', props: { title: 'Transform Your Look', ctaText: 'Book Appointment' } },
          { id: '2', type: 'services', props: { title: 'Our Services' } },
          { id: '3', type: 'staff', props: { title: 'Meet Our Stylists' } },
          { id: '4', type: 'gallery', props: { title: 'Our Work' } },
          { id: '5', type: 'testimonials', props: { title: 'Happy Clients' } },
          { id: '6', type: 'contact', props: { title: 'Book Your Appointment' } },
          { id: '7', type: 'footer', props: {} },
        ],
      },
      {
        name: 'Car Valeting Pro',
        description: 'Professional car valeting service website',
        industry: 'car-valeting',
        estimatedSetupTime: 12,
        tags: ['professional', 'automotive', 'pricing'],
        popularity: 87,
        preview: '/templates/car-valeting-pro.jpg',
        components: [
          { id: '1', type: 'hero', props: { title: 'Premium Car Care', ctaText: 'Get Quote' } },
          { id: '2', type: 'services', props: { title: 'Our Services' } },
          { id: '3', type: 'gallery', props: { title: 'Before & After' } },
          { id: '4', type: 'pricing', props: { title: 'Service Packages' } },
          { id: '5', type: 'about', props: { title: 'Why Choose Us' } },
          { id: '6', type: 'contact', props: { title: 'Get Started' } },
          { id: '7', type: 'footer', props: {} },
        ],
      },
    ];

    pageTemplates.forEach(templateData => {
      const template: PageTemplate = {
        ...templateData,
        id: this.generateId(),
      };
      
      this.pageTemplates.set(template.id, template);
    });
  }

  private static cloneComponents(components: ComponentProps[]): ComponentProps[] {
    return components.map(component => ({
      ...component,
      id: this.generateId(), // Generate new IDs
      props: { ...component.props },
      children: component.children ? this.cloneComponents(component.children) : undefined,
    }));
  }

  private static applyBusinessData(components: ComponentProps[], businessData: BusinessData): void {
    components.forEach(component => {
      if (component.type === 'hero' && businessData.name) {
        component.props.title = `Welcome to ${businessData.name}`;
        if (businessData.description) {
          component.props.subtitle = businessData.description;
        }
      }

      if (component.type === 'contact' && businessData.contact) {
        // Business data will be bound at render time
      }

      if (component.children) {
        this.applyBusinessData(component.children, businessData);
      }
    });
  }

  private static applyCustomizations(components: ComponentProps[], customizations: Record<string, any>): void {
    components.forEach(component => {
      const componentCustomizations = customizations[component.type];
      if (componentCustomizations) {
        Object.assign(component.props, componentCustomizations);
      }

      if (component.children) {
        this.applyCustomizations(component.children, customizations);
      }
    });
  }

  private static detectCategory(components: ComponentProps[]): SectionTemplate['category'] {
    const types = components.map(c => c.type);
    
    if (types.includes('hero')) return 'hero';
    if (types.includes('services')) return 'services';
    if (types.includes('staff')) return 'about';
    if (types.includes('gallery')) return 'gallery';
    if (types.includes('testimonials')) return 'testimonials';
    if (types.includes('contact')) return 'contact';
    if (types.includes('pricing')) return 'pricing';
    
    return 'custom';
  }

  private static generateTags(components: ComponentProps[]): string[] {
    const tags = new Set<string>();
    
    components.forEach(component => {
      tags.add(component.type);
      
      // Add contextual tags based on props
      if (component.props.layout) {
        tags.add(component.props.layout);
      }
      
      if (component.props.columns) {
        tags.add(`${component.props.columns}-column`);
      }
    });
    
    return Array.from(tags);
  }

  private static generatePreview(components: ComponentProps[]): string {
    // In a real implementation, this would generate a screenshot
    return `/templates/preview-${components[0]?.type || 'custom'}.jpg`;
  }

  private static generateId(): string {
    return 'tpl_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// Initialize built-in templates
TemplateManager.initialize();

export default TemplateManager;
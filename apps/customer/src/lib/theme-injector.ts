import { TenantInfo } from './tenant-resolver';

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export class ThemeInjector {
  /**
   * Generate CSS variables from theme configuration
   */
  static generateThemeCSS(theme: ThemeConfig): string {
    const cssVariables: string[] = [];

    // Colors
    Object.entries(theme.colors || {}).forEach(([key, value]) => {
      cssVariables.push(`  --color-${key}: ${value};`);
    });

    // Fonts
    Object.entries(theme.fonts || {}).forEach(([key, value]) => {
      cssVariables.push(`  --font-${key}: ${value};`);
    });

    // Spacing
    Object.entries(theme.spacing || {}).forEach(([key, value]) => {
      cssVariables.push(`  --spacing-${key}: ${value};`);
    });

    // Border radius
    Object.entries(theme.borderRadius || {}).forEach(([key, value]) => {
      cssVariables.push(`  --radius-${key}: ${value};`);
    });

    // Shadows
    Object.entries(theme.shadows || {}).forEach(([key, value]) => {
      cssVariables.push(`  --shadow-${key}: ${value};`);
    });

    return `:root {\n${cssVariables.join('\n')}\n}`;
  }

  /**
   * Generate component-specific CSS classes
   */
  static generateComponentCSS(): string {
    return `
/* Hero Component */
.hero-component {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  color: var(--color-foreground);
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  z-index: -1;
}

.hero-content {
  text-align: center;
  max-width: 800px;
  padding: var(--spacing-xl);
  z-index: 1;
}

.hero-title {
  font-family: var(--font-heading);
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: var(--spacing-md);
  color: var(--color-foreground);
}

.hero-subtitle {
  font-family: var(--font-body);
  font-size: 1.25rem;
  margin-bottom: var(--spacing-lg);
  color: var(--color-muted);
}

.hero-cta {
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hero-cta:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Services Component */
.services-component {
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-background);
}

.services-title {
  font-family: var(--font-heading);
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: var(--spacing-xl);
  color: var(--color-foreground);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.service-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.service-card h3 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  margin-bottom: var(--spacing-sm);
  color: var(--color-foreground);
}

.service-card p {
  font-family: var(--font-body);
  color: var(--color-muted);
  margin-bottom: var(--spacing-md);
  line-height: 1.6;
}

.service-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  border-top: 1px solid var(--color-border);
}

.service-details .duration {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.service-details .price {
  font-weight: bold;
  font-size: 1.25rem;
  color: var(--color-primary);
}

.book-service-btn {
  width: 100%;
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.book-service-btn:hover {
  opacity: 0.9;
}

/* Staff Component */
.staff-component {
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-muted);
}

.staff-title {
  font-family: var(--font-heading);
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: var(--spacing-xl);
  color: var(--color-foreground);
}

.staff-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  max-width: 1000px;
  margin: 0 auto;
}

.staff-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.staff-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.staff-image {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto var(--spacing-md);
  border: 3px solid var(--color-primary);
}

.staff-card h3 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  margin-bottom: var(--spacing-xs);
  color: var(--color-foreground);
}

.staff-role {
  color: var(--color-muted);
  margin-bottom: var(--spacing-md);
  font-style: italic;
}

.staff-skills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  justify-content: center;
  margin-bottom: var(--spacing-md);
}

.skill-tag {
  background: var(--color-accent);
  color: var(--color-foreground);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 500;
}

.book-staff-btn {
  background: var(--color-secondary);
  color: var(--color-foreground);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.book-staff-btn:hover {
  opacity: 0.9;
}

/* Products Component */
.products-component {
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-background);
}

.products-title {
  font-family: var(--font-heading);
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: var(--spacing-xl);
  color: var(--color-foreground);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.product-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.product-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.product-card h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  margin: var(--spacing-md) var(--spacing-md) var(--spacing-sm);
  color: var(--color-foreground);
}

.product-card p {
  font-family: var(--font-body);
  color: var(--color-muted);
  margin: 0 var(--spacing-md) var(--spacing-md);
  line-height: 1.5;
}

.product-price {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-primary);
  margin: 0 var(--spacing-md) var(--spacing-md);
}

.add-to-cart-btn {
  width: calc(100% - 2 * var(--spacing-md));
  margin: 0 var(--spacing-md) var(--spacing-md);
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-to-cart-btn:hover {
  opacity: 0.9;
}

/* Contact Component */
.contact-component {
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-background);
  text-align: center;
}

.contact-component h2 {
  font-family: var(--font-heading);
  font-size: 2.5rem;
  margin-bottom: var(--spacing-lg);
  color: var(--color-foreground);
}

.contact-info {
  max-width: 600px;
  margin: 0 auto;
}

.contact-info p {
  font-family: var(--font-body);
  font-size: 1.1rem;
  margin-bottom: var(--spacing-md);
  color: var(--color-foreground);
}

/* Footer Component */
.footer-component {
  background: var(--color-foreground);
  color: var(--color-background);
  padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.footer-section h3,
.footer-section h4 {
  font-family: var(--font-heading);
  margin-bottom: var(--spacing-md);
}

.footer-section p,
.footer-section li {
  font-family: var(--font-body);
  line-height: 1.6;
  opacity: 0.9;
}

.footer-section ul {
  list-style: none;
  padding: 0;
}

.footer-section li {
  margin-bottom: var(--spacing-xs);
}

.footer-section a {
  color: inherit;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.footer-section a:hover {
  opacity: 0.7;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  text-align: center;
  opacity: 0.7;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .services-title,
  .staff-title,
  .products-title,
  .contact-component h2 {
    font-size: 2rem;
  }
  
  .services-grid,
  .staff-grid,
  .products-grid {
    grid-template-columns: 1fr;
  }
  
  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
}
`;
  }

  /**
   * Inject theme and component CSS into the page
   */
  static injectCSS(tenant: TenantInfo): string {
    const themeCSS = this.generateThemeCSS(tenant.settings?.theme || this.getDefaultTheme());
    const componentCSS = this.generateComponentCSS();
    
    return `${themeCSS}\n\n${componentCSS}`;
  }

  /**
   * Get default theme configuration
   */
  private static getDefaultTheme(): ThemeConfig {
    return {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#f1f5f9',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#64748b',
        border: '#e2e8f0',
      },
      fonts: {
        heading: 'Inter, system-ui, sans-serif',
        body: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
      },
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    };
  }
}
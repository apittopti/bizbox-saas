import { WidgetTheme } from '../types';

export class ThemeManager {
  private loadedThemes = new Map<string, WidgetTheme>();
  private loadedStylesheets = new Set<string>();

  private readonly defaultTheme: WidgetTheme = {
    name: 'default',
    primaryColor: '#3b82f6',
    secondaryColor: '#6b7280',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    breakpoints: {
      mobile: '480px',
      tablet: '768px',
      desktop: '1024px'
    }
  };

  private readonly builtInThemes: Record<string, WidgetTheme> = {
    modern: {
      ...this.defaultTheme,
      name: 'modern',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      borderRadius: 12,
      fontSize: '15px'
    },
    minimal: {
      ...this.defaultTheme,
      name: 'minimal',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      borderColor: '#cccccc',
      borderRadius: 4,
      fontSize: '13px'
    },
    corporate: {
      ...this.defaultTheme,
      name: 'corporate',
      primaryColor: '#1e40af',
      secondaryColor: '#374151',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px'
    },
    creative: {
      ...this.defaultTheme,
      name: 'creative',
      primaryColor: '#f59e0b',
      secondaryColor: '#ef4444',
      backgroundColor: '#fafafa',
      borderRadius: 16,
      fontSize: '15px'
    }
  };

  async applyTheme(theme: WidgetTheme | string | undefined, container: HTMLElement): Promise<void> {
    let resolvedTheme: WidgetTheme;

    if (!theme) {
      resolvedTheme = this.defaultTheme;
    } else if (typeof theme === 'string') {
      resolvedTheme = await this.getTheme(theme);
    } else {
      resolvedTheme = { ...this.defaultTheme, ...theme };
    }

    this.applyThemeToContainer(resolvedTheme, container);
    await this.loadBaseStyles();
  }

  async getTheme(themeName: string): Promise<WidgetTheme> {
    // Check if already loaded
    if (this.loadedThemes.has(themeName)) {
      return this.loadedThemes.get(themeName)!;
    }

    // Check built-in themes
    if (this.builtInThemes[themeName]) {
      const theme = this.builtInThemes[themeName];
      this.loadedThemes.set(themeName, theme);
      return theme;
    }

    // Try to load from API or external source
    try {
      const theme = await this.loadThemeFromApi(themeName);
      this.loadedThemes.set(themeName, theme);
      return theme;
    } catch (error) {
      console.warn(`Failed to load theme '${themeName}', falling back to default`);
      return this.defaultTheme;
    }
  }

  generateThemeFromWebsite(): WidgetTheme {
    const computedStyle = getComputedStyle(document.body);
    
    return {
      ...this.defaultTheme,
      name: 'auto-detected',
      primaryColor: this.detectPrimaryColor(),
      fontFamily: this.detectFontFamily(),
      backgroundColor: computedStyle.backgroundColor || this.defaultTheme.backgroundColor,
      textColor: computedStyle.color || this.defaultTheme.textColor
    };
  }

  private applyThemeToContainer(theme: WidgetTheme, container: HTMLElement): void {
    const cssVariables = {
      '--bx-primary': theme.primaryColor,
      '--bx-secondary': theme.secondaryColor,
      '--bx-background': theme.backgroundColor,
      '--bx-text': theme.textColor,
      '--bx-border': theme.borderColor,
      '--bx-radius': `${theme.borderRadius}px`,
      '--bx-font-family': theme.fontFamily,
      '--bx-font-size': theme.fontSize,
      '--bx-spacing-xs': theme.spacing.xs,
      '--bx-spacing-sm': theme.spacing.sm,
      '--bx-spacing-md': theme.spacing.md,
      '--bx-spacing-lg': theme.spacing.lg,
      '--bx-spacing-xl': theme.spacing.xl,
      '--bx-breakpoint-mobile': theme.breakpoints.mobile,
      '--bx-breakpoint-tablet': theme.breakpoints.tablet,
      '--bx-breakpoint-desktop': theme.breakpoints.desktop
    };

    Object.entries(cssVariables).forEach(([property, value]) => {
      container.style.setProperty(property, value);
    });

    // Add theme class
    container.classList.add(`bizbox-theme-${theme.name || 'default'}`);
  }

  private async loadBaseStyles(): Promise<void> {
    const styleId = 'bizbox-base-styles';
    
    if (this.loadedStylesheets.has(styleId)) {
      return;
    }

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = 'https://widgets.bizbox.co.uk/styles/base.css';
    
    return new Promise((resolve, reject) => {
      link.onload = () => {
        this.loadedStylesheets.add(styleId);
        resolve();
      };
      link.onerror = () => {
        console.warn('Failed to load base styles, using inline styles');
        this.injectInlineStyles();
        resolve();
      };
      
      document.head.appendChild(link);
    });
  }

  private async loadThemeFromApi(themeName: string): Promise<WidgetTheme> {
    // This would load theme from API in real implementation
    throw new Error(`Theme '${themeName}' not found`);
  }

  private detectPrimaryColor(): string {
    // Look for common color indicators on the page
    const indicators = [
      'a', 'button', '.btn', '.button', 
      '.primary', '.brand', '.logo'
    ];

    for (const selector of indicators) {
      const element = document.querySelector(selector);
      if (element) {
        const style = getComputedStyle(element);
        const color = style.color || style.backgroundColor;
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          return color;
        }
      }
    }

    return this.defaultTheme.primaryColor;
  }

  private detectFontFamily(): string {
    const style = getComputedStyle(document.body);
    return style.fontFamily || this.defaultTheme.fontFamily;
  }

  private injectInlineStyles(): void {
    const styleId = 'bizbox-inline-styles';
    
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = this.getInlineStyles();
    document.head.appendChild(style);
  }

  private getInlineStyles(): string {
    return `
      .bizbox-widget {
        box-sizing: border-box;
        font-family: var(--bx-font-family, ${this.defaultTheme.fontFamily});
        font-size: var(--bx-font-size, ${this.defaultTheme.fontSize});
        line-height: 1.5;
        color: var(--bx-text, ${this.defaultTheme.textColor});
        background: var(--bx-background, ${this.defaultTheme.backgroundColor});
      }

      .bizbox-widget *,
      .bizbox-widget *::before,
      .bizbox-widget *::after {
        box-sizing: border-box;
      }

      .bizbox-loading {
        position: relative;
        min-height: 100px;
      }

      .bizbox-loading-spinner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
      }

      .bizbox-spinner {
        display: inline-block;
        width: 24px;
        height: 24px;
        border: 2px solid var(--bx-border, ${this.defaultTheme.borderColor});
        border-radius: 50%;
        border-top-color: var(--bx-primary, ${this.defaultTheme.primaryColor});
        animation: bizbox-spin 1s linear infinite;
      }

      .bizbox-loading-text {
        margin-top: var(--bx-spacing-sm, ${this.defaultTheme.spacing.sm});
        font-size: 12px;
        color: var(--bx-secondary, ${this.defaultTheme.secondaryColor});
      }

      @keyframes bizbox-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .bizbox-error {
        padding: var(--bx-spacing-md, ${this.defaultTheme.spacing.md});
        border: 1px solid #fee2e2;
        border-radius: var(--bx-radius, ${this.defaultTheme.borderRadius}px);
        background: #fef2f2;
        color: #991b1b;
        text-align: center;
      }

      .bizbox-error__icon {
        font-size: 24px;
        margin-bottom: var(--bx-spacing-sm, ${this.defaultTheme.spacing.sm});
      }

      .bizbox-error__message {
        margin-bottom: var(--bx-spacing-md, ${this.defaultTheme.spacing.md});
      }

      .bizbox-error__retry {
        background: #dc2626;
        color: white;
        border: none;
        padding: var(--bx-spacing-sm, ${this.defaultTheme.spacing.sm}) var(--bx-spacing-md, ${this.defaultTheme.spacing.md});
        border-radius: var(--bx-radius, ${this.defaultTheme.borderRadius}px);
        cursor: pointer;
        font-size: 12px;
      }

      .bizbox-error__retry:hover {
        background: #b91c1c;
      }

      @media (max-width: 768px) {
        .bizbox-widget {
          font-size: 13px;
        }
      }
    `;
  }
}
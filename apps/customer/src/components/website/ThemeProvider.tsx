'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { TenantInfo } from '../../lib/tenant-resolver';

interface ThemeContextValue {
  theme: ThemeConfig;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  isLoading: boolean;
}

interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
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
    '2xl': string;
    '3xl': string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    timing: {
      ease: string;
      linear: string;
      'ease-in': string;
      'ease-out': string;
      'ease-in-out': string;
    };
  };
}

interface DarkModeConfig {
  background: string;
  foreground: string;
  muted: string;
  border: string;
  accent: string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DEFAULT_THEME: ThemeConfig = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f1f5f9',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
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
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    timing: {
      ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      linear: 'linear',
      'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

interface ThemeProviderProps {
  tenant: TenantInfo;
  children: React.ReactNode;
  enableDarkMode?: boolean;
}

export function ThemeProvider({ tenant, children, enableDarkMode = true }: ThemeProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  // Initialize theme from tenant settings
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Merge tenant theme with default theme
        const tenantTheme = tenant.settings?.theme || {};
        const mergedTheme = mergeThemes(DEFAULT_THEME, tenantTheme);
        setTheme(mergedTheme);

        // Load dark mode preference
        if (enableDarkMode) {
          const savedDarkMode = localStorage.getItem(`darkMode-${tenant.id}`);
          if (savedDarkMode !== null) {
            setIsDarkMode(JSON.parse(savedDarkMode));
          } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDarkMode(prefersDark);
          }
        }

        // Load any custom CSS
        await loadCustomCSS(tenant);

      } catch (error) {
        console.error('Error initializing theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, [tenant, enableDarkMode]);

  // Apply theme to document
  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;
    const effectiveTheme = isDarkMode ? applyDarkMode(theme) : theme;
    
    // Apply CSS custom properties
    applyThemeVariables(root, effectiveTheme);
    
    // Apply theme class
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${tenant.id}`);
    
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply meta theme-color for mobile browsers
    updateMetaThemeColor(effectiveTheme.colors.primary);

  }, [theme, isDarkMode, tenant.id, isLoading]);

  // Handle system dark mode changes
  useEffect(() => {
    if (!enableDarkMode) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(`darkMode-${tenant.id}`) === null) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [tenant.id, enableDarkMode]);

  const toggleDarkMode = () => {
    if (!enableDarkMode) return;
    
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem(`darkMode-${tenant.id}`, JSON.stringify(newDarkMode));
  };

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTheme(current => mergeThemes(current, updates));
  };

  const contextValue: ThemeContextValue = useMemo(() => ({
    theme,
    isDarkMode,
    toggleDarkMode,
    updateTheme,
    isLoading,
  }), [theme, isDarkMode, isLoading]);

  if (isLoading) {
    return (
      <div className="theme-loading">
        <style jsx>{`
          .theme-loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
          }
          .theme-loading::after {
            content: '';
            width: 40px;
            height: 40px;
            border: 4px solid #e2e8f0;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
      <ThemeStyleSheet theme={isDarkMode ? applyDarkMode(theme) : theme} />
    </ThemeContext.Provider>
  );
}

// Theme stylesheet component
function ThemeStyleSheet({ theme }: { theme: ThemeConfig }) {
  const css = generateThemeCSS(theme);
  
  return (
    <style 
      id="theme-styles" 
      dangerouslySetInnerHTML={{ __html: css }} 
    />
  );
}

// Utility functions
function mergeThemes(base: ThemeConfig, override: any): ThemeConfig {
  return {
    colors: { ...base.colors, ...override.colors },
    fonts: { ...base.fonts, ...override.fonts },
    spacing: { ...base.spacing, ...override.spacing },
    borderRadius: { ...base.borderRadius, ...override.borderRadius },
    shadows: { ...base.shadows, ...override.shadows },
    breakpoints: { ...base.breakpoints, ...override.breakpoints },
    animation: {
      duration: { ...base.animation.duration, ...override.animation?.duration },
      timing: { ...base.animation.timing, ...override.animation?.timing },
    },
  };
}

function applyDarkMode(theme: ThemeConfig): ThemeConfig {
  const darkColors: DarkModeConfig = {
    background: '#0f172a',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    border: '#334155',
    accent: '#1e293b',
  };

  return {
    ...theme,
    colors: {
      ...theme.colors,
      ...darkColors,
    },
  };
}

function applyThemeVariables(root: HTMLElement, theme: ThemeConfig) {
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Fonts
  Object.entries(theme.fonts).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Breakpoints
  Object.entries(theme.breakpoints).forEach(([key, value]) => {
    root.style.setProperty(`--breakpoint-${key}`, value);
  });

  // Animation
  Object.entries(theme.animation.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value);
  });
  
  Object.entries(theme.animation.timing).forEach(([key, value]) => {
    root.style.setProperty(`--timing-${key}`, value);
  });
}

function generateThemeCSS(theme: ThemeConfig): string {
  return `
    /* Base styles */
    * {
      box-sizing: border-box;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: var(--font-body);
      color: var(--color-foreground);
      background-color: var(--color-background);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-heading);
      font-weight: 600;
      line-height: 1.2;
      margin: 0 0 var(--spacing-md) 0;
    }
    
    h1 { font-size: 3rem; }
    h2 { font-size: 2.25rem; }
    h3 { font-size: 1.875rem; }
    h4 { font-size: 1.5rem; }
    h5 { font-size: 1.25rem; }
    h6 { font-size: 1.125rem; }
    
    p {
      margin: 0 0 var(--spacing-md) 0;
      color: var(--color-muted);
    }
    
    a {
      color: var(--color-primary);
      text-decoration: none;
      transition: color var(--duration-fast) var(--timing-ease);
    }
    
    a:hover {
      color: var(--color-secondary);
    }
    
    /* Buttons */
    button, .btn {
      font-family: var(--font-body);
      font-weight: 500;
      border: none;
      border-radius: var(--radius-md);
      padding: var(--spacing-sm) var(--spacing-lg);
      cursor: pointer;
      transition: all var(--duration-fast) var(--timing-ease);
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-xs);
    }
    
    .btn-primary {
      background-color: var(--color-primary);
      color: white;
    }
    
    .btn-primary:hover {
      background-color: var(--color-secondary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    .btn-secondary {
      background-color: transparent;
      color: var(--color-primary);
      border: 2px solid var(--color-primary);
    }
    
    .btn-secondary:hover {
      background-color: var(--color-primary);
      color: white;
    }
    
    /* Form elements */
    input, textarea, select {
      font-family: var(--font-body);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--spacing-sm) var(--spacing-md);
      transition: border-color var(--duration-fast) var(--timing-ease);
      background-color: var(--color-background);
      color: var(--color-foreground);
    }
    
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    /* Layout utilities */
    .container {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 var(--spacing-md);
    }
    
    .section {
      padding: var(--spacing-3xl) 0;
    }
    
    .grid {
      display: grid;
      gap: var(--spacing-lg);
    }
    
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    
    /* Responsive utilities */
    @media (max-width: 768px) {
      .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
      }
      
      h1 { font-size: 2rem; }
      h2 { font-size: 1.75rem; }
      h3 { font-size: 1.5rem; }
      
      .section {
        padding: var(--spacing-2xl) 0;
      }
    }
    
    /* Component-specific styles */
    .hero-component {
      position: relative;
      min-height: 60vh;
      display: flex;
      align-items: center;
      overflow: hidden;
    }
    
    .hero-background, .hero-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: -1;
    }
    
    .hero-content {
      position: relative;
      z-index: 2;
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
      padding: var(--spacing-lg);
    }
    
    .service-card, .product-card, .staff-card {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      transition: all var(--duration-normal) var(--timing-ease);
    }
    
    .service-card:hover, .product-card:hover, .staff-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }
    
    /* Dark mode specific adjustments */
    .dark .service-card, .dark .product-card, .dark .staff-card {
      background: var(--color-accent);
      border-color: var(--color-border);
    }
    
    /* Animation utilities */
    .fade-in {
      animation: fadeIn var(--duration-slow) var(--timing-ease);
    }
    
    .slide-up {
      animation: slideUp var(--duration-normal) var(--timing-ease);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Loading states */
    .widget-loading, .component-placeholder {
      background: var(--color-accent);
      border-radius: var(--radius-md);
      padding: var(--spacing-xl);
      text-align: center;
      color: var(--color-muted);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;
}

async function loadCustomCSS(tenant: TenantInfo) {
  if (!tenant.settings?.customCSS) return;

  try {
    // Validate and sanitize custom CSS
    const sanitizedCSS = sanitizeCSS(tenant.settings.customCSS);
    
    // Create or update custom CSS style element
    let customStyleElement = document.getElementById('custom-css');
    if (!customStyleElement) {
      customStyleElement = document.createElement('style');
      customStyleElement.id = 'custom-css';
      document.head.appendChild(customStyleElement);
    }
    
    customStyleElement.textContent = sanitizedCSS;
  } catch (error) {
    console.error('Error loading custom CSS:', error);
  }
}

function sanitizeCSS(css: string): string {
  // Basic CSS sanitization - remove potentially harmful content
  return css
    .replace(/@import/g, '/* @import removed */')
    .replace(/javascript:/g, '/* javascript: removed */')
    .replace(/expression\s*\(/g, '/* expression() removed */');
}

function updateMetaThemeColor(color: string) {
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', color);
}

// Hook to use theme context
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export types
export type { ThemeConfig, ThemeContextValue };
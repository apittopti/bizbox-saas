import * as React from "react";
import { Theme, defaultTheme } from "./theme-engine";

// Theme context
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customizeTheme: (updates: Partial<Theme>) => void;
  resetTheme: () => void;
  previewTheme: (theme: Theme) => void;
  stopPreview: () => void;
  isPreviewMode: boolean;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  defaultTheme: initialTheme = defaultTheme,
  storageKey = 'bizbox-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);
  const [previewTheme, setPreviewTheme] = React.useState<Theme | null>(null);
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);

  // Load theme from storage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedTheme = JSON.parse(stored);
        setThemeState(parsedTheme);
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error);
    }
  }, [storageKey]);

  // Save theme to storage when it changes
  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(theme));
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  }, [theme, storageKey]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setIsPreviewMode(false);
    setPreviewTheme(null);
  }, []);

  const customizeTheme = React.useCallback((updates: Partial<Theme>) => {
    setThemeState(current => ({ ...current, ...updates }));
  }, []);

  const resetTheme = React.useCallback(() => {
    setThemeState(initialTheme);
    setIsPreviewMode(false);
    setPreviewTheme(null);
  }, [initialTheme]);

  const startPreview = React.useCallback((theme: Theme) => {
    setPreviewTheme(theme);
    setIsPreviewMode(true);
  }, []);

  const stopPreview = React.useCallback(() => {
    setPreviewTheme(null);
    setIsPreviewMode(false);
  }, []);

  const activeTheme = previewTheme || theme;

  const value = React.useMemo(() => ({
    theme: activeTheme,
    setTheme,
    customizeTheme,
    resetTheme,
    previewTheme: startPreview,
    stopPreview,
    isPreviewMode,
  }), [activeTheme, setTheme, customizeTheme, resetTheme, startPreview, stopPreview, isPreviewMode]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeStyleProvider theme={activeTheme}>
        {children}
      </ThemeStyleProvider>
    </ThemeContext.Provider>
  );
}

// Component to inject theme CSS variables
function ThemeStyleProvider({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  React.useEffect(() => {
    const root = document.documentElement;

    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    // Apply typography variables
    root.style.setProperty('--font-family', theme.typography.fontFamily);
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value);
    });
    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value);
    });

    // Apply spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    // Apply border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, value);
    });

    // Apply shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
  }, [theme]);

  return <>{children}</>;
}
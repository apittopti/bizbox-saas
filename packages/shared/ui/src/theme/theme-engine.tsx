import * as React from "react"
import { cn } from "../lib/utils"

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  card: string
  cardForeground: string
  border: string
  input: string
  ring: string
  destructive: string
  destructiveForeground: string
}

export interface ThemeTypography {
  fontFamily: string
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  fontWeight: {
    normal: string
    medium: string
    semibold: string
    bold: string
  }
  lineHeight: {
    tight: string
    normal: string
    relaxed: string
  }
}

export interface ThemeSpacing {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
}

export interface ThemeBorderRadius {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
  full: string
}

export interface Theme {
  id: string
  name: string
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
  borderRadius: ThemeBorderRadius
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
}

// Default themes
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default',
  colors: {
    primary: 'hsl(222.2 84% 4.9%)',
    secondary: 'hsl(210 40% 96%)',
    accent: 'hsl(210 40% 96%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(210 40% 96%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 84% 4.9%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(222.2 84% 4.9%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(210 40% 98%)',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
}

export const darkTheme: Theme = {
  ...defaultTheme,
  id: 'dark',
  name: 'Dark',
  colors: {
    primary: 'hsl(210 40% 98%)',
    secondary: 'hsl(217.2 32.6% 17.5%)',
    accent: 'hsl(217.2 32.6% 17.5%)',
    background: 'hsl(222.2 84% 4.9%)',
    foreground: 'hsl(210 40% 98%)',
    muted: 'hsl(217.2 32.6% 17.5%)',
    mutedForeground: 'hsl(215 20.2% 65.1%)',
    card: 'hsl(222.2 84% 4.9%)',
    cardForeground: 'hsl(210 40% 98%)',
    border: 'hsl(217.2 32.6% 17.5%)',
    input: 'hsl(217.2 32.6% 17.5%)',
    ring: 'hsl(212.7 26.8% 83.9%)',
    destructive: 'hsl(0 62.8% 30.6%)',
    destructiveForeground: 'hsl(210 40% 98%)',
  },
}

// Theme context
interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  customizeTheme: (updates: Partial<Theme>) => void
  resetTheme: () => void
  previewTheme: (theme: Theme) => void
  stopPreview: () => void
  isPreviewMode: boolean
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({ 
  children, 
  defaultTheme: initialTheme = defaultTheme,
  storageKey = 'bizbox-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme)
  const [previewTheme, setPreviewTheme] = React.useState<Theme | null>(null)
  const [isPreviewMode, setIsPreviewMode] = React.useState(false)

  // Load theme from storage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedTheme = JSON.parse(stored)
        setThemeState(parsedTheme)
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error)
    }
  }, [storageKey])

  // Save theme to storage when it changes
  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(theme))
    } catch (error) {
      console.warn('Failed to save theme to storage:', error)
    }
  }, [theme, storageKey])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    setIsPreviewMode(false)
    setPreviewTheme(null)
  }, [])

  const customizeTheme = React.useCallback((updates: Partial<Theme>) => {
    setThemeState(current => ({ ...current, ...updates }))
  }, [])

  const resetTheme = React.useCallback(() => {
    setThemeState(initialTheme)
    setIsPreviewMode(false)
    setPreviewTheme(null)
  }, [initialTheme])

  const startPreview = React.useCallback((theme: Theme) => {
    setPreviewTheme(theme)
    setIsPreviewMode(true)
  }, [])

  const stopPreview = React.useCallback(() => {
    setPreviewTheme(null)
    setIsPreviewMode(false)
  }, [])

  const activeTheme = previewTheme || theme

  const value = React.useMemo(() => ({
    theme: activeTheme,
    setTheme,
    customizeTheme,
    resetTheme,
    previewTheme: startPreview,
    stopPreview,
    isPreviewMode,
  }), [activeTheme, setTheme, customizeTheme, resetTheme, startPreview, stopPreview, isPreviewMode])

  return (
    <ThemeContext.Provider value={value}>
      <ThemeStyleProvider theme={activeTheme}>
        {children}
      </ThemeStyleProvider>
    </ThemeContext.Provider>
  )
}

// Component to inject theme CSS variables
function ThemeStyleProvider({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  React.useEffect(() => {
    const root = document.documentElement

    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })

    // Apply typography variables
    root.style.setProperty('--font-family', theme.typography.fontFamily)
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value)
    })
    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value)
    })
    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value)
    })

    // Apply spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })

    // Apply border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--border-radius-${key}`, value)
    })

    // Apply shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value)
    })
  }, [theme])

  return <>{children}</>
}

// Theme customization utilities
export class ThemeBuilder {
  private theme: Theme

  constructor(baseTheme: Theme = defaultTheme) {
    this.theme = { ...baseTheme }
  }

  setColors(colors: Partial<ThemeColors>): ThemeBuilder {
    this.theme.colors = { ...this.theme.colors, ...colors }
    return this
  }

  setTypography(typography: Partial<ThemeTypography>): ThemeBuilder {
    this.theme.typography = { ...this.theme.typography, ...typography }
    return this
  }

  setSpacing(spacing: Partial<ThemeSpacing>): ThemeBuilder {
    this.theme.spacing = { ...this.theme.spacing, ...spacing }
    return this
  }

  setBorderRadius(borderRadius: Partial<ThemeBorderRadius>): ThemeBuilder {
    this.theme.borderRadius = { ...this.theme.borderRadius, ...borderRadius }
    return this
  }

  build(): Theme {
    return { ...this.theme }
  }
}

// Predefined theme variants
export const themeVariants = {
  light: defaultTheme,
  dark: darkTheme,
  blue: new ThemeBuilder(defaultTheme)
    .setColors({
      primary: 'hsl(221.2 83.2% 53.3%)',
      secondary: 'hsl(210 40% 96%)',
      accent: 'hsl(210 40% 96%)',
    })
    .build(),
  green: new ThemeBuilder(defaultTheme)
    .setColors({
      primary: 'hsl(142.1 76.2% 36.3%)',
      secondary: 'hsl(138 76% 97%)',
      accent: 'hsl(138 76% 97%)',
    })
    .build(),
  purple: new ThemeBuilder(defaultTheme)
    .setColors({
      primary: 'hsl(262.1 83.3% 57.8%)',
      secondary: 'hsl(270 95% 98%)',
      accent: 'hsl(270 95% 98%)',
    })
    .build(),
}

// Theme validation
export function validateTheme(theme: Partial<Theme>): string[] {
  const errors: string[] = []

  if (!theme.colors) {
    errors.push('Theme must include colors')
  } else {
    const requiredColors: (keyof ThemeColors)[] = [
      'primary', 'secondary', 'background', 'foreground'
    ]
    requiredColors.forEach(color => {
      if (!theme.colors![color]) {
        errors.push(`Missing required color: ${color}`)
      }
    })
  }

  if (!theme.typography?.fontFamily) {
    errors.push('Theme must include typography.fontFamily')
  }

  return errors
}

export { Theme, ThemeColors, ThemeTypography, ThemeSpacing, ThemeBorderRadius }
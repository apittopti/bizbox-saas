import { Theme, ThemeColors, ThemeTypography, ThemeSpacing, ThemeBorderRadius, defaultTheme, darkTheme } from "./theme-engine";

// Theme configuration presets
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: Theme;
  category: 'light' | 'dark' | 'colored' | 'industry';
}

// Theme builder utility
export class ThemeBuilder {
  private theme: Theme;

  constructor(baseTheme: Theme = defaultTheme) {
    this.theme = { ...baseTheme };
  }

  setId(id: string): ThemeBuilder {
    this.theme.id = id;
    return this;
  }

  setName(name: string): ThemeBuilder {
    this.theme.name = name;
    return this;
  }

  setColors(colors: Partial<ThemeColors>): ThemeBuilder {
    this.theme.colors = { ...this.theme.colors, ...colors };
    return this;
  }

  setTypography(typography: Partial<ThemeTypography>): ThemeBuilder {
    this.theme.typography = { ...this.theme.typography, ...typography };
    return this;
  }

  setSpacing(spacing: Partial<ThemeSpacing>): ThemeBuilder {
    this.theme.spacing = { ...this.theme.spacing, ...spacing };
    return this;
  }

  setBorderRadius(borderRadius: Partial<ThemeBorderRadius>): ThemeBuilder {
    this.theme.borderRadius = { ...this.theme.borderRadius, ...borderRadius };
    return this;
  }

  setShadows(shadows: Partial<Theme['shadows']>): ThemeBuilder {
    this.theme.shadows = { ...this.theme.shadows, ...shadows };
    return this;
  }

  build(): Theme {
    return { ...this.theme };
  }
}

// Industry-specific theme presets
export const industryThemes: Record<string, ThemePreset> = {
  automotive: {
    id: 'automotive',
    name: 'Automotive',
    description: 'Professional theme for car valeting and automotive services',
    category: 'industry',
    theme: new ThemeBuilder(defaultTheme)
      .setId('automotive')
      .setName('Automotive')
      .setColors({
        primary: 'hsl(210 100% 45%)', // Deep blue
        secondary: 'hsl(45 100% 85%)', // Light gold
        accent: 'hsl(45 100% 50%)', // Gold accent
      })
      .build(),
  },
  
  beauty: {
    id: 'beauty',
    name: 'Beauty & Wellness',
    description: 'Elegant theme for beauty salons and wellness centers',
    category: 'industry',
    theme: new ThemeBuilder(defaultTheme)
      .setId('beauty')
      .setName('Beauty & Wellness')
      .setColors({
        primary: 'hsl(330 80% 50%)', // Rose pink
        secondary: 'hsl(330 30% 95%)', // Light rose
        accent: 'hsl(45 100% 85%)', // Soft gold
      })
      .build(),
  },

  barbershop: {
    id: 'barbershop',
    name: 'Barbershop',
    description: 'Classic theme for traditional barbershops',
    category: 'industry',
    theme: new ThemeBuilder(defaultTheme)
      .setId('barbershop')
      .setName('Barbershop')
      .setColors({
        primary: 'hsl(0 0% 20%)', // Charcoal
        secondary: 'hsl(0 100% 35%)', // Deep red
        accent: 'hsl(45 100% 85%)', // Gold
      })
      .build(),
  },

  hairdressing: {
    id: 'hairdressing',
    name: 'Hair Salon',
    description: 'Modern theme for hair salons and stylists',
    category: 'industry',
    theme: new ThemeBuilder(defaultTheme)
      .setId('hairdressing')
      .setName('Hair Salon')
      .setColors({
        primary: 'hsl(280 100% 60%)', // Purple
        secondary: 'hsl(280 30% 95%)', // Light purple
        accent: 'hsl(45 100% 70%)', // Bright gold
      })
      .build(),
  },

  bodyshop: {
    id: 'bodyshop',
    name: 'Body Shop',
    description: 'Professional theme for automotive body shops',
    category: 'industry',
    theme: new ThemeBuilder(defaultTheme)
      .setId('bodyshop')
      .setName('Body Shop')
      .setColors({
        primary: 'hsl(0 100% 45%)', // Red
        secondary: 'hsl(0 0% 15%)', // Dark gray
        accent: 'hsl(45 100% 50%)', // Yellow
      })
      .build(),
  },
};

// Color scheme presets
export const colorThemes: Record<string, ThemePreset> = {
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Cool blue tones inspired by the ocean',
    category: 'colored',
    theme: new ThemeBuilder(defaultTheme)
      .setId('ocean')
      .setName('Ocean Blue')
      .setColors({
        primary: 'hsl(200 100% 45%)',
        secondary: 'hsl(200 50% 95%)',
        accent: 'hsl(180 100% 85%)',
      })
      .build(),
  },

  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural green tones inspired by forests',
    category: 'colored',
    theme: new ThemeBuilder(defaultTheme)
      .setId('forest')
      .setName('Forest Green')
      .setColors({
        primary: 'hsl(120 60% 35%)',
        secondary: 'hsl(120 30% 95%)',
        accent: 'hsl(60 100% 85%)',
      })
      .build(),
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm orange and red tones',
    category: 'colored',
    theme: new ThemeBuilder(defaultTheme)
      .setId('sunset')
      .setName('Sunset Orange')
      .setColors({
        primary: 'hsl(15 100% 55%)',
        secondary: 'hsl(15 30% 95%)',
        accent: 'hsl(45 100% 85%)',
      })
      .build(),
  },

  lavender: {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purple and lavender tones',
    category: 'colored',
    theme: new ThemeBuilder(defaultTheme)
      .setId('lavender')
      .setName('Lavender')
      .setColors({
        primary: 'hsl(270 50% 60%)',
        secondary: 'hsl(270 30% 95%)',
        accent: 'hsl(300 100% 85%)',
      })
      .build(),
  },
};

// Base theme presets
export const baseThemes: Record<string, ThemePreset> = {
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme',
    category: 'light',
    theme: defaultTheme,
  },

  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Sleek dark theme',
    category: 'dark',
    theme: darkTheme,
  },
};

// All available theme presets
export const allThemePresets: ThemePreset[] = [
  ...Object.values(baseThemes),
  ...Object.values(colorThemes),
  ...Object.values(industryThemes),
];

// Theme validation
export function validateTheme(theme: Partial<Theme>): string[] {
  const errors: string[] = [];

  if (!theme.colors) {
    errors.push('Theme must include colors');
  } else {
    const requiredColors: (keyof ThemeColors)[] = [
      'primary', 'secondary', 'background', 'foreground'
    ];
    requiredColors.forEach(color => {
      if (!theme.colors![color]) {
        errors.push(`Missing required color: ${color}`);
      }
    });
  }

  if (!theme.typography?.fontFamily) {
    errors.push('Theme must include typography.fontFamily');
  }

  return errors;
}

// Theme inheritance utilities
export function createThemeVariation(baseTheme: Theme, name: string, colorOverrides: Partial<ThemeColors>): Theme {
  return new ThemeBuilder(baseTheme)
    .setName(name)
    .setColors(colorOverrides)
    .build();
}

export function createDarkVariation(lightTheme: Theme): Theme {
  // Convert light theme to dark by inverting background/foreground
  return new ThemeBuilder(lightTheme)
    .setName(`${lightTheme.name} Dark`)
    .setId(`${lightTheme.id}-dark`)
    .setColors({
      background: lightTheme.colors.foreground,
      foreground: lightTheme.colors.background,
      card: lightTheme.colors.foreground,
      cardForeground: lightTheme.colors.background,
      muted: 'hsl(217.2 32.6% 17.5%)',
      mutedForeground: 'hsl(215 20.2% 65.1%)',
      border: 'hsl(217.2 32.6% 17.5%)',
      input: 'hsl(217.2 32.6% 17.5%)',
    })
    .build();
}
import { Theme, ThemeColors } from "./theme-engine";

export interface AccessibilityResult {
  isValid: boolean;
  score: number; // 0-100
  issues: AccessibilityIssue[];
  suggestions: string[];
}

export interface AccessibilityIssue {
  type: 'contrast' | 'readability' | 'focus' | 'color-blindness';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedColors: string[];
  wcagLevel: 'AA' | 'AAA';
}

export class AccessibilityValidator {
  /**
   * Validate a theme for accessibility compliance
   */
  validateTheme(theme: Theme): AccessibilityResult {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Check color contrast ratios
    const contrastIssues = this.validateContrast(theme.colors);
    issues.push(...contrastIssues);

    // Check for color blindness compatibility
    const colorBlindnessIssues = this.validateColorBlindness(theme.colors);
    issues.push(...colorBlindnessIssues);

    // Check readability
    const readabilityIssues = this.validateReadability(theme);
    issues.push(...readabilityIssues);

    // Calculate score based on issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    score = Math.max(0, score);

    const suggestions = this.generateSuggestions(issues);

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      score,
      issues,
      suggestions,
    };
  }

  /**
   * Check contrast ratios between foreground and background colors
   */
  private validateContrast(colors: ThemeColors): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Primary combinations to check
    const combinations = [
      { fg: 'foreground', bg: 'background', context: 'main content' },
      { fg: 'primary', bg: 'background', context: 'primary buttons' },
      { fg: 'cardForeground', bg: 'card', context: 'card content' },
      { fg: 'mutedForeground', bg: 'muted', context: 'muted content' },
    ];

    combinations.forEach(({ fg, bg, context }) => {
      const fgColor = colors[fg as keyof ThemeColors];
      const bgColor = colors[bg as keyof ThemeColors];
      
      if (fgColor && bgColor) {
        const ratio = this.calculateContrastRatio(fgColor, bgColor);
        
        // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
        // WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
        if (ratio < 3) {
          issues.push({
            type: 'contrast',
            severity: 'critical',
            message: `Contrast ratio ${ratio.toFixed(2)}:1 is too low for ${context}. Minimum is 3:1.`,
            affectedColors: [fg, bg],
            wcagLevel: 'AA',
          });
        } else if (ratio < 4.5) {
          issues.push({
            type: 'contrast',
            severity: 'high',
            message: `Contrast ratio ${ratio.toFixed(2)}:1 for ${context} doesn't meet WCAG AA standards (4.5:1 for normal text).`,
            affectedColors: [fg, bg],
            wcagLevel: 'AA',
          });
        } else if (ratio < 7) {
          issues.push({
            type: 'contrast',
            severity: 'medium',
            message: `Contrast ratio ${ratio.toFixed(2)}:1 for ${context} doesn't meet WCAG AAA standards (7:1 for normal text).`,
            affectedColors: [fg, bg],
            wcagLevel: 'AAA',
          });
        }
      }
    });

    return issues;
  }

  /**
   * Check for color blindness compatibility
   */
  private validateColorBlindness(colors: ThemeColors): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check if primary and secondary colors are distinguishable for color blind users
    const primaryHue = this.extractHue(colors.primary);
    const secondaryHue = this.extractHue(colors.secondary);
    const accentHue = this.extractHue(colors.accent);

    if (primaryHue !== null && secondaryHue !== null) {
      const hueDifference = Math.abs(primaryHue - secondaryHue);
      const adjustedDifference = Math.min(hueDifference, 360 - hueDifference);

      if (adjustedDifference < 30) {
        issues.push({
          type: 'color-blindness',
          severity: 'medium',
          message: 'Primary and secondary colors may be difficult to distinguish for color-blind users.',
          affectedColors: ['primary', 'secondary'],
          wcagLevel: 'AA',
        });
      }
    }

    // Check for red-green color combinations (most common color blindness)
    const problematicHues = [0, 120]; // Red and green
    const colorHues = [
      { name: 'primary', hue: primaryHue },
      { name: 'secondary', hue: secondaryHue },
      { name: 'accent', hue: accentHue },
    ].filter(c => c.hue !== null);

    const hasRedGreenIssue = colorHues.some(c1 => 
      colorHues.some(c2 => 
        c1.name !== c2.name && 
        problematicHues.some(ph => Math.abs(c1.hue! - ph) < 15) &&
        problematicHues.some(ph => Math.abs(c2.hue! - ph) < 15)
      )
    );

    if (hasRedGreenIssue) {
      issues.push({
        type: 'color-blindness',
        severity: 'high',
        message: 'Red-green color combinations detected. Consider using different hues for better accessibility.',
        affectedColors: ['primary', 'secondary', 'accent'],
        wcagLevel: 'AA',
      });
    }

    return issues;
  }

  /**
   * Check readability factors
   */
  private validateReadability(theme: Theme): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check font sizes
    const baseFontSize = parseFloat(theme.typography.fontSize.base);
    if (baseFontSize < 14) {
      issues.push({
        type: 'readability',
        severity: 'medium',
        message: 'Base font size is smaller than recommended minimum of 14px.',
        affectedColors: [],
        wcagLevel: 'AA',
      });
    }

    // Check line height
    const baseLineHeight = parseFloat(theme.typography.lineHeight.normal);
    if (baseLineHeight < 1.4) {
      issues.push({
        type: 'readability',
        severity: 'low',
        message: 'Line height is lower than recommended minimum of 1.4.',
        affectedColors: [],
        wcagLevel: 'AA',
      });
    }

    return issues;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  private getLuminance(color: string): number {
    const rgb = this.hslToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      const sRGB = c / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert HSL color string to RGB values
   */
  private hslToRgb(hslString: string): [number, number, number] | null {
    const match = hslString.match(/hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/);
    if (!match) return null;

    const h = parseFloat(match[1]) / 360;
    const s = parseFloat(match[2]) / 100;
    const l = parseFloat(match[3]) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Extract hue from HSL color string
   */
  private extractHue(hslString: string): number | null {
    const match = hslString.match(/hsl\((\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  /**
   * Generate suggestions based on issues
   */
  private generateSuggestions(issues: AccessibilityIssue[]): string[] {
    const suggestions: string[] = [];

    const contrastIssues = issues.filter(i => i.type === 'contrast');
    if (contrastIssues.length > 0) {
      suggestions.push('Consider using darker text colors or lighter background colors to improve contrast.');
      suggestions.push('Use online contrast checkers to verify color combinations meet WCAG guidelines.');
    }

    const colorBlindnessIssues = issues.filter(i => i.type === 'color-blindness');
    if (colorBlindnessIssues.length > 0) {
      suggestions.push('Avoid relying solely on color to convey information - use icons, patterns, or text labels.');
      suggestions.push('Test your color scheme with color blindness simulators.');
      suggestions.push('Consider using blue and orange combinations instead of red and green.');
    }

    const readabilityIssues = issues.filter(i => i.type === 'readability');
    if (readabilityIssues.length > 0) {
      suggestions.push('Increase font size to at least 14px for better readability.');
      suggestions.push('Use line heights of 1.4 or greater for improved text readability.');
    }

    if (issues.length === 0) {
      suggestions.push('Your theme meets accessibility standards! Consider testing with real users for additional feedback.');
    }

    return suggestions;
  }

  /**
   * Get accessibility compliance level
   */
  getComplianceLevel(result: AccessibilityResult): 'None' | 'AA' | 'AAA' {
    const criticalIssues = result.issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    const aaIssues = result.issues.filter(i => i.wcagLevel === 'AA');
    const aaaIssues = result.issues.filter(i => i.wcagLevel === 'AAA');

    if (criticalIssues.length > 0 || aaIssues.length > 0) {
      return 'None';
    } else if (aaaIssues.length > 0) {
      return 'AA';
    } else {
      return 'AAA';
    }
  }

  /**
   * Suggest improved colors for better accessibility
   */
  suggestColorImprovements(theme: Theme): Partial<ThemeColors> {
    const improvements: Partial<ThemeColors> = {};
    const result = this.validateTheme(theme);

    result.issues.forEach(issue => {
      if (issue.type === 'contrast' && issue.affectedColors.length >= 2) {
        const [fgKey, bgKey] = issue.affectedColors;
        const fgColor = theme.colors[fgKey as keyof ThemeColors];
        const bgColor = theme.colors[bgKey as keyof ThemeColors];

        if (fgKey === 'foreground' && bgKey === 'background') {
          // Suggest darker foreground or lighter background
          const currentRatio = this.calculateContrastRatio(fgColor, bgColor);
          if (currentRatio < 4.5) {
            improvements.foreground = 'hsl(222.2 84% 4.9%)'; // Darker
            improvements.background = 'hsl(0 0% 100%)'; // White
          }
        }
      }
    });

    return improvements;
  }
}
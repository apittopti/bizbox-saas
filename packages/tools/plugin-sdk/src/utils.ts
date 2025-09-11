import type { PluginManifest, PluginValidationResult } from '@bizbox/core-framework';
import type { PluginValidationOptions } from './types';

/**
 * Plugin development utilities
 */
export class PluginUtils {
  /**
   * Validate a plugin manifest
   */
  static validateManifest(manifest: PluginManifest, options: PluginValidationOptions = {}): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!manifest.id) {
      errors.push('Plugin ID is required');
    } else if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      errors.push('Plugin ID must contain only lowercase letters, numbers, and hyphens');
    }

    if (!manifest.name) {
      errors.push('Plugin name is required');
    }

    if (!manifest.version) {
      errors.push('Plugin version is required');
    } else if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      errors.push('Plugin version must follow semantic versioning (x.y.z)');
    }

    if (!manifest.description) {
      warnings.push('Plugin description is recommended');
    }

    if (!manifest.author) {
      warnings.push('Plugin author is recommended');
    }

    // Dependency validation
    if (options.checkDependencies && manifest.dependencies) {
      for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
        if (!/^[a-z0-9-]+$/.test(depId)) {
          errors.push(`Invalid dependency ID: ${depId}`);
        }
        
        if (!/^\d+\.\d+\.\d+$/.test(depVersion)) {
          errors.push(`Invalid dependency version for ${depId}: ${depVersion}`);
        }
      }
    }

    // Route validation
    if (manifest.routes) {
      for (const route of manifest.routes) {
        if (!route.method || !route.path || !route.handler) {
          errors.push('Route must have method, path, and handler');
        }

        if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method)) {
          errors.push(`Invalid HTTP method: ${route.method}`);
        }

        if (!route.path.startsWith('/')) {
          errors.push(`Route path must start with /: ${route.path}`);
        }
      }
    }

    // Permission validation
    if (manifest.permissions) {
      for (const permission of manifest.permissions) {
        if (!permission.resource || !permission.actions) {
          errors.push('Permission must have resource and actions');
        }

        if (!Array.isArray(permission.actions) || permission.actions.length === 0) {
          errors.push('Permission actions must be a non-empty array');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate a plugin ID from name
   */
  static generatePluginId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Check if a plugin ID is valid
   */
  static isValidPluginId(id: string): boolean {
    return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 50;
  }

  /**
   * Check if a version string is valid semver
   */
  static isValidVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  /**
   * Compare two version strings
   */
  static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (v1Parts[i] > v2Parts[i]) return 1;
      if (v1Parts[i] < v2Parts[i]) return -1;
    }

    return 0;
  }

  /**
   * Generate a basic plugin manifest
   */
  static generateManifest(options: {
    id: string;
    name: string;
    description: string;
    author: string;
    version?: string;
    dependencies?: Record<string, string>;
  }): PluginManifest {
    return {
      id: options.id,
      name: options.name,
      version: options.version || '1.0.0',
      description: options.description,
      author: options.author,
      dependencies: options.dependencies || {},
      tags: [],
      license: 'MIT'
    };
  }

  /**
   * Extract plugin metadata from source code
   */
  static extractMetadata(sourceCode: string): Partial<PluginManifest> {
    const metadata: Partial<PluginManifest> = {};

    // Extract from JSDoc comments
    const jsdocRegex = /\/\*\*\s*\n([^*]|\*(?!\/))*\*\//g;
    const matches = sourceCode.match(jsdocRegex);

    if (matches) {
      for (const match of matches) {
        const nameMatch = match.match(/@name\s+(.+)/);
        if (nameMatch) metadata.name = nameMatch[1].trim();

        const descMatch = match.match(/@description\s+(.+)/);
        if (descMatch) metadata.description = descMatch[1].trim();

        const authorMatch = match.match(/@author\s+(.+)/);
        if (authorMatch) metadata.author = authorMatch[1].trim();

        const versionMatch = match.match(/@version\s+(.+)/);
        if (versionMatch) metadata.version = versionMatch[1].trim();
      }
    }

    return metadata;
  }

  /**
   * Generate TypeScript definitions for a plugin
   */
  static generateTypeDefinitions(manifest: PluginManifest): string {
    let dts = `// Generated type definitions for ${manifest.name}\n\n`;

    dts += `declare module '${manifest.id}' {\n`;
    dts += `  export const pluginId: '${manifest.id}';\n`;
    dts += `  export const pluginName: '${manifest.name}';\n`;
    dts += `  export const pluginVersion: '${manifest.version}';\n\n`;

    // Generate route types
    if (manifest.routes) {
      dts += `  // API Routes\n`;
      for (const route of manifest.routes) {
        const methodName = route.handler || `${route.method.toLowerCase()}${route.path.replace(/[^a-zA-Z0-9]/g, '')}`;
        dts += `  export function ${methodName}(req: any, res: any): Promise<any>;\n`;
      }
      dts += '\n';
    }

    // Generate permission types
    if (manifest.permissions) {
      dts += `  // Permissions\n`;
      dts += `  export type PluginPermissions = {\n`;
      for (const permission of manifest.permissions) {
        dts += `    '${permission.resource}': [${permission.actions.map(a => `'${a}'`).join(', ')}];\n`;
      }
      dts += `  };\n\n`;
    }

    dts += `}\n`;

    return dts;
  }

  /**
   * Sanitize plugin configuration
   */
  static sanitizeConfig(config: any): any {
    if (typeof config !== 'object' || config === null) {
      return {};
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(config)) {
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) {
        continue;
      }

      // Recursively sanitize objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeConfig(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Deep merge plugin configurations
   */
  static mergeConfigs(base: any, override: any): any {
    if (typeof base !== 'object' || base === null) {
      return override;
    }

    if (typeof override !== 'object' || override === null) {
      return base;
    }

    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.mergeConfigs(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Generate plugin documentation template
   */
  static generateDocTemplate(manifest: PluginManifest): string {
    let doc = `# ${manifest.name}\n\n`;
    doc += `${manifest.description}\n\n`;

    doc += `## Installation\n\n`;
    doc += `\`\`\`bash\n`;
    doc += `npm install ${manifest.id}\n`;
    doc += `\`\`\`\n\n`;

    doc += `## Configuration\n\n`;
    doc += `\`\`\`typescript\n`;
    doc += `// Add configuration example here\n`;
    doc += `\`\`\`\n\n`;

    if (manifest.routes && manifest.routes.length > 0) {
      doc += `## API Routes\n\n`;
      for (const route of manifest.routes) {
        doc += `### ${route.method} ${route.path}\n\n`;
        if (route.description) {
          doc += `${route.description}\n\n`;
        }
        doc += `\`\`\`typescript\n`;
        doc += `// Add usage example here\n`;
        doc += `\`\`\`\n\n`;
      }
    }

    if (manifest.permissions && manifest.permissions.length > 0) {
      doc += `## Permissions\n\n`;
      doc += `This plugin requires the following permissions:\n\n`;
      for (const permission of manifest.permissions) {
        doc += `- **${permission.resource}**: ${permission.actions.join(', ')}\n`;
        if (permission.description) {
          doc += `  - ${permission.description}\n`;
        }
      }
      doc += '\n';
    }

    doc += `## License\n\n`;
    doc += `${manifest.license || 'MIT'}\n`;

    return doc;
  }
}
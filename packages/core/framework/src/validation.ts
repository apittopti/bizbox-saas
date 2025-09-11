import type { 
  PluginManifest, 
  PluginValidationResult, 
  PluginCompatibilityResult,
  CompatibilityIssue 
} from "./types";

export class PluginValidator {
  private static readonly SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
  private static readonly PLUGIN_ID_REGEX = /^[a-z0-9-]+$/;
  private static readonly REQUIRED_FIELDS = ['id', 'name', 'version', 'description', 'author'];

  /**
   * Validate a plugin manifest
   */
  static validateManifest(manifest: PluginManifest): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of this.REQUIRED_FIELDS) {
      if (!manifest[field as keyof PluginManifest]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate plugin ID format
    if (manifest.id && !this.PLUGIN_ID_REGEX.test(manifest.id)) {
      errors.push("Plugin ID must contain only lowercase letters, numbers, and hyphens");
    }

    // Validate version format
    if (manifest.version && !this.SEMVER_REGEX.test(manifest.version)) {
      errors.push("Plugin version must follow semantic versioning (x.y.z)");
    }

    // Validate dependencies
    if (manifest.dependencies) {
      for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
        if (!this.PLUGIN_ID_REGEX.test(depId)) {
          errors.push(`Invalid dependency ID: ${depId}`);
        }
        
        if (!this.SEMVER_REGEX.test(depVersion)) {
          errors.push(`Invalid dependency version for ${depId}: ${depVersion}`);
        }
      }
    }

    // Validate peer dependencies
    if (manifest.peerDependencies) {
      for (const [depId, depVersion] of Object.entries(manifest.peerDependencies)) {
        if (!this.PLUGIN_ID_REGEX.test(depId)) {
          errors.push(`Invalid peer dependency ID: ${depId}`);
        }
        
        if (!this.SEMVER_REGEX.test(depVersion)) {
          errors.push(`Invalid peer dependency version for ${depId}: ${depVersion}`);
        }
      }
    }

    // Validate routes
    if (manifest.routes) {
      for (const route of manifest.routes) {
        if (!route.method || !route.path || !route.handler) {
          errors.push("Route must include method, path, and handler");
        }

        if (route.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method)) {
          errors.push(`Invalid HTTP method: ${route.method}`);
        }

        if (route.path && !route.path.startsWith('/')) {
          warnings.push(`Route path should start with '/': ${route.path}`);
        }
      }
    }

    // Validate permissions
    if (manifest.permissions) {
      for (const permission of manifest.permissions) {
        if (!permission.resource || !permission.actions || !permission.description) {
          errors.push("Permission must include resource, actions, and description");
        }

        if (permission.actions && !Array.isArray(permission.actions)) {
          errors.push("Permission actions must be an array");
        }
      }
    }

    // Warnings for missing optional but recommended fields
    if (!manifest.homepage) {
      warnings.push("Consider adding a homepage URL");
    }

    if (!manifest.repository) {
      warnings.push("Consider adding a repository URL");
    }

    if (!manifest.license) {
      warnings.push("Consider specifying a license");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check compatibility between plugins
   */
  static checkCompatibility(
    manifest: PluginManifest,
    availablePlugins: Map<string, PluginManifest>
  ): PluginCompatibilityResult {
    const issues: CompatibilityIssue[] = [];

    // Check dependencies
    if (manifest.dependencies) {
      for (const [depId, requiredVersion] of Object.entries(manifest.dependencies)) {
        const availablePlugin = availablePlugins.get(depId);
        
        if (!availablePlugin) {
          issues.push({
            type: 'error',
            message: `Required dependency '${depId}' is not available`,
            dependency: depId,
            expectedVersion: requiredVersion
          });
          continue;
        }

        // Simple version check (in production, use proper semver comparison)
        if (availablePlugin.version !== requiredVersion) {
          issues.push({
            type: 'warning',
            message: `Version mismatch for dependency '${depId}'`,
            dependency: depId,
            expectedVersion: requiredVersion,
            actualVersion: availablePlugin.version
          });
        }
      }
    }

    // Check peer dependencies
    if (manifest.peerDependencies) {
      for (const [depId, requiredVersion] of Object.entries(manifest.peerDependencies)) {
        const availablePlugin = availablePlugins.get(depId);
        
        if (!availablePlugin) {
          issues.push({
            type: 'warning',
            message: `Peer dependency '${depId}' is not available`,
            dependency: depId,
            expectedVersion: requiredVersion
          });
          continue;
        }

        if (availablePlugin.version !== requiredVersion) {
          issues.push({
            type: 'warning',
            message: `Version mismatch for peer dependency '${depId}'`,
            dependency: depId,
            expectedVersion: requiredVersion,
            actualVersion: availablePlugin.version
          });
        }
      }
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(manifest, availablePlugins);
    if (circularDeps.length > 0) {
      issues.push({
        type: 'error',
        message: `Circular dependency detected: ${circularDeps.join(' -> ')}`
      });
    }

    return {
      compatible: issues.filter(issue => issue.type === 'error').length === 0,
      issues
    };
  }

  /**
   * Detect circular dependencies
   */
  private static detectCircularDependencies(
    manifest: PluginManifest,
    availablePlugins: Map<string, PluginManifest>,
    visited: Set<string> = new Set(),
    path: string[] = []
  ): string[] {
    if (visited.has(manifest.id)) {
      const cycleStart = path.indexOf(manifest.id);
      return path.slice(cycleStart).concat(manifest.id);
    }

    visited.add(manifest.id);
    path.push(manifest.id);

    if (manifest.dependencies) {
      for (const depId of Object.keys(manifest.dependencies)) {
        const depManifest = availablePlugins.get(depId);
        if (depManifest) {
          const cycle = this.detectCircularDependencies(
            depManifest,
            availablePlugins,
            new Set(visited),
            [...path]
          );
          if (cycle.length > 0) {
            return cycle;
          }
        }
      }
    }

    return [];
  }

  /**
   * Validate plugin configuration
   */
  static validateConfig(config: any, schema?: any): PluginValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation - in production, use a proper schema validator like Joi or Zod
    if (typeof config !== 'object' || config === null) {
      errors.push("Configuration must be an object");
      return { valid: false, errors, warnings };
    }

    if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
      errors.push("'enabled' must be a boolean");
    }

    if (config.settings !== undefined && typeof config.settings !== 'object') {
      errors.push("'settings' must be an object");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
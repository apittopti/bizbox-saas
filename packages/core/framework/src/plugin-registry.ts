import type { BasePlugin } from "./base-plugin";
import type { PluginManifest, PluginContext } from "./types";

export enum PluginStatus {
  REGISTERED = "registered",
  INITIALIZING = "initializing", 
  ACTIVE = "active",
  ERROR = "error",
  DISABLED = "disabled"
}

export interface PluginRegistryEntry {
  plugin: BasePlugin;
  status: PluginStatus;
  manifest: PluginManifest;
  error?: Error;
  registeredAt: Date;
  initializedAt?: Date;
}

export class PluginRegistry {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();

  /**
   * Register a plugin with the registry
   */
  async register(plugin: BasePlugin, manifest: PluginManifest): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    // Validate manifest
    this.validateManifest(manifest);

    // Check version compatibility
    this.checkCompatibility(manifest);

    // Register the plugin
    const entry: PluginRegistryEntry = {
      plugin,
      status: PluginStatus.REGISTERED,
      manifest,
      registeredAt: new Date()
    };

    this.plugins.set(plugin.id, entry);
    this.updateDependencyGraph(plugin.id, manifest.dependencies);

    console.log(`Plugin ${plugin.id} registered successfully`);
  }

  /**
   * Initialize a plugin and its dependencies
   */
  async initialize(pluginId: string, context: PluginContext): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (entry.status === PluginStatus.ACTIVE) {
      return; // Already initialized
    }

    try {
      entry.status = PluginStatus.INITIALIZING;

      // Initialize dependencies first
      await this.initializeDependencies(pluginId, context);

      // Initialize the plugin
      await entry.plugin.initialize(context);

      entry.status = PluginStatus.ACTIVE;
      entry.initializedAt = new Date();

      console.log(`Plugin ${pluginId} initialized successfully`);
    } catch (error) {
      entry.status = PluginStatus.ERROR;
      entry.error = error as Error;
      throw new Error(`Failed to initialize plugin ${pluginId}: ${error}`);
    }
  }

  /**
   * Initialize all registered plugins
   */
  async initializeAll(context: PluginContext): Promise<void> {
    const initOrder = this.getInitializationOrder();
    
    for (const pluginId of initOrder) {
      await this.initialize(pluginId, context);
    }
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Check if other plugins depend on this one
    const dependents = this.getDependents(pluginId);
    if (dependents.length > 0) {
      throw new Error(`Cannot disable plugin ${pluginId}: plugins ${dependents.join(', ')} depend on it`);
    }

    try {
      if (entry.status === PluginStatus.ACTIVE) {
        await entry.plugin.destroy();
      }
      entry.status = PluginStatus.DISABLED;
      console.log(`Plugin ${pluginId} disabled successfully`);
    } catch (error) {
      entry.status = PluginStatus.ERROR;
      entry.error = error as Error;
      throw new Error(`Failed to disable plugin ${pluginId}: ${error}`);
    }
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): BasePlugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  /**
   * Get plugin entry with status
   */
  getPluginEntry(pluginId: string): PluginRegistryEntry | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values()).filter(
      entry => entry.status === PluginStatus.ACTIVE
    );
  }

  /**
   * Check if plugin is active
   */
  isActive(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    return entry?.status === PluginStatus.ACTIVE;
  }

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error("Plugin manifest must include id, name, and version");
    }

    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error("Plugin ID must contain only lowercase letters, numbers, and hyphens");
    }

    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new Error("Plugin version must follow semantic versioning (x.y.z)");
    }
  }

  private checkCompatibility(manifest: PluginManifest): void {
    // Check if all dependencies are available
    for (const [depId, depVersion] of Object.entries(manifest.dependencies)) {
      const depEntry = this.plugins.get(depId);
      if (!depEntry) {
        throw new Error(`Dependency ${depId} is not registered`);
      }

      // Simple version check (in production, use semver)
      if (depEntry.manifest.version !== depVersion) {
        console.warn(`Version mismatch for dependency ${depId}: expected ${depVersion}, got ${depEntry.manifest.version}`);
      }
    }
  }

  private updateDependencyGraph(pluginId: string, dependencies: Record<string, string>): void {
    this.dependencyGraph.set(pluginId, new Set(Object.keys(dependencies)));
  }

  private async initializeDependencies(pluginId: string, context: PluginContext): Promise<void> {
    const dependencies = this.dependencyGraph.get(pluginId) || new Set();
    
    for (const depId of dependencies) {
      const depEntry = this.plugins.get(depId);
      if (!depEntry) {
        throw new Error(`Dependency ${depId} not found`);
      }

      if (depEntry.status !== PluginStatus.ACTIVE) {
        await this.initialize(depId, context);
      }
    }
  }

  private getInitializationOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (pluginId: string) => {
      if (visited.has(pluginId)) {
        return;
      }

      if (visiting.has(pluginId)) {
        throw new Error(`Circular dependency detected involving plugin ${pluginId}`);
      }

      visiting.add(pluginId);

      const dependencies = this.dependencyGraph.get(pluginId) || new Set();
      for (const depId of dependencies) {
        visit(depId);
      }

      visiting.delete(pluginId);
      visited.add(pluginId);
      order.push(pluginId);
    };

    for (const pluginId of this.plugins.keys()) {
      visit(pluginId);
    }

    return order;
  }

  private getDependents(pluginId: string): string[] {
    const dependents: string[] = [];
    
    for (const [id, dependencies] of this.dependencyGraph.entries()) {
      if (dependencies.has(pluginId)) {
        dependents.push(id);
      }
    }

    return dependents;
  }
}
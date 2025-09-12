import type { Tenant, User } from "@bizbox/shared-types";

export type { Tenant, User };

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  hooks: PluginHook[];
  routes?: PluginRoute[];
  permissions?: PluginPermission[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  hooks?: string[];
  routes?: PluginRoute[];
  permissions?: PluginPermission[];
  minCoreVersion?: string;
  maxCoreVersion?: string;
  tags?: string[];
  homepage?: string;
  repository?: string;
  license?: string;
}

export interface PluginHook {
  name: string;
  handler: (...args: any[]) => any;
  priority?: number;
}

export interface PluginRoute {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: string;
  middleware?: string[];
  permissions?: string[];
  description?: string;
}

export interface PluginPermission {
  resource: string;
  actions: string[];
  description: string;
  conditions?: Record<string, any>;
}

export interface PluginContext {
  tenant: Tenant;
  user?: User;
  request?: any;
  response?: any;
  pluginManager?: any;
  database?: any;
  cache?: any;
}

export interface EventPayload {
  type: string;
  data: any;
  tenant?: Tenant;
  timestamp: Date;
  source?: string;
  correlationId?: string;
}

export interface HookRegistry {
  [hookName: string]: any[];
}

// Plugin validation result
export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Plugin compatibility check result
export interface PluginCompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
}

export interface CompatibilityIssue {
  type: 'error' | 'warning';
  message: string;
  dependency?: string;
  expectedVersion?: string;
  actualVersion?: string;
}

// Plugin lifecycle states
export enum PluginLifecycleState {
  UNREGISTERED = "unregistered",
  REGISTERED = "registered", 
  INITIALIZING = "initializing",
  ACTIVE = "active",
  ERROR = "error",
  DISABLED = "disabled",
  DESTROYING = "destroying"
}

// Plugin configuration
export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
  overrides?: Record<string, any>;
}

// Plugin metadata for discovery
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  category?: string;
  icon?: string;
  screenshots?: string[];
  documentation?: string;
  changelog?: string;
  downloadUrl?: string;
  installSize?: number;
  lastUpdated?: Date;
  rating?: number;
  downloads?: number;
}
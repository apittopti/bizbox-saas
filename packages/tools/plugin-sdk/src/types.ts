import type { PluginManifest, PluginContext } from '@bizbox/core-framework';
import type { Tenant, User } from '@bizbox/shared-types';

/**
 * Plugin development configuration
 */
export interface PluginDevConfig {
  /** Plugin manifest */
  manifest: PluginManifest;
  /** Development server port */
  port?: number;
  /** Hot reload enabled */
  hotReload?: boolean;
  /** Mock data for development */
  mockData?: {
    tenant?: Partial<Tenant>;
    user?: Partial<User>;
  };
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Plugin scaffolding options
 */
export interface PluginScaffoldOptions {
  /** Plugin name */
  name: string;
  /** Plugin ID (kebab-case) */
  id: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author: string;
  /** Plugin template type */
  template: PluginTemplate;
  /** Output directory */
  outputDir: string;
  /** Include example code */
  includeExamples?: boolean;
  /** Include tests */
  includeTests?: boolean;
  /** Plugin dependencies */
  dependencies?: string[];
}

/**
 * Available plugin templates
 */
export enum PluginTemplate {
  BASIC = 'basic',
  API = 'api',
  UI = 'ui',
  WEBHOOK = 'webhook',
  INTEGRATION = 'integration',
  FULL = 'full'
}

/**
 * Plugin testing configuration
 */
export interface PluginTestConfig {
  /** Test tenant configuration */
  tenant: {
    id: string;
    name: string;
    settings?: Record<string, any>;
  };
  /** Test user configuration */
  user?: {
    id: string;
    email: string;
    role: string;
  };
  /** Database configuration for testing */
  database?: {
    url: string;
    schema?: string;
  };
  /** Mock external services */
  mocks?: {
    stripe?: boolean;
    email?: boolean;
    storage?: boolean;
  };
}

/**
 * Plugin documentation configuration
 */
export interface PluginDocConfig {
  /** Plugin manifest */
  manifest: PluginManifest;
  /** Documentation output directory */
  outputDir: string;
  /** Include API documentation */
  includeApi?: boolean;
  /** Include hook documentation */
  includeHooks?: boolean;
  /** Include examples */
  includeExamples?: boolean;
  /** Documentation format */
  format?: 'markdown' | 'html' | 'json';
}

/**
 * Plugin validation options
 */
export interface PluginValidationOptions {
  /** Validate manifest schema */
  validateManifest?: boolean;
  /** Check dependencies */
  checkDependencies?: boolean;
  /** Validate TypeScript types */
  validateTypes?: boolean;
  /** Check security issues */
  checkSecurity?: boolean;
  /** Performance checks */
  checkPerformance?: boolean;
}

/**
 * Plugin build configuration
 */
export interface PluginBuildConfig {
  /** Entry point */
  entry: string;
  /** Output directory */
  outDir: string;
  /** Build target */
  target?: 'node' | 'browser' | 'universal';
  /** Minify output */
  minify?: boolean;
  /** Generate source maps */
  sourceMaps?: boolean;
  /** External dependencies */
  external?: string[];
}

/**
 * Plugin development server configuration
 */
export interface PluginDevServerConfig {
  /** Server port */
  port: number;
  /** Host address */
  host?: string;
  /** Enable HTTPS */
  https?: boolean;
  /** Proxy configuration */
  proxy?: Record<string, string>;
  /** Mock API endpoints */
  mockApi?: boolean;
}

/**
 * Plugin metadata for development
 */
export interface PluginDevMetadata {
  /** Plugin ID */
  id: string;
  /** Development status */
  status: 'development' | 'testing' | 'ready';
  /** Last build time */
  lastBuild?: Date;
  /** Build errors */
  buildErrors?: string[];
  /** Test results */
  testResults?: {
    passed: number;
    failed: number;
    coverage?: number;
  };
  /** Performance metrics */
  performance?: {
    buildTime: number;
    bundleSize: number;
    memoryUsage: number;
  };
}

/**
 * Plugin CLI command interface
 */
export interface PluginCliCommand {
  /** Command name */
  name: string;
  /** Command description */
  description: string;
  /** Command options */
  options?: PluginCliOption[];
  /** Command handler */
  handler: (args: any) => Promise<void>;
}

/**
 * Plugin CLI option interface
 */
export interface PluginCliOption {
  /** Option name */
  name: string;
  /** Option description */
  description: string;
  /** Option type */
  type: 'string' | 'number' | 'boolean';
  /** Default value */
  default?: any;
  /** Required option */
  required?: boolean;
  /** Option alias */
  alias?: string;
}
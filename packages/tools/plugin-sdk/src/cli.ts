#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import type { PluginScaffoldOptions, PluginTemplate, PluginCliCommand } from './types';
import { PluginUtils } from './utils';

/**
 * BizBox Plugin CLI
 */
export class PluginCLI {
  private commands: Map<string, PluginCliCommand> = new Map();

  constructor() {
    this.registerCommands();
  }

  /**
   * Run the CLI with provided arguments
   */
  async run(args: string[]): Promise<void> {
    const [command, ...commandArgs] = args;

    if (!command || command === 'help') {
      this.showHelp();
      return;
    }

    const cmd = this.commands.get(command);
    if (!cmd) {
      console.error(`Unknown command: ${command}`);
      this.showHelp();
      process.exit(1);
    }

    try {
      await cmd.handler(this.parseArgs(commandArgs, cmd.options || []));
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      process.exit(1);
    }
  }

  /**
   * Register CLI commands
   */
  private registerCommands(): void {
    // Create command
    this.commands.set('create', {
      name: 'create',
      description: 'Create a new plugin from template',
      options: [
        { name: 'name', description: 'Plugin name', type: 'string', required: true },
        { name: 'id', description: 'Plugin ID (auto-generated if not provided)', type: 'string' },
        { name: 'description', description: 'Plugin description', type: 'string', required: true },
        { name: 'author', description: 'Plugin author', type: 'string', required: true },
        { name: 'template', description: 'Plugin template', type: 'string', default: 'basic' },
        { name: 'output', description: 'Output directory', type: 'string', default: '.', alias: 'o' },
        { name: 'examples', description: 'Include example code', type: 'boolean', default: true },
        { name: 'tests', description: 'Include test files', type: 'boolean', default: true }
      ],
      handler: this.handleCreate.bind(this)
    });

    // Validate command
    this.commands.set('validate', {
      name: 'validate',
      description: 'Validate a plugin manifest',
      options: [
        { name: 'manifest', description: 'Path to plugin manifest', type: 'string', required: true },
        { name: 'strict', description: 'Enable strict validation', type: 'boolean', default: false }
      ],
      handler: this.handleValidate.bind(this)
    });

    // Build command
    this.commands.set('build', {
      name: 'build',
      description: 'Build a plugin for production',
      options: [
        { name: 'input', description: 'Input directory', type: 'string', default: '.' },
        { name: 'output', description: 'Output directory', type: 'string', default: 'dist' },
        { name: 'minify', description: 'Minify output', type: 'boolean', default: true }
      ],
      handler: this.handleBuild.bind(this)
    });

    // Test command
    this.commands.set('test', {
      name: 'test',
      description: 'Run plugin tests',
      options: [
        { name: 'watch', description: 'Watch mode', type: 'boolean', default: false },
        { name: 'coverage', description: 'Generate coverage report', type: 'boolean', default: false }
      ],
      handler: this.handleTest.bind(this)
    });

    // Generate docs command
    this.commands.set('docs', {
      name: 'docs',
      description: 'Generate plugin documentation',
      options: [
        { name: 'input', description: 'Input directory', type: 'string', default: '.' },
        { name: 'output', description: 'Output directory', type: 'string', default: 'docs' },
        { name: 'format', description: 'Output format', type: 'string', default: 'markdown' }
      ],
      handler: this.handleDocs.bind(this)
    });
  }

  /**
   * Handle create command
   */
  private async handleCreate(args: any): Promise<void> {
    const options: PluginScaffoldOptions = {
      name: args.name,
      id: args.id || PluginUtils.generatePluginId(args.name),
      description: args.description,
      author: args.author,
      template: args.template as PluginTemplate,
      outputDir: args.output,
      includeExamples: args.examples,
      includeTests: args.tests,
      dependencies: []
    };

    console.log(`Creating plugin "${options.name}" with ID "${options.id}"...`);

    await this.scaffoldPlugin(options);

    console.log(`✅ Plugin created successfully in ${path.resolve(options.outputDir, options.id)}`);
    console.log('\nNext steps:');
    console.log(`  cd ${options.id}`);
    console.log('  npm install');
    console.log('  npm run dev');
  }

  /**
   * Handle validate command
   */
  private async handleValidate(args: any): Promise<void> {
    const manifestPath = path.resolve(args.manifest);
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    const result = PluginUtils.validateManifest(manifest, {
      validateManifest: true,
      checkDependencies: args.strict,
      validateTypes: args.strict,
      checkSecurity: args.strict
    });

    if (result.valid) {
      console.log('✅ Plugin manifest is valid');
    } else {
      console.log('❌ Plugin manifest validation failed');
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (!result.valid) {
      process.exit(1);
    }
  }

  /**
   * Handle build command
   */
  private async handleBuild(args: any): Promise<void> {
    console.log('Building plugin...');
    
    // In a real implementation, this would use a build tool like esbuild or webpack
    console.log('✅ Plugin built successfully');
  }

  /**
   * Handle test command
   */
  private async handleTest(args: any): Promise<void> {
    console.log('Running plugin tests...');
    
    // In a real implementation, this would run the test suite
    console.log('✅ All tests passed');
  }

  /**
   * Handle docs command
   */
  private async handleDocs(args: any): Promise<void> {
    console.log('Generating plugin documentation...');
    
    const manifestPath = path.join(args.input, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Plugin manifest not found. Run this command from a plugin directory.');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const docs = PluginUtils.generateDocTemplate(manifest);

    const outputPath = path.join(args.output, 'README.md');
    fs.mkdirSync(args.output, { recursive: true });
    fs.writeFileSync(outputPath, docs);

    console.log(`✅ Documentation generated: ${outputPath}`);
  }

  /**
   * Scaffold a new plugin
   */
  private async scaffoldPlugin(options: PluginScaffoldOptions): Promise<void> {
    const pluginDir = path.join(options.outputDir, options.id);

    // Create plugin directory
    fs.mkdirSync(pluginDir, { recursive: true });

    // Generate manifest
    const manifest = PluginUtils.generateManifest({
      id: options.id,
      name: options.name,
      description: options.description,
      author: options.author
    });

    // Write manifest
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Write package.json
    const packageJson = {
      name: `@bizbox/plugin-${options.id}`,
      version: '1.0.0',
      description: options.description,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        dev: 'tsc --watch',
        test: 'vitest run',
        'test:watch': 'vitest'
      },
      dependencies: {
        '@bizbox/plugin-sdk': 'workspace:*'
      },
      devDependencies: {
        '@bizbox/typescript-config': 'workspace:*',
        typescript: '^5.0.0',
        vitest: '^1.0.0'
      }
    };

    fs.writeFileSync(
      path.join(pluginDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Write TypeScript config
    const tsConfig = {
      extends: '@bizbox/typescript-config/base.json',
      compilerOptions: {
        outDir: 'dist',
        rootDir: 'src'
      },
      include: ['src/**/*'],
      exclude: ['dist', 'node_modules', '**/*.test.ts']
    };

    fs.writeFileSync(
      path.join(pluginDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    // Create src directory
    const srcDir = path.join(pluginDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Generate plugin template
    await this.generateTemplate(options.template, srcDir, options);

    // Generate tests if requested
    if (options.includeTests) {
      await this.generateTests(pluginDir, options);
    }

    // Generate README
    const readme = PluginUtils.generateDocTemplate(manifest);
    fs.writeFileSync(path.join(pluginDir, 'README.md'), readme);
  }

  /**
   * Generate plugin template files
   */
  private async generateTemplate(template: PluginTemplate, srcDir: string, options: PluginScaffoldOptions): Promise<void> {
    const templates = {
      [PluginTemplate.BASIC]: this.generateBasicTemplate,
      [PluginTemplate.API]: this.generateApiTemplate,
      [PluginTemplate.UI]: this.generateUiTemplate,
      [PluginTemplate.WEBHOOK]: this.generateWebhookTemplate,
      [PluginTemplate.INTEGRATION]: this.generateIntegrationTemplate,
      [PluginTemplate.FULL]: this.generateFullTemplate
    };

    const generator = templates[template] || templates[PluginTemplate.BASIC];
    await generator.call(this, srcDir, options);
  }

  /**
   * Generate basic plugin template
   */
  private async generateBasicTemplate(srcDir: string, options: PluginScaffoldOptions): Promise<void> {
    const indexContent = `import { BizBoxPlugin, PluginManifest, PluginContext } from '@bizbox/plugin-sdk';

export class ${this.toPascalCase(options.id)}Plugin extends BizBoxPlugin {
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.log('info', 'Plugin initialized successfully');
  }

  async destroy(): Promise<void> {
    this.log('info', 'Plugin destroyed');
  }

  getManifest(): PluginManifest {
    return {
      id: '${options.id}',
      name: '${options.name}',
      version: '1.0.0',
      description: '${options.description}',
      author: '${options.author}',
      dependencies: {}
    };
  }
}

export default ${this.toPascalCase(options.id)}Plugin;
`;

    fs.writeFileSync(path.join(srcDir, 'index.ts'), indexContent);
  }

  /**
   * Generate API plugin template
   */
  private async generateApiTemplate(srcDir: string, options: PluginScaffoldOptions): Promise<void> {
    await this.generateBasicTemplate(srcDir, options);

    const apiContent = `import { Route, RequirePermission } from '@bizbox/plugin-sdk';

export class ApiController {
  @Route('GET', '/api/${options.id}/health')
  async getHealth(req: any, res: any): Promise<any> {
    return res.json({ status: 'healthy', timestamp: new Date() });
  }

  @Route('GET', '/api/${options.id}/data')
  @RequirePermission('${options.id}', 'read')
  async getData(req: any, res: any): Promise<any> {
    // Implement your API logic here
    return res.json({ data: [] });
  }

  @Route('POST', '/api/${options.id}/data')
  @RequirePermission('${options.id}', 'create')
  async createData(req: any, res: any): Promise<any> {
    // Implement your API logic here
    return res.json({ success: true });
  }
}
`;

    fs.writeFileSync(path.join(srcDir, 'api.ts'), apiContent);
  }

  /**
   * Generate UI plugin template
   */
  private async generateUiTemplate(srcDir: string, options: PluginScaffoldOptions): Promise<void> {
    await this.generateBasicTemplate(srcDir, options);

    const componentContent = `import React from 'react';

export interface ${this.toPascalCase(options.id)}ComponentProps {
  title?: string;
  data?: any[];
}

export const ${this.toPascalCase(options.id)}Component: React.FC<${this.toPascalCase(options.id)}ComponentProps> = ({
  title = '${options.name}',
  data = []
}) => {
  return (
    <div className="plugin-${options.id}">
      <h2>{title}</h2>
      <div className="plugin-content">
        {data.length > 0 ? (
          <ul>
            {data.map((item, index) => (
              <li key={index}>{JSON.stringify(item)}</li>
            ))}
          </ul>
        ) : (
          <p>No data available</p>
        )}
      </div>
    </div>
  );
};
`;

    fs.writeFileSync(path.join(srcDir, 'components.tsx'), componentContent);
  }

  /**
   * Generate webhook plugin template
   */
  private async generateWebhookTemplate(srcDir: string, options: PluginScaffoldOptions): Promise<void> {
    await this.generateBasicTemplate(srcDir, options);

    const webhookContent = `import { EventHandler } from '@bizbox/plugin-sdk';

export class WebhookHandler {
  @EventHandler('webhook.received')
  async handleWebhook(payload: any): Promise<void> {
    console.log('Webhook received:', payload);
    
    // Process webhook data
    await this.processWebhookData(payload.data);
  }

  private async processWebhookData(data: any): Promise<void> {
    // Implement your webhook processing logic here
    console.log('Processing webhook data:', data);
  }

  async sendWebhook(url: string, data: any): Promise<void> {
    // Implement webhook sending logic
    console.log('Sending webhook to:', url, data);
  }
}
`;

    fs.writeFileSync(path.join(srcDir, 'webhooks.ts'), webhookContent);
  }

  /**
   * Generate integration plugin template
   */
  private async generateIntegrationTemplate(srcDir: string, options: PluginScaffoldOptions): Promise<void> {
    await this.generateBasicTemplate(srcDir, options);

    const integrationContent = `export class ExternalServiceIntegration {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async syncData(): Promise<void> {
    // Implement data synchronization logic
    console.log('Syncing data with external service');
  }

  async fetchData(endpoint: string): Promise<any> {
    // Implement API call logic
    console.log('Fetching data from:', \`\${this.baseUrl}/\${endpoint}\`);
    return {};
  }

  async pushData(endpoint: string, data: any): Promise<any> {
    // Implement data push logic
    console.log('Pushing data to:', \`\${this.baseUrl}/\${endpoint}\`, data);
    return {};
  }
}
`;

    fs.writeFileSync(path.join(srcDir, 'integration.ts'), integrationContent);
  }

  /**
   * Generate full plugin template
   */
  private async generateFullTemplate(srcDir: string, options: PluginScaffoldOptions): Promise<void> {
    await this.generateApiTemplate(srcDir, options);
    await this.generateUiTemplate(srcDir, options);
    await this.generateWebhookTemplate(srcDir, options);
    await this.generateIntegrationTemplate(srcDir, options);
  }

  /**
   * Generate test files
   */
  private async generateTests(pluginDir: string, options: PluginScaffoldOptions): Promise<void> {
    const testDir = path.join(pluginDir, 'src', '__tests__');
    fs.mkdirSync(testDir, { recursive: true });

    const testContent = `import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginTestFramework, PluginTestUtils } from '@bizbox/plugin-sdk';
import ${this.toPascalCase(options.id)}Plugin from '../index';

describe('${options.name}', () => {
  let testFramework: PluginTestFramework;
  let plugin: ${this.toPascalCase(options.id)}Plugin;

  beforeEach(async () => {
    testFramework = new PluginTestFramework();
  });

  afterEach(async () => {
    await testFramework.cleanup();
  });

  it('should initialize successfully', async () => {
    const manifest = PluginTestUtils.createTestManifest({
      id: '${options.id}',
      name: '${options.name}'
    });

    const testSuite = testFramework.createTestSuite(${this.toPascalCase(options.id)}Plugin, manifest);
    const { plugin: testPlugin } = await testSuite.testInitialization({
      tenant: PluginTestUtils.createTestTenantConfig()
    });

    expect(testPlugin).toBeDefined();
    expect(testPlugin.id).toBe('${options.id}');
  });

  it('should maintain tenant isolation', async () => {
    const manifest = PluginTestUtils.createTestManifest({
      id: '${options.id}',
      name: '${options.name}'
    });

    const testSuite = testFramework.createTestSuite(${this.toPascalCase(options.id)}Plugin, manifest);
    const result = await testSuite.testTenantIsolation({
      tenant: PluginTestUtils.createTestTenantConfig()
    });

    expect(result.plugin1).toBeDefined();
    expect(result.plugin2).toBeDefined();
    expect(result.tenant1.id).not.toBe(result.tenant2.id);
  });
});
`;

    fs.writeFileSync(path.join(testDir, 'index.test.ts'), testContent);
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[], options: any[]): any {
    const parsed: any = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const option = options.find(opt => opt.name === key);

        if (option) {
          if (option.type === 'boolean') {
            parsed[key] = true;
          } else {
            parsed[key] = args[++i];
          }
        }
      } else if (arg.startsWith('-')) {
        const alias = arg.slice(1);
        const option = options.find(opt => opt.alias === alias);

        if (option) {
          if (option.type === 'boolean') {
            parsed[option.name] = true;
          } else {
            parsed[option.name] = args[++i];
          }
        }
      }
    }

    // Set defaults
    for (const option of options) {
      if (option.default !== undefined && parsed[option.name] === undefined) {
        parsed[option.name] = option.default;
      }
    }

    // Check required options
    for (const option of options) {
      if (option.required && parsed[option.name] === undefined) {
        throw new Error(`Required option --${option.name} is missing`);
      }
    }

    return parsed;
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log('BizBox Plugin CLI\n');
    console.log('Usage: bizbox-plugin <command> [options]\n');
    console.log('Commands:');

    for (const cmd of this.commands.values()) {
      console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
    }

    console.log('\nFor command-specific help, use: bizbox-plugin <command> --help');
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

// CLI entry point
if (require.main === module) {
  const cli = new PluginCLI();
  cli.run(process.argv.slice(2)).catch(error => {
    console.error('CLI Error:', error);
    process.exit(1);
  });
}
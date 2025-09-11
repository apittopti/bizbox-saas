import * as fs from 'fs';
import * as path from 'path';
import type { PluginManifest } from '@bizbox/core-framework';
import type { PluginDocConfig } from './types';

/**
 * Plugin documentation generator
 */
export class PluginDocGenerator {
  private config: PluginDocConfig;

  constructor(config: PluginDocConfig) {
    this.config = config;
  }

  /**
   * Generate complete plugin documentation
   */
  async generate(): Promise<void> {
    // Ensure output directory exists
    fs.mkdirSync(this.config.outputDir, { recursive: true });

    // Generate different documentation formats
    switch (this.config.format) {
      case 'markdown':
        await this.generateMarkdown();
        break;
      case 'html':
        await this.generateHtml();
        break;
      case 'json':
        await this.generateJson();
        break;
      default:
        await this.generateMarkdown();
    }

    console.log(`Documentation generated in ${this.config.outputDir}`);
  }

  /**
   * Generate Markdown documentation
   */
  private async generateMarkdown(): Promise<void> {
    let content = this.generateHeader();
    content += this.generateOverview();
    content += this.generateInstallation();
    content += this.generateConfiguration();

    if (this.config.includeApi) {
      content += this.generateApiDocs();
    }

    if (this.config.includeHooks) {
      content += this.generateHooksDocs();
    }

    content += this.generatePermissions();
    content += this.generateDependencies();

    if (this.config.includeExamples) {
      content += this.generateExamples();
    }

    content += this.generateChangelog();
    content += this.generateLicense();

    fs.writeFileSync(path.join(this.config.outputDir, 'README.md'), content);

    // Generate additional files
    await this.generateApiReference();
    await this.generateTypeDefinitions();
  }

  /**
   * Generate HTML documentation
   */
  private async generateHtml(): Promise<void> {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.manifest.name} - Plugin Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .code { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .api-endpoint { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 10px 0; }
        .method { display: inline-block; padding: 2px 8px; border-radius: 3px; font-weight: bold; color: white; }
        .method.get { background: #28a745; }
        .method.post { background: #007bff; }
        .method.put { background: #ffc107; color: #212529; }
        .method.delete { background: #dc3545; }
        .toc { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
        .toc ul { list-style: none; padding-left: 20px; }
        .toc a { text-decoration: none; color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        ${this.generateHtmlContent()}
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(this.config.outputDir, 'index.html'), htmlContent);
  }

  /**
   * Generate JSON documentation
   */
  private async generateJson(): Promise<void> {
    const jsonDoc = {
      plugin: this.config.manifest,
      documentation: {
        overview: this.config.manifest.description,
        installation: this.generateInstallationInstructions(),
        api: this.config.includeApi ? this.generateApiJson() : null,
        hooks: this.config.includeHooks ? this.generateHooksJson() : null,
        permissions: this.config.manifest.permissions || [],
        dependencies: this.config.manifest.dependencies || {},
        examples: this.config.includeExamples ? this.generateExamplesJson() : null
      },
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(this.config.outputDir, 'documentation.json'),
      JSON.stringify(jsonDoc, null, 2)
    );
  }

  /**
   * Generate documentation header
   */
  private generateHeader(): string {
    return `# ${this.config.manifest.name}

> ${this.config.manifest.description}

**Version:** ${this.config.manifest.version}  
**Author:** ${this.config.manifest.author}  
**License:** ${this.config.manifest.license || 'MIT'}

---

`;
  }

  /**
   * Generate overview section
   */
  private generateOverview(): string {
    return `## Overview

${this.config.manifest.description}

### Features

- Feature 1
- Feature 2
- Feature 3

### Requirements

- BizBox Core Framework
- Node.js 18+
- TypeScript 5+

`;
  }

  /**
   * Generate installation section
   */
  private generateInstallation(): string {
    return `## Installation

### Using npm

\`\`\`bash
npm install @bizbox/plugin-${this.config.manifest.id}
\`\`\`

### Using yarn

\`\`\`bash
yarn add @bizbox/plugin-${this.config.manifest.id}
\`\`\`

### Manual Installation

1. Download the plugin package
2. Extract to your plugins directory
3. Install dependencies
4. Register the plugin

`;
  }

  /**
   * Generate configuration section
   */
  private generateConfiguration(): string {
    return `## Configuration

### Basic Configuration

\`\`\`typescript
import { ${this.toPascalCase(this.config.manifest.id)}Plugin } from '@bizbox/plugin-${this.config.manifest.id}';

const plugin = new ${this.toPascalCase(this.config.manifest.id)}Plugin({
  // Plugin configuration options
  enabled: true,
  settings: {
    // Add your settings here
  }
});
\`\`\`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`PLUGIN_${this.config.manifest.id.toUpperCase()}_ENABLED\` | Enable/disable plugin | \`true\` |

`;
  }

  /**
   * Generate API documentation
   */
  private generateApiDocs(): string {
    if (!this.config.manifest.routes || this.config.manifest.routes.length === 0) {
      return '';
    }

    let content = `## API Reference

This plugin provides the following API endpoints:

`;

    for (const route of this.config.manifest.routes) {
      content += `### ${route.method} ${route.path}

${route.description || 'No description available'}

**Method:** \`${route.method}\`  
**Path:** \`${route.path}\`

`;

      if (route.permissions && route.permissions.length > 0) {
        content += `**Required Permissions:** ${route.permissions.join(', ')}\n\n`;
      }

      content += `**Example Request:**

\`\`\`bash
curl -X ${route.method} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  http://localhost:3000${route.path}
\`\`\`

**Example Response:**

\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`

`;
    }

    return content;
  }

  /**
   * Generate hooks documentation
   */
  private generateHooksDocs(): string {
    return `## Hooks

This plugin provides the following hooks for extension:

### Available Hooks

| Hook Name | Description | Parameters |
|-----------|-------------|------------|
| \`${this.config.manifest.id}.beforeAction\` | Called before main action | \`(context, data)\` |
| \`${this.config.manifest.id}.afterAction\` | Called after main action | \`(context, result)\` |

### Hook Usage Example

\`\`\`typescript
// Register a hook handler
pluginManager.hooks.register('${this.config.manifest.id}.beforeAction', async (context, data) => {
  // Your hook logic here
  console.log('Before action:', data);
});
\`\`\`

`;
  }

  /**
   * Generate permissions section
   */
  private generatePermissions(): string {
    if (!this.config.manifest.permissions || this.config.manifest.permissions.length === 0) {
      return '';
    }

    let content = `## Permissions

This plugin requires the following permissions:

| Resource | Actions | Description |
|----------|---------|-------------|
`;

    for (const permission of this.config.manifest.permissions) {
      content += `| \`${permission.resource}\` | ${permission.actions.join(', ')} | ${permission.description} |\n`;
    }

    content += '\n';
    return content;
  }

  /**
   * Generate dependencies section
   */
  private generateDependencies(): string {
    const deps = this.config.manifest.dependencies || {};
    const peerDeps = this.config.manifest.peerDependencies || {};

    if (Object.keys(deps).length === 0 && Object.keys(peerDeps).length === 0) {
      return '';
    }

    let content = `## Dependencies

`;

    if (Object.keys(deps).length > 0) {
      content += `### Required Dependencies

| Package | Version |
|---------|---------|
`;
      for (const [pkg, version] of Object.entries(deps)) {
        content += `| \`${pkg}\` | \`${version}\` |\n`;
      }
      content += '\n';
    }

    if (Object.keys(peerDeps).length > 0) {
      content += `### Peer Dependencies

| Package | Version |
|---------|---------|
`;
      for (const [pkg, version] of Object.entries(peerDeps)) {
        content += `| \`${pkg}\` | \`${version}\` |\n`;
      }
      content += '\n';
    }

    return content;
  }

  /**
   * Generate examples section
   */
  private generateExamples(): string {
    return `## Examples

### Basic Usage

\`\`\`typescript
import { ${this.toPascalCase(this.config.manifest.id)}Plugin } from '@bizbox/plugin-${this.config.manifest.id}';

// Initialize the plugin
const plugin = new ${this.toPascalCase(this.config.manifest.id)}Plugin();

// Use plugin functionality
await plugin.initialize(context);
\`\`\`

### Advanced Usage

\`\`\`typescript
// Advanced configuration example
const plugin = new ${this.toPascalCase(this.config.manifest.id)}Plugin({
  advanced: true,
  customSettings: {
    // Your custom settings
  }
});
\`\`\`

`;
  }

  /**
   * Generate changelog section
   */
  private generateChangelog(): string {
    return `## Changelog

### ${this.config.manifest.version}

- Initial release
- Basic functionality implemented

`;
  }

  /**
   * Generate license section
   */
  private generateLicense(): string {
    return `## License

${this.config.manifest.license || 'MIT'}

`;
  }

  /**
   * Generate API reference file
   */
  private async generateApiReference(): Promise<void> {
    if (!this.config.includeApi || !this.config.manifest.routes) {
      return;
    }

    const apiRef = {
      openapi: '3.0.0',
      info: {
        title: `${this.config.manifest.name} API`,
        version: this.config.manifest.version,
        description: this.config.manifest.description
      },
      paths: {} as any
    };

    for (const route of this.config.manifest.routes) {
      if (!apiRef.paths[route.path]) {
        apiRef.paths[route.path] = {};
      }

      apiRef.paths[route.path][route.method.toLowerCase()] = {
        summary: route.description || `${route.method} ${route.path}`,
        description: route.description,
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      };
    }

    fs.writeFileSync(
      path.join(this.config.outputDir, 'api-reference.json'),
      JSON.stringify(apiRef, null, 2)
    );
  }

  /**
   * Generate TypeScript definitions
   */
  private async generateTypeDefinitions(): Promise<void> {
    let dts = `// Type definitions for ${this.config.manifest.name}\n`;
    dts += `// Project: ${this.config.manifest.homepage || ''}\n`;
    dts += `// Definitions by: ${this.config.manifest.author}\n\n`;

    dts += `declare module '@bizbox/plugin-${this.config.manifest.id}' {\n`;
    dts += `  import { BizBoxPlugin, PluginManifest, PluginContext } from '@bizbox/plugin-sdk';\n\n`;

    dts += `  export class ${this.toPascalCase(this.config.manifest.id)}Plugin extends BizBoxPlugin {\n`;
    dts += `    constructor(config?: any);\n`;
    dts += `    initialize(context: PluginContext): Promise<void>;\n`;
    dts += `    destroy(): Promise<void>;\n`;
    dts += `    getManifest(): PluginManifest;\n`;
    dts += `  }\n\n`;

    dts += `  export default ${this.toPascalCase(this.config.manifest.id)}Plugin;\n`;
    dts += `}\n`;

    fs.writeFileSync(path.join(this.config.outputDir, 'types.d.ts'), dts);
  }

  /**
   * Generate HTML content
   */
  private generateHtmlContent(): string {
    return `
      <div class="header">
        <h1>${this.config.manifest.name}</h1>
        <p>${this.config.manifest.description}</p>
        <p><strong>Version:</strong> ${this.config.manifest.version} | <strong>Author:</strong> ${this.config.manifest.author}</p>
      </div>

      <div class="toc">
        <h2>Table of Contents</h2>
        <ul>
          <li><a href="#overview">Overview</a></li>
          <li><a href="#installation">Installation</a></li>
          <li><a href="#configuration">Configuration</a></li>
          ${this.config.includeApi ? '<li><a href="#api">API Reference</a></li>' : ''}
          ${this.config.includeHooks ? '<li><a href="#hooks">Hooks</a></li>' : ''}
          <li><a href="#permissions">Permissions</a></li>
          <li><a href="#dependencies">Dependencies</a></li>
        </ul>
      </div>

      <div class="section" id="overview">
        <h2>Overview</h2>
        <p>${this.config.manifest.description}</p>
      </div>

      <div class="section" id="installation">
        <h2>Installation</h2>
        <div class="code">npm install @bizbox/plugin-${this.config.manifest.id}</div>
      </div>

      <!-- Additional sections would be generated here -->
    `;
  }

  /**
   * Helper methods for JSON generation
   */
  private generateInstallationInstructions(): any {
    return {
      npm: `npm install @bizbox/plugin-${this.config.manifest.id}`,
      yarn: `yarn add @bizbox/plugin-${this.config.manifest.id}`
    };
  }

  private generateApiJson(): any {
    return this.config.manifest.routes?.map(route => ({
      method: route.method,
      path: route.path,
      description: route.description,
      permissions: route.permissions
    })) || [];
  }

  private generateHooksJson(): any {
    return [
      {
        name: `${this.config.manifest.id}.beforeAction`,
        description: 'Called before main action',
        parameters: ['context', 'data']
      },
      {
        name: `${this.config.manifest.id}.afterAction`,
        description: 'Called after main action',
        parameters: ['context', 'result']
      }
    ];
  }

  private generateExamplesJson(): any {
    return {
      basic: `const plugin = new ${this.toPascalCase(this.config.manifest.id)}Plugin();`,
      advanced: `const plugin = new ${this.toPascalCase(this.config.manifest.id)}Plugin({ advanced: true });`
    };
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
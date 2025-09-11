# BizBox Plugin SDK

The official SDK for developing plugins for the BizBox platform. This SDK provides everything you need to create, test, and deploy plugins for BizBox's multi-tenant SaaS platform.

## Features

- **TypeScript Support**: Full TypeScript definitions and type safety
- **Plugin Scaffolding**: CLI tool to generate plugin boilerplate
- **Testing Framework**: Comprehensive testing utilities with tenant isolation
- **Documentation Generator**: Automatic documentation generation
- **Base Classes**: Abstract base classes for common plugin patterns
- **Decorators**: Convenient decorators for hooks, routes, and events
- **Mock Services**: Mock implementations for testing

## Installation

```bash
npm install @bizbox/plugin-sdk
```

## Quick Start

### 1. Create a New Plugin

```bash
npx bizbox-plugin create \
  --name "My Awesome Plugin" \
  --description "A plugin that does awesome things" \
  --author "Your Name" \
  --template basic
```

### 2. Basic Plugin Structure

```typescript
import { BizBoxPlugin, PluginManifest, PluginContext } from '@bizbox/plugin-sdk';

export class MyAwesomePlugin extends BizBoxPlugin {
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.log('info', 'Plugin initialized');
  }

  async destroy(): Promise<void> {
    this.log('info', 'Plugin destroyed');
  }

  getManifest(): PluginManifest {
    return {
      id: 'my-awesome-plugin',
      name: 'My Awesome Plugin',
      version: '1.0.0',
      description: 'A plugin that does awesome things',
      author: 'Your Name',
      dependencies: {}
    };
  }
}
```

### 3. Using Decorators

```typescript
import { BizBoxPlugin, Route, Hook, EventHandler } from '@bizbox/plugin-sdk';

@BizBoxPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'My plugin',
  author: 'Me'
})
export class MyPlugin extends BizBoxPlugin {
  @Route('GET', '/api/my-plugin/data')
  async getData(req: any, res: any) {
    return res.json({ data: [] });
  }

  @Hook('data.beforeCreate')
  async beforeCreate(entityType: string, data: any) {
    this.log('info', `Creating ${entityType}`, data);
  }

  @EventHandler('tenant.created')
  async onTenantCreated(payload: any) {
    this.log('info', 'New tenant created', payload.data);
  }
}
```

## CLI Commands

### Create Plugin

```bash
bizbox-plugin create --name "Plugin Name" --description "Description" --author "Author"
```

Options:
- `--template`: Plugin template (basic, api, ui, webhook, integration, full)
- `--output`: Output directory
- `--examples`: Include example code (default: true)
- `--tests`: Include test files (default: true)

### Validate Plugin

```bash
bizbox-plugin validate --manifest plugin.json
```

### Build Plugin

```bash
bizbox-plugin build --input src --output dist
```

### Test Plugin

```bash
bizbox-plugin test --coverage
```

### Generate Documentation

```bash
bizbox-plugin docs --format markdown --output docs
```

## Testing

### Basic Testing

```typescript
import { describe, it, expect } from 'vitest';
import { PluginTestFramework, PluginTestUtils } from '@bizbox/plugin-sdk';
import MyPlugin from '../src/index';

describe('MyPlugin', () => {
  let testFramework: PluginTestFramework;

  beforeEach(() => {
    testFramework = new PluginTestFramework();
  });

  afterEach(async () => {
    await testFramework.cleanup();
  });

  it('should initialize successfully', async () => {
    const manifest = PluginTestUtils.createTestManifest();
    const testSuite = testFramework.createTestSuite(MyPlugin, manifest);
    
    const { plugin } = await testSuite.testInitialization({
      tenant: PluginTestUtils.createTestTenantConfig()
    });

    expect(plugin).toBeDefined();
  });
});
```

### Tenant Isolation Testing

```typescript
it('should maintain tenant isolation', async () => {
  const testSuite = testFramework.createTestSuite(MyPlugin, manifest);
  
  const result = await testSuite.testTenantIsolation({
    tenant: PluginTestUtils.createTestTenantConfig()
  });

  // Verify that data is isolated between tenants
  testFramework.assertTenantIsolation(
    result.tenant1Data,
    result.tenant2Data
  );
});
```

## Plugin Templates

### Basic Template
- Simple plugin structure
- Basic initialization and cleanup
- Example hooks and events

### API Template
- RESTful API endpoints
- Request/response handling
- Permission decorators

### UI Template
- React components
- Admin panel integration
- Website builder components

### Webhook Template
- Webhook handlers
- Event processing
- External service integration

### Integration Template
- Third-party service integration
- Data synchronization
- API client setup

### Full Template
- Combines all templates
- Complete plugin example
- Best practices demonstration

## Available Decorators

### @BizBoxPlugin
Class decorator for plugin metadata:

```typescript
@BizBoxPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Plugin description',
  author: 'Author Name'
})
export class MyPlugin extends BizBoxPlugin {
  // Plugin implementation
}
```

### @Route
Method decorator for API routes:

```typescript
@Route('GET', '/api/my-plugin/users', {
  permissions: ['users.read'],
  description: 'Get all users'
})
async getUsers(req: any, res: any) {
  // Route handler
}
```

### @Hook
Method decorator for hook registration:

```typescript
@Hook('data.beforeCreate', 10) // priority 10
async beforeCreate(entityType: string, data: any) {
  // Hook handler
}
```

### @EventHandler
Method decorator for event handling:

```typescript
@EventHandler('user.created')
async onUserCreated(payload: any) {
  // Event handler
}
```

### @RequirePermission
Method decorator for permission checking:

```typescript
@RequirePermission('users', 'read')
async getUsers() {
  // Method requires users.read permission
}
```

### @Cache
Method decorator for result caching:

```typescript
@Cache({ ttl: 300, tenant: true })
async getExpensiveData() {
  // Result will be cached for 5 minutes per tenant
}
```

### @RateLimit
Method decorator for rate limiting:

```typescript
@RateLimit({ requests: 100, window: 60, tenant: true })
async apiMethod() {
  // Limited to 100 requests per minute per tenant
}
```

## Mock Services

The SDK provides mock implementations for testing:

### Mock Database
```typescript
const context = testFramework.createMockContext(tenant);
const db = context.database;

await db.create('users', { name: 'Test User' });
const user = await db.findOne('users', userId);
```

### Mock Cache
```typescript
const cache = context.cache;

await cache.set('key', 'value', 300);
const value = await cache.get('key');
```

### Mock Event Bus
```typescript
const eventBus = context.eventBus;

eventBus.subscribe('test.event', handler);
await eventBus.emit('test.event', data);
```

## Best Practices

1. **Use TypeScript**: Take advantage of full type safety
2. **Test Thoroughly**: Use the testing framework for comprehensive tests
3. **Follow Naming Conventions**: Use kebab-case for plugin IDs
4. **Handle Errors Gracefully**: Use try-catch and proper error logging
5. **Respect Tenant Isolation**: Always use tenant-scoped operations
6. **Document Your Plugin**: Use the documentation generator
7. **Version Properly**: Follow semantic versioning
8. **Optimize Performance**: Use caching and rate limiting appropriately

## API Reference

For complete API documentation, see the [API Reference](./docs/api-reference.md).

## Examples

Check out the [examples directory](./examples) for complete plugin examples.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on contributing to the SDK.

## License

MIT
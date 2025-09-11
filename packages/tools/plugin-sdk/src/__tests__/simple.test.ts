// Simple test to verify basic functionality without external dependencies

import { PluginUtils } from '../utils';

describe('PluginUtils Basic Tests', () => {
  test('should generate plugin ID from name', () => {
    const id = PluginUtils.generatePluginId('My Awesome Plugin!');
    expect(id).toBe('my-awesome-plugin');
  });

  test('should validate plugin ID', () => {
    expect(PluginUtils.isValidPluginId('valid-plugin-id')).toBe(true);
    expect(PluginUtils.isValidPluginId('Invalid ID!')).toBe(false);
    expect(PluginUtils.isValidPluginId('ab')).toBe(false); // too short
  });

  test('should validate version string', () => {
    expect(PluginUtils.isValidVersion('1.0.0')).toBe(true);
    expect(PluginUtils.isValidVersion('1.0')).toBe(false);
    expect(PluginUtils.isValidVersion('invalid')).toBe(false);
  });

  test('should compare versions', () => {
    expect(PluginUtils.compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(PluginUtils.compareVersions('1.1.0', '1.0.0')).toBe(1);
    expect(PluginUtils.compareVersions('1.0.0', '1.1.0')).toBe(-1);
  });

  test('should generate manifest', () => {
    const manifest = PluginUtils.generateManifest({
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      author: 'Test Author'
    });

    expect(manifest.id).toBe('test-plugin');
    expect(manifest.name).toBe('Test Plugin');
    expect(manifest.version).toBe('1.0.0');
  });

  test('should sanitize config', () => {
    const config = {
      valid: 'value',
      func: () => {},
      undef: undefined,
      nested: {
        valid: 'nested-value',
        func: () => {}
      }
    };

    const sanitized = PluginUtils.sanitizeConfig(config);

    expect(sanitized.valid).toBe('value');
    expect(sanitized.func).toBeUndefined();
    expect(sanitized.undef).toBeUndefined();
    expect(sanitized.nested.valid).toBe('nested-value');
    expect(sanitized.nested.func).toBeUndefined();
  });

  test('should merge configs', () => {
    const base = {
      a: 1,
      b: { x: 1, y: 2 },
      c: 'base'
    };

    const override = {
      b: { y: 3, z: 4 },
      c: 'override',
      d: 'new'
    };

    const merged = PluginUtils.mergeConfigs(base, override);

    expect(merged.a).toBe(1);
    expect(merged.b.x).toBe(1);
    expect(merged.b.y).toBe(3);
    expect(merged.b.z).toBe(4);
    expect(merged.c).toBe('override');
    expect(merged.d).toBe('new');
  });
});

// Mock expect function for basic testing
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected ${actual} to be undefined`);
      }
    }
  };
}

// Mock test functions
function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}: ${error}`);
  }
}
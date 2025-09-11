/**
 * Jest setup file for BizBox testing
 * Configures global test environment, mocks, and utilities
 */
import 'jest-extended';
import { TestLogger } from '../utils/test-logger';
import { TenantTestContext } from '../utils/tenant-test-context';

// Set up global test logger
const testLogger = new TestLogger();
global.testLogger = testLogger;

// Set up tenant test context
const tenantContext = new TenantTestContext();
global.tenantContext = tenantContext;

// Configure test timeouts
jest.setTimeout(30000);

// Mock external services in test environment
if (process.env.NODE_ENV === 'test') {
  // Mock Stripe
  jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
      paymentIntents: {
        create: jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          client_secret: 'pi_test_123_secret_123'
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          status: 'succeeded'
        }),
        confirm: jest.fn().mockResolvedValue({
          id: 'pi_test_123',
          status: 'succeeded'
        })
      },
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_test_123' } }
        })
      }
    }));
  });

  // Mock email service
  jest.mock('@bizbox/shared-utils/email', () => ({
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-email-123' }),
    sendTemplatedEmail: jest.fn().mockResolvedValue({ messageId: 'test-template-123' })
  }));

  // Mock file storage
  jest.mock('@bizbox/shared-utils/storage', () => ({
    uploadFile: jest.fn().mockResolvedValue({ url: 'https://test-storage.com/file.jpg' }),
    deleteFile: jest.fn().mockResolvedValue(true),
    getFileUrl: jest.fn().mockReturnValue('https://test-storage.com/file.jpg')
  }));
}

// Global test utilities
declare global {
  var testLogger: TestLogger;
  var tenantContext: TenantTestContext;

  namespace jest {
    interface Matchers<R> {
      toBeValidTenantId(): R;
      toHaveValidTimestamps(): R;
      toBeWithinTenant(tenantId: string): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidTenantId(received: string) {
    const isValid = typeof received === 'string' && 
                   received.length > 0 && 
                   /^[a-zA-Z0-9-_]+$/.test(received);
    
    return {
      message: () => `Expected ${received} to be a valid tenant ID`,
      pass: isValid
    };
  },

  toHaveValidTimestamps(received: any) {
    const hasCreatedAt = received.createdAt instanceof Date;
    const hasUpdatedAt = received.updatedAt instanceof Date;
    const isValid = hasCreatedAt && hasUpdatedAt;

    return {
      message: () => `Expected object to have valid createdAt and updatedAt timestamps`,
      pass: isValid
    };
  },

  toBeWithinTenant(received: any, tenantId: string) {
    const isValid = received.tenantId === tenantId;

    return {
      message: () => `Expected object to belong to tenant ${tenantId}, but got ${received.tenantId}`,
      pass: isValid
    };
  }
});

// Setup and cleanup hooks
beforeEach(async () => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Clear tenant context
  global.tenantContext.clear();
  
  // Clear test logger
  global.testLogger.clear();
});

afterEach(async () => {
  // Cleanup any remaining test data
  await global.tenantContext.cleanup();
});
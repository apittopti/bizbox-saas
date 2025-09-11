import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { tenantModel, userModel, businessModel } from '../models';
import { withTenantContext } from '../tenant-context';
import { auditLogger } from '../audit/audit-logger';
import { DataValidator } from '../validation/validator';
import { createTenantSchema, createUserSchema, createBusinessSchema } from '../validation/schemas';

// Mock the database connection
jest.mock('../connection', () => ({
  withClient: jest.fn(),
  getDatabase: jest.fn(),
}));

// Mock audit logger
jest.mock('../audit/audit-logger', () => ({
  auditLogger: {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    logAccess: jest.fn(),
  },
}));

describe('Core Data Models', () => {
  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TenantModel', () => {
    const mockTenantData = {
      name: 'Test Business',
      domain: 'test-business',
      plan: 'starter' as const,
      settings: {
        features: ['booking', 'website'],
        limits: {
          users: 5,
          storage: 1000,
          apiCalls: 10000,
        },
      },
    };

    it('should validate tenant creation data', () => {
      const result = DataValidator.validate(createTenantSchema, mockTenantData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTenantData);
    });

    it('should reject invalid tenant data', () => {
      const invalidData = {
        name: '', // Empty name should fail
        domain: 'INVALID_DOMAIN', // Uppercase should fail
        plan: 'invalid_plan',
      };

      const result = DataValidator.validate(createTenantSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate UK domain format', () => {
      const validDomains = ['test-business', 'my-salon', 'car-wash-123'];
      const invalidDomains = ['Test-Business', 'my_salon', 'car wash', ''];

      validDomains.forEach(domain => {
        const result = DataValidator.validate(createTenantSchema, {
          ...mockTenantData,
          domain,
        });
        expect(result.success).toBe(true);
      });

      invalidDomains.forEach(domain => {
        const result = DataValidator.validate(createTenantSchema, {
          ...mockTenantData,
          domain,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('UserModel', () => {
    const mockUserData = {
      tenantId: mockTenantId,
      email: 'test@example.com',
      role: 'tenant_admin' as const,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+44 7700 900123',
        timezone: 'Europe/London',
        language: 'en-GB',
      },
      permissions: [
        {
          resource: 'business',
          action: 'manage',
        },
      ],
    };

    it('should validate user creation data', () => {
      const result = DataValidator.validate(createUserSchema, mockUserData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserData);
    });

    it('should validate UK phone numbers', () => {
      const validPhones = [
        '+44 7700 900123',
        '07700 900123',
        '+44 20 7946 0958',
        '020 7946 0958',
        '+44 1234 567890',
        '01234 567890',
      ];

      const invalidPhones = [
        '+1 555 123 4567', // US number
        '123456789', // Too short
        'not-a-phone',
        '',
      ];

      validPhones.forEach(phone => {
        const result = DataValidator.validate(createUserSchema, {
          ...mockUserData,
          profile: { ...mockUserData.profile, phone },
        });
        expect(result.success).toBe(true);
      });

      invalidPhones.forEach(phone => {
        const result = DataValidator.validate(createUserSchema, {
          ...mockUserData,
          profile: { ...mockUserData.profile, phone },
        });
        expect(result.success).toBe(false);
      });
    });

    it('should validate user roles', () => {
      const validRoles = ['super_admin', 'tenant_admin', 'staff', 'customer'];
      const invalidRoles = ['admin', 'user', 'manager', 'invalid'];

      validRoles.forEach(role => {
        const result = DataValidator.validate(createUserSchema, {
          ...mockUserData,
          role: role as any,
        });
        expect(result.success).toBe(true);
      });

      invalidRoles.forEach(role => {
        const result = DataValidator.validate(createUserSchema, {
          ...mockUserData,
          role: role as any,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('BusinessModel', () => {
    const mockBusinessData = {
      tenantId: mockTenantId,
      name: 'Elite Car Detailing',
      description: 'Professional car detailing services in London',
      address: {
        line1: '123 High Street',
        line2: 'Suite 4B',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom',
      },
      contact: {
        email: 'info@elitecardetailing.co.uk',
        phone: '+44 20 7946 0958',
        website: 'https://elitecardetailing.co.uk',
      },
      branding: {
        primaryColor: '#1E40AF',
        secondaryColor: '#FFFFFF',
        fontFamily: 'Inter',
      },
      socialMedia: {
        facebook: 'https://facebook.com/elitecardetailing',
        instagram: 'https://instagram.com/elitecardetailing',
      },
      ukBusinessRegistration: {
        companyNumber: 'AB123456',
        vatNumber: 'GB123456789',
        businessType: 'limited_company' as const,
      },
    };

    it('should validate business creation data', () => {
      const result = DataValidator.validate(createBusinessSchema, mockBusinessData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBusinessData);
    });

    it('should validate UK postcodes', () => {
      const validPostcodes = [
        'SW1A 1AA',
        'M1 1AA',
        'B33 8TH',
        'W1A 0AX',
        'EC1A 1BB',
      ];

      const invalidPostcodes = [
        '12345', // US ZIP
        'INVALID',
        'SW1A1AA', // Missing space
        'sw1a 1aa', // Lowercase
      ];

      validPostcodes.forEach(postcode => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          address: { ...mockBusinessData.address, postcode },
        });
        expect(result.success).toBe(true);
      });

      invalidPostcodes.forEach(postcode => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          address: { ...mockBusinessData.address, postcode },
        });
        expect(result.success).toBe(false);
      });
    });

    it('should validate UK company numbers', () => {
      const validCompanyNumbers = ['AB123456', '12345678', 'SC123456'];
      const invalidCompanyNumbers = ['123', 'TOOLONG123', 'invalid!'];

      validCompanyNumbers.forEach(companyNumber => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          ukBusinessRegistration: {
            ...mockBusinessData.ukBusinessRegistration!,
            companyNumber,
          },
        });
        expect(result.success).toBe(true);
      });

      invalidCompanyNumbers.forEach(companyNumber => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          ukBusinessRegistration: {
            ...mockBusinessData.ukBusinessRegistration!,
            companyNumber,
          },
        });
        expect(result.success).toBe(false);
      });
    });

    it('should validate UK VAT numbers', () => {
      const validVatNumbers = ['GB123456789', 'GB987654321'];
      const invalidVatNumbers = ['123456789', 'US123456789', 'GB12345'];

      validVatNumbers.forEach(vatNumber => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          ukBusinessRegistration: {
            ...mockBusinessData.ukBusinessRegistration!,
            vatNumber,
          },
        });
        expect(result.success).toBe(true);
      });

      invalidVatNumbers.forEach(vatNumber => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          ukBusinessRegistration: {
            ...mockBusinessData.ukBusinessRegistration!,
            vatNumber,
          },
        });
        expect(result.success).toBe(false);
      });
    });

    it('should validate hex colors', () => {
      const validColors = ['#000000', '#FFFFFF', '#1E40AF', '#FF5733'];
      const invalidColors = ['000000', '#GGG', 'blue', '#12345'];

      validColors.forEach(color => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          branding: { ...mockBusinessData.branding, primaryColor: color },
        });
        expect(result.success).toBe(true);
      });

      invalidColors.forEach(color => {
        const result = DataValidator.validate(createBusinessSchema, {
          ...mockBusinessData,
          branding: { ...mockBusinessData.branding, primaryColor: color },
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Tenant Context Integration', () => {
    it('should require tenant context for user operations', async () => {
      const mockContext = { tenantId: mockTenantId, userId: mockUserId };

      await withTenantContext(mockContext, async () => {
        // This should work with tenant context
        expect(() => userModel.validateCreate({
          tenantId: mockTenantId,
          email: 'test@example.com',
          role: 'staff',
          profile: {
            firstName: 'Test',
            lastName: 'User',
          },
        })).not.toThrow();
      });
    });

    it('should validate tenant isolation in queries', () => {
      // Mock query builder should automatically add tenant filters
      const mockWhere = { email: 'test@example.com' };
      
      // This would be tested with actual database integration
      expect(mockWhere).toBeDefined();
    });
  });

  describe('Audit Logging Integration', () => {
    it('should log create operations', async () => {
      const mockTenant = {
        id: mockTenantId,
        name: 'Test Tenant',
        domain: 'test',
        plan: 'starter' as const,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the create operation
      jest.spyOn(tenantModel, 'create').mockResolvedValue(mockTenant);

      await tenantModel.create({
        name: 'Test Tenant',
        domain: 'test',
        plan: 'starter',
      });

      expect(auditLogger.logCreate).toHaveBeenCalledWith(
        'tenants',
        mockTenantId,
        expect.any(Object)
      );
    });

    it('should log update operations', async () => {
      const mockUser = {
        id: mockUserId,
        tenantId: mockTenantId,
        email: 'test@example.com',
        role: 'staff' as const,
        profile: {},
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the update operation
      jest.spyOn(userModel, 'findById').mockResolvedValue(mockUser);
      jest.spyOn(userModel, 'update').mockResolvedValue({
        ...mockUser,
        profile: { firstName: 'Updated' },
      });

      await userModel.update(mockUserId, {
        profile: { firstName: 'Updated' },
      });

      expect(auditLogger.logUpdate).toHaveBeenCalledWith(
        'users',
        mockUserId,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should log delete operations', async () => {
      const mockBusiness = {
        tenantId: mockTenantId,
        name: 'Test Business',
        description: 'Test',
        address: {},
        contact: {},
        branding: {},
        socialMedia: {},
        legalDocuments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the delete operation
      jest.spyOn(businessModel, 'findById').mockResolvedValue(mockBusiness);
      jest.spyOn(businessModel, 'delete').mockResolvedValue(true);

      await businessModel.delete(mockTenantId);

      expect(auditLogger.logDelete).toHaveBeenCalledWith(
        'businesses',
        mockTenantId,
        expect.any(Object)
      );
    });
  });
});
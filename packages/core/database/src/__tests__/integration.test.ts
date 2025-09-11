import { describe, it, expect } from '@jest/globals';
import { DataValidator } from '../validation/validator';
import { 
  createTenantSchema, 
  createUserSchema, 
  createBusinessSchema 
} from '../validation/schemas';

describe('Core Data Models Integration', () => {
  describe('Validation Integration', () => {
    it('should validate complete tenant data', () => {
      const tenantData = {
        name: 'Elite Car Detailing',
        domain: 'elite-car-detailing',
        plan: 'professional' as const,
        settings: {
          features: ['booking', 'website', 'ecommerce'],
          limits: {
            users: 10,
            storage: 5000,
            apiCalls: 50000,
          },
        },
      };

      const result = DataValidator.validate(createTenantSchema, tenantData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(tenantData);
    });

    it('should validate complete user data with UK phone', () => {
      const userData = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john.doe@elitecardetailing.co.uk',
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
          {
            resource: 'users',
            action: 'create',
          },
        ],
      };

      const result = DataValidator.validate(createUserSchema, userData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(userData);
    });

    it('should validate complete business data with UK details', () => {
      const businessData = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Elite Car Detailing Ltd',
        description: 'Professional car detailing and valeting services in Central London. We provide premium automotive care using eco-friendly products.',
        address: {
          line1: '123 High Street',
          line2: 'Unit 4B',
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
          theme: 'light' as const,
        },
        socialMedia: {
          facebook: 'https://facebook.com/elitecardetailing',
          instagram: 'https://instagram.com/elitecardetailing',
          twitter: 'https://twitter.com/elitecardetail',
        },
        legalDocuments: [
          {
            type: 'terms' as const,
            content: 'Terms and conditions content...',
            version: '1.0',
            updatedAt: new Date(),
          },
          {
            type: 'privacy' as const,
            content: 'Privacy policy content...',
            version: '1.0',
            updatedAt: new Date(),
          },
        ],
        ukBusinessRegistration: {
          companyNumber: 'AB123456',
          vatNumber: 'GB123456789',
          businessType: 'limited_company' as const,
          incorporationDate: new Date('2020-01-15'),
        },
      };

      const result = DataValidator.validate(createBusinessSchema, businessData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(businessData);
    });

    it('should reject invalid UK postcode formats', () => {
      const invalidPostcodes = [
        '12345',        // US ZIP
        'INVALID',      // Not a postcode
        'SW1A1AA',      // Missing space
        'sw1a 1aa',     // Lowercase
        'SW1A  1AA',    // Double space
      ];

      invalidPostcodes.forEach(postcode => {
        const businessData = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Business',
          address: {
            line1: '123 Test Street',
            city: 'London',
            county: 'Greater London',
            postcode,
            country: 'United Kingdom',
          },
          contact: {
            email: 'test@example.com',
            phone: '+44 20 7946 0958',
          },
        };

        const result = DataValidator.validate(createBusinessSchema, businessData);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => 
          error.field.includes('postcode') || error.message.includes('postcode')
        )).toBe(true);
      });
    });

    it('should reject invalid UK phone numbers', () => {
      const invalidPhones = [
        '+1 555 123 4567',  // US number
        '123456789',        // Too short
        'not-a-phone',      // Not a number
        '+44 123',          // Too short UK
        '0800 123',         // Incomplete
      ];

      invalidPhones.forEach(phone => {
        const userData = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role: 'staff' as const,
          profile: {
            firstName: 'Test',
            lastName: 'User',
            phone,
          },
        };

        const result = DataValidator.validate(createUserSchema, userData);
        expect(result.success).toBe(false);
        expect(result.errors?.some(error => 
          error.field.includes('phone') || error.message.includes('phone')
        )).toBe(true);
      });
    });

    it('should validate UK company numbers', () => {
      const validCompanyNumbers = [
        'AB123456',
        '12345678',
        'SC123456',
        'NI123456',
      ];

      const invalidCompanyNumbers = [
        '123',          // Too short
        'TOOLONG123',   // Too long
        'invalid!',     // Invalid characters
        '',             // Empty
      ];

      validCompanyNumbers.forEach(companyNumber => {
        const businessData = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Business',
          address: {
            line1: '123 Test Street',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            country: 'United Kingdom',
          },
          contact: {
            email: 'test@example.com',
            phone: '+44 20 7946 0958',
          },
          ukBusinessRegistration: {
            companyNumber,
            businessType: 'limited_company' as const,
          },
        };

        const result = DataValidator.validate(createBusinessSchema, businessData);
        expect(result.success).toBe(true);
      });

      invalidCompanyNumbers.forEach(companyNumber => {
        const businessData = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Business',
          address: {
            line1: '123 Test Street',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            country: 'United Kingdom',
          },
          contact: {
            email: 'test@example.com',
            phone: '+44 20 7946 0958',
          },
          ukBusinessRegistration: {
            companyNumber,
            businessType: 'limited_company' as const,
          },
        };

        const result = DataValidator.validate(createBusinessSchema, businessData);
        expect(result.success).toBe(false);
      });
    });

    it('should validate hex color formats', () => {
      const validColors = ['#000000', '#FFFFFF', '#1E40AF', '#FF5733'];
      const invalidColors = ['000000', '#GGG', 'blue', '#12345', '#1234567'];

      validColors.forEach(color => {
        const businessData = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Business',
          address: {
            line1: '123 Test Street',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            country: 'United Kingdom',
          },
          contact: {
            email: 'test@example.com',
            phone: '+44 20 7946 0958',
          },
          branding: {
            primaryColor: color,
          },
        };

        const result = DataValidator.validate(createBusinessSchema, businessData);
        expect(result.success).toBe(true);
      });

      invalidColors.forEach(color => {
        const businessData = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Business',
          address: {
            line1: '123 Test Street',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            country: 'United Kingdom',
          },
          contact: {
            email: 'test@example.com',
            phone: '+44 20 7946 0958',
          },
          branding: {
            primaryColor: color,
          },
        };

        const result = DataValidator.validate(createBusinessSchema, businessData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Schema Relationships', () => {
    it('should enforce required fields for business', () => {
      const incompleteBusinessData = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Business',
        // Missing required address and contact
      };

      const result = DataValidator.validate(createBusinessSchema, incompleteBusinessData);
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => error.field === 'address')).toBe(true);
      expect(result.errors?.some(error => error.field === 'contact')).toBe(true);
    });

    it('should enforce required fields for user profile', () => {
      const incompleteUserData = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'staff' as const,
        profile: {
          firstName: 'John',
          // Missing required lastName
        },
      };

      const result = DataValidator.validate(createUserSchema, incompleteUserData);
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => 
        error.field.includes('lastName') || error.message.includes('Last name')
      )).toBe(true);
    });

    it('should validate permission structure', () => {
      const userDataWithInvalidPermissions = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'staff' as const,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
        permissions: [
          {
            resource: 'business',
            // Missing required action
          },
        ],
      };

      const result = DataValidator.validate(createUserSchema, userDataWithInvalidPermissions);
      expect(result.success).toBe(false);
      expect(result.errors?.some(error => 
        error.field.includes('action') || error.message.includes('Action')
      )).toBe(true);
    });
  });
});
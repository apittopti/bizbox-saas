import { z } from 'zod';

// UK-specific validation patterns (defined first)
const ukPostcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i;
const ukPhoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?1\d{3}|\(?01\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?20\s?|020\s?)\d{4}\s?\d{4}$/;
const ukCompanyNumberRegex = /^[A-Z0-9]{8}$/;

// Base schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const timestampSchema = z.date();

// Tenant schemas with enhanced validation
export const subscriptionPlanSchema = z.enum(['starter', 'professional', 'enterprise']);

export const tenantSettingsSchema = z.object({
  features: z.array(z.string()).default([]),
  limits: z.object({
    users: z.number().min(1).default(5),
    storage: z.number().min(100).default(1000), // MB
    apiCalls: z.number().min(1000).default(10000), // per month
  }).default({}),
  active: z.boolean().default(true),
});

export const tenantSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1, 'Tenant name is required').max(255),
  domain: z.string().regex(/^[a-z0-9-]+$/, 'Domain must contain only lowercase letters, numbers, and hyphens').optional().nullable(),
  plan: subscriptionPlanSchema.default('starter'),
  settings: tenantSettingsSchema.default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(255),
  domain: z.string().regex(/^[a-z0-9-]+$/, 'Domain must contain only lowercase letters, numbers, and hyphens').optional(),
  plan: subscriptionPlanSchema.optional(),
  settings: tenantSettingsSchema.optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required').max(255).optional(),
  domain: z.string().regex(/^[a-z0-9-]+$/, 'Domain must contain only lowercase letters, numbers, and hyphens').optional().nullable().optional(),
  plan: subscriptionPlanSchema.optional(),
  settings: z.object({
    features: z.array(z.string()).optional(),
    limits: z.object({
      users: z.number().min(1).optional(),
      storage: z.number().min(100).optional(),
      apiCalls: z.number().min(1000).optional(),
    }).optional(),
    active: z.boolean().optional(),
  }).optional(),
});

// User schemas with enhanced validation
export const userRoleSchema = z.enum(['super_admin', 'tenant_admin', 'staff', 'customer']);

export const permissionSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
  conditions: z.record(z.any()).optional(),
});

export const userProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  avatar: z.string().url().optional(),
  phone: z.string().regex(ukPhoneRegex, 'Invalid UK phone number format').optional(),
  timezone: z.string().default('Europe/London'),
  language: z.string().default('en-GB'),
  preferences: z.record(z.any()).default({}),
  active: z.boolean().default(true),
});

export const userPermissionsSchema = z.array(permissionSchema).default([]);

export const userSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  email: emailSchema,
  passwordHash: z.string().optional().nullable(),
  role: userRoleSchema.default('customer'),
  profile: userProfileSchema,
  permissions: userPermissionsSchema.default([]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createUserSchema = z.object({
  tenantId: uuidSchema,
  email: emailSchema,
  password: z.string().min(8).optional(),
  role: userRoleSchema.optional(),
  profile: userProfileSchema.partial().optional(),
  permissions: userPermissionsSchema.optional(),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  role: userRoleSchema.optional(),
  profile: userProfileSchema.partial().optional(),
  permissions: userPermissionsSchema.optional(),
});

// Business schemas with UK-specific validation
export const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  county: z.string().min(1, 'County is required').max(100),
  postcode: z.string().regex(ukPostcodeRegex, 'Invalid UK postcode format'),
  country: z.string().default('United Kingdom'),
});

export const contactSchema = z.object({
  email: emailSchema,
  phone: z.string().regex(ukPhoneRegex, 'Invalid UK phone number format'),
  website: z.string().url().optional(),
  fax: z.string().regex(ukPhoneRegex, 'Invalid UK fax number format').optional(),
});

export const brandingSchema = z.object({
  logo: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format').default('#000000'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color format').default('#FFFFFF'),
  fontFamily: z.string().default('Inter'),
  theme: z.enum(['light', 'dark']).default('light'),
});

export const socialMediaSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  youtube: z.string().url().optional(),
  tiktok: z.string().url().optional(),
});

export const legalDocumentSchema = z.object({
  type: z.enum(['terms', 'privacy', 'cookies']),
  content: z.string().min(1, 'Document content is required'),
  version: z.string().default('1.0'),
  updatedAt: timestampSchema.default(() => new Date()),
});

export const legalDocumentsSchema = z.array(legalDocumentSchema).default([]);

// UK business registration schema
export const ukBusinessRegistrationSchema = z.object({
  companyNumber: z.string().regex(ukCompanyNumberRegex, 'Invalid UK company number').optional(),
  vatNumber: z.string().regex(/^GB\d{9}$/, 'Invalid UK VAT number format').optional(),
  businessType: z.enum(['sole_trader', 'partnership', 'limited_company', 'llp', 'charity', 'other']),
  incorporationDate: z.date().optional(),
  registeredAddress: addressSchema.optional(),
});

export const businessSchema = z.object({
  tenantId: uuidSchema,
  name: z.string().min(1, 'Business name is required').max(255),
  description: z.string().max(1000).optional().nullable(),
  address: addressSchema,
  contact: contactSchema,
  branding: brandingSchema.default({}),
  socialMedia: socialMediaSchema.default({}),
  legalDocuments: legalDocumentsSchema.default([]),
  ukBusinessRegistration: ukBusinessRegistrationSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createBusinessSchema = z.object({
  tenantId: uuidSchema,
  name: z.string().min(1, 'Business name is required').max(255),
  description: z.string().max(1000).optional(),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required').max(255),
    line2: z.string().max(255).optional(),
    city: z.string().min(1, 'City is required').max(100),
    county: z.string().min(1, 'County is required').max(100),
    postcode: z.string().regex(ukPostcodeRegex, 'Invalid UK postcode format'),
    country: z.string().optional(),
  }),
  contact: contactSchema,
  branding: brandingSchema.optional(),
  socialMedia: socialMediaSchema.optional(),
  legalDocuments: legalDocumentsSchema.optional(),
  ukBusinessRegistration: ukBusinessRegistrationSchema.optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(255).optional(),
  description: z.string().max(1000).optional().nullable().optional(),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required').max(255).optional(),
    line2: z.string().max(255).optional(),
    city: z.string().min(1, 'City is required').max(100).optional(),
    county: z.string().min(1, 'County is required').max(100).optional(),
    postcode: z.string().regex(ukPostcodeRegex, 'Invalid UK postcode format').optional(),
    country: z.string().optional(),
  }).optional(),
  contact: contactSchema.partial().optional(),
  branding: brandingSchema.partial().optional(),
  socialMedia: socialMediaSchema.partial().optional(),
  legalDocuments: legalDocumentsSchema.optional(),
  ukBusinessRegistration: ukBusinessRegistrationSchema.optional(),
});

// Export types
export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenant = z.infer<typeof createTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;

export type Business = z.infer<typeof businessSchema>;
export type CreateBusiness = z.infer<typeof createBusinessSchema>;
export type UpdateBusiness = z.infer<typeof updateBusinessSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Branding = z.infer<typeof brandingSchema>;
export type SocialMedia = z.infer<typeof socialMediaSchema>;
export type LegalDocuments = z.infer<typeof legalDocumentsSchema>;
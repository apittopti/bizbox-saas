// Core tenant and user types
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: SubscriptionPlan;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  permissions: Permission[];
}

export interface Business {
  tenantId: string;
  name: string;
  description: string;
  address: Address;
  contact: ContactInfo;
  branding: BrandingSettings;
  socialMedia: SocialMediaLinks;
  legalDocuments: LegalDocument[];
}

// Enums and supporting types
export enum UserRole {
  SUPER_ADMIN = "super_admin",
  TENANT_ADMIN = "tenant_admin",
  STAFF = "staff",
  CUSTOMER = "customer",
}

export enum SubscriptionPlan {
  STARTER = "starter",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
}

export interface TenantSettings {
  features: string[];
  limits: {
    users: number;
    storage: number;
    apiCalls: number;
  };
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  website?: string;
}

export interface BrandingSettings {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface SocialMediaLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

export interface LegalDocument {
  type: "terms" | "privacy" | "cookies";
  content: string;
  version: string;
  updatedAt: Date;
}
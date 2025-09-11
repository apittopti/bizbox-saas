import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const businesses = pgTable('businesses', {
  tenantId: uuid('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  address: jsonb('address').notNull(),
  contact: jsonb('contact').notNull(),
  branding: jsonb('branding').notNull().default('{}'),
  socialMedia: jsonb('social_media').notNull().default('{}'),
  legalDocuments: jsonb('legal_documents').notNull().default('[]'),
  ukBusinessRegistration: jsonb('uk_business_registration'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
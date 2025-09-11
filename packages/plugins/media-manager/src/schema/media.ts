import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'), // for videos/audio in seconds
  url: varchar('url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  folderId: uuid('folder_id'),
  alt: varchar('alt', { length: 255 }),
  caption: text('caption'),
  metadata: jsonb('metadata').notNull().default('{}'),
  tags: jsonb('tags').notNull().default('[]'),
  isPublic: boolean('is_public').notNull().default(false),
  isProcessed: boolean('is_processed').notNull().default(false),
  processingStatus: varchar('processing_status', { length: 50 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
  processingError: text('processing_error'),
  checksum: varchar('checksum', { length: 64 }), // SHA-256 hash for deduplication
  uploadedBy: uuid('uploaded_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('media_files_tenant_id_idx').on(table.tenantId),
  folderIdIdx: index('media_files_folder_id_idx').on(table.folderId),
  mimeTypeIdx: index('media_files_mime_type_idx').on(table.mimeType),
  uploadedByIdx: index('media_files_uploaded_by_idx').on(table.uploadedBy),
  checksumIdx: index('media_files_checksum_idx').on(table.checksum),
  createdAtIdx: index('media_files_created_at_idx').on(table.createdAt),
  isPublicIdx: index('media_files_is_public_idx').on(table.isPublic),
}));

export const mediaFolders = pgTable('media_folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  parentId: uuid('parent_id'),
  path: varchar('path', { length: 500 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  sortOrder: integer('sort_order').default(0),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('media_folders_tenant_id_idx').on(table.tenantId),
  parentIdIdx: index('media_folders_parent_id_idx').on(table.parentId),
  pathIdx: index('media_folders_path_idx').on(table.path),
  slugIdx: index('media_folders_slug_idx').on(table.slug),
  createdByIdx: index('media_folders_created_by_idx').on(table.createdBy),
}));

export const mediaUsage = pgTable('media_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  mediaFileId: uuid('media_file_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  context: varchar('context', { length: 50 }).notNull(), // 'website', 'product', 'service', 'post', etc.
  contextId: uuid('context_id').notNull(),
  usageType: varchar('usage_type', { length: 50 }).notNull(), // 'primary', 'gallery', 'thumbnail', 'background', etc.
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  mediaFileIdIdx: index('media_usage_media_file_id_idx').on(table.mediaFileId),
  tenantIdIdx: index('media_usage_tenant_id_idx').on(table.tenantId),
  contextIdx: index('media_usage_context_idx').on(table.context, table.contextId),
  usageTypeIdx: index('media_usage_usage_type_idx').on(table.usageType),
}));

export const mediaCollections = pgTable('media_collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull().default('manual'), // 'manual', 'smart', 'auto'
  rules: jsonb('rules').notNull().default('{}'), // For smart collections
  isPublic: boolean('is_public').notNull().default(false),
  sortOrder: integer('sort_order').default(0),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('media_collections_tenant_id_idx').on(table.tenantId),
  slugIdx: index('media_collections_slug_idx').on(table.slug),
  typeIdx: index('media_collections_type_idx').on(table.type),
  createdByIdx: index('media_collections_created_by_idx').on(table.createdBy),
}));

export const mediaCollectionFiles = pgTable('media_collection_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull(),
  mediaFileId: uuid('media_file_id').notNull(),
  sortOrder: integer('sort_order').default(0),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (table) => ({
  collectionIdIdx: index('media_collection_files_collection_id_idx').on(table.collectionId),
  mediaFileIdIdx: index('media_collection_files_media_file_id_idx').on(table.mediaFileId),
  sortOrderIdx: index('media_collection_files_sort_order_idx').on(table.sortOrder),
}));

export const mediaTransformations = pgTable('media_transformations', {
  id: uuid('id').primaryKey().defaultRandom(),
  mediaFileId: uuid('media_file_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  transformationType: varchar('transformation_type', { length: 50 }).notNull(), // 'resize', 'crop', 'format', 'quality', etc.
  parameters: jsonb('parameters').notNull(),
  resultUrl: varchar('result_url', { length: 500 }),
  resultSize: integer('result_size'),
  resultWidth: integer('result_width'),
  resultHeight: integer('result_height'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  mediaFileIdIdx: index('media_transformations_media_file_id_idx').on(table.mediaFileId),
  tenantIdIdx: index('media_transformations_tenant_id_idx').on(table.tenantId),
  statusIdx: index('media_transformations_status_idx').on(table.status),
  transformationTypeIdx: index('media_transformations_transformation_type_idx').on(table.transformationType),
}));

export const mediaAuditLog = pgTable('media_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  mediaFileId: uuid('media_file_id'),
  action: varchar('action', { length: 50 }).notNull(), // 'upload', 'download', 'delete', 'update', 'view', etc.
  userId: uuid('user_id').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').notNull().default('{}'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('media_audit_log_tenant_id_idx').on(table.tenantId),
  mediaFileIdIdx: index('media_audit_log_media_file_id_idx').on(table.mediaFileId),
  userIdIdx: index('media_audit_log_user_id_idx').on(table.userId),
  actionIdx: index('media_audit_log_action_idx').on(table.action),
  timestampIdx: index('media_audit_log_timestamp_idx').on(table.timestamp),
}));

// Define relations
export const mediaFilesRelations = relations(mediaFiles, ({ one, many }) => ({
  folder: one(mediaFolders, {
    fields: [mediaFiles.folderId],
    references: [mediaFolders.id],
  }),
  usage: many(mediaUsage),
  transformations: many(mediaTransformations),
  collectionFiles: many(mediaCollectionFiles),
  auditLogs: many(mediaAuditLog),
}));

export const mediaFoldersRelations = relations(mediaFolders, ({ one, many }) => ({
  parent: one(mediaFolders, {
    fields: [mediaFolders.parentId],
    references: [mediaFolders.id],
  }),
  children: many(mediaFolders),
  files: many(mediaFiles),
}));

export const mediaUsageRelations = relations(mediaUsage, ({ one }) => ({
  mediaFile: one(mediaFiles, {
    fields: [mediaUsage.mediaFileId],
    references: [mediaFiles.id],
  }),
}));

export const mediaCollectionsRelations = relations(mediaCollections, ({ many }) => ({
  collectionFiles: many(mediaCollectionFiles),
}));

export const mediaCollectionFilesRelations = relations(mediaCollectionFiles, ({ one }) => ({
  collection: one(mediaCollections, {
    fields: [mediaCollectionFiles.collectionId],
    references: [mediaCollections.id],
  }),
  mediaFile: one(mediaFiles, {
    fields: [mediaCollectionFiles.mediaFileId],
    references: [mediaFiles.id],
  }),
}));

export const mediaTransformationsRelations = relations(mediaTransformations, ({ one }) => ({
  mediaFile: one(mediaFiles, {
    fields: [mediaTransformations.mediaFileId],
    references: [mediaFiles.id],
  }),
}));

export const mediaAuditLogRelations = relations(mediaAuditLog, ({ one }) => ({
  mediaFile: one(mediaFiles, {
    fields: [mediaAuditLog.mediaFileId],
    references: [mediaFiles.id],
  }),
}));

// Export types
export type MediaFile = typeof mediaFiles.$inferSelect;
export type NewMediaFile = typeof mediaFiles.$inferInsert;

export type MediaFolder = typeof mediaFolders.$inferSelect;
export type NewMediaFolder = typeof mediaFolders.$inferInsert;

export type MediaUsage = typeof mediaUsage.$inferSelect;
export type NewMediaUsage = typeof mediaUsage.$inferInsert;

export type MediaCollection = typeof mediaCollections.$inferSelect;
export type NewMediaCollection = typeof mediaCollections.$inferInsert;

export type MediaCollectionFile = typeof mediaCollectionFiles.$inferSelect;
export type NewMediaCollectionFile = typeof mediaCollectionFiles.$inferInsert;

export type MediaTransformation = typeof mediaTransformations.$inferSelect;
export type NewMediaTransformation = typeof mediaTransformations.$inferInsert;

export type MediaAuditLog = typeof mediaAuditLog.$inferSelect;
export type NewMediaAuditLog = typeof mediaAuditLog.$inferInsert;
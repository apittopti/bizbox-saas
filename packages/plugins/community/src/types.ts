import { z } from 'zod';

export const communityPostSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const communityCommentSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const marketplaceListingSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  price: z.number().min(0),
  category: z.string(),
  images: z.array(z.string()).default([]),
  status: z.enum(['active', 'sold', 'archived']).default('active'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CommunityPost = z.infer<typeof communityPostSchema>;
export type CommunityComment = z.infer<typeof communityCommentSchema>;
export type MarketplaceListing = z.infer<typeof marketplaceListingSchema>;
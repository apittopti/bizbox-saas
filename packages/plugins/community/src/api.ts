import type { CommunityPost, MarketplaceListing, CommunityComment } from './types';

export async function getCommunityPosts(tenantId: string): Promise<CommunityPost[]> {
  const response = await fetch(`/api/community/posts?tenantId=${tenantId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch community posts');
  }
  return response.json();
}

export async function createCommunityPost(post: Partial<CommunityPost>): Promise<CommunityPost> {
  const response = await fetch('/api/community/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post),
  });
  if (!response.ok) {
    throw new Error('Failed to create community post');
  }
  return response.json();
}

export async function getMarketplaceListings(tenantId: string): Promise<MarketplaceListing[]> {
  const response = await fetch(`/api/marketplace/listings?tenantId=${tenantId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch marketplace listings');
  }
  return response.json();
}

export async function createMarketplaceListing(listing: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
  const response = await fetch('/api/marketplace/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(listing),
  });
  if (!response.ok) {
    throw new Error('Failed to create marketplace listing');
  }
  return response.json();
}

export async function addComment(comment: Partial<CommunityComment>): Promise<CommunityComment> {
  const response = await fetch('/api/community/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment),
  });
  if (!response.ok) {
    throw new Error('Failed to add comment');
  }
  return response.json();
}
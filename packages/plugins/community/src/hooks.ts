import { useState, useEffect } from 'react';
import type { CommunityPost, MarketplaceListing } from './types';

export function useCommunityPosts(tenantId: string) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await fetch(`/api/community/posts?tenantId=${tenantId}`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }
    
    fetchPosts();
  }, [tenantId]);

  return { posts, loading, error };
}

export function useMarketplaceListings(tenantId: string) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchListings() {
      try {
        setLoading(true);
        const response = await fetch(`/api/marketplace/listings?tenantId=${tenantId}`);
        if (!response.ok) throw new Error('Failed to fetch listings');
        const data = await response.json();
        setListings(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }
    
    fetchListings();
  }, [tenantId]);

  return { listings, loading, error };
}
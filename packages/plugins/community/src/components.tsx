import React from 'react';
import type { CommunityPost, MarketplaceListing } from './types';

interface PostCardProps {
  post: CommunityPost;
  onClick?: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  return (
    <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow" onClick={onClick}>
      <h3 className="text-lg font-semibold">{post.title}</h3>
      <p className="text-gray-600 mt-2 line-clamp-3">{post.content}</p>
      <div className="flex gap-2 mt-3">
        {post.tags.map((tag) => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ListingCardProps {
  listing: MarketplaceListing;
  onClick?: () => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
  return (
    <div className="p-4 border rounded-lg hover:shadow-lg transition-shadow" onClick={onClick}>
      {listing.images[0] && (
        <img 
          src={listing.images[0]} 
          alt={listing.title}
          className="w-full h-48 object-cover rounded mb-3"
        />
      )}
      <h3 className="text-lg font-semibold">{listing.title}</h3>
      <p className="text-gray-600 mt-2 line-clamp-2">{listing.description}</p>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xl font-bold">£{listing.price.toFixed(2)}</span>
        <span className="text-sm text-gray-500">{listing.category}</span>
      </div>
    </div>
  );
}

export function CommunityFeed({ posts }: { posts: CommunityPost[] }) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export function MarketplaceGrid({ listings }: { listings: MarketplaceListing[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
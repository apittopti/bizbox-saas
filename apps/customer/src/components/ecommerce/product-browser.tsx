'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from './shopping-cart';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  tags: string[];
  variants?: ProductVariant[];
  inStock: boolean;
  stockQuantity: number;
}

interface ProductVariant {
  id: string;
  name: string;
  options: Record<string, string>;
  price?: number;
  stockQuantity: number;
}

interface Category {
  id: string;
  name: string;
  count: number;
}

interface ProductBrowserProps {
  tenantId: string;
  className?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  gridColumns?: number;
}

export function ProductBrowser({
  tenantId,
  className = '',
  showFilters = true,
  showSearch = true,
  gridColumns = 3,
}: ProductBrowserProps) {
  const { addToCart, isLoading: cartLoading } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>('name');
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [tenantId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        tenantId,
        search: searchQuery,
        category: selectedCategory,
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString(),
        sortBy,
        includeOutOfStock: showOutOfStock.toString(),
      });

      const response = await fetch(`/api/ecommerce/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/ecommerce/categories?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedCategory, priceRange, sortBy, showOutOfStock]);

  const handleAddToCart = async (product: Product, variant?: ProductVariant) => {
    try {
      await addToCart(product.id, 1, variant);
      // Show success message
      showNotification(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      showNotification('Failed to add to cart', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple notification - in production you'd use a proper notification system
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem;
      border-radius: 0.5rem;
      color: white;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  if (loading) {
    return (
      <div className={`product-browser loading ${className}`}>
        <div className="loading-spinner">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`product-browser error ${className}`}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className={`product-browser ${className}`}>
      {(showSearch || showFilters) && (
        <div className="browser-controls">
          {showSearch && (
            <div className="search-section">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          {showFilters && (
            <div className="filters-section">
              <div className="filter-group">
                <label>Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="name">Name</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Price Range:</label>
                <div className="price-range">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="price-input"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="price-input"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showOutOfStock}
                    onChange={(e) => setShowOutOfStock(e.target.checked)}
                  />
                  Show out of stock
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="products-grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            isLoading={cartLoading}
          />
        ))}
      </div>

      {products.length === 0 && (
        <div className="no-products">
          <p>No products found matching your criteria.</p>
        </div>
      )}

      <style jsx>{`
        .product-browser {
          width: 100%;
        }

        .loading-spinner,
        .error-message {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .error-message {
          color: #ef4444;
        }

        .browser-controls {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .search-section {
          margin-bottom: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }

        .filters-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-group label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .filter-select {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: white;
        }

        .price-range {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .price-input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .products-grid {
          display: grid;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .no-products {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .products-grid {
            grid-template-columns: 1fr !important;
          }
          
          .filters-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1024px) {
          .products-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  isLoading: boolean;
}

function ProductCard({ product, onAddToCart, isLoading }: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] || null
  );
  const [selectedImage, setSelectedImage] = useState(0);

  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant?.stockQuantity || product.stockQuantity;
  const isInStock = currentStock > 0;

  return (
    <div className={`product-card ${!isInStock ? 'out-of-stock' : ''}`}>
      <div className="product-images">
        {product.images.length > 0 ? (
          <>
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="main-image"
            />
            {product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-image">No Image</div>
        )}
        
        {!isInStock && (
          <div className="out-of-stock-overlay">Out of Stock</div>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        
        <div className="product-price">
          £{currentPrice.toFixed(2)}
        </div>

        {product.variants && product.variants.length > 0 && (
          <div className="product-variants">
            <label>Options:</label>
            <select
              value={selectedVariant?.id || ''}
              onChange={(e) => {
                const variant = product.variants?.find(v => v.id === e.target.value);
                setSelectedVariant(variant || null);
              }}
              className="variant-select"
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} - £{(variant.price || product.price).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="product-actions">
          <button
            className="add-to-cart-btn"
            onClick={() => onAddToCart(product, selectedVariant || undefined)}
            disabled={!isInStock || isLoading}
          >
            {isLoading ? 'Adding...' : isInStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>

        {isInStock && currentStock <= 5 && (
          <div className="low-stock-warning">
            Only {currentStock} left in stock!
          </div>
        )}
      </div>

      <style jsx>{`
        .product-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          transition: all 0.2s;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .product-card.out-of-stock {
          opacity: 0.7;
        }

        .product-images {
          position: relative;
        }

        .main-image {
          width: 100%;
          height: 250px;
          object-fit: cover;
        }

        .no-image {
          width: 100%;
          height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #6b7280;
        }

        .image-thumbnails {
          display: flex;
          gap: 0.25rem;
          padding: 0.5rem;
          background: #f9fafb;
        }

        .thumbnail {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 0.25rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .thumbnail:hover,
        .thumbnail.active {
          opacity: 1;
        }

        .out-of-stock-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.125rem;
        }

        .product-info {
          padding: 1rem;
        }

        .product-name {
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .product-description {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .product-price {
          font-size: 1.25rem;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 1rem;
        }

        .product-variants {
          margin-bottom: 1rem;
        }

        .product-variants label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .variant-select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: white;
        }

        .add-to-cart-btn {
          width: 100%;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-to-cart-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .add-to-cart-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .low-stock-warning {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fef3c7;
          color: #92400e;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAnalytics } from '../core/AnalyticsProvider';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  inStock: boolean;
  sku: string;
  rating?: number;
  reviewCount?: number;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  options: string[];
  required: boolean;
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variants?: Record<string, string>;
}

interface EcommerceWidgetProps {
  tenantId: string;
  categoryId?: string;
  productId?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  showSorting?: boolean;
  gridColumns?: 2 | 3 | 4;
  maxProducts?: number;
  embedded?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

type SortOption = 'name' | 'price-low' | 'price-high' | 'rating' | 'newest';
type ViewMode = 'grid' | 'list';

export default function EcommerceWidget({
  tenantId,
  categoryId,
  productId,
  showFilters = true,
  showSearch = true,
  showSorting = true,
  gridColumns = 3,
  maxProducts,
  embedded = false,
  theme = 'auto',
  className = '',
}: EcommerceWidgetProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const { trackEvent, trackConversion } = useAnalytics();
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadCart();
  }, [tenantId]);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery, sortBy, priceRange]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        ...(selectedCategory && { category: selectedCategory }),
        ...(searchQuery && { search: searchQuery }),
        ...(productId && { productId }),
        sort: sortBy,
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString(),
        ...(maxProducts && { limit: maxProducts.toString() }),
      });

      const response = await fetch(`/api/ecommerce/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/ecommerce/categories?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCart = async () => {
    try {
      const cartId = localStorage.getItem(`cart-${tenantId}`);
      if (cartId) {
        const response = await fetch(`/api/ecommerce/cart/${cartId}?tenantId=${tenantId}`);
        if (response.ok) {
          const data = await response.json();
          setCart(data.items || []);
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const addToCart = async (product: Product, quantity: number = 1, variants?: Record<string, string>) => {
    try {
      let cartId = localStorage.getItem(`cart-${tenantId}`);
      
      if (!cartId) {
        // Create new cart
        const createResponse = await fetch('/api/ecommerce/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });
        
        if (createResponse.ok) {
          const newCart = await createResponse.json();
          cartId = newCart.id;
          localStorage.setItem(`cart-${tenantId}`, cartId);
        } else {
          throw new Error('Failed to create cart');
        }
      }

      // Add item to cart
      const response = await fetch(`/api/ecommerce/cart/${cartId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          productId: product.id,
          quantity,
          variants,
        }),
      });

      if (response.ok) {
        await loadCart();
        
        // Track add to cart event
        trackEvent({
          action: 'add_to_cart',
          category: 'ecommerce',
          label: product.name,
          value: product.salePrice || product.price,
          metadata: {
            productId: product.id,
            quantity,
            variants,
          },
        });

        // Show success feedback
        showAddToCartSuccess(product);
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const cartId = localStorage.getItem(`cart-${tenantId}`);
      if (!cartId) return;

      const response = await fetch(`/api/ecommerce/cart/${cartId}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        await loadCart();
        
        trackEvent({
          action: 'remove_from_cart',
          category: 'ecommerce',
          label: itemId,
        });
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    }
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    try {
      const cartId = localStorage.getItem(`cart-${tenantId}`);
      if (!cartId) return;

      const response = await fetch(`/api/ecommerce/cart/${cartId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, quantity }),
      });

      if (response.ok) {
        await loadCart();
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      
      return matchesSearch && matchesPrice;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.salePrice || a.price) - (b.salePrice || b.price);
        case 'price-high':
          return (b.salePrice || b.price) - (a.salePrice || a.price);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, searchQuery, sortBy, priceRange]);

  const showAddToCartSuccess = (product: Product) => {
    // Show temporary success message
    const successElement = document.createElement('div');
    successElement.className = 'add-to-cart-success';
    successElement.textContent = `${product.name} added to cart!`;
    
    if (widgetRef.current) {
      widgetRef.current.appendChild(successElement);
      setTimeout(() => {
        if (widgetRef.current?.contains(successElement)) {
          widgetRef.current.removeChild(successElement);
        }
      }, 3000);
    }
  };

  const handleQuickView = (product: Product) => {
    setSelectedProduct(product);
    setShowQuickView(true);
    
    trackEvent({
      action: 'product_quick_view',
      category: 'ecommerce',
      label: product.name,
    });
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    trackConversion('purchase', total, {
      cartItems: cart.length,
      products: cart.map(item => ({
        id: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });
    
    // Redirect to checkout
    window.location.href = `/checkout?cartId=${localStorage.getItem(`cart-${tenantId}`)}`;
  };

  const renderProductCard = (product: Product) => (
    <div key={product.id} className={`product-card ${viewMode}`}>
      <div className="product-image-container">
        <img
          src={product.images[0] || '/images/placeholder-product.jpg'}
          alt={product.name}
          className="product-image"
          loading="lazy"
          onClick={() => handleQuickView(product)}
        />
        
        {product.salePrice && (
          <span className="sale-badge">
            -{Math.round(((product.price - product.salePrice) / product.price) * 100)}%
          </span>
        )}
        
        {!product.inStock && (
          <span className="out-of-stock-badge">Out of Stock</span>
        )}
        
        <div className="product-actions">
          <button
            className="quick-view-btn"
            onClick={() => handleQuickView(product)}
            title="Quick View"
          >
            👁️
          </button>
          
          <button
            className="add-to-cart-btn"
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            title="Add to Cart"
          >
            🛒
          </button>
        </div>
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        
        <div className="product-pricing">
          {product.salePrice ? (
            <>
              <span className="sale-price">£{product.salePrice}</span>
              <span className="original-price">£{product.price}</span>
            </>
          ) : (
            <span className="current-price">£{product.price}</span>
          )}
        </div>
        
        {product.rating && (
          <div className="product-rating">
            <div className="stars">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < Math.floor(product.rating!) ? 'star filled' : 'star'}>
                  ★
                </span>
              ))}
            </div>
            {product.reviewCount && (
              <span className="review-count">({product.reviewCount})</span>
            )}
          </div>
        )}
        
        <button
          className="add-to-cart-button"
          onClick={() => addToCart(product)}
          disabled={!product.inStock}
        >
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );

  const renderQuickView = () => {
    if (!selectedProduct || !showQuickView) return null;

    return (
      <div className="quick-view-overlay" onClick={() => setShowQuickView(false)}>
        <div className="quick-view-modal" onClick={(e) => e.stopPropagation()}>
          <button
            className="close-button"
            onClick={() => setShowQuickView(false)}
          >
            ×
          </button>
          
          <div className="quick-view-content">
            <div className="product-images">
              <img
                src={selectedProduct.images[0]}
                alt={selectedProduct.name}
                className="main-image"
              />
            </div>
            
            <div className="product-details">
              <h2>{selectedProduct.name}</h2>
              <p>{selectedProduct.description}</p>
              
              <div className="pricing">
                {selectedProduct.salePrice ? (
                  <>
                    <span className="sale-price">£{selectedProduct.salePrice}</span>
                    <span className="original-price">£{selectedProduct.price}</span>
                  </>
                ) : (
                  <span className="current-price">£{selectedProduct.price}</span>
                )}
              </div>
              
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="product-variants">
                  {selectedProduct.variants.map((variant) => (
                    <div key={variant.id} className="variant-group">
                      <label>{variant.name}:</label>
                      <select>
                        {variant.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="quantity-selector">
                <label>Quantity:</label>
                <input type="number" min="1" max="10" defaultValue="1" />
              </div>
              
              <button
                className="add-to-cart-large"
                onClick={() => {
                  addToCart(selectedProduct);
                  setShowQuickView(false);
                }}
                disabled={!selectedProduct.inStock}
              >
                Add to Cart - £{selectedProduct.salePrice || selectedProduct.price}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCart = () => (
    <div className={`cart-sidebar ${showCart ? 'open' : ''}`}>
      <div className="cart-header">
        <h3>Shopping Cart ({cart.length})</h3>
        <button onClick={() => setShowCart(false)}>×</button>
      </div>
      
      <div className="cart-items">
        {cart.length === 0 ? (
          <p className="empty-cart">Your cart is empty</p>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} className="item-image" />
              <div className="item-details">
                <h4>{item.name}</h4>
                <div className="item-controls">
                  <div className="quantity-controls">
                    <button onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <span className="item-price">£{(item.price * item.quantity).toFixed(2)}</span>
                  <button
                    className="remove-item"
                    onClick={() => removeFromCart(item.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {cart.length > 0 && (
        <div className="cart-footer">
          <div className="cart-total">
            Total: £{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
          </div>
          <button className="checkout-button" onClick={proceedToCheckout}>
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="filters-section">
      {showSearch && (
        <div className="search-box">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}
      
      {showFilters && (
        <>
          <div className="category-filter">
            <label>Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="price-filter">
            <label>Price Range: £{priceRange[0]} - £{priceRange[1]}</label>
            <input
              type="range"
              min="0"
              max="1000"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
            />
            <input
              type="range"
              min="0"
              max="1000"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            />
          </div>
        </>
      )}
      
      {showSorting && (
        <div className="sort-options">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="name">Name</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Rating</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      )}
      
      <div className="view-mode-toggle">
        <button
          className={viewMode === 'grid' ? 'active' : ''}
          onClick={() => setViewMode('grid')}
        >
          Grid
        </button>
        <button
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => setViewMode('list')}
        >
          List
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={widgetRef}
      className={`ecommerce-widget ${embedded ? 'embedded' : ''} ${className}`}
      data-theme={theme}
    >
      {renderFilters()}
      
      <div className="products-header">
        <h3>
          {filteredAndSortedProducts.length} Product{filteredAndSortedProducts.length !== 1 ? 's' : ''}
          {selectedCategory && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
        </h3>
        
        <button
          className="cart-toggle"
          onClick={() => setShowCart(true)}
        >
          🛒 Cart ({cart.length})
        </button>
      </div>
      
      {isLoading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className={`products-grid grid-${gridColumns} ${viewMode}-view`}>
          {filteredAndSortedProducts.map(renderProductCard)}
        </div>
      )}
      
      {filteredAndSortedProducts.length === 0 && !isLoading && (
        <div className="no-products">
          <p>No products found matching your criteria.</p>
        </div>
      )}
      
      {renderQuickView()}
      {renderCart()}
    </div>
  );
}
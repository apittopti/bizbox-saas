'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: {
    id: string;
    name: string;
    options: Record<string, string>;
  };
}

interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

interface CartContextType {
  cart: Cart | null;
  addToCart: (productId: string, quantity?: number, variant?: any) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ 
  children, 
  tenantId 
}: { 
  children: React.ReactNode; 
  tenantId: string; 
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, [tenantId]);

  const loadCart = async () => {
    try {
      const cartId = localStorage.getItem(`cart_${tenantId}`);
      if (!cartId) {
        // Create new cart
        const response = await fetch('/api/ecommerce/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tenantId }),
        });
        
        if (response.ok) {
          const newCart = await response.json();
          setCart(newCart);
          localStorage.setItem(`cart_${tenantId}`, newCart.id);
        }
      } else {
        // Load existing cart
        const response = await fetch(`/api/ecommerce/cart/${cartId}`);
        if (response.ok) {
          const existingCart = await response.json();
          setCart(existingCart);
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const addToCart = async (productId: string, quantity = 1, variant?: any) => {
    if (!cart) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ecommerce/cart/${cart.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity,
          variant,
        }),
      });

      if (response.ok) {
        const updatedCart = await response.json();
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!cart) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ecommerce/cart/${cart.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });

      if (response.ok) {
        const updatedCart = await response.json();
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!cart) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ecommerce/cart/${cart.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedCart = await response.json();
        setCart(updatedCart);
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!cart) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ecommerce/cart/${cart.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCart({ ...cart, items: [], subtotal: 0, tax: 0, total: 0 });
      }
    } catch (error) {
      console.error('Failed to clear cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      isLoading,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export function ShoppingCartWidget({ className = '' }: { className?: string }) {
  const { cart, updateQuantity, removeFromCart, isLoading } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  if (!cart || cart.items.length === 0) {
    return (
      <div className={`cart-widget empty ${className}`}>
        <button className="cart-toggle" onClick={() => setIsOpen(!isOpen)}>
          🛒 <span className="cart-count">0</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`cart-widget ${className}`}>
      <button className="cart-toggle" onClick={() => setIsOpen(!isOpen)}>
        🛒 <span className="cart-count">{cart.items.length}</span>
      </button>

      {isOpen && (
        <div className="cart-dropdown">
          <div className="cart-header">
            <h3>Shopping Cart</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>

          <div className="cart-items">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item">
                {item.image && (
                  <img src={item.image} alt={item.name} className="item-image" />
                )}
                <div className="item-details">
                  <h4>{item.name}</h4>
                  {item.variant && (
                    <p className="variant-info">
                      {Object.entries(item.variant.options).map(([key, value]) => (
                        <span key={key}>{key}: {value}</span>
                      ))}
                    </p>
                  )}
                  <div className="item-controls">
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isLoading || item.quantity <= 1}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isLoading}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                      disabled={isLoading}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="item-price">
                  £{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-line">
              <span>Subtotal:</span>
              <span>£{cart.subtotal.toFixed(2)}</span>
            </div>
            {cart.tax > 0 && (
              <div className="summary-line">
                <span>Tax:</span>
                <span>£{cart.tax.toFixed(2)}</span>
              </div>
            )}
            {cart.shipping > 0 && (
              <div className="summary-line">
                <span>Shipping:</span>
                <span>£{cart.shipping.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-line total">
              <span>Total:</span>
              <span>£{cart.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="cart-actions">
            <button className="view-cart-btn" onClick={() => window.location.href = '/cart'}>
              View Cart
            </button>
            <button className="checkout-btn" onClick={() => window.location.href = '/checkout'}>
              Checkout
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .cart-widget {
          position: relative;
        }

        .cart-toggle {
          position: relative;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.25rem;
          transition: all 0.2s;
        }

        .cart-toggle:hover {
          background: #2563eb;
        }

        .cart-count {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .cart-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 400px;
          max-width: 90vw;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          z-index: 50;
        }

        .cart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .cart-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }

        .cart-items {
          max-height: 400px;
          overflow-y: auto;
        }

        .cart-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .item-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 0.375rem;
        }

        .item-details {
          flex: 1;
        }

        .item-details h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .variant-info {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .variant-info span {
          margin-right: 0.5rem;
        }

        .item-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .quantity-controls button {
          width: 2rem;
          height: 2rem;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 0.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quantity-controls button:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .quantity-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .remove-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .remove-btn:hover {
          text-decoration: underline;
        }

        .item-price {
          font-weight: 600;
          color: #1f2937;
        }

        .cart-summary {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .summary-line.total {
          font-weight: 600;
          font-size: 1.125rem;
          border-top: 1px solid #e5e7eb;
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }

        .cart-actions {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
        }

        .view-cart-btn,
        .checkout-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-cart-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .view-cart-btn:hover {
          background: #e5e7eb;
        }

        .checkout-btn {
          background: #3b82f6;
          color: white;
        }

        .checkout-btn:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
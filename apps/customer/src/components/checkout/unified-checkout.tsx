'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '../ecommerce/shopping-cart';

interface BookingItem {
  id: string;
  type: 'booking';
  serviceId: string;
  serviceName: string;
  staffId?: string;
  staffName?: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    notes?: string;
  };
}

interface CheckoutItem {
  id: string;
  type: 'product' | 'booking';
  name: string;
  price: number;
  quantity?: number;
  details?: any;
}

interface UnifiedCheckoutProps {
  tenantId: string;
  bookingItems?: BookingItem[];
  onComplete?: (result: any) => void;
  className?: string;
}

export function UnifiedCheckout({
  tenantId,
  bookingItems = [],
  onComplete,
  className = '',
}: UnifiedCheckoutProps) {
  const { cart } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Customer information
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'GB',
    },
  });

  // Payment information
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [requiresShipping, setRequiresShipping] = useState(false);

  // Combined items for checkout
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
  });

  useEffect(() => {
    combineItems();
  }, [cart, bookingItems]);

  useEffect(() => {
    calculateTotals();
  }, [checkoutItems, requiresShipping]);

  const combineItems = () => {
    const items: CheckoutItem[] = [];

    // Add cart items (products)
    if (cart?.items) {
      cart.items.forEach((item) => {
        items.push({
          id: item.id,
          type: 'product',
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          details: {
            productId: item.productId,
            variant: item.variant,
            image: item.image,
          },
        });
      });

      // Check if any products require shipping
      setRequiresShipping(cart.items.length > 0);
    }

    // Add booking items
    bookingItems.forEach((booking) => {
      items.push({
        id: booking.id,
        type: 'booking',
        name: `${booking.serviceName} - ${booking.date} at ${booking.time}`,
        price: booking.price,
        quantity: 1,
        details: {
          serviceId: booking.serviceId,
          staffId: booking.staffId,
          staffName: booking.staffName,
          date: booking.date,
          time: booking.time,
          duration: booking.duration,
          customerInfo: booking.customerInfo,
        },
      });
    });

    setCheckoutItems(items);
  };

  const calculateTotals = () => {
    const subtotal = checkoutItems.reduce((sum, item) => {
      return sum + (item.price * (item.quantity || 1));
    }, 0);

    const shipping = requiresShipping ? 5.99 : 0; // Simple shipping calculation
    const tax = subtotal * 0.2; // 20% VAT for UK
    const total = subtotal + shipping + tax;

    setTotals({ subtotal, shipping, tax, total });
  };

  const handleCustomerInfoChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setCustomerInfo({
        ...customerInfo,
        address: {
          ...customerInfo.address,
          [addressField]: value,
        },
      });
    } else {
      setCustomerInfo({
        ...customerInfo,
        [field]: value,
      });
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return checkoutItems.length > 0;
      case 2:
        return !!(customerInfo.name && customerInfo.email);
      case 3:
        return !requiresShipping || !!(
          customerInfo.address.street &&
          customerInfo.address.city &&
          customerInfo.address.postalCode
        );
      default:
        return true;
    }
  };

  const processPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          items: checkoutItems,
          customer: customerInfo,
          paymentMethod,
          totals,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.requiresPayment) {
          // Redirect to Stripe Checkout or handle payment
          window.location.href = result.paymentUrl;
        } else {
          // Payment completed
          onComplete?.(result);
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      alert('Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkoutItems.length === 0) {
    return (
      <div className={`unified-checkout empty ${className}`}>
        <div className="empty-message">
          <h3>Your cart is empty</h3>
          <p>Add some products or book a service to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`unified-checkout ${className}`}>
      <div className="checkout-header">
        <h2>Checkout</h2>
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Review</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Details</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Shipping</div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Payment</div>
        </div>
      </div>

      <div className="checkout-content">
        <div className="checkout-main">
          {step === 1 && (
            <div className="step-content">
              <h3>Review Your Order</h3>
              <div className="items-list">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="checkout-item">
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      {item.type === 'product' && item.details?.variant && (
                        <p className="variant-info">
                          {Object.entries(item.details.variant.options).map(([key, value]) => (
                            <span key={key}>{key}: {value}</span>
                          ))}
                        </p>
                      )}
                      {item.type === 'booking' && (
                        <div className="booking-details">
                          <p>Duration: {item.details.duration} minutes</p>
                          {item.details.staffName && (
                            <p>Staff: {item.details.staffName}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="item-quantity">
                      {item.quantity && item.quantity > 1 && (
                        <span>Qty: {item.quantity}</span>
                      )}
                    </div>
                    <div className="item-price">
                      £{(item.price * (item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <h3>Your Details</h3>
              <div className="customer-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      value={customerInfo.email}
                      onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && requiresShipping && (
            <div className="step-content">
              <h3>Shipping Address</h3>
              <div className="address-form">
                <div className="form-group">
                  <label htmlFor="street">Street Address *</label>
                  <input
                    type="text"
                    id="street"
                    value={customerInfo.address.street}
                    onChange={(e) => handleCustomerInfoChange('address.street', e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City *</label>
                    <input
                      type="text"
                      id="city"
                      value={customerInfo.address.city}
                      onChange={(e) => handleCustomerInfoChange('address.city', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="postalCode">Postal Code *</label>
                    <input
                      type="text"
                      id="postalCode"
                      value={customerInfo.address.postalCode}
                      onChange={(e) => handleCustomerInfoChange('address.postalCode', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <h3>Payment Method</h3>
              <div className="payment-methods">
                <div
                  className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <span>💳</span>
                  <span>Credit/Debit Card</span>
                </div>
                <div
                  className={`payment-option ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <span>🅿️</span>
                  <span>PayPal</span>
                </div>
              </div>
            </div>
          )}

          <div className="step-actions">
            {step > 1 && (
              <button
                className="back-btn"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            
            {step < 4 && (
              <button
                className="next-btn"
                disabled={!validateStep(step)}
                onClick={() => {
                  if (step === 2 && !requiresShipping) {
                    setStep(4); // Skip shipping step
                  } else {
                    setStep(step + 1);
                  }
                }}
              >
                {step === 2 && !requiresShipping ? 'Continue to Payment' : 'Next'}
              </button>
            )}
            
            {step === 4 && (
              <button
                className="pay-btn"
                disabled={loading}
                onClick={processPayment}
              >
                {loading ? 'Processing...' : `Pay £${totals.total.toFixed(2)}`}
              </button>
            )}
          </div>
        </div>

        <div className="checkout-sidebar">
          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-line">
              <span>Subtotal:</span>
              <span>£{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.shipping > 0 && (
              <div className="summary-line">
                <span>Shipping:</span>
                <span>£{totals.shipping.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-line">
              <span>VAT (20%):</span>
              <span>£{totals.tax.toFixed(2)}</span>
            </div>
            <div className="summary-line total">
              <span>Total:</span>
              <span>£{totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .unified-checkout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .unified-checkout.empty {
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-message h3 {
          margin-bottom: 1rem;
          color: #1f2937;
        }

        .empty-message p {
          color: #6b7280;
        }

        .checkout-header {
          margin-bottom: 2rem;
        }

        .checkout-header h2 {
          margin-bottom: 1rem;
          font-size: 2rem;
          font-weight: 600;
          color: #1f2937;
        }

        .checkout-steps {
          display: flex;
          gap: 1rem;
        }

        .step {
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          background: #f3f4f6;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .step.active {
          background: #3b82f6;
          color: white;
        }

        .checkout-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        .checkout-main {
          background: white;
          padding: 2rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .step-content h3 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .items-list {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .checkout-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }

        .item-info {
          flex: 1;
        }

        .item-info h4 {
          margin-bottom: 0.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .variant-info,
        .booking-details {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .variant-info span {
          margin-right: 0.5rem;
        }

        .item-quantity {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .item-price {
          font-weight: 600;
          color: #1f2937;
        }

        .customer-form,
        .address-form {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
        }

        .payment-methods {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .payment-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .payment-option:hover {
          border-color: #3b82f6;
        }

        .payment-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .step-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }

        .back-btn,
        .next-btn,
        .pay-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .back-btn:hover {
          background: #e5e7eb;
        }

        .next-btn,
        .pay-btn {
          background: #3b82f6;
          color: white;
        }

        .next-btn:hover,
        .pay-btn:hover {
          background: #2563eb;
        }

        .next-btn:disabled,
        .pay-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .checkout-sidebar {
          background: white;
          padding: 2rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          height: fit-content;
        }

        .order-summary h3 {
          margin-bottom: 1rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .summary-line.total {
          font-weight: 600;
          font-size: 1.125rem;
          border-bottom: none;
          border-top: 2px solid #e5e7eb;
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
          .checkout-content {
            grid-template-columns: 1fr;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .checkout-steps {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
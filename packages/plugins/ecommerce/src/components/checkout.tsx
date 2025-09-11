import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bizbox/shared-ui'
import { Button } from '@bizbox/shared-ui'
import { Badge } from '@bizbox/shared-ui'
import { Input } from '@bizbox/shared-ui'
import { Separator } from '@bizbox/shared-ui'
import { 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Check, 
  ArrowLeft, 
  ArrowRight,
  Tag,
  X,
  Lock,
  Package
} from 'lucide-react'
import { 
  Cart, 
  CartItem, 
  Address, 
  ShippingMethod, 
  CheckoutSession,
  enhancedShoppingCart 
} from '../cart/enhanced-shopping-cart'

interface CheckoutProps {
  cartId: string
  onComplete: (orderNumber: string) => void
  onCancel: () => void
}

interface CheckoutStepProps {
  session: CheckoutSession
  cart: Cart
  onNext: () => void
  onBack?: () => void
  onUpdate: (updates: any) => void
}

const CartSummary: React.FC<{ cart: Cart; showItems?: boolean }> = ({ cart, showItems = true }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showItems && (
          <div className="space-y-3">
            {cart.items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{(item.price * item.quantity).toFixed(2)}</p>
                  {item.compareAtPrice && item.compareAtPrice > item.price && (
                    <p className="text-xs text-gray-500 line-through">
                      £{(item.compareAtPrice * item.quantity).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <Separator />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>£{cart.subtotal.toFixed(2)}</span>
          </div>
          
          {cart.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-£{cart.discount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{cart.shipping === 0 ? 'Free' : `£${cart.shipping.toFixed(2)}`}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Tax</span>
            <span>£{cart.tax.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>£{cart.total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const CustomerInfoStep: React.FC<CheckoutStepProps> = ({ session, onNext, onUpdate }) => {
  const [formData, setFormData] = useState({
    email: session.customerInfo?.email || '',
    firstName: session.customerInfo?.firstName || '',
    lastName: session.customerInfo?.lastName || '',
    phone: session.customerInfo?.phone || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onUpdate({ customerInfo: formData })
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Contact Information</h2>
        <p className="text-gray-600">We'll use this to send you order updates</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email Address *</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="your@email.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="John"
              className={errors.firstName ? 'border-red-500' : ''}
            />
            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Doe"
              className={errors.lastName ? 'border-red-500' : ''}
            />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+44 20 1234 5678"
          />
        </div>
      </div>

      <Button onClick={handleNext} className="w-full">
        Continue to Shipping
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}

const ShippingStep: React.FC<CheckoutStepProps> = ({ session, cart, onNext, onBack, onUpdate }) => {
  const [shippingAddress, setShippingAddress] = useState<Address>(
    session.shippingAddress || {
      firstName: session.customerInfo?.firstName || '',
      lastName: session.customerInfo?.lastName || '',
      address1: '',
      city: '',
      province: '',
      country: 'GB',
      zip: ''
    }
  )

  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>(
    session.shippingMethod?.id || ''
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadShippingMethods()
  }, [])

  const loadShippingMethods = async () => {
    try {
      const methods = await enhancedShoppingCart.getShippingMethods(cart.id)
      setShippingMethods(methods)
      if (methods.length > 0 && !selectedShippingMethod) {
        setSelectedShippingMethod(methods[0].id)
      }
    } catch (error) {
      console.error('Failed to load shipping methods:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!shippingAddress.address1) newErrors.address1 = 'Address is required'
    if (!shippingAddress.city) newErrors.city = 'City is required'
    if (!shippingAddress.province) newErrors.province = 'County/State is required'
    if (!shippingAddress.zip) newErrors.zip = 'Postal code is required'
    if (!selectedShippingMethod) newErrors.shippingMethod = 'Please select a shipping method'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      const selectedMethod = shippingMethods.find(m => m.id === selectedShippingMethod)
      onUpdate({
        shippingAddress,
        shippingMethod: selectedMethod
      })
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Shipping Address</h2>
          <p className="text-gray-600">Where should we send your order?</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name *</label>
            <Input
              value={shippingAddress.firstName}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, firstName: e.target.value }))}
              className={errors.firstName ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name *</label>
            <Input
              value={shippingAddress.lastName}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, lastName: e.target.value }))}
              className={errors.lastName ? 'border-red-500' : ''}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Company (Optional)</label>
          <Input
            value={shippingAddress.company || ''}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, company: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address *</label>
          <Input
            value={shippingAddress.address1}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, address1: e.target.value }))}
            placeholder="123 Main Street"
            className={errors.address1 ? 'border-red-500' : ''}
          />
          {errors.address1 && <p className="text-red-500 text-sm mt-1">{errors.address1}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Apartment, suite, etc. (Optional)</label>
          <Input
            value={shippingAddress.address2 || ''}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
            placeholder="Apartment, suite, unit, building, floor, etc."
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">City *</label>
            <Input
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
              className={errors.city ? 'border-red-500' : ''}
            />
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">County/State *</label>
            <Input
              value={shippingAddress.province}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, province: e.target.value }))}
              className={errors.province ? 'border-red-500' : ''}
            />
            {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postal Code *</label>
            <Input
              value={shippingAddress.zip}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, zip: e.target.value }))}
              className={errors.zip ? 'border-red-500' : ''}
            />
            {errors.zip && <p className="text-red-500 text-sm mt-1">{errors.zip}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone (Optional)</label>
          <Input
            type="tel"
            value={shippingAddress.phone || ''}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
      </div>

      {shippingMethods.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Shipping Method</h3>
          <div className="space-y-3">
            {shippingMethods.map(method => (
              <label key={method.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="shippingMethod"
                  value={method.id}
                  checked={selectedShippingMethod === method.id}
                  onChange={(e) => setSelectedShippingMethod(e.target.value)}
                  className="w-4 h-4"
                />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {method.price === 0 ? 'Free' : `£${method.price.toFixed(2)}`}
                    </p>
                    {method.trackingSupported && (
                      <p className="text-xs text-gray-500">Tracking included</p>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.shippingMethod && <p className="text-red-500 text-sm">{errors.shippingMethod}</p>}
        </div>
      )}

      <Button onClick={handleNext} className="w-full">
        Continue to Payment
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}

const PaymentStep: React.FC<CheckoutStepProps> = ({ session, cart, onNext, onBack, onUpdate }) => {
  const [couponCode, setCouponCode] = useState(cart.couponCode || '')
  const [appliedCoupon, setAppliedCoupon] = useState(!!cart.couponCode)
  const [couponMessage, setCouponMessage] = useState('')

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return

    try {
      const result = await enhancedShoppingCart.applyCoupon(cart.id, couponCode)
      setCouponMessage(result.message)
      setAppliedCoupon(result.success)
      
      if (result.success) {
        // Refresh cart data
        window.location.reload() // In real app, would update state properly
      }
    } catch (error) {
      setCouponMessage('Failed to apply coupon')
      setAppliedCoupon(false)
    }
  }

  const handleRemoveCoupon = async () => {
    try {
      await enhancedShoppingCart.removeCoupon(cart.id)
      setCouponCode('')
      setAppliedCoupon(false)
      setCouponMessage('')
      // Refresh cart data
      window.location.reload() // In real app, would update state properly
    } catch (error) {
      console.error('Failed to remove coupon:', error)
    }
  }

  const handleCompleteOrder = () => {
    // In real implementation, this would process payment
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Payment</h2>
          <p className="text-gray-600">Complete your order</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Coupon Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Discount Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appliedCoupon ? (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="font-medium">{cart.couponCode}</span>
                <span className="text-green-600">-£{cart.discount.toFixed(2)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter discount code"
                />
                <Button onClick={handleApplyCoupon} variant="outline">
                  Apply
                </Button>
              </div>
              {couponMessage && (
                <p className={`text-sm ${appliedCoupon ? 'text-green-600' : 'text-red-600'}`}>
                  {couponMessage}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Credit Card</h4>
                <div className="flex gap-2">
                  <img src="/visa.png" alt="Visa" className="h-6" />
                  <img src="/mastercard.png" alt="Mastercard" className="h-6" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Card Number</label>
                  <Input placeholder="1234 5678 9012 3456" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry Date</label>
                    <Input placeholder="MM/YY" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">CVC</label>
                    <Input placeholder="123" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Name on Card</label>
                  <Input placeholder="John Doe" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="w-4 h-4" />
              <span>Your payment information is secure and encrypted</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleCompleteOrder} className="w-full" size="lg">
        Complete Order - £{cart.total.toFixed(2)}
        <Lock className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}

const OrderComplete: React.FC<{ orderNumber: string; onContinue: () => void }> = ({ 
  orderNumber, 
  onContinue 
}) => {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Order Complete!</h2>
        <p className="text-gray-600">Thank you for your purchase</p>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">Order Number</p>
        <p className="font-mono font-bold text-lg">{orderNumber}</p>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          We've sent a confirmation email with your order details and tracking information.
        </p>
        <p className="text-sm text-gray-600">
          Your order will be processed and shipped within 1-2 business days.
        </p>
      </div>
      
      <Button onClick={onContinue} className="w-full">
        Continue Shopping
      </Button>
    </div>
  )
}

export const Checkout: React.FC<CheckoutProps> = ({ cartId, onComplete, onCancel }) => {
  const [cart, setCart] = useState<Cart | null>(null)
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [currentStep, setCurrentStep] = useState<CheckoutSession['step']>('information')
  const [loading, setLoading] = useState(true)
  const [orderNumber, setOrderNumber] = useState<string>('')

  useEffect(() => {
    loadCart()
  }, [cartId])

  const loadCart = async () => {
    try {
      const cartData = await enhancedShoppingCart.getCart(cartId)
      if (!cartData) {
        throw new Error('Cart not found')
      }
      setCart(cartData)
    } catch (error) {
      console.error('Failed to load cart:', error)
      onCancel()
    } finally {
      setLoading(false)
    }
  }

  const handleStepUpdate = async (updates: any) => {
    if (!session) return

    try {
      const updatedSession = await enhancedShoppingCart.updateCheckoutSession(session.id, updates)
      if (updatedSession) {
        setSession(updatedSession)
      }
    } catch (error) {
      console.error('Failed to update checkout session:', error)
    }
  }

  const handleNext = () => {
    const steps: CheckoutSession['step'][] = ['information', 'shipping', 'payment', 'review', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const steps: CheckoutSession['step'][] = ['information', 'shipping', 'payment', 'review', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const startCheckout = async (customerInfo: any) => {
    if (!cart) return

    try {
      const newSession = await enhancedShoppingCart.startCheckout(cart.id, customerInfo)
      setSession(newSession)
      handleNext()
    } catch (error) {
      console.error('Failed to start checkout:', error)
    }
  }

  const completeCheckout = async () => {
    if (!session) return

    try {
      const order = await enhancedShoppingCart.completeCheckout(session.id, 'mock-payment-intent')
      setOrderNumber(order.orderNumber)
      setCurrentStep('complete')
    } catch (error) {
      console.error('Failed to complete checkout:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!cart) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cart not found</p>
        <Button onClick={onCancel} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  if (currentStep === 'complete') {
    return <OrderComplete orderNumber={orderNumber} onContinue={() => onComplete(orderNumber)} />
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {currentStep === 'information' && (
            <CustomerInfoStep
              session={session!}
              cart={cart}
              onNext={() => {
                if (!session) {
                  // Start checkout with customer info
                  return
                }
                handleNext()
              }}
              onUpdate={(updates) => {
                if (!session) {
                  startCheckout(updates.customerInfo)
                } else {
                  handleStepUpdate(updates)
                }
              }}
            />
          )}

          {currentStep === 'shipping' && session && (
            <ShippingStep
              session={session}
              cart={cart}
              onNext={handleNext}
              onBack={handleBack}
              onUpdate={handleStepUpdate}
            />
          )}

          {currentStep === 'payment' && session && (
            <PaymentStep
              session={session}
              cart={cart}
              onNext={completeCheckout}
              onBack={handleBack}
              onUpdate={handleStepUpdate}
            />
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <CartSummary cart={cart} />
        </div>
      </div>
    </div>
  )
}
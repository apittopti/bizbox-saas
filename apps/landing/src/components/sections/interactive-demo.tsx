'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Calendar, ShoppingCart, BarChart3, Palette, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('website');

  const demos = {
    website: {
      title: 'Website Builder',
      icon: Globe,
      description: 'Professional websites tailored for your industry',
      component: <WebsiteBuilderDemo />,
    },
    booking: {
      title: 'Online Booking',
      icon: Calendar,
      description: '24/7 appointment scheduling system',
      component: <BookingSystemDemo />,
    },
    ecommerce: {
      title: 'E-commerce',
      icon: ShoppingCart,
      description: 'Sell products and services online',
      component: <EcommerceDemo />,
    },
    analytics: {
      title: 'Analytics',
      icon: BarChart3,
      description: 'Track performance and customer insights',
      component: <AnalyticsDemo />,
    },
  };

  return (
    <section className="section-padding bg-gray-50">
      <div className="container mx-auto container-padding">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
            Interactive Demo
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            See BizBox in Action
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our platform with this interactive demo. Click on each tab to see different features.
          </p>
        </motion.div>
        
        <motion.div 
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {Object.entries(demos).map(([key, demo]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? 'border-brand-500 text-brand-600 bg-brand-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <demo.icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{demo.title}</span>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {demos[activeTab as keyof typeof demos].title}
                  </h3>
                  <p className="text-gray-600">
                    {demos[activeTab as keyof typeof demos].description}
                  </p>
                </div>
                
                {demos[activeTab as keyof typeof demos].component}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WebsiteBuilderDemo() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Industry-Specific Templates
          </h4>
          <div className="space-y-3">
            {[
              'Professional designs for beauty salons, barbershops, and more',
              'Drag-and-drop customization with real-time preview',
              'Mobile-responsive layouts that look great on all devices',
              'SEO-optimized for better search engine visibility',
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-brand-500 rounded-full mt-2" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Button variant="outline" className="w-full sm:w-auto">
          Try Website Builder
        </Button>
      </div>
      
      <div className="relative">
        <div className="bg-gray-100 rounded-lg p-4 shadow-inner">
          <div className="bg-white rounded border shadow-soft">
            {/* Website Preview */}
            <div className="bg-brand-600 h-16 rounded-t flex items-center px-4">
              <div className="w-24 h-6 bg-white/20 rounded" />
            </div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="h-20 bg-gray-100 rounded" />
                <div className="h-20 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute -top-2 -right-2 bg-green-500 text-white p-2 rounded-full text-xs font-medium">
          Live
        </div>
      </div>
    </div>
  );
}

function BookingSystemDemo() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Streamlined Booking Experience
          </h4>
          <div className="space-y-3">
            {[
              '24/7 online booking with automatic confirmations',
              'Calendar sync with Google, Outlook, and Apple',
              'Staff scheduling and availability management',
              'Automated reminders and follow-up messages',
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Button variant="outline" className="w-full sm:w-auto">
          Try Booking System
        </Button>
      </div>
      
      <div className="relative">
        <div className="bg-white rounded-lg border shadow-soft p-4">
          {/* Calendar View */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 p-1">
                {day}
              </div>
            ))}
            {Array.from({ length: 28 }, (_, i) => (
              <div key={i} className="aspect-square flex items-center justify-center text-sm border rounded">
                {((i % 31) + 1).toString()}
              </div>
            ))}
          </div>
          
          {/* Booking Slots */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Available Times</div>
            <div className="grid grid-cols-3 gap-2">
              {['9:00 AM', '11:30 AM', '2:00 PM', '4:30 PM'].map((time) => (
                <button key={time} className="text-xs py-2 px-3 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EcommerceDemo() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Complete E-commerce Solution
          </h4>
          <div className="space-y-3">
            {[
              'Product catalog with inventory management',
              'Secure payment processing with Stripe',
              'Order tracking and customer notifications',
              'Integrated shipping and tax calculations',
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Button variant="outline" className="w-full sm:w-auto">
          Try E-commerce
        </Button>
      </div>
      
      <div className="relative">
        <div className="bg-white rounded-lg border shadow-soft p-4">
          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 h-20" />
                <div className="p-2">
                  <div className="h-3 bg-gray-200 rounded mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="text-sm font-semibold text-brand-600 mt-1">
                    £{(15 + i * 5).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Cart Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span>Cart (2 items)</span>
              <span className="font-semibold">£35.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsDemo() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Business Intelligence Dashboard
          </h4>
          <div className="space-y-3">
            {[
              'Real-time revenue and booking analytics',
              'Customer behavior and retention insights',
              'Staff performance and productivity metrics',
              'Automated reporting and business forecasting',
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
        
        <Button variant="outline" className="w-full sm:w-auto">
          Try Analytics
        </Button>
      </div>
      
      <div className="relative">
        <div className="bg-white rounded-lg border shadow-soft p-4 space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">£12.5K</div>
              <div className="text-xs text-blue-600">This Month</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">847</div>
              <div className="text-xs text-green-600">Bookings</div>
            </div>
          </div>
          
          {/* Chart Placeholder */}
          <div className="h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-end justify-between p-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div 
                key={i} 
                className="bg-blue-500 rounded-t"
                style={{ height: `${20 + Math.random() * 60}%`, width: '10px' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
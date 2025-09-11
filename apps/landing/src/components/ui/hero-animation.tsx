'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, ShoppingCart, BarChart3, Users, Smartphone, Globe } from 'lucide-react';

export function HeroAnimation() {
  const [currentView, setCurrentView] = useState(0);
  
  const features = [
    { 
      icon: Globe, 
      title: 'Website Builder',
      description: 'Professional websites in minutes',
      color: 'bg-blue-500' 
    },
    { 
      icon: Calendar, 
      title: 'Online Booking',
      description: '24/7 appointment scheduling',
      color: 'bg-green-500' 
    },
    { 
      icon: ShoppingCart, 
      title: 'E-commerce',
      description: 'Sell products and services online',
      color: 'bg-purple-500' 
    },
    { 
      icon: BarChart3, 
      title: 'Analytics',
      description: 'Track performance and growth',
      color: 'bg-orange-500' 
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentView((prev) => (prev + 1) % features.length);
    }, 3000);
    
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <div className="relative w-full h-full">
      {/* Main Device Mockup */}
      <div className="relative mx-auto max-w-md">
        {/* Phone Frame */}
        <div className="relative">
          <div className="mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
            <div className="h-[32px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
            <div className="h-[64px] w-[3px] bg-gray-800 dark:bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
            
            {/* Screen Content */}
            <div className="rounded-[2rem] overflow-hidden w-[272px] h-[572px] bg-white relative">
              {/* Header */}
              <div className="bg-brand-600 h-20 flex items-end pb-2 px-4">
                <div className="text-white font-semibold">BizBox Dashboard</div>
              </div>
              
              {/* Feature Cards */}
              <div className="p-4 space-y-3">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className={`p-4 rounded-lg transition-all duration-300 ${
                      index === currentView 
                        ? 'bg-white shadow-large scale-105' 
                        : 'bg-gray-50 shadow-soft'
                    }`}
                    animate={{
                      scale: index === currentView ? 1.05 : 1,
                      y: index === currentView ? -5 : 0,
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${feature.color} text-white`}>
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{feature.title}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Bottom Section - Stats */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-900">2,847</div>
                      <div className="text-xs text-gray-600">Happy Customers</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">98%</div>
                      <div className="text-xs text-gray-600">Satisfaction Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <motion.div
          className="absolute -top-8 -left-8 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Globe className="w-8 h-8 text-blue-600" />
        </motion.div>
        
        <motion.div
          className="absolute -top-4 -right-12 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <Calendar className="w-6 h-6 text-green-600" />
        </motion.div>
        
        <motion.div
          className="absolute bottom-8 -right-8 w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center"
          animate={{ y: [-8, 8, -8] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <ShoppingCart className="w-7 h-7 text-purple-600" />
        </motion.div>
      </div>
    </div>
  );
}
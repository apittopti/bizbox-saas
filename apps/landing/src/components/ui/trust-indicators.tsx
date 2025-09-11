'use client';

import Image from 'next/image';
import { Star, Shield, Award, TrendingUp } from 'lucide-react';

export function TrustIndicators() {
  const stats = [
    { value: '2,847+', label: 'UK Businesses', icon: TrendingUp },
    { value: '4.9/5', label: 'Customer Rating', icon: Star },
    { value: '99.9%', label: 'Uptime SLA', icon: Shield },
    { value: 'Award Winning', label: 'Platform', icon: Award },
  ];

  const logos = [
    { name: 'Trustpilot', src: '/images/logos/trustpilot.svg', alt: 'Trustpilot' },
    { name: 'Google Reviews', src: '/images/logos/google.svg', alt: 'Google Reviews' },
    { name: 'ISO 27001', src: '/images/logos/iso27001.svg', alt: 'ISO 27001 Certified' },
    { name: 'GDPR', src: '/images/logos/gdpr.svg', alt: 'GDPR Compliant' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center mb-2">
              <stat.icon className="w-5 h-5 text-brand-600 mr-1" />
              <span className="text-lg font-bold text-gray-900">{stat.value}</span>
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
      
      {/* Trust Badges */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500 mb-3 text-center">
          Trusted & Secure
        </div>
        <div className="flex items-center justify-center space-x-6 opacity-60">
          {logos.map((logo, index) => (
            <div key={index} className="h-8 w-16 relative grayscale hover:grayscale-0 transition-all">
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                className="object-contain"
                sizes="64px"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Reviews */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">4.9/5</span> from 2,847 reviews
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          "BizBox transformed our salon business. We went from pen-and-paper bookings to a professional online presence in just one day."
        </p>
        <div className="text-xs text-gray-500 mt-1">
          - Sarah Johnson, Elegance Beauty Salon
        </div>
      </div>
    </div>
  );
}
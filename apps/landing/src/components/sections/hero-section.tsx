'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Play, Star, CheckCircle } from 'lucide-react';
import { HeroAnimation } from '@/components/ui/hero-animation';
import { TrustIndicators } from '@/components/ui/trust-indicators';
import { VideoModal } from '@/components/ui/video-modal';

export function HeroSection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="container mx-auto container-padding">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[90vh] py-20">
          {/* Content */}
          <div className="space-y-8 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center rounded-full px-4 py-2 bg-brand-100 text-brand-800 text-sm font-medium">
              <Star className="w-4 h-4 mr-2 fill-current" />
              Trusted by 2,800+ UK businesses
            </div>
            
            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Everything Your{' '}
                <span className="gradient-text">Business Needs</span>{' '}
                in One Platform
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                Professional websites, online booking, e-commerce, and customer management tools 
                designed specifically for UK service businesses. Launch in minutes, not months.
              </p>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild 
                variant="gradient" 
                size="xl"
                className="text-lg px-8 py-4"
              >
                <Link href="/signup">
                  Start Free Trial
                </Link>
              </Button>
              
              <Button
                variant="outline"
                size="xl"
                className="text-lg px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-white"
                onClick={() => setIsVideoOpen(true)}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            {/* Key Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              {[
                { text: "Free 14-day trial", icon: CheckCircle },
                { text: "No setup fees", icon: CheckCircle },
                { text: "Cancel anytime", icon: CheckCircle },
              ].map((benefit, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <benefit.icon className="w-4 h-4 text-green-500 mr-2" />
                  {benefit.text}
                </div>
              ))}
            </div>
            
            {/* Trust Indicators */}
            <TrustIndicators />
          </div>
          
          {/* Hero Animation/Image */}
          <div className="relative lg:h-[600px] animate-slide-in-right">
            <HeroAnimation />
          </div>
        </div>
      </div>
      
      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ" // Replace with actual demo video
      />
    </section>
  );
}
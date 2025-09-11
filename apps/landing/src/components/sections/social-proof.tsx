'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight, Award, TrendingUp, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SocialProof() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: 'Sarah Johnson',
      business: 'Elegance Beauty Salon',
      location: 'Manchester',
      avatar: '/images/testimonials/sarah.jpg',
      rating: 5,
      quote: "BizBox transformed our business completely. We went from pen-and-paper bookings to a professional online presence in just one day. Our revenue increased by 35% in the first month alone.",
      results: '35% revenue increase',
      industry: 'Beauty',
      verified: true
    },
    {
      name: 'Mike Rodriguez',
      business: 'Classic Cuts Barbershop',
      location: 'London',
      avatar: '/images/testimonials/mike.jpg',
      rating: 5,
      quote: "The booking system alone has saved us hours every week. Our customers love being able to book online 24/7, and we've reduced no-shows by 70% with automated reminders.",
      results: '70% fewer no-shows',
      industry: 'Barbershop',
      verified: true
    },
    {
      name: 'Emma Thompson',
      business: 'FitLife Personal Training',
      location: 'Birmingham',
      avatar: '/images/testimonials/emma.jpg',
      rating: 5,
      quote: "The e-commerce features let me sell training plans and supplements online. My revenue has increased by 40% since launching, and the client management tools keep everyone engaged.",
      results: '40% revenue growth',
      industry: 'Fitness',
      verified: true
    },
    {
      name: 'James Wilson',
      business: 'AutoCare Garage',
      location: 'Leeds',
      avatar: '/images/testimonials/james.jpg',
      rating: 5,
      quote: "Managing customer vehicles, service history, and MOT reminders has never been easier. Our customers appreciate the transparency and professional service reminders.",
      results: '50% more repeat customers',
      industry: 'Automotive',
      verified: true
    },
    {
      name: 'Lisa Chen',
      business: 'Sparkle Clean Services',
      location: 'Bristol',
      avatar: '/images/testimonials/lisa.jpg',
      rating: 5,
      quote: "The recurring booking feature is perfect for our regular cleaning clients. We've automated 80% of our scheduling, giving us more time to focus on service quality.",
      results: '80% scheduling automated',
      industry: 'Cleaning',
      verified: true
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section-padding bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto container-padding">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-4">
            Customer Success Stories
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Loved by UK Businesses
          </h2>
          <div className="flex justify-center items-center gap-4 mb-8">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-current" />
              ))}
            </div>
            <span className="text-lg font-semibold text-gray-700">4.9/5 from 2,847 reviews</span>
          </div>
        </motion.div>

        {/* Main Testimonial Carousel */}
        <div className="relative max-w-4xl mx-auto mb-16">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="p-8 md:p-12"
              >
                <div className="grid md:grid-cols-3 gap-8 items-center">
                  {/* Testimonial Content */}
                  <div className="md:col-span-2 space-y-6">
                    <Quote className="w-12 h-12 text-brand-500 mb-4" />
                    
                    <blockquote className="text-xl md:text-2xl text-gray-700 leading-relaxed">
                      "{testimonials[currentTestimonial].quote}"
                    </blockquote>
                    
                    <div className="flex items-center space-x-4">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-r from-brand-400 to-brand-600" />
                        {/* Avatar placeholder - replace with actual image */}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-lg text-gray-900">
                            {testimonials[currentTestimonial].name}
                          </h4>
                          {testimonials[currentTestimonial].verified && (
                            <div className="bg-green-500 rounded-full p-1">
                              <Star className="w-3 h-3 text-white fill-current" />
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600">
                          {testimonials[currentTestimonial].business}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {testimonials[currentTestimonial].location}
                        </p>
                        <div className="flex text-yellow-400 mt-1">
                          {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Results Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <h5 className="font-semibold text-gray-900 mb-3">Key Result</h5>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {testimonials[currentTestimonial].results}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      {testimonials[currentTestimonial].industry} Industry
                    </div>
                    <div className="flex items-center text-xs text-green-700">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Verified Result
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation */}
            <div className="flex justify-between items-center px-8 pb-6">
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentTestimonial ? 'bg-brand-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevTestimonial}
                  className="rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextTestimonial}
                  className="rounded-full hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges Grid */}
        <TrustBadges />

        {/* Stats Section */}
        <motion.div 
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {[
            { value: '2,847+', label: 'Happy Customers', icon: Users },
            { value: '98%', label: 'Satisfaction Rate', icon: Award },
            { value: '50M+', label: 'Bookings Processed', icon: TrendingUp },
            { value: '99.9%', label: 'Uptime SLA', icon: Shield },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-soft border border-gray-200">
              <stat.icon className="w-8 h-8 text-brand-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-gray-600 text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TrustBadges() {
  const badges = [
    { 
      name: 'Trustpilot Excellent', 
      logo: '/images/badges/trustpilot.svg', 
      rating: '4.9/5 Excellent',
      reviews: '2,847 reviews' 
    },
    { 
      name: 'Google Reviews', 
      logo: '/images/badges/google.svg', 
      rating: '4.8/5 Stars',
      reviews: '3,284 reviews' 
    },
    { 
      name: 'ISO 27001 Certified', 
      logo: '/images/badges/iso27001.svg', 
      rating: 'Certified',
      reviews: 'Security Standard' 
    },
    { 
      name: 'GDPR Compliant', 
      logo: '/images/badges/gdpr.svg', 
      rating: 'Compliant',
      reviews: 'Data Protection' 
    },
  ];

  return (
    <motion.div 
      className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {badges.map((badge, index) => (
        <div key={index} className="bg-white rounded-lg p-4 shadow-soft border border-gray-200 text-center">
          <div className="h-12 w-20 mx-auto mb-3 bg-gray-100 rounded flex items-center justify-center">
            {/* Badge logo placeholder */}
            <div className="text-xs text-gray-500">{badge.name}</div>
          </div>
          <div className="font-semibold text-gray-900 text-sm">{badge.rating}</div>
          <div className="text-gray-600 text-xs">{badge.reviews}</div>
        </div>
      ))}
    </motion.div>
  );
}
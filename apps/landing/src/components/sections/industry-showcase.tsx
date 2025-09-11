'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, Scissors, Car, Dumbbell, Sparkle, UtensilsCrossed, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function IndustryShowcase() {
  const [selectedIndustry, setSelectedIndustry] = useState(0);

  const industries = [
    {
      id: 'beauty',
      name: 'Beauty Salons',
      icon: Sparkles,
      image: '/images/templates/beauty-salon.jpg',
      features: ['Online Booking', 'Service Menu', 'Staff Profiles', 'Client Gallery', 'Product Sales'],
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      description: 'Professional salon management with booking, retail, and customer engagement tools.',
      stats: { businesses: '850+', bookings: '2.3M+', rating: '4.9' }
    },
    {
      id: 'barbershop',
      name: 'Barbershops',
      icon: Scissors,
      image: '/images/templates/barbershop.jpg',
      features: ['Walk-in Queue', 'Barber Profiles', 'Price Lists', 'Reviews', 'Loyalty Program'],
      color: 'from-gray-700 to-gray-900',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      description: 'Modern barbershop experience with queue management and customer loyalty.',
      stats: { businesses: '420+', bookings: '980K+', rating: '4.8' }
    },
    {
      id: 'automotive',
      name: 'Auto Garages',
      icon: Car,
      image: '/images/templates/auto-garage.jpg',
      features: ['Service Booking', 'Quote Requests', 'MOT Reminders', 'Parts Shop', 'Vehicle History'],
      color: 'from-blue-600 to-blue-800',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      description: 'Complete automotive service management with customer vehicle tracking.',
      stats: { businesses: '340+', bookings: '1.1M+', rating: '4.9' }
    },
    {
      id: 'fitness',
      name: 'Personal Trainers',
      icon: Dumbbell,
      image: '/images/templates/personal-trainer.jpg',
      features: ['Session Booking', 'Workout Plans', 'Progress Tracking', 'Nutrition Guides', 'Client Portal'],
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      description: 'Comprehensive fitness coaching with client management and progress tracking.',
      stats: { businesses: '680+', bookings: '1.8M+', rating: '4.9' }
    },
    {
      id: 'cleaning',
      name: 'Cleaning Services',
      icon: Sparkle,
      image: '/images/templates/cleaning-service.jpg',
      features: ['Recurring Bookings', 'Service Areas', 'Team Management', 'Before/After Photos', 'Quality Checks'],
      color: 'from-purple-500 to-violet-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      description: 'Professional cleaning service management with recurring appointments.',
      stats: { businesses: '290+', bookings: '750K+', rating: '4.8' }
    },
    {
      id: 'restaurant',
      name: 'Restaurants',
      icon: UtensilsCrossed,
      image: '/images/templates/restaurant.jpg',
      features: ['Table Reservations', 'Online Ordering', 'Menu Management', 'Delivery Tracking', 'Reviews'],
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      description: 'Full-service restaurant management with reservations and online ordering.',
      stats: { businesses: '470+', bookings: '3.2M+', rating: '4.7' }
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section className="section-padding bg-white">
      <div className="container mx-auto container-padding">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
            Industry-Specific Solutions
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Built for Your Industry
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Professional templates and features designed specifically for UK service businesses. 
            Each industry gets tailored functionality that matches their unique needs.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Industry Navigation */}
          <motion.div 
            className="lg:col-span-4 space-y-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {industries.map((industry, index) => (
              <motion.button
                key={industry.id}
                variants={itemVariants}
                onClick={() => setSelectedIndustry(index)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                  selectedIndustry === index
                    ? `${industry.bgColor} border-current ${industry.textColor} shadow-medium`
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-soft bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    selectedIndustry === index 
                      ? `bg-gradient-to-r ${industry.color} text-white` 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <industry.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{industry.name}</h3>
                    <p className={`text-sm ${
                      selectedIndustry === index 
                        ? industry.textColor.replace('600', '700') 
                        : 'text-gray-600'
                    }`}>
                      {industry.stats.businesses} businesses trust us
                    </p>
                  </div>
                  {selectedIndustry === index && (
                    <ArrowRight className="w-5 h-5 text-current" />
                  )}
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* Selected Industry Details */}
          <motion.div 
            className="lg:col-span-8"
            key={selectedIndustry}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-large overflow-hidden">
              {/* Industry Header */}
              <div className={`bg-gradient-to-r ${industries[selectedIndustry].color} p-6 text-white`}>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <industries[selectedIndustry].icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{industries[selectedIndustry].name}</h3>
                    <p className="text-white/80">{industries[selectedIndustry].description}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{industries[selectedIndustry].stats.businesses}</div>
                    <div className="text-white/80 text-sm">UK Businesses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{industries[selectedIndustry].stats.bookings}</div>
                    <div className="text-white/80 text-sm">Bookings Made</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{industries[selectedIndustry].stats.rating}/5</div>
                    <div className="text-white/80 text-sm">Avg Rating</div>
                  </div>
                </div>
              </div>

              {/* Template Preview */}
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h4>
                    <div className="space-y-3">
                      {industries[selectedIndustry].features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${industries[selectedIndustry].color}`} />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full group"
                      >
                        View Live Demo
                        <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                      <Button 
                        className={`w-full bg-gradient-to-r ${industries[selectedIndustry].color} hover:opacity-90`}
                      >
                        Get Started with This Template
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Template Screenshot Placeholder */}
                    <div className="aspect-[4/3] bg-gray-100 rounded-lg border overflow-hidden">
                      <div className="bg-white h-full">
                        {/* Website Header */}
                        <div className={`h-16 bg-gradient-to-r ${industries[selectedIndustry].color} flex items-center px-4`}>
                          <div className="w-32 h-6 bg-white/20 rounded" />
                        </div>
                        
                        {/* Content Area */}
                        <div className="p-4 space-y-4">
                          <div className="flex space-x-4">
                            <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-3/4" />
                              <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                          </div>
                          
                          {/* Feature Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: 4 }, (_, i) => (
                              <div key={i} className="h-12 bg-gray-100 rounded flex items-center justify-center">
                                <div className="h-2 w-16 bg-gray-300 rounded" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Live Badge */}
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                      <span>Live Demo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Call to Action */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Don't See Your Industry?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              We're constantly adding new industry templates. Our flexible platform 
              can be customized for any service-based business.
            </p>
            <Button variant="outline" size="lg">
              Request Custom Template
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
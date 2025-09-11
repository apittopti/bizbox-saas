'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Scissors, 
  Car, 
  Dumbbell, 
  Sparkle, 
  UtensilsCrossed,
  ArrowRight,
  ArrowLeft,
  Users,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignupProgress } from '@/components/signup/signup-progress';
import { trackSignupStart, trackEvent } from '@/components/analytics';

export default function BusinessTypePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const businessTypes = [
    { 
      id: 'beauty', 
      name: 'Beauty Salon', 
      icon: Sparkles,
      description: 'Hair, nails, skincare, and spa services',
      popular: true,
      color: 'from-pink-500 to-rose-500'
    },
    { 
      id: 'barbershop', 
      name: 'Barbershop', 
      icon: Scissors,
      description: 'Traditional and modern barbering services',
      popular: true,
      color: 'from-gray-700 to-gray-900'
    },
    { 
      id: 'automotive', 
      name: 'Auto Garage', 
      icon: Car,
      description: 'Vehicle maintenance and repair services',
      popular: false,
      color: 'from-blue-600 to-blue-800'
    },
    { 
      id: 'fitness', 
      name: 'Personal Trainer', 
      icon: Dumbbell,
      description: 'Personal training and fitness coaching',
      popular: true,
      color: 'from-green-500 to-emerald-600'
    },
    { 
      id: 'cleaning', 
      name: 'Cleaning Service', 
      icon: Sparkle,
      description: 'Residential and commercial cleaning',
      popular: false,
      color: 'from-purple-500 to-violet-600'
    },
    { 
      id: 'restaurant', 
      name: 'Restaurant', 
      icon: UtensilsCrossed,
      description: 'Food service and hospitality',
      popular: false,
      color: 'from-orange-500 to-red-500'
    },
    { 
      id: 'other-service', 
      name: 'Other Service', 
      icon: Users,
      description: 'Professional services and consulting',
      popular: false,
      color: 'from-indigo-500 to-purple-600'
    },
    { 
      id: 'multiple', 
      name: 'Multiple Businesses', 
      icon: Building2,
      description: 'Multiple locations or business types',
      popular: false,
      color: 'from-slate-600 to-slate-800'
    },
  ];

  const handleNext = () => {
    if (!selectedType) return;
    
    trackEvent('signup_business_type_selected', {
      business_type: selectedType,
      plan: selectedPlan || 'unknown'
    });

    const params = new URLSearchParams();
    if (selectedPlan) params.set('plan', selectedPlan);
    params.set('type', selectedType);
    
    router.push(`/signup/business-details?${params.toString()}`);
  };

  // Track signup start when component mounts
  useState(() => {
    trackSignupStart(selectedPlan || undefined);
  });

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full">
        <SignupProgress currentStep={1} totalSteps={5} />
        
        <motion.div 
          className="bg-white rounded-2xl shadow-large p-8 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              What type of business do you run?
            </h1>
            <p className="text-gray-600 text-lg">
              This helps us customize your experience and provide industry-specific features.
            </p>
          </div>

          {/* Business Type Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {businessTypes.map((type, index) => (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => setSelectedType(type.id)}
                className={`relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-medium text-left ${
                  selectedType === type.id
                    ? 'border-brand-500 bg-brand-50 shadow-large'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {/* Popular Badge */}
                {type.popular && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    Popular
                  </div>
                )}

                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  selectedType === type.id
                    ? `bg-gradient-to-r ${type.color} text-white`
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <type.icon className="w-6 h-6" />
                </div>
                
                <h3 className={`font-semibold text-base mb-2 ${
                  selectedType === type.id ? 'text-brand-900' : 'text-gray-900'
                }`}>
                  {type.name}
                </h3>
                
                <p className={`text-sm ${
                  selectedType === type.id ? 'text-brand-700' : 'text-gray-600'
                }`}>
                  {type.description}
                </p>

                {/* Selected Indicator */}
                {selectedType === type.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Selected Plan Info */}
          {selectedPlan && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 capitalize">
                    {selectedPlan} Plan Selected
                  </h4>
                  <p className="text-blue-700 text-sm">
                    14-day free trial • No credit card required
                  </p>
                </div>
                <Link 
                  href="/#pricing"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Change plan
                </Link>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              asChild
              className="text-gray-600 hover:text-gray-800"
            >
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to homepage
              </Link>
            </Button>

            <Button
              onClick={handleNext}
              disabled={!selectedType}
              size="lg"
              className="min-w-[120px]"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Need help choosing? 
            <a href="#" className="text-brand-600 hover:text-brand-700 ml-1 underline">
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
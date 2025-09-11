'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, Calendar, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignupProgress } from '@/components/signup/signup-progress';
import { trackEvent, trackTrialStart } from '@/components/analytics';

export default function SignupCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const selectedType = searchParams.get('type');
  const selectedTemplate = searchParams.get('template');
  
  useEffect(() => {
    // Track trial start
    if (selectedPlan) {
      trackTrialStart(selectedPlan);
    }
    
    trackEvent('signup_completed', {
      business_type: selectedType,
      plan: selectedPlan || 'unknown',
      template: selectedTemplate
    });
  }, [selectedPlan, selectedType, selectedTemplate]);

  const nextSteps = [
    {
      icon: Globe,
      title: 'Set up your website',
      description: 'Customize your template with your branding and content',
      time: '10 minutes'
    },
    {
      icon: Calendar,
      title: 'Configure booking system',
      description: 'Add your services and availability',
      time: '15 minutes'
    },
    {
      icon: Sparkles,
      title: 'Go live',
      description: 'Publish your website and start accepting bookings',
      time: '5 minutes'
    },
  ];

  const handleGetStarted = () => {
    // In a real app, this would redirect to the main dashboard
    // For now, we'll just redirect to a success page or back to landing
    trackEvent('dashboard_redirect', {
      source: 'signup_complete',
      plan: selectedPlan
    });
    
    window.location.href = `/dashboard`; // This would be the actual dashboard URL
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-3xl w-full">
        <SignupProgress currentStep={5} totalSteps={5} />
        
        <motion.div 
          className="bg-white rounded-2xl shadow-large p-8 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Success Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-12 h-12 text-green-600" />
            </motion.div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to BizBox! 🎉
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Your account has been created successfully. You're now ready to transform 
              your business with our powerful platform.
            </p>
          </div>

          {/* Account Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Your Account Summary</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Plan:</span>
                <div className="font-medium text-gray-900 capitalize">
                  {selectedPlan || 'Starter'} Plan
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Business Type:</span>
                <div className="font-medium text-gray-900 capitalize">
                  {selectedType?.replace('-', ' ') || 'Beauty Salon'}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Template:</span>
                <div className="font-medium text-gray-900">
                  {selectedTemplate?.replace('-', ' ').replace(/^\w/, c => c.toUpperCase()) || 'Elegant Beauty'}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Trial Period:</span>
                <div className="font-medium text-green-600">14 days free</div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Next Steps (30 minutes to go live)
            </h3>
            
            <div className="space-y-4">
              {nextSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="flex items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-4">
                    <step.icon className="w-6 h-6 text-brand-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-gray-600 text-sm">{step.description}</p>
                  </div>
                  
                  <div className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
                    {step.time}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Support Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h4 className="font-medium text-blue-900 mb-2">
              Need Help Getting Started?
            </h4>
            <p className="text-blue-800 text-sm mb-4">
              Our team is here to help you succeed. Get personalized onboarding assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="sm" className="bg-white">
                Schedule Onboarding Call
              </Button>
              <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800">
                View Help Center
              </Button>
            </div>
          </div>

          {/* Main CTA */}
          <div className="text-center">
            <Button
              onClick={handleGetStarted}
              size="xl"
              className="text-lg px-12 py-4 mb-4"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <p className="text-gray-500 text-sm">
              Your 14-day free trial starts now. No payment required until trial ends.
            </p>
          </div>
        </motion.div>

        {/* Additional Info */}
        <div className="text-center mt-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-2">
              What happens next?
            </h4>
            <p className="text-gray-600 text-sm">
              We've sent a welcome email with your login details and next steps. 
              Check your inbox (including spam folder) in the next few minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
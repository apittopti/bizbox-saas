'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Eye, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignupProgress } from '@/components/signup/signup-progress';
import { trackEvent, trackSignupComplete } from '@/components/analytics';

export default function TemplateSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const selectedType = searchParams.get('type');
  
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getTemplatesByBusinessType = (businessType: string | null) => {
    const templateMap: Record<string, any[]> = {
      beauty: [
        {
          id: 'beauty-elegant',
          name: 'Elegant Beauty',
          preview: '/images/templates/beauty-elegant.jpg',
          features: ['Online Booking', 'Service Gallery', 'Staff Profiles', 'Price List'],
          popular: true,
        },
        {
          id: 'beauty-modern',
          name: 'Modern Spa',
          preview: '/images/templates/beauty-modern.jpg',
          features: ['Booking System', 'Treatment Menu', 'Customer Reviews'],
          popular: false,
        },
        {
          id: 'beauty-luxury',
          name: 'Luxury Salon',
          preview: '/images/templates/beauty-luxury.jpg',
          features: ['Premium Design', 'VIP Booking', 'Exclusive Gallery'],
          popular: false,
        },
      ],
      barbershop: [
        {
          id: 'barber-classic',
          name: 'Classic Cuts',
          preview: '/images/templates/barber-classic.jpg',
          features: ['Walk-in Queue', 'Barber Profiles', 'Price List', 'Reviews'],
          popular: true,
        },
        {
          id: 'barber-modern',
          name: 'Urban Barber',
          preview: '/images/templates/barber-modern.jpg',
          features: ['Online Booking', 'Style Gallery', 'Loyalty Program'],
          popular: false,
        },
      ],
      automotive: [
        {
          id: 'auto-professional',
          name: 'Professional Garage',
          preview: '/images/templates/auto-professional.jpg',
          features: ['Service Booking', 'Quote System', 'MOT Reminders'],
          popular: true,
        },
        {
          id: 'auto-modern',
          name: 'Modern Auto Care',
          preview: '/images/templates/auto-modern.jpg',
          features: ['Digital Inspection', 'Parts Catalog', 'Customer Portal'],
          popular: false,
        },
      ],
    };

    return templateMap[businessType || 'beauty'] || templateMap.beauty;
  };

  const templates = getTemplatesByBusinessType(selectedType);

  const handleNext = () => {
    if (!selectedTemplate) return;
    
    trackSignupComplete(selectedPlan || 'starter');
    trackEvent('signup_template_selected', {
      business_type: selectedType,
      plan: selectedPlan || 'unknown',
      template: selectedTemplate
    });

    const params = new URLSearchParams();
    if (selectedPlan) params.set('plan', selectedPlan);
    if (selectedType) params.set('type', selectedType);
    params.set('template', selectedTemplate);
    
    router.push(`/signup/complete?${params.toString()}`);
  };

  const handleBack = () => {
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/signup/account-setup?${params.toString()}`);
  };

  const openPreview = (templateId: string) => {
    setIsPreviewOpen(true);
    trackEvent('template_preview_opened', {
      template_id: templateId,
      business_type: selectedType
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-6xl w-full">
        <SignupProgress currentStep={4} totalSteps={5} />
        
        <motion.div 
          className="bg-white rounded-2xl shadow-large p-8 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Choose Your Template
            </h1>
            <p className="text-gray-600 text-lg">
              Pick a design that matches your brand. You can customize everything later.
            </p>
          </div>

          {/* Templates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-large cursor-pointer ${
                  selectedTemplate === template.id
                    ? 'border-brand-500 shadow-large scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                {/* Popular Badge */}
                {template.popular && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
                    Popular
                  </div>
                )}

                {/* Selected Indicator */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-4 left-4 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}

                {/* Template Preview */}
                <div className="aspect-[4/3] bg-gray-100 rounded-t-xl overflow-hidden relative">
                  {/* Mock Website Preview */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 p-4">
                    <div className="bg-white rounded shadow-soft h-full p-3">
                      {/* Header */}
                      <div className={`h-8 rounded mb-3 ${
                        template.id.includes('beauty') ? 'bg-gradient-to-r from-pink-400 to-rose-400' :
                        template.id.includes('barber') ? 'bg-gradient-to-r from-gray-600 to-gray-800' :
                        template.id.includes('auto') ? 'bg-gradient-to-r from-blue-500 to-blue-700' :
                        'bg-gradient-to-r from-brand-500 to-brand-700'
                      }`} />
                      
                      {/* Content Blocks */}
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-200 rounded w-3/4" />
                        <div className="h-2 bg-gray-200 rounded w-1/2" />
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="h-12 bg-gray-100 rounded" />
                          <div className="h-12 bg-gray-100 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview(template.id);
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Template Info */}
                <div className="p-6">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {template.name}
                  </h3>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Includes:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {template.features.map((feature: string, featureIndex: number) => (
                        <li key={featureIndex} className="flex items-center">
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Customization Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Fully Customizable
                </h4>
                <p className="text-blue-800 text-sm">
                  Don't worry about getting it perfect now. You can change colors, fonts, 
                  layout, and content anytime from your dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!selectedTemplate}
              size="lg"
              className="min-w-[140px]"
            >
              Continue Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Can't decide? You can always change your template later in your dashboard.
          </p>
        </div>
      </div>

      {/* Preview Modal would go here */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Template Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-8 text-center text-gray-500">
              Live preview would be loaded here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
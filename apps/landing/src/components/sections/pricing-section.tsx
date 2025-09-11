'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X, Crown, Zap, Building2, HelpCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for small businesses just getting started',
      monthlyPrice: 29,
      yearlyPrice: 24,
      popular: false,
      icon: Zap,
      color: 'blue',
      features: [
        'Professional website',
        'Online booking system',
        'Basic analytics',
        'Email support',
        '5GB storage',
        'Custom domain',
        'Mobile app access',
        'Basic templates',
      ],
      limits: [
        'Up to 100 bookings/month',
        '1 staff member',
        'Basic integrations',
      ],
      cta: 'Start Free Trial',
      href: '/signup?plan=starter',
    },
    {
      name: 'Professional',
      description: 'Everything you need to grow your business',
      monthlyPrice: 79,
      yearlyPrice: 65,
      popular: true,
      icon: Crown,
      color: 'brand',
      features: [
        'Everything in Starter',
        'E-commerce store',
        'Advanced analytics',
        'Priority support',
        '50GB storage',
        'Premium templates',
        'Marketing tools',
        'Customer reviews',
        'Staff management',
        'Automated reminders',
        'Payment processing',
        'Multi-location support',
      ],
      limits: [
        'Up to 1,000 bookings/month',
        'Up to 10 staff members',
        'All integrations',
      ],
      cta: 'Start Free Trial',
      href: '/signup?plan=professional',
    },
    {
      name: 'Enterprise',
      description: 'For established businesses with advanced needs',
      monthlyPrice: 199,
      yearlyPrice: 165,
      popular: false,
      icon: Building2,
      color: 'purple',
      features: [
        'Everything in Professional',
        'Multi-location support',
        'Advanced integrations',
        'Dedicated account manager',
        'Unlimited storage',
        'White-label options',
        'API access',
        'Custom development',
        'SLA guarantee',
        'Advanced reporting',
        'Custom workflows',
        'Priority onboarding',
      ],
      limits: [
        'Unlimited bookings',
        'Unlimited staff',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      href: '/contact?plan=enterprise',
    },
  ];

  const faqs = [
    {
      question: 'How long is the free trial?',
      answer: 'All plans come with a 14-day free trial. No credit card required to start, and you can cancel anytime during the trial period.',
    },
    {
      question: 'Can I change plans anytime?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and you\'ll only pay the difference.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and direct debit for UK businesses.',
    },
    {
      question: 'Is there a setup fee?',
      answer: 'No setup fees, ever. The price you see is all you pay. We also include free onboarding and migration assistance.',
    },
    {
      question: 'What happens if I exceed my booking limit?',
      answer: 'We\'ll send you a notification when you\'re approaching your limit. You can easily upgrade your plan or we\'ll automatically handle overflow bookings for a small additional fee.',
    },
    {
      question: 'Do you offer discounts for multiple locations?',
      answer: 'Yes! Enterprise plans include multi-location support, and we offer volume discounts for businesses with multiple locations. Contact sales for custom pricing.',
    },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavings = (plan: typeof plans[0]) => {
    const monthlyCost = plan.monthlyPrice * 12;
    const yearlyCost = plan.yearlyPrice * 12;
    return monthlyCost - yearlyCost;
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
          <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-4">
            Simple Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            14-day free trial. No setup fees. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-soft'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md font-medium transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow-soft'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              price={getPrice(plan)}
              savings={billingPeriod === 'yearly' ? getSavings(plan) : 0}
              billingPeriod={billingPeriod}
              index={index}
            />
          ))}
        </div>

        {/* Feature Comparison */}
        <FeatureComparison plans={plans} />

        {/* FAQ Section */}
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h3>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                    openFAQ === index ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {openFAQ === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div 
          className="mt-16 text-center bg-gradient-to-r from-brand-50 to-purple-50 rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our friendly team is here to help you choose the right plan for your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" size="lg">
              Schedule a Demo
            </Button>
            <Button variant="default" size="lg">
              Contact Sales
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

interface PricingCardProps {
  plan: typeof plans[0];
  price: number;
  savings: number;
  billingPeriod: 'monthly' | 'yearly';
  index: number;
}

function PricingCard({ plan, price, savings, billingPeriod, index }: PricingCardProps) {
  const colorMap = {
    blue: 'border-blue-200 bg-blue-50',
    brand: 'border-brand-200 bg-brand-50',
    purple: 'border-purple-200 bg-purple-50',
  };

  const buttonColorMap = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    brand: 'bg-brand-600 hover:bg-brand-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`relative bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-large ${
        plan.popular 
          ? `${colorMap[plan.color as keyof typeof colorMap]} shadow-large scale-105` 
          : 'border-gray-200 hover:border-gray-300 shadow-soft'
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 py-2 rounded-full text-sm font-medium">
            Most Popular
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 ${
            plan.popular ? 'bg-brand-600' : 'bg-gray-100'
          }`}>
            <plan.icon className={`w-8 h-8 ${plan.popular ? 'text-white' : 'text-gray-600'}`} />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
          <p className="text-gray-600 mb-6">{plan.description}</p>
          
          <div className="space-y-2">
            <div className="flex items-baseline justify-center">
              <span className="text-4xl font-bold text-gray-900">
                {formatPrice(price)}
              </span>
              <span className="text-gray-600 ml-2">
                /{billingPeriod === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            
            {billingPeriod === 'yearly' && savings > 0 && (
              <p className="text-green-600 font-medium">
                Save {formatPrice(savings)} per year
              </p>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <Button
          asChild
          className={`w-full mb-6 ${
            plan.popular 
              ? buttonColorMap[plan.color as keyof typeof buttonColorMap]
              : 'bg-gray-900 hover:bg-gray-800'
          }`}
          size="lg"
        >
          <Link href={plan.href}>{plan.cta}</Link>
        </Button>

        {/* Features */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">What's included:</h4>
          <ul className="space-y-3">
            {plan.features.map((feature, featureIndex) => (
              <li key={featureIndex} className="flex items-start">
                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
          
          {plan.limits.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Usage limits:</h5>
              <ul className="space-y-1">
                {plan.limits.map((limit, limitIndex) => (
                  <li key={limitIndex} className="text-sm text-gray-600">
                    • {limit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FeatureComparison({ plans }: { plans: any[] }) {
  const comparisonFeatures = [
    'Professional Website',
    'Online Booking',
    'E-commerce Store',
    'Analytics Dashboard',
    'Mobile App',
    'Email Support',
    'Priority Support',
    'Phone Support',
    'Custom Integrations',
    'White-label Options',
    'API Access',
    'Dedicated Account Manager',
  ];

  const hasFeature = (planName: string, feature: string) => {
    if (planName === 'Starter') {
      return ['Professional Website', 'Online Booking', 'Analytics Dashboard', 'Mobile App', 'Email Support'].includes(feature);
    }
    if (planName === 'Professional') {
      return !['White-label Options', 'API Access', 'Dedicated Account Manager'].includes(feature);
    }
    return true; // Enterprise has all features
  };

  return (
    <div className="mt-20 bg-gray-50 rounded-2xl p-8">
      <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
        Compare All Features
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 font-semibold text-gray-900">Features</th>
              {plans.map((plan) => (
                <th key={plan.name} className="text-center py-4 font-semibold text-gray-900 min-w-[120px]">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonFeatures.map((feature, index) => (
              <tr key={feature} className={index % 2 === 0 ? 'bg-white' : ''}>
                <td className="py-4 text-gray-700">{feature}</td>
                {plans.map((plan) => (
                  <td key={plan.name} className="text-center py-4">
                    {hasFeature(plan.name, feature) ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small businesses just getting started',
    monthlyPrice: 29,
    yearlyPrice: 24,
    popular: false,
    icon: Zap,
    color: 'blue',
    features: [
      'Professional website',
      'Online booking system',
      'Basic analytics',
      'Email support',
      '5GB storage',
      'Custom domain',
      'Mobile app access',
      'Basic templates',
    ],
    limits: [
      'Up to 100 bookings/month',
      '1 staff member',
      'Basic integrations',
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=starter',
  },
  {
    name: 'Professional',
    description: 'Everything you need to grow your business',
    monthlyPrice: 79,
    yearlyPrice: 65,
    popular: true,
    icon: Crown,
    color: 'brand',
    features: [
      'Everything in Starter',
      'E-commerce store',
      'Advanced analytics',
      'Priority support',
      '50GB storage',
      'Premium templates',
      'Marketing tools',
      'Customer reviews',
      'Staff management',
      'Automated reminders',
      'Payment processing',
      'Multi-location support',
    ],
    limits: [
      'Up to 1,000 bookings/month',
      'Up to 10 staff members',
      'All integrations',
    ],
    cta: 'Start Free Trial',
    href: '/signup?plan=professional',
  },
  {
    name: 'Enterprise',
    description: 'For established businesses with advanced needs',
    monthlyPrice: 199,
    yearlyPrice: 165,
    popular: false,
    icon: Building2,
    color: 'purple',
    features: [
      'Everything in Professional',
      'Multi-location support',
      'Advanced integrations',
      'Dedicated account manager',
      'Unlimited storage',
      'White-label options',
      'API access',
      'Custom development',
      'SLA guarantee',
      'Advanced reporting',
      'Custom workflows',
      'Priority onboarding',
    ],
    limits: [
      'Unlimited bookings',
      'Unlimited staff',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    href: '/contact?plan=enterprise',
  },
];
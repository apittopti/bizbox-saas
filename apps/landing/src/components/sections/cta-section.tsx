'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="section-padding bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(0deg,transparent,black,transparent)]" />
      </div>
      
      <div className="container mx-auto container-padding relative z-10">
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            Ready to Transform Your Business?
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Join 2,847+ UK Businesses Using BizBox
          </h2>
          
          <p className="text-xl text-blue-100 mb-8 leading-relaxed max-w-2xl mx-auto">
            Stop losing customers to competitors. Launch your professional online presence 
            and streamline your operations in under 10 minutes.
          </p>
          
          {/* Key Benefits */}
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: Clock, text: '10-minute setup' },
              { icon: Shield, text: '14-day free trial' },
              { icon: Sparkles, text: 'No contracts' },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                className="flex items-center justify-center space-x-2 text-blue-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <benefit.icon className="w-5 h-5" />
                <span className="font-medium">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
          
          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button 
              asChild 
              size="xl"
              className="bg-white text-brand-600 hover:bg-gray-50 shadow-large text-lg px-8 py-4"
            >
              <Link href="/signup" className="inline-flex items-center">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="xl"
              className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-4"
            >
              <Link href="/demo">
                Book a Demo
              </Link>
            </Button>
          </motion.div>
          
          {/* Trust Indicator */}
          <motion.p 
            className="text-blue-200 text-sm mt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            No credit card required • Cancel anytime • 99.9% uptime guarantee
          </motion.p>
        </motion.div>
      </div>
      
      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"
        animate={{ y: [-20, 20, -20] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"
        animate={{ y: [20, -20, 20] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </section>
  );
}
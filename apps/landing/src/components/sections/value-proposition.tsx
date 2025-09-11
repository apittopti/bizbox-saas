'use client';

import { motion } from 'framer-motion';
import { Zap, Users, TrendingUp, Shield, Clock, Smartphone } from 'lucide-react';

export function ValueProposition() {
  const benefits = [
    {
      icon: Zap,
      title: 'Launch in Minutes',
      description: 'Get your professional website live in under 10 minutes with our industry-specific templates.',
      color: 'bg-yellow-500',
      delay: 0,
    },
    {
      icon: Users,
      title: 'Manage Everything',
      description: 'Bookings, payments, staff, and customers - all in one powerful platform.',
      color: 'bg-blue-500',
      delay: 0.1,
    },
    {
      icon: TrendingUp,
      title: 'Grow Your Business',
      description: 'Built-in marketing tools and analytics to help you attract and retain customers.',
      color: 'bg-green-500',
      delay: 0.2,
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with SSL encryption, GDPR compliance, and regular backups.',
      color: 'bg-purple-500',
      delay: 0.3,
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Your business works around the clock with automatic booking and payment processing.',
      color: 'bg-orange-500',
      delay: 0.4,
    },
    {
      icon: Smartphone,
      title: 'Mobile-First Design',
      description: 'Perfect experience on all devices - desktop, tablet, and mobile.',
      color: 'bg-pink-500',
      delay: 0.5,
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
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut'
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
          <div className="inline-block px-4 py-2 bg-brand-100 text-brand-800 rounded-full text-sm font-medium mb-4">
            Why Choose BizBox?
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Everything Your Business Needs
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Stop juggling multiple tools. BizBox gives UK service businesses everything 
            they need to succeed online in one comprehensive platform.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} {...benefit} variants={itemVariants} />
          ))}
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="mt-20 bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">2,847+</div>
              <div className="text-brand-100">UK Businesses</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">98%</div>
              <div className="text-brand-100">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">50M+</div>
              <div className="text-brand-100">Bookings Processed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-2">£125M+</div>
              <div className="text-brand-100">Revenue Generated</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

interface BenefitCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  delay: number;
  variants: any;
}

function BenefitCard({ icon: Icon, title, description, color, variants }: BenefitCardProps) {
  return (
    <motion.div
      className="group p-8 rounded-xl border border-gray-200 hover:border-brand-200 hover:shadow-large transition-all duration-300 bg-white"
      variants={variants}
      whileHover={{ y: -5 }}
    >
      <div className={`w-14 h-14 ${color} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}
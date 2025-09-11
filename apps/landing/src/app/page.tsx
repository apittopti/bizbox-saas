import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/sections/hero-section';
import { ValueProposition } from '@/components/sections/value-proposition';
import { InteractiveDemo } from '@/components/sections/interactive-demo';
import { IndustryShowcase } from '@/components/sections/industry-showcase';
import { SocialProof } from '@/components/sections/social-proof';
import { PricingSection } from '@/components/sections/pricing-section';
import { CTASection } from '@/components/sections/cta-section';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Value Proposition */}
      <ValueProposition />
      
      {/* Interactive Demo */}
      <InteractiveDemo />
      
      {/* Industry Showcase */}
      <IndustryShowcase />
      
      {/* Social Proof & Testimonials */}
      <SocialProof />
      
      {/* Pricing */}
      <PricingSection />
      
      {/* Final CTA */}
      <CTASection />
      
      <Footer />
    </main>
  );
}
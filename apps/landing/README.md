# BizBox Landing Page

A high-converting, performance-optimized landing page for the BizBox platform, built with Next.js 15 and designed specifically for UK service businesses.

## ✨ Features

### 🎯 Landing Page Sections
- **Hero Section** - Compelling headline with interactive demo and trust indicators
- **Value Proposition** - Benefits showcase with animated cards and statistics  
- **Interactive Demo** - Tabbed interface showcasing core platform features
- **Industry Showcase** - Industry-specific templates and use cases
- **Social Proof** - Customer testimonials carousel with verified reviews
- **Pricing Section** - Transparent pricing with feature comparison and FAQ
- **Final CTA** - Conversion-optimized call-to-action

### 🚀 Sign-up Flow
- **Business Type Selection** - Industry-specific onboarding
- **Business Details** - Information collection with validation
- **Account Setup** - Secure account creation with password strength validation
- **Template Selection** - Industry-tailored template picker with preview
- **Completion** - Success page with next steps and onboarding guidance

### 🎨 Design & UX
- **Responsive Design** - Mobile-first approach with perfect tablet/desktop experience
- **Modern UI** - Clean, professional design with smooth animations
- **Accessibility** - WCAG compliant with keyboard navigation and screen reader support
- **Performance** - Optimized for Lighthouse 95+ score across all metrics

### 📈 Analytics & Conversion
- **Google Analytics 4** - Enhanced ecommerce tracking
- **Facebook Pixel** - Retargeting and conversion optimization
- **Hotjar Integration** - User behavior analysis
- **Custom Events** - Detailed funnel tracking throughout signup flow

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth interactions
- **Icons**: Lucide React for consistent iconography
- **Forms**: Custom validation with accessible error handling
- **Analytics**: GA4, Facebook Pixel, Hotjar integration
- **SEO**: Comprehensive metadata, sitemap, robots.txt

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── signup/            # Multi-step signup flow
│   │   ├── business-type/
│   │   ├── business-details/
│   │   ├── account-setup/
│   │   ├── template-selection/
│   │   └── complete/
│   ├── globals.css        # Global styles and Tailwind imports
│   ├── layout.tsx         # Root layout with SEO metadata
│   ├── page.tsx          # Landing page composition
│   ├── loading.tsx        # Loading UI
│   ├── error.tsx         # Error boundary
│   ├── not-found.tsx     # 404 page
│   ├── sitemap.ts        # SEO sitemap generation
│   ├── robots.ts         # SEO robots.txt
│   └── manifest.ts       # PWA manifest
├── components/
│   ├── sections/         # Landing page sections
│   │   ├── hero-section.tsx
│   │   ├── value-proposition.tsx
│   │   ├── interactive-demo.tsx
│   │   ├── industry-showcase.tsx
│   │   ├── social-proof.tsx
│   │   ├── pricing-section.tsx
│   │   └── cta-section.tsx
│   ├── layout/           # Layout components
│   │   ├── header.tsx
│   │   └── footer.tsx
│   ├── signup/           # Signup flow components
│   │   └── signup-progress.tsx
│   ├── ui/               # Reusable UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── hero-animation.tsx
│   │   ├── trust-indicators.tsx
│   │   └── video-modal.tsx
│   └── analytics.tsx     # Analytics integration
└── lib/
    └── utils.ts          # Utility functions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Access to BizBox workspace packages

### Installation

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   NEXT_PUBLIC_GA_ID=your_google_analytics_id
   NEXT_PUBLIC_FB_PIXEL_ID=your_facebook_pixel_id
   NEXT_PUBLIC_HOTJAR_ID=your_hotjar_id
   NEXT_PUBLIC_API_URL=https://api.bizbox.co.uk
   NEXT_PUBLIC_SITE_URL=https://bizbox.co.uk
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open application**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build & Deploy

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 🎨 Customization

### Design System
The landing page uses a comprehensive design system defined in `tailwind.config.js`:

- **Colors**: Brand colors with full palette (50-950 shades)
- **Typography**: Inter font with heading variants
- **Animations**: Custom keyframes for enhanced UX
- **Shadows**: Soft, medium, and large shadow variants
- **Spacing**: Consistent spacing scale

### Component Customization
All components are built with flexibility in mind:

- **Responsive Design**: Uses Tailwind's responsive utilities
- **Theme Support**: Built-in support for light/dark themes
- **Animation Control**: Framer Motion animations can be disabled for reduced motion
- **A/B Testing Ready**: Components support variant testing

### Content Management
Update content by modifying the data objects in each component:

```typescript
// Example: Update testimonials in social-proof.tsx
const testimonials = [
  {
    name: 'Your Customer',
    business: 'Their Business',
    quote: 'Their testimonial...',
    // ... other properties
  },
];
```

## 📊 Performance Optimizations

### Core Web Vitals
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Implemented Optimizations
- **Image Optimization**: Next.js Image component with WebP/AVIF
- **Code Splitting**: Automatic route-based code splitting
- **Bundle Analysis**: Optimized imports and tree shaking
- **Caching**: Aggressive caching strategies for static assets
- **Compression**: Gzip/Brotli compression enabled
- **Preloading**: Critical resources preloaded

### Lighthouse Score Targets
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

## 📈 Analytics & Tracking

### Conversion Funnel
1. **Page View**: Track initial landing page visits
2. **Signup Started**: User begins signup process
3. **Business Type Selected**: First step completion
4. **Business Details Completed**: Form submission
5. **Account Created**: User registration
6. **Template Selected**: Template choice
7. **Signup Completed**: Full funnel completion
8. **Trial Started**: User enters trial period

### Custom Events
```typescript
// Track custom events
trackEvent('demo_requested', {
  source: 'hero_section',
  business_type: 'beauty'
});

trackConversion('signup_complete', 79, 'GBP');
```

### A/B Testing
Ready for A/B testing implementation with:
- Component variants
- Feature flags via environment variables
- Analytics segmentation

## 🔒 Security & Privacy

### Data Protection
- **GDPR Compliant**: Cookie consent and data processing notices
- **Form Validation**: Client and server-side validation
- **XSS Protection**: Next.js built-in security headers
- **CSRF Protection**: Secure form handling

### Privacy Features
- **Cookie Consent**: Granular tracking consent
- **Data Minimization**: Only collect necessary information
- **Right to Deletion**: Account deletion capabilities
- **Transparency**: Clear privacy policy and terms

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm test:e2e
```

### Performance Testing
```bash
# Lighthouse CI
pnpm test:lighthouse

# Bundle analysis
pnpm analyze
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically on push to main

### Docker
```bash
# Build image
docker build -t bizbox-landing .

# Run container
docker run -p 3000:3000 bizbox-landing
```

### Custom Hosting
Build static files and serve with any web server:
```bash
pnpm build
pnpm export
```

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
- Ensure all workspace packages are properly installed
- Check TypeScript configuration compatibility
- Verify environment variables are set

**Performance Issues**
- Run `pnpm analyze` to check bundle size
- Ensure images are properly optimized
- Check network requests in dev tools

**Analytics Not Working**
- Verify environment variables are set correctly
- Check browser console for tracking errors
- Ensure ad blockers aren't interfering

## 📞 Support

- **Documentation**: [Internal Wiki](link-to-docs)
- **Issues**: Create GitHub issue with reproduction steps
- **Slack**: #frontend-team for quick questions

## 🔄 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request with detailed description

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Prettier**: Auto-formatting on save
- **Commit Messages**: Use conventional commits

---

Built with ❤️ by the BizBox team for UK service businesses.
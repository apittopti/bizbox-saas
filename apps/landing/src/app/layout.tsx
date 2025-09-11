import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Analytics } from '@/components/analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BizBox - Complete Business Platform for UK Service Businesses',
  description: 'Everything UK service businesses need: professional websites, online booking, e-commerce, and customer management. Start your free trial today.',
  keywords: 'UK business software, online booking system, website builder, e-commerce platform, service business management, beauty salon software, barbershop software, automotive garage software, personal trainer software',
  authors: [{ name: 'BizBox' }],
  creator: 'BizBox',
  publisher: 'BizBox',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://bizbox.co.uk'),
  openGraph: {
    title: 'BizBox - Complete Business Platform for UK Service Businesses',
    description: 'Professional websites, online booking, e-commerce, and customer management tools designed specifically for UK service businesses.',
    url: 'https://bizbox.co.uk',
    siteName: 'BizBox',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'BizBox - Complete Business Platform',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BizBox - Complete Business Platform',
    description: 'Professional websites and business tools for UK service businesses',
    creator: '@BizBoxUK',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
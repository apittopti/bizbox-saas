import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-brand-600 mb-4">404</div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Page Not Found
        </h1>
        
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/">
              Go to Homepage
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/signup">
              Start Free Trial
            </Link>
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Looking for something specific?</p>
          <div className="flex justify-center space-x-4 mt-2">
            <Link href="#features" className="text-brand-600 hover:underline">
              Features
            </Link>
            <Link href="#pricing" className="text-brand-600 hover:underline">
              Pricing
            </Link>
            <Link href="/contact" className="text-brand-600 hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
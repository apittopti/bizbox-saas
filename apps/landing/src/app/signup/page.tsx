'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to business type selection
    router.push('/signup/business-type');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-500"></div>
    </div>
  );
}
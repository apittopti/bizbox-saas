'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupRedirect() {
  useEffect(() => {
    // Redirect to business type selection
    redirect('/signup/business-type');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-500"></div>
    </div>
  );
}
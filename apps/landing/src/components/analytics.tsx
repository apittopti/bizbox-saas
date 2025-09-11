'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    fbq: (command: string, event: string, data?: any) => void;
  }
}

export function Analytics() {
  useEffect(() => {
    // Track page view
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, []);

  return (
    <>
      {/* Google Analytics */}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                page_location: window.location.href,
                page_title: document.title,
              });
            `}
          </Script>
        </>
      )}

      {/* Facebook Pixel */}
      {process.env.NEXT_PUBLIC_FB_PIXEL_ID && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* Hotjar */}
      {process.env.NEXT_PUBLIC_HOTJAR_ID && (
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:${process.env.NEXT_PUBLIC_HOTJAR_ID},hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
      )}
    </>
  );
}

// Analytics tracking functions
export function trackEvent(eventName: string, parameters: Record<string, any> = {}) {
  // Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }

  // Facebook Pixel
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters);
  }

  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', eventName, parameters);
  }
}

export function trackConversion(conversionType: string, value?: number, currency: string = 'GBP') {
  const parameters: Record<string, any> = {
    event_category: 'conversion',
    event_label: conversionType,
  };

  if (value !== undefined) {
    parameters.value = value;
    parameters.currency = currency;
  }

  trackEvent('conversion', parameters);
}

export function trackSignupStart(plan?: string) {
  trackEvent('begin_checkout', {
    event_category: 'signup',
    event_label: plan || 'unknown',
    content_name: 'signup_flow',
  });
}

export function trackSignupComplete(plan: string, value?: number) {
  trackConversion('signup_complete', value);
  trackEvent('sign_up', {
    method: 'email',
    content_name: plan,
  });
}

export function trackTrialStart(plan: string) {
  trackEvent('start_trial', {
    event_category: 'trial',
    event_label: plan,
    trial_days: 14,
  });
}

export function trackDemoRequest() {
  trackEvent('generate_lead', {
    event_category: 'lead',
    event_label: 'demo_request',
    content_name: 'landing_page_demo',
  });
}
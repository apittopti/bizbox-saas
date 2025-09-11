'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface AnalyticsContextValue {
  trackEvent: (event: AnalyticsEvent) => void;
  trackPageView: (path: string, title?: string) => void;
  trackConversion: (type: ConversionType, value?: number, metadata?: Record<string, any>) => void;
  setUserProperties: (properties: Record<string, any>) => void;
  isEnabled: boolean;
}

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

type ConversionType = 'booking' | 'purchase' | 'contact' | 'signup' | 'download' | 'call';

interface AnalyticsConfig {
  tenantId: string;
  isPreview: boolean;
  enableGA?: boolean;
  enableFacebook?: boolean;
  gaTrackingId?: string;
  fbPixelId?: string;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

interface AnalyticsProviderProps {
  tenantId: string;
  isPreview?: boolean;
  children: React.ReactNode;
  config?: Partial<AnalyticsConfig>;
}

export function AnalyticsProvider({ 
  tenantId, 
  isPreview = false, 
  children, 
  config = {} 
}: AnalyticsProviderProps) {
  const [isEnabled, setIsEnabled] = useState(!isPreview);
  const [isInitialized, setIsInitialized] = useState(false);
  const sessionId = useRef(generateSessionId());
  const userId = useRef<string | null>(null);
  const eventQueue = useRef<any[]>([]);

  const analyticsConfig: AnalyticsConfig = {
    tenantId,
    isPreview,
    enableGA: true,
    enableFacebook: true,
    ...config,
  };

  useEffect(() => {
    if (isPreview) return;

    // Initialize analytics
    initializeAnalytics();
    
    // Check for user consent
    checkConsentStatus();

    // Set up page visibility change tracking
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up beforeunload tracking
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tenantId, isPreview]);

  const initializeAnalytics = async () => {
    try {
      // Get or create user ID
      userId.current = getUserId();

      // Load tenant analytics configuration
      const configResponse = await fetch(`/api/analytics/config/${tenantId}`);
      if (configResponse.ok) {
        const tenantConfig = await configResponse.json();
        
        // Initialize Google Analytics
        if (tenantConfig.googleAnalytics?.enabled && tenantConfig.googleAnalytics?.trackingId) {
          await initializeGoogleAnalytics(tenantConfig.googleAnalytics.trackingId);
        }

        // Initialize Facebook Pixel
        if (tenantConfig.facebookPixel?.enabled && tenantConfig.facebookPixel?.pixelId) {
          initializeFacebookPixel(tenantConfig.facebookPixel.pixelId);
        }

        // Initialize other tracking services
        if (tenantConfig.customTracking) {
          initializeCustomTracking(tenantConfig.customTracking);
        }
      }

      setIsInitialized(true);
      
      // Process queued events
      processEventQueue();

    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  };

  const checkConsentStatus = () => {
    const consent = localStorage.getItem('analytics-consent');
    if (consent === 'denied') {
      setIsEnabled(false);
    }
  };

  const trackEvent = (event: AnalyticsEvent) => {
    if (!isEnabled || isPreview) return;

    const enrichedEvent = {
      ...event,
      tenantId,
      sessionId: sessionId.current,
      userId: userId.current,
      timestamp: Date.now(),
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    if (!isInitialized) {
      eventQueue.current.push(enrichedEvent);
      return;
    }

    // Send to our analytics API
    sendAnalyticsEvent(enrichedEvent);

    // Send to external services
    sendToExternalServices(enrichedEvent);
  };

  const trackPageView = (path: string, title?: string) => {
    if (!isEnabled || isPreview) return;

    const pageViewEvent = {
      action: 'page_view',
      category: 'navigation',
      label: path,
      metadata: {
        title: title || document.title,
        path,
        search: window.location.search,
        hash: window.location.hash,
      },
    };

    trackEvent(pageViewEvent);

    // Update session data
    updateSessionData(path);
  };

  const trackConversion = (type: ConversionType, value?: number, metadata?: Record<string, any>) => {
    if (!isEnabled || isPreview) return;

    const conversionEvent = {
      action: 'conversion',
      category: type,
      value,
      metadata: {
        ...metadata,
        conversionType: type,
        timestamp: Date.now(),
      },
    };

    trackEvent(conversionEvent);

    // Send specific conversion events to external services
    sendConversionToExternalServices(type, value, metadata);
  };

  const setUserProperties = (properties: Record<string, any>) => {
    if (!isEnabled || isPreview) return;

    // Update user properties in external services
    if (typeof gtag !== 'undefined') {
      gtag('config', analyticsConfig.gaTrackingId!, {
        custom_map: properties,
      });
    }

    if (typeof fbq !== 'undefined') {
      fbq('setUserProperties', properties);
    }
  };

  const sendAnalyticsEvent = async (event: any) => {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch (error) {
      console.debug('Failed to send analytics event:', error);
    }
  };

  const sendToExternalServices = (event: any) => {
    // Google Analytics
    if (typeof gtag !== 'undefined' && analyticsConfig.enableGA) {
      gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_parameters: event.metadata,
      });
    }

    // Facebook Pixel
    if (typeof fbq !== 'undefined' && analyticsConfig.enableFacebook) {
      const fbEvent = mapToFacebookEvent(event);
      if (fbEvent) {
        fbq('track', fbEvent.name, fbEvent.parameters);
      }
    }
  };

  const sendConversionToExternalServices = (
    type: ConversionType, 
    value?: number, 
    metadata?: Record<string, any>
  ) => {
    // Google Analytics Enhanced Ecommerce
    if (typeof gtag !== 'undefined') {
      const gaEvent = mapToGoogleAnalyticsConversion(type, value, metadata);
      if (gaEvent) {
        gtag('event', gaEvent.action, gaEvent.parameters);
      }
    }

    // Facebook Pixel Conversions
    if (typeof fbq !== 'undefined') {
      const fbEvent = mapToFacebookConversion(type, value, metadata);
      if (fbEvent) {
        fbq('track', fbEvent.name, fbEvent.parameters);
      }
    }
  };

  const processEventQueue = () => {
    if (eventQueue.current.length === 0) return;

    eventQueue.current.forEach(event => {
      sendAnalyticsEvent(event);
      sendToExternalServices(event);
    });

    eventQueue.current = [];
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      trackEvent({
        action: 'page_hidden',
        category: 'engagement',
        metadata: {
          timeOnPage: Date.now() - (window as any).__pageStartTime,
        },
      });
    } else {
      trackEvent({
        action: 'page_visible',
        category: 'engagement',
      });
      (window as any).__pageStartTime = Date.now();
    }
  };

  const handleBeforeUnload = () => {
    trackEvent({
      action: 'page_unload',
      category: 'engagement',
      metadata: {
        timeOnPage: Date.now() - (window as any).__pageStartTime,
      },
    });
  };

  const updateSessionData = (path: string) => {
    const sessionData = {
      lastPath: path,
      lastUpdate: Date.now(),
    };
    
    sessionStorage.setItem('analytics-session', JSON.stringify(sessionData));
  };

  const contextValue: AnalyticsContextValue = {
    trackEvent,
    trackPageView,
    trackConversion,
    setUserProperties,
    isEnabled,
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
      {!isPreview && <AnalyticsScripts config={analyticsConfig} />}
    </AnalyticsContext.Provider>
  );
}

// Analytics scripts component
function AnalyticsScripts({ config }: { config: AnalyticsConfig }) {
  useEffect(() => {
    // Initialize page start time
    (window as any).__pageStartTime = Date.now();
  }, []);

  return null; // Scripts are loaded dynamically in initializeAnalytics
}

// Utility functions
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getUserId(): string {
  let userId = localStorage.getItem('analytics-user-id');
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics-user-id', userId);
  }
  return userId;
}

async function initializeGoogleAnalytics(trackingId: string) {
  if (typeof gtag !== 'undefined') return;

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);

  // Initialize gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function() {
    (window as any).dataLayer.push(arguments);
  };

  const gtag = (window as any).gtag;
  gtag('js', new Date());
  gtag('config', trackingId, {
    anonymize_ip: true,
    respect_dnt: true,
  });
}

function initializeFacebookPixel(pixelId: string) {
  if (typeof fbq !== 'undefined') return;

  // Initialize Facebook Pixel
  !(function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  (window as any).fbq('init', pixelId);
  (window as any).fbq('track', 'PageView');
}

function initializeCustomTracking(config: any) {
  // Initialize custom tracking scripts based on tenant configuration
  config.scripts?.forEach((script: any) => {
    if (script.enabled && script.src) {
      const scriptElement = document.createElement('script');
      scriptElement.src = script.src;
      scriptElement.async = true;
      document.head.appendChild(scriptElement);
    }
  });
}

function mapToFacebookEvent(event: any) {
  const mapping: Record<string, string> = {
    'page_view': 'PageView',
    'add_to_cart': 'AddToCart',
    'purchase': 'Purchase',
    'contact': 'Contact',
    'booking': 'Schedule',
    'signup': 'CompleteRegistration',
  };

  const fbEventName = mapping[event.action];
  if (!fbEventName) return null;

  return {
    name: fbEventName,
    parameters: {
      content_name: event.label,
      value: event.value,
      currency: 'GBP',
      ...event.metadata,
    },
  };
}

function mapToGoogleAnalyticsConversion(type: ConversionType, value?: number, metadata?: Record<string, any>) {
  const mapping: Record<ConversionType, string> = {
    booking: 'book_appointment',
    purchase: 'purchase',
    contact: 'generate_lead',
    signup: 'sign_up',
    download: 'download',
    call: 'call',
  };

  return {
    action: mapping[type],
    parameters: {
      event_category: 'conversion',
      event_label: type,
      value,
      currency: 'GBP',
      ...metadata,
    },
  };
}

function mapToFacebookConversion(type: ConversionType, value?: number, metadata?: Record<string, any>) {
  const mapping: Record<ConversionType, string> = {
    booking: 'Schedule',
    purchase: 'Purchase',
    contact: 'Contact',
    signup: 'CompleteRegistration',
    download: 'Download',
    call: 'Contact',
  };

  return {
    name: mapping[type],
    parameters: {
      value,
      currency: 'GBP',
      ...metadata,
    },
  };
}

// React hook to use analytics
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

// Higher-order component for automatic event tracking
export function withAnalytics<T extends {}>(
  Component: React.ComponentType<T>,
  eventConfig: Partial<AnalyticsEvent>
) {
  return function AnalyticsWrappedComponent(props: T) {
    const { trackEvent } = useAnalytics();

    useEffect(() => {
      trackEvent({
        action: 'component_view',
        category: 'engagement',
        ...eventConfig,
      });
    }, []);

    return <Component {...props} />;
  };
}

// Export types
export type { AnalyticsEvent, ConversionType, AnalyticsContextValue };
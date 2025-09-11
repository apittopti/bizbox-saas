'use client';

import React, { useEffect, useRef } from 'react';

interface PerformanceMonitorProps {
  tenantId: string;
  path: string;
  children: React.ReactNode;
}

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

export function PerformanceMonitor({ tenantId, path, children }: PerformanceMonitorProps) {
  const metricsRef = useRef<PerformanceMetrics>({});
  const observersRef = useRef<PerformanceObserver[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'development') {
      return;
    }

    const observers: PerformanceObserver[] = [];

    // Observe paint metrics (FCP, LCP)
    if ('PerformanceObserver' in window) {
      try {
        // First Contentful Paint & Largest Contentful Paint
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              if (entry.name === 'first-contentful-paint') {
                metricsRef.current.fcp = entry.startTime;
                sendMetric('FCP', entry.startTime);
              }
            } else if (entry.entryType === 'largest-contentful-paint') {
              metricsRef.current.lcp = entry.startTime;
              sendMetric('LCP', entry.startTime);
            }
          }
        });

        paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        observers.push(paintObserver);

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'first-input') {
              const fid = entry.processingStart - entry.startTime;
              metricsRef.current.fid = fid;
              sendMetric('FID', fid);
            }
          }
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        observers.push(fidObserver);

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift') {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
          }
          
          if (clsValue > 0) {
            metricsRef.current.cls = clsValue;
            sendMetric('CLS', clsValue);
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observers.push(clsObserver);

      } catch (error) {
        console.warn('Performance monitoring not supported:', error);
      }
    }

    // Monitor Time to First Byte
    if ('performance' in window && 'getEntriesByType' in performance) {
      const measureTTFB = () => {
        const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const ttfb = navigationEntries[0].responseStart - navigationEntries[0].requestStart;
          metricsRef.current.ttfb = ttfb;
          sendMetric('TTFB', ttfb);
        }
      };

      if (document.readyState === 'complete') {
        measureTTFB();
      } else {
        window.addEventListener('load', measureTTFB);
      }
    }

    // Monitor resource loading performance
    monitorResourcePerformance();

    // Monitor memory usage (if available)
    monitorMemoryUsage();

    observersRef.current = observers;

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [tenantId, path]);

  const sendMetric = async (metricName: string, value: number) => {
    try {
      // Debounce metric sending
      await new Promise(resolve => setTimeout(resolve, 100));

      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          path,
          metric: metricName,
          value: Math.round(value),
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          connection: getConnectionInfo(),
          viewport: getViewportInfo(),
        }),
      });
    } catch (error) {
      // Fail silently - don't impact user experience
      console.debug('Failed to send performance metric:', error);
    }
  };

  const monitorResourcePerformance = () => {
    if (!('PerformanceObserver' in window)) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const resources = list.getEntries().filter((entry) => {
          // Focus on important resources
          return entry.name.includes('.css') || 
                 entry.name.includes('.js') || 
                 entry.name.includes('.woff') ||
                 entry.name.includes('/api/');
        });

        resources.forEach((resource) => {
          const loadTime = resource.responseEnd - resource.startTime;
          if (loadTime > 1000) { // Only report slow resources (>1s)
            sendSlowResourceMetric(resource.name, loadTime);
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      observersRef.current.push(resourceObserver);
    } catch (error) {
      console.warn('Resource performance monitoring not supported:', error);
    }
  };

  const monitorMemoryUsage = () => {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // > 50MB
        sendMetric('MEMORY_HIGH', memory.usedJSHeapSize / 1024 / 1024);
      }
    };

    // Check memory usage every 30 seconds
    const interval = setInterval(checkMemory, 30000);
    
    return () => clearInterval(interval);
  };

  const sendSlowResourceMetric = async (resourceName: string, loadTime: number) => {
    try {
      await fetch('/api/analytics/slow-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          path,
          resource: resourceName,
          loadTime: Math.round(loadTime),
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.debug('Failed to send slow resource metric:', error);
    }
  };

  return <>{children}</>;
}

function getConnectionInfo() {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
    };
  }
  return null;
}

function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

// Performance monitoring utilities
export class PerformanceUtils {
  static markStart(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  static markEnd(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name, 'measure')[0];
        return measure.duration;
      } catch (error) {
        console.debug('Performance measure failed:', error);
      }
    }
    return 0;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.markStart(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.markEnd(name);
    }
  }

  static measure<T>(name: string, fn: () => T): T {
    this.markStart(name);
    try {
      const result = fn();
      return result;
    } finally {
      this.markEnd(name);
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(name: string) {
  const startTimeRef = useRef<number>();

  const start = () => {
    startTimeRef.current = performance.now();
    PerformanceUtils.markStart(name);
  };

  const end = () => {
    const duration = PerformanceUtils.markEnd(name);
    return duration;
  };

  const measure = <T>(fn: () => T): T => {
    return PerformanceUtils.measure(name, fn);
  };

  const measureAsync = async <T>(fn: () => Promise<T>): Promise<T> => {
    return PerformanceUtils.measureAsync(name, fn);
  };

  return { start, end, measure, measureAsync };
}
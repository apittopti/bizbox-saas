'use client';

import React, { useEffect, useState } from 'react';
import { useAnalytics } from '../components/core/AnalyticsProvider';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [isReporting, setIsReporting] = useState(false);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    // Log error to analytics
    trackEvent({
      action: 'error_boundary_triggered',
      category: 'error',
      label: error.message,
      metadata: {
        stack: error.stack,
        digest: error.digest,
        timestamp: Date.now(),
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', error);
    }
  }, [error, trackEvent]);

  const handleReportError = async () => {
    setIsReporting(true);
    
    try {
      await fetch('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    } finally {
      setIsReporting(false);
    }
  };

  const getErrorType = (error: Error): string => {
    if (error.message.includes('ChunkLoadError')) {
      return 'chunk_load';
    }
    if (error.message.includes('NetworkError')) {
      return 'network';
    }
    if (error.message.includes('TypeError')) {
      return 'type';
    }
    if (error.message.includes('ReferenceError')) {
      return 'reference';
    }
    return 'unknown';
  };

  const getErrorSuggestion = (errorType: string): string => {
    switch (errorType) {
      case 'chunk_load':
        return 'This might be caused by a network issue or an outdated version. Try refreshing the page.';
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'type':
        return 'This appears to be a data processing issue. Please try again or contact support.';
      case 'reference':
        return 'Something unexpected happened. Please refresh the page and try again.';
      default:
        return 'An unexpected error occurred. Please try refreshing the page.';
    }
  };

  const errorType = getErrorType(error);
  const suggestion = getErrorSuggestion(errorType);

  return (
    <div className="error-boundary">
      <div className="error-content">
        <div className="error-icon">
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        
        <h1>Oops! Something went wrong</h1>
        
        <p className="error-message">
          {suggestion}
        </p>
        
        <div className="error-actions">
          <button 
            onClick={reset}
            className="retry-button"
          >
            Try Again
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="refresh-button"
          >
            Refresh Page
          </button>
          
          <button 
            onClick={handleReportError}
            disabled={isReporting}
            className="report-button"
          >
            {isReporting ? 'Reporting...' : 'Report Issue'}
          </button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="error-details">
            <summary>Error Details (Development)</summary>
            <div className="error-stack">
              <h3>Error Message:</h3>
              <p>{error.message}</p>
              
              {error.digest && (
                <>
                  <h3>Error Digest:</h3>
                  <p>{error.digest}</p>
                </>
              )}
              
              <h3>Stack Trace:</h3>
              <pre>{error.stack}</pre>
            </div>
          </details>
        )}
        
        <div className="error-help">
          <h3>Need Help?</h3>
          <p>If this problem persists, please contact our support team:</p>
          <ul>
            <li>Email: <a href="mailto:support@bizbox.com">support@bizbox.com</a></li>
            <li>Include the error details above if possible</li>
          </ul>
        </div>
      </div>
      
      <style jsx>{`
        .error-boundary {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: system-ui, sans-serif;
        }
        
        .error-content {
          max-width: 600px;
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 3rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .error-icon {
          margin-bottom: 2rem;
          color: #fbbf24;
        }
        
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }
        
        .error-message {
          font-size: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0.9;
          line-height: 1.6;
        }
        
        .error-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        
        button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .retry-button {
          background: #10b981;
          color: white;
        }
        
        .retry-button:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        
        .refresh-button {
          background: #3b82f6;
          color: white;
        }
        
        .refresh-button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .report-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .report-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        
        .report-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .error-details {
          margin: 2rem 0;
          text-align: left;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 1rem;
        }
        
        .error-details summary {
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .error-stack {
          font-size: 0.9rem;
        }
        
        .error-stack h3 {
          margin: 1rem 0 0.5rem 0;
          font-size: 1rem;
        }
        
        .error-stack pre {
          white-space: pre-wrap;
          word-break: break-word;
          background: rgba(0, 0, 0, 0.5);
          padding: 1rem;
          border-radius: 4px;
          font-size: 0.8rem;
          overflow-x: auto;
        }
        
        .error-help {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .error-help h3 {
          margin-bottom: 1rem;
        }
        
        .error-help ul {
          text-align: left;
          margin: 1rem 0;
        }
        
        .error-help li {
          margin: 0.5rem 0;
        }
        
        .error-help a {
          color: #60a5fa;
          text-decoration: none;
        }
        
        .error-help a:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 640px) {
          .error-content {
            padding: 2rem;
          }
          
          h1 {
            font-size: 2rem;
          }
          
          .error-actions {
            flex-direction: column;
            align-items: center;
          }
          
          button {
            width: 100%;
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
}
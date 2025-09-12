'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="error-code">
          <span>4</span>
          <div className="zero">
            <div className="zero-inner"></div>
          </div>
          <span>4</span>
        </div>
        
        <h1>Page Not Found</h1>
        
        <p className="error-description">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        
        <div className="suggestions">
          <h2>What can you do?</h2>
          <ul>
            <li>Check the URL for any typos</li>
            <li>Go back to the previous page</li>
            <li>Visit our homepage</li>
            <li>Contact the business owner if you think this is an error</li>
          </ul>
        </div>
        
        <div className="actions">
          <Link href="/" className="home-button">
            Go to Homepage
          </Link>
          
          <button 
            onClick={() => window.history.back()} 
            className="back-button"
          >
            Go Back
          </button>
        </div>
        
        <div className="help-section">
          <p>
            Still having trouble? Contact support at{' '}
            <a href="mailto:support@bizbox.com">support@bizbox.com</a>
          </p>
        </div>
      </div>
      
      <style jsx>{`
        .not-found-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: system-ui, sans-serif;
        }
        
        .not-found-content {
          max-width: 500px;
          text-align: center;
          animation: fadeInUp 0.6s ease-out;
        }
        
        .error-code {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 2rem;
          font-size: 6rem;
          font-weight: 900;
          line-height: 1;
        }
        
        .error-code span {
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .zero {
          margin: 0 1rem;
          width: 80px;
          height: 80px;
          border: 6px solid currentColor;
          border-radius: 50%;
          position: relative;
          animation: spin 3s linear infinite;
        }
        
        .zero-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 40px;
          height: 40px;
          border: 3px solid currentColor;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: spin 2s linear infinite reverse;
        }
        
        h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          font-weight: 700;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .error-description {
          font-size: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0.9;
          line-height: 1.6;
        }
        
        .suggestions {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: left;
        }
        
        .suggestions h2 {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          color: #fbbf24;
        }
        
        .suggestions ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .suggestions li {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
          position: relative;
        }
        
        .suggestions li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: #fbbf24;
          font-weight: bold;
        }
        
        .actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        
        .home-button,
        .back-button {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }
        
        .home-button {
          background: #10b981;
          color: white;
        }
        
        .home-button:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .back-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .back-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
        }
        
        .help-section {
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 0.9rem;
          opacity: 0.8;
        }
        
        .help-section a {
          color: #60a5fa;
          text-decoration: none;
        }
        
        .help-section a:hover {
          text-decoration: underline;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @media (max-width: 640px) {
          .not-found-content {
            padding: 1rem;
          }
          
          .error-code {
            font-size: 4rem;
          }
          
          .zero {
            width: 60px;
            height: 60px;
            margin: 0 0.5rem;
          }
          
          .zero-inner {
            width: 30px;
            height: 30px;
          }
          
          h1 {
            font-size: 2rem;
          }
          
          .actions {
            flex-direction: column;
            align-items: center;
          }
          
          .home-button,
          .back-button {
            width: 100%;
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
}
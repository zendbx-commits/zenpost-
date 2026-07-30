import { useState, useEffect } from 'react';
import './WebsiteAnalysisView.css';

const WebsiteAnalysisView = ({ websiteInfo, onComplete, onBack }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    performAnalysis();
  }, []);

  const performAnalysis = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Call backend API
      const response = await fetch('http://localhost:8000/api/analyze-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: websiteInfo.websiteUrl,
          business_name: websiteInfo.businessName,
          description: websiteInfo.businessDescription,
          industry: websiteInfo.industry,
          target_audience: websiteInfo.targetAudience
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Failed to analyze website');
      }

      const data = await response.json();
      setProgress(100);
      
      setTimeout(() => {
        setAnalysis(data.analysis);
        setIsAnalyzing(false);
      }, 500);

    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.message);
      setIsAnalyzing(false);
    }
  };

  const handleContinue = () => {
    onComplete(analysis);
  };

  const handleRetry = () => {
    performAnalysis();
  };

  if (error) {
    return (
      <div className="analysis-view">
        <div className="analysis-card card">
          <div className="error-state">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Analysis Failed</h2>
            <p>{error}</p>
            <div className="error-actions">
              <button className="btn btn-secondary" onClick={onBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Go Back
              </button>
              <button className="btn btn-primary" onClick={handleRetry}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="analysis-view">
        <div className="analysis-card card">
          <div className="analyzing-state">
            <div className="analysis-spinner">
              <svg className="spinner-circle" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--border-color)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="var(--accent-purple)"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * progress) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="spinner-content">
                <div className="progress-value">{progress}%</div>
                <div className="progress-label">Analyzing</div>
              </div>
            </div>
            
            <h2 className="analyzing-title">Analyzing Your Website</h2>
            <p className="analyzing-subtitle">This will take about 30 seconds...</p>
            
            <div className="analysis-stages">
              <div className={`stage ${progress >= 25 ? 'completed' : 'active'}`}>
                <div className="stage-icon">
                  {progress >= 25 ? '✓' : '○'}
                </div>
                <div className="stage-text">Crawling website content</div>
              </div>
              <div className={`stage ${progress >= 50 ? 'completed' : progress >= 25 ? 'active' : ''}`}>
                <div className="stage-icon">
                  {progress >= 50 ? '✓' : '○'}
                </div>
                <div className="stage-text">Extracting brand information</div>
              </div>
              <div className={`stage ${progress >= 75 ? 'completed' : progress >= 50 ? 'active' : ''}`}>
                <div className="stage-icon">
                  {progress >= 75 ? '✓' : '○'}
                </div>
                <div className="stage-text">Analyzing tone and style</div>
              </div>
              <div className={`stage ${progress >= 90 ? 'completed' : progress >= 75 ? 'active' : ''}`}>
                <div className="stage-icon">
                  {progress >= 90 ? '✓' : '○'}
                </div>
                <div className="stage-text">Generating insights</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-view">
      <div className="analysis-card card">
        <div className="analysis-header">
          <div className="success-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Analysis Complete</span>
          </div>
          <h2 className="analysis-title">Website Analysis Results</h2>
          <p className="analysis-subtitle">
            We've analyzed your website and extracted key information about your brand
          </p>
        </div>

        <div className="analysis-content">
          {/* Business Type */}
          <div className="analysis-section">
            <h3 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Business Type
            </h3>
            <p className="section-content">{analysis?.business_type || websiteInfo.industry || 'Professional Services'}</p>
          </div>

          {/* Products/Services */}
          <div className="analysis-section">
            <h3 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Products & Services
            </h3>
            <div className="tags-list">
              {(analysis?.products_services || ['Digital Services', 'Consulting', 'Solutions']).map((item, index) => (
                <span key={index} className="tag">{item}</span>
              ))}
            </div>
          </div>

          {/* Brand Voice */}
          <div className="analysis-section">
            <h3 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Brand Voice & Tone
            </h3>
            <p className="section-content">{analysis?.brand_voice || 'Professional, informative, and engaging with a focus on building trust and authority'}</p>
          </div>

          {/* Key Messages */}
          <div className="analysis-section">
            <h3 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Key Messages
            </h3>
            <ul className="key-messages-list">
              {(analysis?.key_messages || [
                'Innovative solutions for modern challenges',
                'Customer-focused approach',
                'Proven track record of success'
              ]).map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </div>

          {/* Target Audience */}
          <div className="analysis-section">
            <h3 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Target Audience
            </h3>
            <p className="section-content">{analysis?.target_audience || websiteInfo.targetAudience || 'Business professionals, decision-makers, and entrepreneurs'}</p>
          </div>
        </div>

        <div className="analysis-footer">
          <button className="btn btn-secondary" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button className="btn btn-primary btn-large" onClick={handleContinue}>
            Continue to Marketing Intelligence
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebsiteAnalysisView;

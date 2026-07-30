import { useState, useEffect } from 'react';
import './MarketingIntelligenceView.css';

const MarketingIntelligenceView = ({ websiteInfo, analysis, onComplete, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [intelligence, setIntelligence] = useState(null);

  useEffect(() => {
    generateIntelligence();
  }, []);

  const generateIntelligence = async () => {
    setIsGenerating(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 500);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    clearInterval(progressInterval);
    setProgress(100);

    // Mock intelligence data
    const mockIntelligence = {
      target_personas: [
        { name: 'Business Owners', description: 'Small to medium business owners looking to grow their online presence', age: '35-50' },
        { name: 'Marketing Managers', description: 'Marketing professionals seeking efficient content solutions', age: '28-45' }
      ],
      content_pillars: ['Industry Insights', 'Tips & Tutorials', 'Success Stories', 'Product Updates'],
      platforms: [
        { name: 'LinkedIn', reason: 'Professional audience', priority: 'High' },
        { name: 'Instagram', reason: 'Visual content engagement', priority: 'Medium' },
        { name: 'Twitter', reason: 'Quick updates and news', priority: 'Medium' }
      ],
      posting_times: ['Monday-Friday, 9:00 AM', 'Wednesday, 3:00 PM', 'Friday, 11:00 AM'],
      hashtag_strategy: ['#BusinessGrowth', '#MarketingTips', '#DigitalMarketing', '#SmallBusiness'],
      campaign_ideas: [
        'Weekly Tips Series',
        'Customer Success Stories',
        'Behind the Scenes',
        'Product Feature Highlights'
      ]
    };

    setTimeout(() => {
      setIntelligence(mockIntelligence);
      setIsGenerating(false);
    }, 500);
  };

  const handleContinue = () => {
    onComplete(intelligence);
  };

  if (isGenerating) {
    return (
      <div className="intelligence-view">
        <div className="intelligence-card card">
          <div className="generating-state">
            <div className="progress-ring">
              <svg className="progress-svg" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--accent-purple)"
                  strokeWidth="8"
                  strokeDasharray="339.292"
                  strokeDashoffset={339.292 - (339.292 * progress) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="progress-text">
                <div className="progress-percent">{progress}%</div>
              </div>
            </div>
            <h2>Generating Marketing Intelligence</h2>
            <p>Analyzing your market, competitors, and opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligence-view">
      <div className="intelligence-card card">
        <div className="intelligence-header">
          <div className="success-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Intelligence Generated
          </div>
          <h2>Marketing Intelligence</h2>
          <p>Actionable insights tailored to your business</p>
        </div>

        <div className="intelligence-content">
          {/* Target Personas */}
          <div className="intelligence-section">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Target Personas
            </h3>
            <div className="personas-grid">
              {intelligence.target_personas.map((persona, idx) => (
                <div key={idx} className="persona-card">
                  <h4>{persona.name}</h4>
                  <p>{persona.description}</p>
                  <span className="persona-age">Age: {persona.age}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Pillars */}
          <div className="intelligence-section">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Content Pillars
            </h3>
            <div className="pillars-list">
              {intelligence.content_pillars.map((pillar, idx) => (
                <div key={idx} className="pillar-tag">{pillar}</div>
              ))}
            </div>
          </div>

          {/* Platform Recommendations */}
          <div className="intelligence-section">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Recommended Platforms
            </h3>
            <div className="platforms-list">
              {intelligence.platforms.map((platform, idx) => (
                <div key={idx} className="platform-item">
                  <div className="platform-header">
                    <span className="platform-name">{platform.name}</span>
                    <span className={`priority-badge ${platform.priority.toLowerCase()}`}>{platform.priority}</span>
                  </div>
                  <p>{platform.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hashtag Strategy */}
          <div className="intelligence-section">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Hashtag Strategy
            </h3>
            <div className="hashtags-list">
              {intelligence.hashtag_strategy.map((tag, idx) => (
                <span key={idx} className="hashtag">{tag}</span>
              ))}
            </div>
          </div>

          {/* Campaign Ideas */}
          <div className="intelligence-section">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Campaign Ideas
            </h3>
            <ul className="campaigns-list">
              {intelligence.campaign_ideas.map((idea, idx) => (
                <li key={idx}>{idea}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="intelligence-footer">
          <button className="btn btn-secondary" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button className="btn btn-primary btn-large" onClick={handleContinue}>
            Generate Content Calendar
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketingIntelligenceView;

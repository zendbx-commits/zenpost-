import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateMarketingIntelligenceFromAnalysis } from '../services/marketingIntelligenceService';
import Preloader from '../components/Preloader';
import '../theme-blue-black.css';
import './MarketingIntelligence.css';

export default function MarketingIntelligence() {
  const navigate = useNavigate();
  const location = useLocation();
  const { websiteAnalysis } = location.state || {};

  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('business');
  const [generatingCalendar, setGeneratingCalendar] = useState(false);

  useEffect(() => {
    if (!websiteAnalysis) {
      navigate('/websites');
      return;
    }

    generateIntelligence();
  }, []);

  const generateIntelligence = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Calling Marketing Intelligence API...');
      console.log('Website Analysis:', websiteAnalysis);
      
      // Extract user_id from websiteAnalysis
      const user_id = websiteAnalysis?.user_id || websiteAnalysis?.metadata?.user_id;
      
      const result = await generateMarketingIntelligenceFromAnalysis(websiteAnalysis, user_id);
      
      console.log('Marketing Intelligence Result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result || {}));
      
      setIntelligence(result);
      
      // DON'T auto-generate - let user review MI first and click button
      console.log('Marketing Intelligence ready - waiting for user action');
      
    } catch (err) {
      console.error('Marketing Intelligence Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateCampaigns = async (intelligenceData) => {
    setGeneratingCalendar(true);
    try {
      console.log('Generating 30-day content calendar automatically...');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/generate-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketing_intelligence: intelligenceData,
          website_analysis: websiteAnalysis,
          duration_days: 30
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate campaigns');
      }

      const data = await response.json();
      console.log('Content Calendar Generated:', data.data);
      
      // Navigate to Campaigns page with generated calendar
      navigate('/campaigns', { 
        state: { 
          generatedCampaigns: data.data,
          marketingIntelligence: intelligenceData,
          websiteAnalysis: websiteAnalysis,
          showCalendar: true
        } 
      });
      
    } catch (err) {
      console.error('Campaign generation error:', err);
      // Don't show error, just stay on MI page
      setGeneratingCalendar(false);
    }
  };

  const generateCampaigns = async () => {
    setGeneratingCalendar(true);
    try {
      console.log('Generating content calendar from Marketing Intelligence...');
      
      // Get user_id from websiteAnalysis or zendbx
      const user_id = websiteAnalysis?.user_id || websiteAnalysis?.metadata?.user_id;
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/generate-content-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user_id,
          intelligence_id: intelligence.intelligence_id,
          auto_schedule: false,
          duration_days: 30
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content calendar');
      }

      const data = await response.json();
      console.log('Content Calendar generated:', data);
      
      // Save to localStorage for ContentCalendar page
      localStorage.setItem('zenpost_content_calendar', JSON.stringify(data.content_calendar));
      localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(
        data.content_calendar.map(post => ({
          id: `post-${Date.now()}-${Math.random()}`,
          date: post.date,
          time: post.publishing_time || '10:00',
          platform: post.platform || 'LinkedIn',
          type: post.content_type,
          status: 'draft',
          title: post.title,
          caption: post.caption,
          hook: post.hook,
          call_to_action: post.call_to_action,
          hashtags: post.hashtags || [],
          image_prompt: post.image_prompt,
          goal: post.goal
        }))
      ));
      
      // Navigate to Content Calendar
      navigate('/content-calendar', { 
        state: { 
          contentCalendar: data.content_calendar,
          fromGeneration: true
        } 
      });
      
    } catch (err) {
      console.error('Content calendar generation error:', err);
      alert('Failed to generate content calendar. Please try again.');
    } finally {
      setGeneratingCalendar(false);
    }
  };

  if (loading || generatingCalendar) {
    return (
      <Preloader 
        message={loading 
          ? 'Generating Marketing Intelligence...' 
          : 'Generating Content Calendar...'
        } 
      />
    );
  }

  if (error) {
    return (
      <div className="marketing-intelligence">
        <div className="error-state">
          <h2>Generation Failed</h2>
          <p>{error}</p>
          <button onClick={generateIntelligence} className="btn-primary">
            Retry
          </button>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!intelligence) {
    return null;
  }

  return (
    <div className="marketing-intelligence">
      <div className="mi-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <div className="mi-title">
          <h1>Marketing Intelligence Report</h1>
          <p className="business-name">{intelligence.metadata?.business_name}</p>
        </div>
        <button 
          onClick={generateCampaigns}
          className="btn-primary"
          style={{ marginLeft: 'auto' }}
          disabled={generatingCalendar}
        >
          {generatingCalendar ? 'Creating Calendar...' : 'Generate Content Calendar'}
        </button>
      </div>

      <div className="mi-tabs">
        <button 
          className={activeTab === 'business' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('business')}
        >
          Business Intelligence
        </button>
        <button 
          className={activeTab === 'competitors' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('competitors')}
        >
          Competitors
        </button>
        <button 
          className={activeTab === 'market' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('market')}
        >
          Market
        </button>
        <button 
          className={activeTab === 'swot' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('swot')}
        >
          SWOT
        </button>
        <button 
          className={activeTab === 'personas' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('personas')}
        >
          Personas
        </button>
        <button 
          className={activeTab === 'positioning' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('positioning')}
        >
          Positioning
        </button>
        <button 
          className={activeTab === 'strategy' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('strategy')}
        >
          Strategy
        </button>
        <button 
          className={activeTab === 'campaigns' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('campaigns')}
        >
          Campaigns
        </button>
      </div>

      <div className="mi-content">
        {activeTab === 'business' && <BusinessIntelligenceTab data={intelligence.business_intelligence} />}
        {activeTab === 'competitors' && <CompetitorIntelligenceTab data={intelligence.competitor_intelligence} />}
        {activeTab === 'market' && <MarketIntelligenceTab data={intelligence.market_intelligence} />}
        {activeTab === 'swot' && <SwotTab data={intelligence.swot_analysis} />}
        {activeTab === 'personas' && <PersonasTab data={intelligence.audience_personas} />}
        {activeTab === 'positioning' && <PositioningTab data={intelligence.positioning} />}
        {activeTab === 'strategy' && <StrategyTab data={intelligence.marketing_strategy} />}
        {activeTab === 'campaigns' && <CampaignsTab data={intelligence.campaign_blueprints} />}
      </div>
    </div>
  );
}

// Tab Components
function BusinessIntelligenceTab({ data }) {
  return (
    <div className="tab-content">
      <section className="mi-section">
        <h2>Executive Summary</h2>
        <p className="summary-text">{data.executive_summary}</p>
      </section>

      <div className="two-column">
        <section className="mi-section">
          <h3>Business Model</h3>
          <p>{data.business_model}</p>
        </section>
        <section className="mi-section">
          <h3>Revenue Model</h3>
          <p>{data.revenue_model}</p>
        </section>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <label>Company Size</label>
          <span>{data.company_size}</span>
        </div>
        <div className="info-card">
          <label>Company Stage</label>
          <span>{data.company_stage}</span>
        </div>
        <div className="info-card">
          <label>Industry</label>
          <span>{data.industry}</span>
        </div>
        <div className="info-card">
          <label>Pricing Position</label>
          <span>{data.pricing_position}</span>
        </div>
      </div>

      <section className="mi-section">
        <h3>Unique Selling Proposition</h3>
        <p className="highlight-text">{data.unique_selling_proposition}</p>
      </section>

      <div className="two-column">
        <section className="mi-section">
          <h3>Key Products</h3>
          <ul className="list-styled">
            {data.key_products?.map((product, i) => (
              <li key={i}>{product}</li>
            ))}
          </ul>
        </section>
        <section className="mi-section">
          <h3>Key Services</h3>
          <ul className="list-styled">
            {data.key_services?.map((service, i) => (
              <li key={i}>{service}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mi-section">
        <h3>Customer Journey</h3>
        <div className="journey-grid">
          {Object.entries(data.customer_journey || {}).map(([stage, description]) => (
            <div key={stage} className="journey-stage">
              <h4>{stage.charAt(0).toUpperCase() + stage.slice(1)}</h4>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="two-column">
        <section className="mi-section strength">
          <h3>Business Strengths</h3>
          <ul className="list-styled">
            {data.business_strengths?.map((strength, i) => (
              <li key={i}>{strength}</li>
            ))}
          </ul>
        </section>
        <section className="mi-section weakness">
          <h3>Business Weaknesses</h3>
          <ul className="list-styled">
            {data.business_weaknesses?.map((weakness, i) => (
              <li key={i}>{weakness}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function CompetitorIntelligenceTab({ data }) {
  return (
    <div className="tab-content">
      <div className="competitors-overview">
        <div className="competitor-category">
          <h3>Direct Competitors</h3>
          <div className="tags">
            {data.direct_competitors?.map((comp, i) => (
              <span key={i} className="tag direct">{comp}</span>
            ))}
          </div>
        </div>
        <div className="competitor-category">
          <h3>Indirect Competitors</h3>
          <div className="tags">
            {data.indirect_competitors?.map((comp, i) => (
              <span key={i} className="tag indirect">{comp}</span>
            ))}
          </div>
        </div>
        <div className="competitor-category">
          <h3>Emerging Competitors</h3>
          <div className="tags">
            {data.emerging_competitors?.map((comp, i) => (
              <span key={i} className="tag emerging">{comp}</span>
            ))}
          </div>
        </div>
      </div>

      {data.competitor_profiles?.map((competitor, index) => (
        <div key={index} className="competitor-card">
          <div className="competitor-header">
            <h3>{competitor.name}</h3>
            <span className="threat-score">Threat: {competitor.threat_score}/100</span>
          </div>
          <p className="competitor-overview">{competitor.company_overview}</p>
          
          <div className="competitor-details">
            <div className="detail-item">
              <label>Market Position:</label>
              <span>{competitor.market_position}</span>
            </div>
            <div className="detail-item">
              <label>Business Model:</label>
              <span>{competitor.business_model}</span>
            </div>
            <div className="detail-item">
              <label>Pricing:</label>
              <span>{competitor.pricing_strategy}</span>
            </div>
          </div>

          <div className="competitor-analysis">
            <div className="analysis-col">
              <h4>Strengths</h4>
              <ul>
                {competitor.strengths?.map((s, i) => (
                  <li key={i} className="strength-item">{s}</li>
                ))}
              </ul>
            </div>
            <div className="analysis-col">
              <h4>Weaknesses</h4>
              <ul>
                {competitor.weaknesses?.map((w, i) => (
                  <li key={i} className="weakness-item">{w}</li>
                ))}
              </ul>
            </div>
            <div className="analysis-col">
              <h4>Opportunities to Beat Them</h4>
              <ul>
                {competitor.opportunities_to_beat_them?.map((o, i) => (
                  <li key={i} className="opportunity-item">{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarketIntelligenceTab({ data }) {
  return (
    <div className="tab-content">
      <section className="mi-section">
        <h2>Market Trends</h2>
        <div className="trends-grid">
          <div className="trend-category">
            <h4>Industry Trends</h4>
            <ul>
              {data.market_trends?.current_industry_trends?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="trend-category">
            <h4>Growing Topics</h4>
            <ul>
              {data.market_trends?.growing_topics?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="trend-category">
            <h4>AI Opportunities</h4>
            <ul>
              {data.market_trends?.ai_opportunities?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mi-section">
        <h2>Market Opportunities</h2>
        <div className="opportunities-list">
          {data.market_opportunities?.map((opp, i) => (
            <div key={i} className="opportunity-card">
              <div className="opp-header">
                <h4>{opp.title}</h4>
                <div className="opp-badges">
                  <span className={`badge impact-${opp.potential_impact}`}>
                    {opp.potential_impact} impact
                  </span>
                  <span className={`badge priority-${opp.priority}`}>
                    {opp.priority}
                  </span>
                </div>
              </div>
              <p>{opp.description}</p>
              <span className="opp-type">{opp.type}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>Market Risks</h2>
        <div className="risks-list">
          {data.market_risks?.map((risk, i) => (
            <div key={i} className={`risk-card severity-${risk.severity}`}>
              <div className="risk-header">
                <h4>{risk.title}</h4>
                <span className="severity-badge">{risk.severity} severity</span>
              </div>
              <p>{risk.description}</p>
              <div className="mitigation">
                <strong>Mitigation:</strong> {risk.mitigation_strategy}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>SEO Gap Analysis</h2>
        <div className="gap-grid">
          <div className="gap-category">
            <h4>Missing Keywords</h4>
            <div className="tags">
              {data.seo_gap_analysis?.missing_keywords?.map((k, i) => (
                <span key={i} className="tag">{k}</span>
              ))}
            </div>
          </div>
          <div className="gap-category">
            <h4>High Intent Keywords</h4>
            <div className="tags">
              {data.seo_gap_analysis?.high_intent_keywords?.map((k, i) => (
                <span key={i} className="tag">{k}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mi-section">
        <h2>Content Gap Analysis</h2>
        <div className="content-gaps">
          <div className="gap-item">
            <h4>Missing Blogs</h4>
            <ul>
              {data.content_gap_analysis?.missing_blogs?.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="gap-item">
            <h4>Missing Videos</h4>
            <ul>
              {data.content_gap_analysis?.missing_videos?.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function SwotTab({ data }) {
  return (
    <div className="tab-content">
      <div className="swot-grid">
        <div className="swot-quadrant strengths">
          <h3>Strengths</h3>
          {data.strengths?.map((item, i) => (
            <div key={i} className="swot-item">
              <h4>{item.title}</h4>
              <p>{item.explanation}</p>
              <div className="swot-meta">
                <span className="evidence">Evidence: {item.evidence}</span>
                <span className={`priority priority-${item.priority}`}>{item.priority}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="swot-quadrant weaknesses">
          <h3>Weaknesses</h3>
          {data.weaknesses?.map((item, i) => (
            <div key={i} className="swot-item">
              <h4>{item.title}</h4>
              <p>{item.explanation}</p>
              <div className="swot-meta">
                <span className="evidence">Evidence: {item.evidence}</span>
                <span className={`priority priority-${item.priority}`}>{item.priority}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="swot-quadrant opportunities">
          <h3>Opportunities</h3>
          {data.opportunities?.map((item, i) => (
            <div key={i} className="swot-item">
              <h4>{item.title}</h4>
              <p>{item.explanation}</p>
              <div className="swot-meta">
                <span className="evidence">Evidence: {item.evidence}</span>
                <span className={`priority priority-${item.priority}`}>{item.priority}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="swot-quadrant threats">
          <h3>Threats</h3>
          {data.threats?.map((item, i) => (
            <div key={i} className="swot-item">
              <h4>{item.title}</h4>
              <p>{item.explanation}</p>
              <div className="swot-meta">
                <span className="evidence">Evidence: {item.evidence}</span>
                <span className={`priority priority-${item.priority}`}>{item.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonasTab({ data }) {
  return (
    <div className="tab-content">
      <div className="personas-grid">
        {data?.map((persona, i) => (
          <div key={i} className="persona-card">
            <div className="persona-header">
              <h3>{persona.persona_name}</h3>
              <span className="age-group">{persona.age_group}</span>
            </div>
            
            <div className="persona-detail">
              <label>Profession:</label>
              <span>{persona.profession}</span>
            </div>

            <div className="persona-section">
              <h4>Goals</h4>
              <ul>
                {persona.goals?.map((g, idx) => (
                  <li key={idx}>{g}</li>
                ))}
              </ul>
            </div>

            <div className="persona-section">
              <h4>Pain Points</h4>
              <ul>
                {persona.pain_points?.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="persona-section">
              <h4>Preferred Platforms</h4>
              <div className="tags">
                {persona.preferred_platforms?.map((p, idx) => (
                  <span key={idx} className="tag">{p}</span>
                ))}
              </div>
            </div>

            <div className="persona-cta">
              <strong>Recommended CTA:</strong> {persona.preferred_cta}
            </div>

            <div className="persona-message">
              <strong>Marketing Message:</strong>
              <p>{persona.recommended_marketing_message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PositioningTab({ data }) {
  return (
    <div className="tab-content">
      <section className="mi-section">
        <h2>Brand Promise</h2>
        <p className="highlight-text">{data.brand_promise}</p>
      </section>

      <section className="mi-section">
        <h2>Unique Value Proposition</h2>
        <p className="uv-text">{data.unique_value_proposition}</p>
      </section>

      <div className="two-column">
        <section className="mi-section">
          <h3>Current Position</h3>
          <p>{data.current_position}</p>
        </section>
        <section className="mi-section">
          <h3>Recommended Position</h3>
          <p>{data.recommended_position}</p>
        </section>
      </div>

      <section className="mi-section">
        <h2>Messaging Pillars</h2>
        <div className="pillars-grid">
          {data.messaging_pillars?.map((pillar, i) => (
            <div key={i} className="pillar-card">
              <h4>{pillar.pillar}</h4>
              <p>{pillar.message}</p>
              <ul>
                {pillar.proof_points?.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>Suggested Taglines</h2>
        <div className="taglines">
          {data.suggested_taglines?.map((tagline, i) => (
            <div key={i} className="tagline-option">
              <span className="quote-icon">"</span>
              {tagline}
              <span className="quote-icon">"</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>Brand Differentiators</h2>
        <ul className="differentiators-list">
          {data.brand_differentiators?.map((diff, i) => (
            <li key={i}>{diff}</li>
          ))}
        </ul>
      </section>

      <section className="mi-section">
        <h2>Reasons to Choose Us</h2>
        <div className="reasons-grid">
          {data.reasons_to_choose_us?.map((reason, i) => (
            <div key={i} className="reason-card">
              <h4>{reason.reason}</h4>
              <p>{reason.explanation}</p>
              <div className="proof">{reason.proof}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StrategyTab({ data }) {
  return (
    <div className="tab-content">
      <section className="mi-section">
        <h2>Executive Summary</h2>
        <p className="summary-text">{data.executive_summary}</p>
      </section>

      <section className="mi-section">
        <h2>90-Day Strategy</h2>
        <div className="timeline">
          {['month_1', 'month_2', 'month_3'].map((month, i) => (
            <div key={month} className="timeline-item">
              <h3>Month {i + 1}: {data.ninety_day_strategy?.[month]?.focus}</h3>
              <div className="timeline-content">
                <div>
                  <h4>Activities</h4>
                  <ul>
                    {data.ninety_day_strategy?.[month]?.activities?.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Success Metrics</h4>
                  <ul>
                    {data.ninety_day_strategy?.[month]?.success_metrics?.map((metric, idx) => (
                      <li key={idx}>{metric}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>Content Pillars</h2>
        <div className="pillars-list">
          {data.content_pillars?.map((pillar, i) => (
            <div key={i} className="content-pillar">
              <h4>{pillar.pillar}</h4>
              <p>{pillar.description}</p>
              <div className="pillar-meta">
                <span>Frequency: {pillar.frequency}</span>
                <div className="tags">
                  {pillar.content_types?.map((type, idx) => (
                    <span key={idx} className="tag">{type}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>Platform Strategy</h2>
        <div className="platforms-grid">
          {data.platform_strategy?.map((platform, i) => (
            <div key={i} className="platform-card">
              <h3>{platform.platform}</h3>
              <p><strong>Objective:</strong> {platform.objective}</p>
              <p><strong>Frequency:</strong> {platform.posting_frequency}</p>
              <div>
                <strong>Content Types:</strong>
                <div className="tags">
                  {platform.content_types?.map((type, idx) => (
                    <span key={idx} className="tag">{type}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>Success KPIs</h2>
        <div className="kpis-grid">
          {data.success_kpis?.map((kpi, i) => (
            <div key={i} className="kpi-card">
              <h4>{kpi.kpi}</h4>
              <div className="kpi-target">{kpi.target}</div>
              <div className="kpi-measurement">{kpi.measurement}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mi-section">
        <h2>Priority Actions</h2>
        <div className="actions-list">
          {data.priority_actions?.map((action, i) => (
            <div key={i} className="action-card">
              <div className="action-header">
                <h4>{action.action}</h4>
                <div className="action-badges">
                  <span className={`badge impact-${action.impact}`}>{action.impact} impact</span>
                  <span className={`badge effort-${action.effort}`}>{action.effort} effort</span>
                </div>
              </div>
              <p>{action.description}</p>
              <span className="timeframe">{action.timeframe}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CampaignsTab({ data }) {
  return (
    <div className="tab-content">
      <div className="campaigns-grid">
        {data?.map((campaign, i) => (
          <div key={i} className="campaign-card">
            <div className="campaign-header">
              <h3>{campaign.campaign_name}</h3>
              <span className={`goal-badge ${campaign.campaign_goal}`}>
                {campaign.campaign_goal}
              </span>
            </div>

            <p className="campaign-message">{campaign.key_message}</p>

            <div className="campaign-meta">
              <div className="meta-item">
                <label>Duration:</label>
                <span>{campaign.campaign_duration}</span>
              </div>
              <div className="meta-item">
                <label>Content Pieces:</label>
                <span>{campaign.content_pieces_needed}</span>
              </div>
            </div>

            <div className="campaign-platforms">
              <label>Platforms:</label>
              <div className="tags">
                {campaign.platforms?.map((p, idx) => (
                  <span key={idx} className="tag">{p}</span>
                ))}
              </div>
            </div>

            <div className="campaign-content">
              <label>Content Types:</label>
              <div className="tags">
                {campaign.recommended_content_types?.map((type, idx) => (
                  <span key={idx} className="tag">{type}</span>
                ))}
              </div>
            </div>

            <div className="campaign-cta">
              <strong>Call-to-Action:</strong> {campaign.call_to_action}
            </div>

            {campaign.suggested_offer && (
              <div className="campaign-offer">
                <strong>Offer:</strong> {campaign.suggested_offer}
              </div>
            )}

            <div className="campaign-metrics">
              <h4>Success Metrics</h4>
              {campaign.success_metrics?.map((metric, idx) => (
                <div key={idx} className="metric-item">
                  <span>{metric.metric}: </span>
                  <strong>{metric.target}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

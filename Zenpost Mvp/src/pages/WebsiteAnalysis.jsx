import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import analysisService from '../services/analysisService'
import Preloader from '../components/Preloader'
import '../theme-blue-black.css'
import './WebsiteAnalysis.css'

const WebsiteAnalysis = () => {
  const { id: websiteId } = useParams()
  const navigate = useNavigate()
  
  const [website, setWebsite] = useState(null)
  const [userId, setUserId] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [analysisData, setAnalysisData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    checkAuthAndLoad()
  }, [websiteId])

  const checkAuthAndLoad = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
        return
      }
      
      setUserId(user.id)
      await loadWebsite(user.id)
      await loadExistingAnalysis(user.id)
    } catch (error) {
      console.error('Auth error:', error)
      navigate('/login')
    }
  }

  const loadWebsite = async (uid) => {
    try {
      const response = await zendbx.from('websites').select('*')
      const allWebsites = response?.data || response || []
      const foundWebsite = allWebsites.find(w => w.id === websiteId && w.user_id === uid)
      
      if (!foundWebsite) {
        navigate('/websites')
        return
      }
      
      setWebsite(foundWebsite)
    } catch (error) {
      console.error('Error loading website:', error)
      setError('Failed to load website')
    } finally {
      setLoading(false)
    }
  }

  const loadExistingAnalysis = async (uid) => {
    try {
      const analysis = await analysisService.getWebsiteAnalysis(websiteId, uid)
      if (analysis) {
        setAnalysisData(analysis)
      }
    } catch (error) {
      console.log('No existing analysis found')
    }
  }

  const handleAnalyze = async () => {
    if (!website || !userId) return

    setAnalyzing(true)
    setError('')
    setAnalysisProgress('Starting analysis...')

    try {
      // Simulate progress updates (in production, use websockets or polling)
      const steps = [
        'Validating website...',
        'Crawling pages...',
        'Extracting content...',
        'Analyzing SEO...',
        'AI analyzing brand...',
        'Detecting target audience...',
        'Generating business summary...',
        'Discovering competitors...',
        'Analyzing competitors...',
        'Creating marketing strategy...',
        'Generating 30-day campaign...',
        'Creating content ideas...',
        'Generating recommendations...',
        'Finalizing analysis...'
      ]

      let currentStep = 0
      const progressInterval = setInterval(() => {
        if (currentStep < steps.length) {
          setAnalysisProgress(steps[currentStep])
          currentStep++
        }
      }, 2000)

      // Call analysis API
      const result = await analysisService.analyzeWebsite(
        website.url,
        userId,
        websiteId,
        true // deep crawl
      )

      clearInterval(progressInterval)

      if (result.success) {
        setAnalysisData(result.data)
        setAnalysisProgress('Analysis complete!')
        
        // Update website record
        await updateWebsiteWithAnalysis(result.analysis_id)
      } else {
        throw new Error(result.message || 'Analysis failed')
      }
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.message || 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const updateWebsiteWithAnalysis = async (analysisId) => {
    try {
      // This would update the website record in ZendBX
      // For now, just reload
      await loadWebsite(userId)
    } catch (error) {
      console.error('Failed to update website:', error)
    }
  }

  if (loading) {
    return <Preloader message="Loading website analysis..." />
  }

  if (!website) {
    return (
      <div className="analysis-page">
        <div className="container">
          <p>Website not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="analysis-page">
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <button 
            className="btn-back"
            onClick={() => navigate(`/websites/${websiteId}`)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Website
          </button>

          <div className="header-content">
            <h1 className="page-title">
              <span className="gradient-text">AI Website Analysis</span>
            </h1>
            <p className="page-subtitle">
              {website.name} • {website.url}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="container">
          {/* Analysis Actions */}
          {!analyzing && !analysisData && (
            <div className="analysis-start card">
              <div className="start-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2>Start AI-Powered Analysis</h2>
              <p>
                Our AI will analyze your website and generate:
              </p>
              <ul className="analysis-features">
                <li>✓ Complete SEO audit and recommendations</li>
                <li>✓ Brand voice and positioning analysis</li>
                <li>✓ Target audience identification</li>
                <li>✓ Competitor analysis and insights</li>
                <li>✓ Marketing strategy with SWOT analysis</li>
                <li>✓ 30-day content calendar</li>
                <li>✓ Platform-specific content ideas</li>
                <li>✓ Actionable improvement recommendations</li>
              </ul>
              <button 
                className="btn btn-primary btn-large"
                onClick={handleAnalyze}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Analysis
              </button>
              <p className="analysis-note">
                Analysis typically takes 2-3 minutes
              </p>
            </div>
          )}

          {/* Analysis Progress */}
          {analyzing && (
            <Preloader message={analysisProgress} />
          )}

          {/* Error Display */}
          {error && (
            <div className="error-card card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>Analysis Failed</h3>
              <p>{error}</p>
              <button 
                className="btn btn-primary"
                onClick={handleAnalyze}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysisData && !analyzing && (
            <div className="analysis-results">
              {/* Quick Stats */}
              <div className="stats-grid">
                <div className="stat-card card">
                  <div className="stat-icon seo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">SEO Score</div>
                    <div className="stat-value">
                      {analysisData.seo?.score || 0}/100
                      <span className="stat-badge">{analysisData.seo?.grade || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="stat-card card">
                  <div className="stat-icon competitors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Competitors</div>
                    <div className="stat-value">{analysisData.competitors?.length || 0}</div>
                  </div>
                </div>

                <div className="stat-card card">
                  <div className="stat-icon calendar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Campaign Days</div>
                    <div className="stat-value">{analysisData.campaign_calendar?.length || 0}</div>
                  </div>
                </div>

                <div className="stat-card card">
                  <div className="stat-icon recommendations">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">AI Insights</div>
                    <div className="stat-value">
                      {(analysisData.recommendations?.priority_actions?.length || 0) + 
                       (analysisData.recommendations?.seo_improvements?.length || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="analysis-tabs card">
                <div className="tabs-header">
                  {['overview', 'brand', 'seo', 'competitors', 'strategy', 'content'].map(tab => (
                    <button
                      key={tab}
                      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="tabs-content">
                  {activeTab === 'overview' && (
                    <OverviewTab data={analysisData} />
                  )}
                  {activeTab === 'brand' && (
                    <BrandTab data={analysisData.brand} />
                  )}
                  {activeTab === 'seo' && (
                    <SEOTab data={analysisData.seo} />
                  )}
                  {activeTab === 'competitors' && (
                    <CompetitorsTab data={analysisData.competitors} />
                  )}
                  {activeTab === 'strategy' && (
                    <StrategyTab data={analysisData.marketing_strategy} />
                  )}
                  {activeTab === 'content' && (
                    <ContentTab 
                      calendar={analysisData.campaign_calendar}
                      ideas={analysisData.content}
                    />
                  )}
                </div>
              </div>

              {/* Re-analyze Button */}
              <div className="reanalyze-section">
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/marketing-intelligence', { state: { websiteAnalysis: analysisData } })}
                  style={{ marginRight: '10px' }}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Generate Marketing Intelligence
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleAnalyze}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-analyze Website
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Tab Components
const OverviewTab = ({ data }) => (
  <div className="tab-content">
    <div className="content-section">
      <h3>Business Summary</h3>
      <p className="summary-text">{data.business?.detailed_summary || 'No summary available'}</p>
    </div>

    <div className="content-section">
      <h3>Industry & Category</h3>
      <div className="info-badges">
        <span className="badge">{data.business?.industry || 'N/A'}</span>
        <span className="badge">{data.business?.category || 'N/A'}</span>
      </div>
    </div>

    <div className="content-section">
      <h3>Target Audience</h3>
      <p>{data.audience?.ideal_customer || 'No audience data available'}</p>
    </div>

    {data.business?.mission && (
      <div className="content-section">
        <h3>Mission</h3>
        <p>{data.business.mission}</p>
      </div>
    )}
  </div>
)

const BrandTab = ({ data }) => (
  <div className="tab-content">
    <div className="content-section">
      <h3>Brand Voice</h3>
      <p>{data?.brand_voice || 'No brand voice data'}</p>
    </div>

    <div className="content-section">
      <h3>Tone</h3>
      <div className="info-badges">
        {(data?.tone || []).map((tone, i) => (
          <span key={i} className="badge">{tone}</span>
        ))}
      </div>
    </div>

    <div className="content-section">
      <h3>Unique Selling Proposition</h3>
      <p>{data?.unique_selling_proposition || 'N/A'}</p>
    </div>

    <div className="content-section">
      <h3>Value Proposition</h3>
      <p>{data?.value_proposition || 'N/A'}</p>
    </div>

    {data?.customer_pain_points && data.customer_pain_points.length > 0 && (
      <div className="content-section">
        <h3>Customer Pain Points</h3>
        <ul className="content-list">
          {data.customer_pain_points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)

const SEOTab = ({ data }) => (
  <div className="tab-content">
    <div className="seo-score-card">
      <div className="score-circle">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="var(--accent-purple-light)" 
            strokeWidth="10"
            strokeDasharray={`${(data?.score || 0) * 2.83} 283`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="score-text">
          <span className="score-number">{data?.score || 0}</span>
          <span className="score-grade">{data?.grade || 'F'}</span>
        </div>
      </div>
    </div>

    {data?.recommendations && data.recommendations.length > 0 && (
      <div className="content-section">
        <h3>SEO Recommendations</h3>
        <div className="recommendations-list">
          {data.recommendations.map((rec, i) => (
            <div key={i} className={`recommendation-item ${rec.severity}`}>
              <div className="rec-header">
                <span className={`severity-badge ${rec.severity}`}>{rec.severity}</span>
                <span className="rec-category">{rec.category}</span>
              </div>
              <p className="rec-issue">{rec.issue}</p>
              <p className="rec-solution">{rec.recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)

const CompetitorsTab = ({ data }) => (
  <div className="tab-content">
    {data && data.length > 0 ? (
      <div className="competitors-grid">
        {data.map((competitor, i) => (
          <div key={i} className="competitor-card">
            <h4>{competitor.name}</h4>
            {competitor.website && (
              <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="competitor-link">
                {competitor.website}
              </a>
            )}
            <div className="competitor-details">
              {competitor.strengths && competitor.strengths.length > 0 && (
                <div className="detail-section">
                  <h5>Strengths</h5>
                  <ul>
                    {competitor.strengths.map((s, j) => <li key={j}>{s}</li>)}
                  </ul>
                </div>
              )}
              {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                <div className="detail-section">
                  <h5>Weaknesses</h5>
                  <ul>
                    {competitor.weaknesses.map((w, j) => <li key={j}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p>No competitor data available</p>
    )}
  </div>
)

const StrategyTab = ({ data }) => (
  <div className="tab-content">
    {data?.marketing_goals && data.marketing_goals.length > 0 && (
      <div className="content-section">
        <h3>Marketing Goals</h3>
        <ul className="content-list">
          {data.marketing_goals.map((goal, i) => (
            <li key={i}>{goal}</li>
          ))}
        </ul>
      </div>
    )}

    {data?.content_pillars && data.content_pillars.length > 0 && (
      <div className="content-section">
        <h3>Content Pillars</h3>
        <div className="info-badges">
          {data.content_pillars.map((pillar, i) => (
            <span key={i} className="badge badge-large">{pillar}</span>
          ))}
        </div>
      </div>
    )}

    {data?.recommended_platforms && data.recommended_platforms.length > 0 && (
      <div className="content-section">
        <h3>Recommended Platforms</h3>
        <div className="platforms-grid">
          {data.recommended_platforms.map((platform, i) => (
            <div key={i} className="platform-card">
              <h4>{platform.platform}</h4>
              <span className={`priority-badge ${platform.priority}`}>{platform.priority}</span>
              <p>{platform.reason}</p>
              <p className="frequency">{platform.posting_frequency}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {data?.swot_analysis && (
      <div className="content-section">
        <h3>SWOT Analysis</h3>
        <div className="swot-grid">
          <div className="swot-card strengths">
            <h4>Strengths</h4>
            <ul>
              {(data.swot_analysis.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="swot-card weaknesses">
            <h4>Weaknesses</h4>
            <ul>
              {(data.swot_analysis.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
          <div className="swot-card opportunities">
            <h4>Opportunities</h4>
            <ul>
              {(data.swot_analysis.opportunities || []).map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
          <div className="swot-card threats">
            <h4>Threats</h4>
            <ul>
              {(data.swot_analysis.threats || []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    )}
  </div>
)

const ContentTab = ({ calendar, ideas }) => {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  const viewCalendarWithPosts = () => {
    if (!calendar || calendar.length === 0) return
    
    // Transform calendar data to match expected format
    const masterCalendar = calendar.map((item, index) => ({
      date: new Date(Date.now() + item.day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      headline: item.title,
      hook: item.hook || '',
      caption: item.caption,
      call_to_action: item.call_to_action || '',
      hashtags: item.hashtags || [],
      platforms: [item.platform],
      post_type: item.content_type,
      image_prompt: item.image_prompt || '',
      best_time: item.publishing_time || '10:00 AM'
    }))

    const generatedCampaigns = {
      master_calendar: masterCalendar,
      campaigns: [],
      summary: {
        total_posts: calendar.length,
        total_campaigns: Math.ceil(calendar.length / 7),
        duration_days: 30,
        platforms: [...new Set(calendar.map(item => item.platform))]
      }
    }

    // Navigate to campaigns with calendar view
    navigate('/campaigns', {
      state: {
        generatedCampaigns,
        showCalendar: true
      }
    })
  }

  const createCampaignsFromCalendar = async () => {
    if (!calendar || calendar.length === 0) return
    
    setCreating(true)
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) return

      // Group calendar items by week to create weekly campaigns
      const weeksCount = Math.ceil(calendar.length / 7)
      let created = 0

      for (let week = 0; week < weeksCount; week++) {
        const weekStart = week * 7
        const weekEnd = Math.min(weekStart + 7, calendar.length)
        const weekItems = calendar.slice(weekStart, weekEnd)

        // Create campaign for this week
        const campaignData = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: `Week ${week + 1} Content Campaign`,
          description: `AI-generated content for days ${weekStart + 1}-${weekEnd}`,
          status: 'draft',
          start_date: new Date(Date.now() + weekStart * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date(Date.now() + weekEnd * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          platforms: [...new Set(weekItems.map(item => item.platform))],
          content_pieces: weekItems.map(item => ({
            day: item.day,
            platform: item.platform,
            type: item.content_type,
            title: item.title,
            caption: item.caption,
            hashtags: item.hashtags,
            scheduled_time: item.publishing_time,
            goal: item.goal
          })),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Insert campaign
        await zendbx.from('campaigns').insert(campaignData)
        created++
      }

      alert(`✅ Successfully created ${created} campaigns from your content calendar!`)
      navigate('/campaigns')
    } catch (error) {
      console.error('Error creating campaigns:', error)
      alert('Failed to create campaigns. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="tab-content">
      {calendar && calendar.length > 0 && (
        <div className="content-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
            <h3>30-Day Content Calendar</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary"
                onClick={viewCalendarWithPosts}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                View Full Calendar
              </button>
              <button 
                className="btn btn-secondary"
                onClick={createCampaignsFromCalendar}
                disabled={creating}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                {creating ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14m-7-7h14" />
                    </svg>
                    Save to Database
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="calendar-list">
            {calendar.slice(0, 7).map((day, i) => (
              <div key={i} className="calendar-item">
                <div className="calendar-header">
                  <span className="day-number">Day {day.day}</span>
                  <span className="platform-badge">{day.platform}</span>
                  <span className="content-type">{day.content_type}</span>
                </div>
                <h4>{day.title}</h4>
                <p className="caption-preview">{day.caption?.substring(0, 150)}...</p>
                <div className="calendar-meta">
                  <span>{day.publishing_time}</span>
                  <span className="goal-badge">{day.goal}</span>
                </div>
              </div>
            ))}
          </div>
          {calendar.length > 7 && (
            <p className="more-indicator">+ {calendar.length - 7} more days of content</p>
          )}
        </div>
      )}

      {ideas && (
        <div className="content-section">
          <h3>Content Ideas</h3>
          
          {ideas.linkedin_posts && ideas.linkedin_posts.length > 0 && (
            <div className="idea-category">
              <h4>LinkedIn Posts</h4>
              {ideas.linkedin_posts.slice(0, 3).map((post, i) => (
                <div key={i} className="idea-item">
                  <strong>{post.topic}</strong>
                  <p>{post.caption?.substring(0, 200)}...</p>
                </div>
              ))}
            </div>
          )}

          {ideas.blog_ideas && ideas.blog_ideas.length > 0 && (
            <div className="idea-category">
              <h4>Blog Ideas</h4>
              <ul>
                {ideas.blog_ideas.slice(0, 5).map((blog, i) => (
                  <li key={i}>{blog.title || blog}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WebsiteAnalysis

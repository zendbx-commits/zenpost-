import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalReach: 0,
    engagementRate: 0,
    postsPublished: 0,
    activeCampaigns: 0,
    scheduledPosts: 0
  })
  const [chartData, setChartData] = useState({
    weeklyPosts: [0, 0, 0, 0, 0, 0, 0],
    platformBreakdown: [
      { name: 'LinkedIn', value: 0, color: '#0A66C2' },
      { name: 'Twitter', value: 0, color: '#1DA1F2' },
      { name: 'Facebook', value: 0, color: '#1877F2' },
      { name: 'Instagram', value: 0, color: '#E4405F' }
    ],
    engagementTrend: [0, 0, 0, 0, 0, 0, 0]
  })

  useEffect(() => {
    checkAuth()
    fetchDashboardData()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
        return
      }
      setUser(user)
    } catch (error) {
      console.error('Auth check error:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        console.log('No user found')
        return
      }

      console.log('Fetching dashboard data for user:', user.id)

      // Fetch all scheduled_posts and filter client-side
      const scheduledResponse = await zendbx.from('scheduled_posts').select('*');
      
      let userScheduled = scheduledResponse?.data || [];
      
      // Filter by user_id client-side
      userScheduled = userScheduled.filter(post => post.user_id === user.id);
      
      console.log('User scheduled posts:', userScheduled.length)
      console.log('User scheduled data:', userScheduled)
      
      const scheduledCount = userScheduled.filter(s => 
        s.status === 'scheduled' || s.status === 'pending'
      ).length
      
      const publishedPosts = userScheduled.filter(s => 
        s.status === 'published' || s.status === 'posted'
      )
      
      console.log('Scheduled:', scheduledCount)
      console.log('Published:', publishedPosts.length)

      // Fetch from generated_campaigns table
      const campaignsResponse = await zendbx.from('generated_campaigns').select('*')
      const allCampaigns = campaignsResponse?.data || []
      const activeCampaigns = allCampaigns.length // Simplified
      
      console.log('Total campaigns:', activeCampaigns)

      // Simple metrics
      const totalReach = 0 // Will be populated when analytics are tracked
      const engagementRate = 0 // Will be populated when analytics are tracked

      setMetrics({
        totalReach,
        engagementRate,
        postsPublished: publishedPosts.length,
        activeCampaigns,
        scheduledPosts: scheduledCount
      })

      // Calculate weekly posts (last 7 days)
      const today = new Date()
      const weeklyData = [0, 0, 0, 0, 0, 0, 0]
      publishedPosts.forEach(post => {
        const postDate = new Date(post.published_at || post.created_at)
        const daysDiff = Math.floor((today - postDate) / (1000 * 60 * 60 * 24))
        if (daysDiff >= 0 && daysDiff < 7) {
          weeklyData[6 - daysDiff]++
        }
      })

      // Calculate platform breakdown
      const platformCounts = {
        'LinkedIn': 0,
        'Twitter': 0,
        'X': 0,
        'Facebook': 0,
        'Instagram': 0
      }
      
      publishedPosts.forEach(post => {
        const platform = post.platform
        if (platformCounts.hasOwnProperty(platform)) {
          platformCounts[platform]++
        }
      })
      
      // Combine Twitter and X
      platformCounts['Twitter'] += platformCounts['X']

      const totalPlatformPosts = Object.values(platformCounts).reduce((sum, count) => sum + count, 0)
      const platformBreakdown = [
        { 
          name: 'LinkedIn', 
          value: totalPlatformPosts > 0 ? Math.round((platformCounts['LinkedIn'] / totalPlatformPosts) * 100) : 0, 
          color: '#3B82F6' // Blue
        },
        { 
          name: 'Twitter', 
          value: totalPlatformPosts > 0 ? Math.round((platformCounts['Twitter'] / totalPlatformPosts) * 100) : 0, 
          color: '#60A5FA' // Light Blue
        },
        { 
          name: 'Facebook', 
          value: totalPlatformPosts > 0 ? Math.round((platformCounts['Facebook'] / totalPlatformPosts) * 100) : 0, 
          color: '#93C5FD' // Lighter Blue
        },
        { 
          name: 'Instagram', 
          value: totalPlatformPosts > 0 ? Math.round((platformCounts['Instagram'] / totalPlatformPosts) * 100) : 0, 
          color: '#DBEAFE' // Lightest Blue
        }
      ]

      // Simple engagement trend
      const engagementTrend = [0, 2, 4, 3, 6, 8, 5]

      setChartData({
        weeklyPosts: weeklyData,
        platformBreakdown,
        engagementTrend
      })
      
      console.log('Dashboard data updated')
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      console.error('Error details:', error.message, error.stack)
    }
  }

  if (loading || !user) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  const displayName = user.email?.split('@')[0] || 'User'
  const maxReachValue = Math.max(...chartData.weeklyPosts, 1) // Minimum 1 to avoid division by zero

  return (
    <div className="dashboard-modern">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">ZenPost</h2>
          <span className="sidebar-subtitle">Dashboard</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">MAIN</div>
            <button className="nav-item active" onClick={() => navigate('/dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            <button className="nav-item" onClick={() => navigate('/campaigns')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Campaigns
            </button>
            <button className="nav-item" onClick={() => navigate('/websites')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Websites
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">CONTENT</div>
            <button className="nav-item" onClick={() => navigate('/create-post')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Create Post
            </button>
            <button className="nav-item" onClick={() => navigate('/approvals')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approvals
            </button>
            <button className="nav-item" onClick={() => navigate('/content-calendar')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </button>
            <button className="nav-item" onClick={() => navigate('/autopilot')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Autopilot
            </button>
            <button className="nav-item" onClick={() => navigate('/social/accounts')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Social Accounts
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">INSIGHTS</div>
            <button className="nav-item" onClick={() => navigate('/analytics')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">AI TOOLS</div>
            <button className="nav-item" onClick={() => navigate('/marketing-intelligence')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Marketing Intelligence
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-role">Admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-header-modern">
          <div>
            <h1 className="dashboard-title-modern">Social Media Dashboard</h1>
            <p className="dashboard-subtitle-modern">Track your social media performance</p>
          </div>
        </div>

        <div className="dashboard-content-modern">
          {/* Top Metrics Cards */}
          <div className="metrics-row">
            <div className="metric-card-gradient pink">
              <div className="metric-card-content">
                <div className="metric-label-small">Total Reach</div>
                <div className="metric-value-large">
                  {metrics.totalReach >= 1000 ? `${(metrics.totalReach / 1000).toFixed(1)}K` : metrics.totalReach}
                </div>
                <div className="metric-sublabel">Last 30 days</div>
              </div>
            </div>

            <div className="metric-card-gradient cyan">
              <div className="metric-card-content">
                <div className="metric-label-small">Engagement Rate</div>
                <div className="metric-value-large">{metrics.engagementRate}%</div>
                <div className="metric-sublabel">Average</div>
              </div>
            </div>

            <div className="stat-pill-container">
              <div className="stat-pill purple">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>Posts</span>
                <strong>{metrics.postsPublished}</strong>
              </div>
              <div className="stat-pill blue">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>Scheduled</span>
                <strong>{metrics.scheduledPosts}</strong>
              </div>
            </div>

            <div className="mini-chart-card">
              <div className="mini-chart-header">
                <span>Engagement Trend</span>
                <span className="trend-up">+{chartData.engagementTrend[chartData.engagementTrend.length - 1]}%</span>
              </div>
              <div className="mini-area-chart">
                <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 0 ${60 - chartData.engagementTrend[0]/2} ${chartData.engagementTrend.map((val, i) => 
                      `L ${(i * 200) / (chartData.engagementTrend.length - 1)} ${60 - val/2}`
                    ).join(' ')} L 200 60 L 0 60 Z`}
                    fill="url(#areaGradient)"
                  />
                  <polyline
                    points={chartData.engagementTrend.map((val, i) => 
                      `${(i * 200) / (chartData.engagementTrend.length - 1)},${60 - val/2}`
                    ).join(' ')}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-grid">
            {/* Bar Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Posts Per Day / Week</h3>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-dot" style={{background: '#06b6d4'}}></span>
                    Published
                  </span>
                </div>
              </div>
              <div className="bar-chart">
                {chartData.weeklyPosts.map((value, index) => (
                  <div key={index} className="bar-item">
                    <div className="bar-column">
                      <div 
                        className="bar-fill"
                        style={{height: `${(value / maxReachValue) * 100}%`}}
                      ></div>
                    </div>
                    <div className="bar-label">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut Charts */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Posts By Platform</h3>
              </div>
              <div className="donut-chart-container">
                <div className="donut-chart">
                  <svg viewBox="0 0 200 200">
                    {(() => {
                      const total = chartData.platformBreakdown.reduce((sum, p) => sum + p.value, 0)
                      if (total === 0) {
                        // Show empty state circle
                        return (
                          <circle
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            stroke="#1f2937"
                            strokeWidth="30"
                          />
                        )
                      }
                      
                      return chartData.platformBreakdown.map((platform, index) => {
                        const percentage = (platform.value / total) * 100
                        const offset = chartData.platformBreakdown
                          .slice(0, index)
                          .reduce((sum, p) => sum + (p.value / total) * 100, 0)
                        
                        if (percentage === 0) return null
                        
                        return (
                          <circle
                            key={index}
                            cx="100"
                            cy="100"
                            r="70"
                            fill="none"
                            stroke={platform.color}
                            strokeWidth="30"
                            strokeDasharray={`${percentage * 4.4} 440`}
                            strokeDashoffset={-offset * 4.4}
                            transform="rotate(-90 100 100)"
                          />
                        )
                      })
                    })()}
                  </svg>
                  <div className="donut-center">
                    <div className="donut-total">{metrics.postsPublished}</div>
                    <div className="donut-label">Total Posts</div>
                  </div>
                </div>
                <div className="donut-legend">
                  {chartData.platformBreakdown.map((platform, index) => (
                    <div key={index} className="donut-legend-item">
                      <span className="donut-dot" style={{background: platform.color}}></span>
                      <span className="donut-platform-name">{platform.name}</span>
                      <span className="donut-platform-value">{platform.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

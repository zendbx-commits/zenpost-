import React, { useState, useEffect } from 'react'
import zendbx from '../../lib/zendbx'
import './AnalyticsSummary.css'

const AnalyticsSummary = () => {
  const [metrics, setMetrics] = useState([
    {
      label: 'Total Reach',
      value: '0',
      change: '0%',
      trend: 'neutral',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      label: 'Engagement Rate',
      value: '0%',
      change: '0%',
      trend: 'neutral',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      label: 'Posts Published',
      value: '0',
      change: '0',
      trend: 'neutral',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: 'Active Campaigns',
      value: '0',
      change: '0',
      trend: 'neutral',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) return

      // Fetch all campaigns and filter client-side (ZendBX .eq doesn't work as expected)
      const campaignsResponse = await zendbx
        .from('campaigns')
        .select('*')
      
      const allCampaigns = campaignsResponse?.data || campaignsResponse || []
      const campaigns = allCampaigns.filter(c => c.user_id === user.id)

      // Fetch all posts and filter client-side
      const postsResponse = await zendbx
        .from('posts')
        .select('*')
      
      const allPosts = postsResponse?.data || postsResponse || []
      const posts = allPosts.filter(p => p.user_id === user.id)

      // Calculate metrics
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length || 0
      const totalPosts = posts.length || 0
      
      // Calculate total reach and engagement from posts
      const totalReach = posts.reduce((sum, post) => sum + (post.reach || 0), 0) || 0
      const totalEngagements = posts.reduce((sum, post) => sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0), 0) || 0
      const engagementRate = totalReach > 0 ? ((totalEngagements / totalReach) * 100).toFixed(1) : '0.0'

      setMetrics([
        {
          ...metrics[0],
          value: totalReach >= 1000 ? `${(totalReach / 1000).toFixed(1)}K` : totalReach.toString(),
          change: '+0%', // Calculate from historical data if available
          trend: 'neutral'
        },
        {
          ...metrics[1],
          value: `${engagementRate}%`,
          change: '+0%',
          trend: 'neutral'
        },
        {
          ...metrics[2],
          value: totalPosts.toString(),
          change: `+${totalPosts}`,
          trend: totalPosts > 0 ? 'up' : 'neutral'
        },
        {
          ...metrics[3],
          value: activeCampaigns.toString(),
          change: `+${activeCampaigns}`,
          trend: activeCampaigns > 0 ? 'up' : 'neutral'
        }
      ])
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="analytics-summary">
        <div className="section-header">
          <h2 className="section-title">Analytics Overview</h2>
        </div>
        <div className="metrics-grid">
          <div className="loading-placeholder">Loading analytics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-summary">
      <div className="section-header">
        <h2 className="section-title">Analytics Overview</h2>
        <select className="time-filter">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>All time</option>
        </select>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className="metric-card card">
            <div className="metric-header">
              <div className="metric-icon">{metric.icon}</div>
              <span className={`metric-change ${metric.trend}`}>
                {metric.change}
              </span>
            </div>
            <div className="metric-content">
              <div className="metric-value">{metric.value}</div>
              <div className="metric-label">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AnalyticsSummary

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import zendbx from '../../lib/zendbx'
import './RecentCampaigns.css'

const RecentCampaigns = () => {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) return

      // Fetch all campaigns and filter client-side (ZendBX .eq doesn't work as expected)
      const response = await zendbx
        .from('campaigns')
        .select('*')

      const allCampaigns = response?.data || response || []
      
      // Filter for current user and sort
      const userCampaigns = allCampaigns
        .filter(c => c.user_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4)

      setCampaigns(userCampaigns)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'status-active', label: 'Active' },
      scheduled: { class: 'status-scheduled', label: 'Scheduled' },
      completed: { class: 'status-completed', label: 'Completed' },
      draft: { class: 'status-scheduled', label: 'Draft' }
    }
    return statusConfig[status] || statusConfig.draft
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatNumber = (num) => {
    if (!num || num === 0) return '0'
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <div className="recent-campaigns">
        <div className="section-header">
          <h2 className="section-title">Recent Campaigns</h2>
        </div>
        <div className="campaigns-list card">
          <div className="loading-placeholder">Loading campaigns...</div>
        </div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="recent-campaigns">
        <div className="section-header">
          <h2 className="section-title">Recent Campaigns</h2>
        </div>
        <div className="campaigns-list card">
          <div className="empty-state">
            <p>No campaigns yet. Create your first campaign to get started!</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/campaigns/create')}
            >
              Create Campaign
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="recent-campaigns">
      <div className="section-header">
        <h2 className="section-title">Recent Campaigns</h2>
        <button className="btn-text" onClick={() => navigate('/campaigns')}>
          View All →
        </button>
      </div>

      <div className="campaigns-list card">
        {campaigns.map((campaign) => (
          <div 
            key={campaign.id} 
            className="campaign-item"
            onClick={() => navigate(`/campaigns/${campaign.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div className="campaign-header">
              <div className="campaign-info">
                <h3 className="campaign-name">{campaign.name}</h3>
                <p className="campaign-date">
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </p>
              </div>
              <span className={`status-badge ${getStatusBadge(campaign.status).class}`}>
                {getStatusBadge(campaign.status).label}
              </span>
            </div>
            <div className="campaign-stats">
              <div className="stat-item">
                <span className="stat-label">Posts</span>
                <span className="stat-value">{campaign.total_posts || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Reach</span>
                <span className="stat-value">{formatNumber(campaign.total_reach || 0)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Engagement</span>
                <span className="stat-value">
                  {campaign.engagement_rate ? `${campaign.engagement_rate.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentCampaigns

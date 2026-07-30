import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import './WebsiteDetails.css'

const WebsiteDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [website, setWebsite] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndLoadWebsite()
  }, [id, navigate])

  const checkAuthAndLoadWebsite = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
        return
      }
      await loadWebsite(user.id)
    } catch (error) {
      console.error('Auth error:', error)
      navigate('/login')
    }
  }

  const loadWebsite = async (userId) => {
    try {
      // Fetch all websites and filter client-side
      const response = await zendbx.from('websites').select('*')
      
      const allWebsites = response?.data || response || []
      const foundWebsite = allWebsites.find(w => w.id === id && w.user_id === userId)

      if (!foundWebsite) {
        navigate('/websites')
        return
      }

      setWebsite(foundWebsite)
    } catch (error) {
      console.error('Error loading website:', error)
      navigate('/websites')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981',
      inactive: '#6b7280',
      pending: '#f59e0b'
    }
    return colors[status] || '#7c3aed'
  }

  if (loading || !website) {
    return (
      <div className="website-details-page">
        <div className="container">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="website-details-page">
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <button 
            className="btn-back"
            onClick={() => navigate('/websites')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Websites
          </button>

          <div className="header-content">
            <div className="header-left">
              <div className="website-favicon-large">
                {website.name.charAt(0).toUpperCase()}
              </div>
              <div className="header-text">
                <h1 className="page-title">{website.name}</h1>
                <a 
                  href={website.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="website-url-large"
                >
                  {website.url}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="header-actions">
              <div 
                className="website-status-large"
                style={{ background: `${getStatusColor(website.status)}20`, color: getStatusColor(website.status) }}
              >
                {website.status}
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate(`/websites/${website.id}/analysis`)}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Analysis
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="container">
          {/* Metrics Overview */}
          <div className="metrics-grid">
            <div className="metric-card card">
              <div className="metric-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-purple-light)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-label">Total Posts</div>
                <div className="metric-value">{website.posts_count || 0}</div>
              </div>
            </div>

            <div className="metric-card card">
              <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-label">Total Traffic</div>
                <div className="metric-value">{website.traffic || '0'}</div>
              </div>
            </div>

            <div className="metric-card card">
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-label">Performance Score</div>
                <div className="metric-value">{website.score || 'N/A'}</div>
              </div>
            </div>

            <div className="metric-card card">
              <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="metric-info">
                <div className="metric-label">Category</div>
                <div className="metric-value">{website.category}</div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="details-grid">
            {/* About Section */}
            <div className="details-card card">
              <h2 className="details-title">About</h2>
              <div className="details-content">
                <div className="detail-item">
                  <span className="detail-label">Website Name</span>
                  <span className="detail-value">{website.name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">URL</span>
                  <a href={website.url} target="_blank" rel="noopener noreferrer" className="detail-value detail-link">
                    {website.url}
                  </a>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{website.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{website.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Added On</span>
                  <span className="detail-value">
                    {new Date(website.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="details-card card">
              <h2 className="details-title">Description</h2>
              <div className="details-content">
                <p className="description-text">
                  {website.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-section card">
            <h2 className="details-title">Recent Activity</h2>
            <div className="empty-activity">
              <svg className="empty-icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="empty-text">No recent activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WebsiteDetails

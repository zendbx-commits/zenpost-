import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import LinkedInPublishModal from './LinkedInPublishModal'
import Preloader from '../components/Preloader'
import PlatformIcon from '../components/PlatformIcon'
import './Campaigns.css'

const Campaigns = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { generatedCampaigns, showCalendar } = location.state || {}
  
  const [campaigns, setCampaigns] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(showCalendar ? 'calendar' : 'list') // calendar or list
  const [selectedPost, setSelectedPost] = useState(null)
  const [showLinkedInModal, setShowLinkedInModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [showCampaignCalendar, setShowCampaignCalendar] = useState(false)
  const [savingCalendar, setSavingCalendar] = useState(false)

  const handleSaveCalendar = async () => {
    if (!generatedCampaigns || !generatedCampaigns.master_calendar) {
      alert('No calendar data to save');
      return;
    }

    setSavingCalendar(true);
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        navigate('/login');
        return;
      }

      const masterCalendar = generatedCampaigns.master_calendar;
      
      // Group posts by week
      const weeksCount = Math.ceil(masterCalendar.length / 7);
      let created = 0;

      for (let week = 0; week < weeksCount; week++) {
        const weekStart = week * 7;
        const weekEnd = Math.min(weekStart + 7, masterCalendar.length);
        const weekPosts = masterCalendar.slice(weekStart, weekEnd);

        // Calculate date range for this week
        const firstPost = weekPosts[0];
        const lastPost = weekPosts[weekPosts.length - 1];

        const campaignData = {
          id: crypto.randomUUID(),
          user_id: user.id,
          name: `Week ${week + 1} AI Content Campaign`,
          description: `AI-generated content campaign with ${weekPosts.length} posts across multiple platforms`,
          status: 'draft',
          start_date: firstPost.date,
          end_date: lastPost.date,
          posts_count: weekPosts.length,
          // Store the actual posts in metadata field (if your schema supports it)
          // For now, we'll just save the campaign shell
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Saving campaign:', campaignData);
        const result = await zendbx.from('campaigns').insert(campaignData);
        console.log('Campaign save result:', result);
        created++;
      }

      alert(`Successfully saved ${created} campaigns!\n\nNote: To post to LinkedIn, use the calendar view and click "Post to LinkedIn" on any post.`);
      
      // Switch to list view to see saved campaigns
      setView('list');
      
      // Reload campaigns from database
      const user2 = await zendbx.auth.getUser();
      if (user2 && user2.id) {
        await loadCampaigns(user2.id);
      }
      
    } catch (error) {
      console.error('Error saving calendar:', error);
      alert(`Failed to save calendar: ${error.message || 'Unknown error'}\n\nYou can still use "Post to LinkedIn" from the calendar view.`);
    } finally {
      setSavingCalendar(false);
    }
  }

  useEffect(() => {
    // Always check auth first, regardless of view type
    checkAuthAndLoadCampaigns()
  }, [navigate, generatedCampaigns, showCalendar])

  const checkAuthAndLoadCampaigns = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
        return
      }
      
      // If we have generated campaigns for calendar view, just finish loading
      if (generatedCampaigns && showCalendar) {
        setLoading(false)
      } else {
        // Otherwise load campaigns from database
        await loadCampaigns(user.id)
      }
    } catch (error) {
      console.error('Auth error:', error)
      navigate('/login')
    }
  }

  const loadCampaigns = async (userId) => {
    try {
      // Fetch all campaigns and filter client-side
      // ZendBX query builder (.eq, .order) doesn't work as documented
      const response = await zendbx
        .from('campaigns')
        .select('*')

      console.log('Raw campaigns response:', response)

      // Handle the response based on what we get
      let allCampaigns = []
      if (response && response.data) {
        allCampaigns = response.data
      } else if (Array.isArray(response)) {
        allCampaigns = response
      }

      // Filter for current user and sort by created_at descending
      const userCampaigns = allCampaigns
        .filter(c => c.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setCampaigns(userCampaigns)
    } catch (error) {
      console.error('Error loading campaigns:', error)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'green',
      scheduled: 'blue',
      paused: 'orange',
      completed: 'gray',
      draft: 'purple'
    }
    return colors[status] || 'gray'
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || campaign.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const handleDeleteCampaign = async (id) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        const { error } = await zendbx
          .from('campaigns')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Update local state
        setCampaigns(campaigns.filter(c => c.id !== id))
      } catch (error) {
        console.error('Error deleting campaign:', error)
        alert('Failed to delete campaign. Please try again.')
      }
    }
  }

  const handleViewCampaignCalendar = (campaign) => {
    setSelectedCampaign(campaign)
    setShowCampaignCalendar(true)
  }

  if (loading) {
    return <Preloader message="Loading campaigns..." />;
  }

  // If we have generated campaigns, show calendar view
  if (generatedCampaigns && view === 'calendar') {
    const masterCalendar = generatedCampaigns.master_calendar || []
    const campaignsList = generatedCampaigns.campaigns || []
    const summary = generatedCampaigns.summary || {}

    // Group posts by date
    const postsByDate = masterCalendar.reduce((acc, post) => {
      const date = post.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(post)
      return acc
    }, {})

    // Get calendar weeks
    const getCalendarWeeks = () => {
      if (masterCalendar.length === 0) return []
      
      const startDate = new Date(masterCalendar[0].date)
      const endDate = new Date(masterCalendar[masterCalendar.length - 1].date)
      
      const weeks = []
      let currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const weekStart = new Date(currentDate)
        const weekDays = []
        
        for (let i = 0; i < 7; i++) {
          const day = new Date(weekStart)
          day.setDate(weekStart.getDate() + i)
          
          if (day >= startDate && day <= endDate) {
            const dateStr = day.toISOString().split('T')[0]
            weekDays.push({
              date: dateStr,
              day: day.getDate(),
              posts: postsByDate[dateStr] || []
            })
          }
        }
        
        if (weekDays.length > 0) {
          weeks.push(weekDays)
        }
        
        currentDate.setDate(currentDate.getDate() + 7)
      }
      
      return weeks
    }

    const weeks = getCalendarWeeks()

    return (
      <div className="campaigns-page">
        {/* Header */}
        <div className="page-header">
          <div className="container">
            <div className="header-content">
              <div className="header-text">
                <h1 className="page-title">
                  <span className="gradient-text">Content Calendar</span>
                </h1>
                <p className="page-subtitle">
                  {summary.total_posts} posts across {summary.total_campaigns} campaigns • {summary.duration_days} days
                </p>
              </div>
              <div className="header-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setView('list');
                    checkAuthAndLoadCampaigns();
                  }}
                >
                  View My Campaigns
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/schedule-posts', { 
                    state: { generatedCampaigns } 
                  })}
                  style={{ marginRight: '0.5rem' }}
                >
                  Schedule Posts
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleSaveCalendar}
                  disabled={savingCalendar}
                >
                  {savingCalendar ? 'Saving...' : 'Save Calendar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="page-content">
          <div className="container">
            {/* Summary Cards */}
            <div className="calendar-summary">
              <div className="summary-card">
                <span className="summary-label">Total Posts</span>
                <span className="summary-value">{summary.total_posts || masterCalendar.length || 0}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Campaigns</span>
                <span className="summary-value">{summary.total_campaigns || campaignsList.length || 0}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Duration</span>
                <span className="summary-value">{summary.duration_days || 30} days</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Platforms</span>
                <span className="summary-value">{summary.platforms?.length || [...new Set(masterCalendar.flatMap(p => p.platforms || []))].length || 0}</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="content-calendar-view card">
              <div className="calendar-weekdays">
                <div className="weekday">Mon</div>
                <div className="weekday">Tue</div>
                <div className="weekday">Wed</div>
                <div className="weekday">Thu</div>
                <div className="weekday">Fri</div>
                <div className="weekday">Sat</div>
                <div className="weekday">Sun</div>
              </div>
              
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="calendar-week">
                  {week.map((day, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className={`calendar-day ${day.posts.length > 0 ? 'has-posts' : ''}`}
                    >
                      <div className="day-number">{day.day}</div>
                      {day.posts.length > 0 && (
                        <div className="day-posts">
                          {day.posts.map((post, postIndex) => (
                            <div 
                              key={postIndex}
                              className={`post-indicator ${post.post_type?.toLowerCase()}`}
                              title={post.headline}
                              onClick={() => setSelectedPost(post)}
                            >
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {post.platforms?.map((p, idx) => (
                                  <PlatformIcon key={idx} platform={p} size="small" />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Post List */}
            <div className="calendar-posts-list">
              <h2>All Posts</h2>
              <div className="posts-grid">
                {masterCalendar.map((post, index) => (
                  <div key={index} className="calendar-post-card card" onClick={() => setSelectedPost(post)}>
                    <div className="post-date-badge">{post.date}</div>
                    <h3>{post.headline}</h3>
                    <p className="post-hook">{post.hook}</p>
                    <div className="post-meta-row">
                      <span className={`post-type ${post.post_type?.toLowerCase()}`}>
                        {post.post_type}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {post.platforms?.map((p, i) => (
                          <PlatformIcon key={i} platform={p} size="small" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedPost(null)}>×</button>
              
              <div className="modal-header">
                <h2>{selectedPost.headline}</h2>
                <div className="modal-meta">
                  <span className={`post-type ${selectedPost.post_type?.toLowerCase()}`}>
                    {selectedPost.post_type}
                  </span>
                  <span className="post-date-badge">{selectedPost.date}</span>
                </div>
              </div>

              <div className="modal-body">
                <div className="modal-section">
                  <label>Platforms:</label>
                  <div className="platforms-list" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedPost.platforms?.map((platform, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <PlatformIcon platform={platform} size="small" showLabel={true} />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="modal-section">
                  <label>Hook:</label>
                  <p className="hook-text">{selectedPost.hook}</p>
                </div>

                <div className="modal-section">
                  <label>Caption:</label>
                  <p className="caption-text">{selectedPost.caption}</p>
                </div>

                <div className="modal-section">
                  <label>Call to Action:</label>
                  <p className="cta-text">{selectedPost.call_to_action}</p>
                </div>

                <div className="modal-section">
                  <label>Hashtags:</label>
                  <div className="hashtags-list">
                    {selectedPost.hashtags?.map((tag, i) => (
                      <span key={i} className="hashtag">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="modal-section">
                  <label>Image Prompt:</label>
                  <p className="image-prompt">{selectedPost.image_prompt}</p>
                </div>

                <div className="modal-section">
                  <label>Best Time:</label>
                  <p>{selectedPost.best_time}</p>
                </div>
              </div>

              <div className="modal-actions">
                {selectedPost.platforms?.includes('LinkedIn') && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowLinkedInModal(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                    </svg>
                    Post to LinkedIn
                  </button>
                )}
                <button className="btn btn-secondary">Edit Post</button>
                <button className="btn btn-secondary" onClick={() => setSelectedPost(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* LinkedIn Publishing Modal */}
        {showLinkedInModal && selectedPost && (
          <LinkedInPublishModal
            post={selectedPost}
            onClose={() => setShowLinkedInModal(false)}
            onPublished={(data) => {
              console.log('Published successfully:', data);
              setSelectedPost(null);
              setShowLinkedInModal(false);
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="campaigns-page">
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1 className="page-title">
                <span className="gradient-text">Campaigns</span>
              </h1>
              <p className="page-subtitle">
                Manage your marketing campaigns
              </p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/campaigns/create')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="container">
          
          {/* LinkedIn Posting Guide */}
          <div className="info-banner" style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '32px', height: '32px', flexShrink: 0 }}>
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>📤 Post to LinkedIn</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
                Go to <strong>Website Analysis</strong> → Click <strong>"Generate Marketing Intelligence"</strong> → View the calendar → Click any post → <strong>"Post to LinkedIn"</strong>
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="campaigns-filters card">
            <div className="filter-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-tabs">
              {['all', 'active', 'scheduled', 'paused', 'completed', 'draft'].map(status => (
                <button
                  key={status}
                  className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Campaigns List */}
          {filteredCampaigns.length === 0 ? (
            <div className="empty-state card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <h3>No campaigns found</h3>
              <p>Create your first campaign to get started</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/campaigns/create')}
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="campaigns-grid">
              {filteredCampaigns.map(campaign => (
                <div key={campaign.id} className="campaign-card card">
                  <div className="campaign-header">
                    <h3 className="campaign-name">{campaign.name}</h3>
                    <span className={`status-badge status-${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>

                  <p className="campaign-description">{campaign.description}</p>

                  <div className="campaign-meta">
                    <div className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{campaign.start_date} - {campaign.end_date}</span>
                    </div>
                    <div className="meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{campaign.posts_count || 0} posts</span>
                    </div>
                  </div>

                  <div className="campaign-stats">
                    <div className="stat">
                      <span className="stat-value">{campaign.reach || 0}</span>
                      <span className="stat-label">Reach</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{campaign.engagement || 0}%</span>
                      <span className="stat-label">Engagement</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{campaign.conversions || 0}</span>
                      <span className="stat-label">Conversions</span>
                    </div>
                  </div>

                  <div className="campaign-actions">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => alert('Campaign details view coming soon!')}
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    >
                      View Details
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleViewCampaignCalendar(campaign)}
                    >
                      Calendar
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => alert('Campaign analytics coming soon!')}
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    >
                      Analytics
                    </button>
                    <button 
                      className="btn-icon"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Calendar Modal */}
      {showCampaignCalendar && selectedCampaign && (
        <div className="modal-overlay" onClick={() => setShowCampaignCalendar(false)}>
          <div className="modal-content campaign-calendar-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%' }}>
            <button className="modal-close" onClick={() => setShowCampaignCalendar(false)}>×</button>
            
            <div className="modal-header">
              <h2>{selectedCampaign.name}</h2>
              <p>{selectedCampaign.description}</p>
            </div>

            <div className="modal-body">
              {selectedCampaign.content_pieces && selectedCampaign.content_pieces.length > 0 ? (
                <div className="calendar-posts-grid">
                  {selectedCampaign.content_pieces.map((post, index) => (
                    <div key={index} className="calendar-post-card card" onClick={() => setSelectedPost(post)}>
                      <div className="post-header">
                        <span className="day-badge">Day {post.day}</span>
                        <span className="platform-badge">
                          <PlatformIcon platform={post.platform} size="small" showLabel={true} />
                        </span>
                      </div>
                      <h4>{post.title}</h4>
                      <p className="post-caption">{post.caption?.substring(0, 100)}...</p>
                      <div className="post-meta">
                        <span>{post.scheduled_time}</span>
                        <span className="content-type">{post.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }}>
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3>No Posts in This Campaign</h3>
                  <p style={{ marginBottom: '1rem' }}>Saved campaigns don't include individual post data yet.</p>
                  <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', fontSize: '0.9em' }}>
                    <strong>To post to LinkedIn:</strong>
                    <ol style={{ textAlign: 'left', margin: '0.5rem 0 0 1.5rem', lineHeight: '1.6' }}>
                      <li>Go to Website Analysis page</li>
                      <li>Click "Generate Marketing Intelligence"</li>
                      <li>View the generated Content Calendar</li>
                      <li>Click any post → "Post to LinkedIn"</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCampaignCalendar(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Campaigns

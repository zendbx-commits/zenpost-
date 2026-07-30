import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import zendbx from '../../lib/zendbx'
import './RecentPosts.css'

const RecentPosts = () => {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) return

      // Fetch all posts and filter client-side (ZendBX .eq doesn't work as expected)
      const response = await zendbx
        .from('posts')
        .select('*')

      const allPosts = response?.data || response || []
      
      // Filter for current user and sort
      const userPosts = allPosts
        .filter(p => p.user_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4)

      setPosts(userPosts)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    return status === 'published' 
      ? { class: 'status-published', label: 'Published' }
      : { class: 'status-scheduled', label: 'Scheduled' }
  }

  const getPlatformColor = (platform) => {
    const colors = {
      twitter: '#1DA1F2',
      linkedin: '#0A66C2',
      instagram: '#E4405F',
      facebook: '#1877F2'
    }
    return colors[platform?.toLowerCase()] || '#7c3aed'
  }

  const getPlatformIcon = (platform) => {
    const icons = {
      twitter: '𝕏',
      linkedin: 'in',
      instagram: 'IG',
      facebook: 'f'
    }
    return icons[platform?.toLowerCase()] || platform?.charAt(0).toUpperCase() || 'P'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="recent-posts">
        <div className="section-header">
          <h2 className="section-title">Recent Posts</h2>
        </div>
        <div className="posts-list card">
          <div className="loading-placeholder">Loading posts...</div>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="recent-posts">
        <div className="section-header">
          <h2 className="section-title">Recent Posts</h2>
        </div>
        <div className="posts-list card">
          <div className="empty-state">
            <p>No posts yet. Create your first campaign to schedule posts!</p>
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
    <div className="recent-posts">
      <div className="section-header">
        <h2 className="section-title">Recent Posts</h2>
        <button className="btn-text" onClick={() => navigate('/content-calendar')}>
          View All →
        </button>
      </div>

      <div className="posts-list card">
        {posts.map((post) => (
          <div key={post.id} className="post-item">
            <div className="post-header">
              <div 
                className="platform-badge"
                style={{ 
                  background: `${getPlatformColor(post.platform)}20`, 
                  color: getPlatformColor(post.platform) 
                }}
              >
                {getPlatformIcon(post.platform)}
              </div>
              <span className={`status-badge ${getStatusBadge(post.status).class}`}>
                {getStatusBadge(post.status).label}
              </span>
            </div>
            
            <p className="post-content">
              {post.content?.substring(0, 120)}{post.content?.length > 120 ? '...' : ''}
            </p>
            
            <div className="post-footer">
              <span className="post-date">
                {post.status === 'scheduled' && post.scheduled_time
                  ? formatDate(post.scheduled_time)
                  : formatDate(post.published_at || post.created_at)
                }
              </span>
              {post.status === 'published' && (
                <div className="post-stats">
                  <span className="post-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {post.likes || 0}
                  </span>
                  <span className="post-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {post.comments || 0}
                  </span>
                  <span className="post-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {post.shares || 0}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentPosts

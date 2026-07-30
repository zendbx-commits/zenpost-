import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import Preloader from '../components/Preloader'
import './Websites.css'

const Websites = () => {
  const navigate = useNavigate()
  const [websites, setWebsites] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndLoadWebsites()
  }, [navigate])

  const checkAuthAndLoadWebsites = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
        return
      }
      await loadWebsites(user.id)
    } catch (error) {
      console.error('Auth error:', error)
      navigate('/login')
    }
  }

  const loadWebsites = async (userId) => {
    try {
      // Try the basic select first to see what the SDK returns
      const response = await zendbx
        .from('websites')
        .select('*')

      console.log('Raw response:', response)

      // Handle the response based on what we get
      if (response && response.data) {
        // Filter on client side for now
        const userWebsites = response.data.filter(w => w.user_id === userId)
        setWebsites(userWebsites)
      } else if (Array.isArray(response)) {
        const userWebsites = response.filter(w => w.user_id === userId)
        setWebsites(userWebsites)
      } else {
        setWebsites([])
      }
    } catch (error) {
      console.error('Error loading websites:', error)
      setWebsites([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWebsite = async (id) => {
    if (window.confirm('Are you sure you want to delete this website?')) {
      try {
        const { error } = await zendbx
          .from('websites')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Update local state
        setWebsites(websites.filter(w => w.id !== id))
      } catch (error) {
        console.error('Error deleting website:', error)
        alert('Failed to delete website. Please try again.')
      }
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

  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         website.url?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || website.status === filterStatus
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return <Preloader message="Loading websites..." />
  }

  return (
    <div className="websites-page">
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1 className="page-title">
                <span className="gradient-text">Websites</span>
              </h1>
              <p className="page-subtitle">
                Manage and analyze your connected websites
              </p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/websites/add')}
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Add Website
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="container">
          {/* Filters */}
          <div className="filters-bar">
            <div className="search-box">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search websites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-group">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Websites Grid */}
          {filteredWebsites.length === 0 ? (
            <div className="empty-state card">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <h3 className="empty-title">No websites found</h3>
              <p className="empty-description">
                {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first website'}
              </p>
              {!searchTerm && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/websites/add')}
                >
                  Add Your First Website
                </button>
              )}
            </div>
          ) : (
            <div className="websites-grid">
              {filteredWebsites.map((website) => (
                <div key={website.id} className="website-card card">
                  <div className="website-header">
                    <div className="website-favicon">
                      {website.name.charAt(0).toUpperCase()}
                    </div>
                    <div 
                      className="website-status"
                      style={{ background: `${getStatusColor(website.status)}20`, color: getStatusColor(website.status) }}
                    >
                      {website.status}
                    </div>
                  </div>

                  <h3 className="website-name">{website.name}</h3>
                  <a 
                    href={website.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="website-url"
                  >
                    {website.url}
                  </a>

                  <div className="website-stats">
                    <div className="stat-item">
                      <span className="stat-label">Posts</span>
                      <span className="stat-value">{website.posts_count || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Traffic</span>
                      <span className="stat-value">{website.traffic || '0'}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Score</span>
                      <span className="stat-value">{website.score || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="website-actions">
                    <button 
                      className="btn-icon-action"
                      onClick={() => navigate(`/websites/${website.id}`)}
                      title="View Details"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button 
                      className="btn-icon-action"
                      onClick={() => navigate(`/websites/${website.id}/analysis`)}
                      title="AI Analysis"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </button>
                    <button 
                      className="btn-icon-action danger"
                      onClick={() => handleDeleteWebsite(website.id)}
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
    </div>
  )
}

export default Websites

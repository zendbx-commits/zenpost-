import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import Preloader from '../components/Preloader'
import '../theme-blue-black.css'
import './AddWebsite.css'

const AddWebsite = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: 'blog',
    status: 'active'
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth()
  }, [navigate])

  const checkAuth = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
      } else {
        setLoading(false);
      }
    } catch (error) {
      navigate('/login')
    }
  }

  if (loading) {
    return <Preloader message="Loading add website..." />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const validateUrl = (url) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    // Validation
    if (!formData.name.trim()) {
      setError('Website name is required')
      setIsSubmitting(false)
      return
    }

    if (!validateUrl(formData.url)) {
      setError('Please enter a valid URL (e.g., https://example.com)')
      setIsSubmitting(false)
      return
    }

    try {
      const user = await zendbx.auth.getUser()
      
      if (!user || !user.id) {
        navigate('/login')
        return
      }

      // Create new website - ZendBX expects single object, not array
      const response = await zendbx
        .from('websites')
        .insert({
          user_id: user.id,
          name: formData.name,
          url: formData.url,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          posts_count: 0,
          traffic: '0',
          score: 'N/A'
        })

      console.log('Insert response:', response)

      // Handle different response formats
      let newWebsite = null
      if (response && response.data && response.data.length > 0) {
        newWebsite = response.data[0]
      } else if (response && Array.isArray(response) && response.length > 0) {
        newWebsite = response[0]
      } else if (response && response.id) {
        newWebsite = response
      } else if (response) {
        // Use the inserted data
        newWebsite = {
          id: response.id || Date.now().toString(),
          ...formData,
          user_id: user.id
        }
      }

      if (newWebsite) {
        // Redirect to websites list
        navigate('/websites')
      } else {
        throw new Error('Failed to create website')
      }
    } catch (err) {
      console.error('Error adding website:', err)
      setError(err.message || 'An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="add-website-page">
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
          <h1 className="page-title">
            <span className="gradient-text">Add New Website</span>
          </h1>
          <p className="page-subtitle">
            Connect a new website to manage and analyze its content
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          <div className="form-container">
            <form className="website-form card" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Website Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-input"
                    placeholder="My Awesome Blog"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  <p className="form-hint">A friendly name for your website</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="url" className="form-label">
                    Website URL *
                  </label>
                  <input
                    type="url"
                    id="url"
                    name="url"
                    className="form-input"
                    placeholder="https://example.com"
                    value={formData.url}
                    onChange={handleChange}
                    required
                  />
                  <p className="form-hint">The full URL of your website</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-textarea"
                    placeholder="Brief description of your website..."
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                  />
                </div>
              </div>

              <div className="form-row-split">
                <div className="form-group">
                  <label htmlFor="category" className="form-label">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="blog">Blog</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="business">Business</option>
                    <option value="news">News</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status" className="form-label">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/websites')}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Website'}
                </button>
              </div>
            </form>

            <div className="info-card card">
              <h3 className="info-title">Why add your website?</h3>
              <ul className="info-list">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Centralize all your content in one place
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Get AI-powered content analysis
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Track performance metrics
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Schedule posts across platforms
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddWebsite

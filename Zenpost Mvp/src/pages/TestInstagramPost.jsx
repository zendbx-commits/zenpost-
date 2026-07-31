import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import './TestInstagramPost.css'

const TestInstagramPost = () => {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [posting, setPosting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAuthAndLoadAccounts()
  }, [navigate])

  const checkAuthAndLoadAccounts = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
        return
      }
      setUserId(user.id)
      await loadInstagramAccounts(user.id)
    } catch (error) {
      console.error('Auth error:', error)
      navigate('/login')
    }
  }

  const loadInstagramAccounts = async (userId) => {
    try {
      const response = await zendbx
        .from('socials')
        .select('*')

      let allAccounts = []
      if (response && response.data) {
        allAccounts = response.data
      } else if (Array.isArray(response)) {
        allAccounts = response
      }

      const instagramAccounts = allAccounts.filter(
        acc => acc.user_id === userId && acc.platform === 'instagram'
      )

      setAccounts(instagramAccounts)
      if (instagramAccounts.length > 0) {
        setSelectedAccount(instagramAccounts[0].id)
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const handleTestPost = async (e) => {
    e.preventDefault()
    
    if (!selectedAccount) {
      setError('Please select an Instagram account')
      return
    }

    if (!imageUrl) {
      setError('Please provide an image URL')
      return
    }

    setPosting(true)
    setError(null)
    setResult(null)

    try {
      // Use environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'

      const response = await fetch(`${apiBaseUrl}/api/instagram/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: selectedAccount,
          image_url: imageUrl,
          caption: caption,
          post_type: 'feed'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: 'Post published successfully!',
          postId: data.post_id,
          permalink: data.permalink
        })
        // Clear form
        setImageUrl('')
        setCaption('')
      } else {
        throw new Error(data.message || data.detail || 'Failed to post')
      }
    } catch (err) {
      console.error('Post error:', err)
      setError(err.message || 'Failed to post to Instagram')
    } finally {
      setPosting(false)
    }
  }

  const sampleImages = [
    'https://picsum.photos/1080/1080?random=1',
    'https://picsum.photos/1080/1080?random=2',
    'https://picsum.photos/1080/1080?random=3',
  ]

  return (
    <div className="test-post-page">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate('/social/accounts')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Accounts
            </button>
            <div className="header-text">
              <h1 className="page-title">
                <span className="gradient-text">Test Instagram Post</span>
              </h1>
              <p className="page-subtitle">
                Test your Instagram connection by posting a sample image
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          <div className="test-post-container">
            {accounts.length === 0 ? (
              <div className="no-accounts-message card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                <h3>No Instagram Accounts Connected</h3>
                <p>Connect an Instagram account first to test posting</p>
                <button className="btn btn-primary" onClick={() => navigate('/social/accounts')}>
                  Connect Instagram Account
                </button>
              </div>
            ) : (
              <div className="test-post-grid">
                <div className="post-form-section card">
                  <h2>Create Test Post</h2>

                  <form onSubmit={handleTestPost}>
                    <div className="form-group">
                      <label>Instagram Account</label>
                      <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="form-control"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            @{account.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="form-control"
                        required
                      />
                      <small className="form-help">
                        Must be a publicly accessible HTTPS URL
                      </small>
                    </div>

                    <div className="quick-images">
                      <label>Or use a sample image:</label>
                      <div className="sample-images">
                        {sampleImages.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="sample-image-btn"
                            onClick={() => setImageUrl(url)}
                          >
                            <img src={url} alt={`Sample ${idx + 1}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Caption (Optional)</label>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write your post caption... #hashtags"
                        className="form-control"
                        rows="4"
                      />
                      <small className="form-help">
                        {caption.length} characters
                      </small>
                    </div>

                    {error && (
                      <div className="alert alert-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v4m0 4h.01" />
                        </svg>
                        {error}
                      </div>
                    )}

                    {result && result.success && (
                      <div className="alert alert-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <strong>{result.message}</strong>
                          {result.permalink && (
                            <a
                              href={result.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-post-link"
                            >
                              View on Instagram →
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary btn-block"
                      disabled={posting || !selectedAccount || !imageUrl}
                      style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
                    >
                      {posting ? (
                        <>
                          <div className="spinner-small"></div>
                          Publishing to Instagram...
                        </>
                      ) : (
                        <>
                          <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <circle cx="12" cy="12" r="4" />
                          </svg>
                          Post to Instagram
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div className="preview-section card">
                  <h2>Preview</h2>
                  <div className="instagram-preview">
                    <div className="preview-header">
                      <div className="preview-avatar">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                          <circle cx="12" cy="12" r="4" />
                        </svg>
                      </div>
                      <div className="preview-username">
                        {accounts.find(a => a.id === selectedAccount)?.username || 'username'}
                      </div>
                    </div>
                    <div className="preview-image">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" onError={(e) => e.target.src = 'https://via.placeholder.com/400x400?text=Invalid+Image'} />
                      ) : (
                        <div className="preview-placeholder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="M21 15l-5-5L5 21"/>
                          </svg>
                          <p>Image preview</p>
                        </div>
                      )}
                    </div>
                    <div className="preview-actions">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                      </svg>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                      </svg>
                    </div>
                    {caption && (
                      <div className="preview-caption">
                        <strong>{accounts.find(a => a.id === selectedAccount)?.username || 'username'}</strong> {caption}
                      </div>
                    )}
                  </div>

                  <div className="preview-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4m0-4h.01" />
                    </svg>
                    <p>
                      <strong>Note:</strong> Instagram requires images to be:
                    </p>
                    <ul>
                      <li>Publicly accessible HTTPS URLs</li>
                      <li>JPG or PNG format</li>
                      <li>Minimum 320px width</li>
                      <li>Aspect ratio between 4:5 and 1.91:1</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestInstagramPost

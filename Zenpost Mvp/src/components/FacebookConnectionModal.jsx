import { useState, useEffect } from 'react'
import './LinkedInConnectionModal.css' // Reuse styles

const FacebookConnectionModal = ({ isOpen, onClose, onConnect, userId }) => {
  const [step, setStep] = useState(1) // 1: Auth, 2: Select pages, 3: Success
  const [loading, setLoading] = useState(false)
  const [authWindow, setAuthWindow] = useState(null)
  const [authData, setAuthData] = useState(null)
  const [selectedPages, setSelectedPages] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === 'FACEBOOK_AUTH_SUCCESS') {
        console.log('Facebook auth success:', event.data.data)
        setAuthData(event.data.data)
        setStep(2)
        setLoading(false)
        
        if (authWindow) {
          authWindow.close()
        }
      } else if (event.data.type === 'FACEBOOK_AUTH_ERROR') {
        setError(event.data.error)
        setLoading(false)
        if (authWindow) {
          authWindow.close()
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [authWindow])

  const handleStartAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'

      const response = await fetch(`${apiBaseUrl}/api/auth/facebook/initiate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId})
      })

      const data = await response.json()

      if (data.success) {
        const width = 600
        const height = 700
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2
        
        const popup = window.open(
          data.auth_url,
          'Facebook Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        )
        
        setAuthWindow(popup)
      } else {
        throw new Error(data.message || 'Failed to initiate Facebook auth')
      }
    } catch (err) {
      console.error('Facebook auth error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const togglePageSelection = (page) => {
    setSelectedPages(prev => {
      const exists = prev.find(p => p.id === page.id)
      return exists ? prev.filter(p => p.id !== page.id) : [...prev, page]
    })
  }

  const handleFinishConnection = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'

      const response = await fetch(`${apiBaseUrl}/api/auth/facebook/save-connection`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          access_token: authData.access_token,
          profile: authData.profile,
          pages: selectedPages
        })
      })

      const data = await response.json()

      if (data.success) {
        setStep(3)
        setTimeout(() => {
          onConnect(data.accounts)
          handleClose()
        }, 2000)
      } else {
        throw new Error(data.message || 'Failed to save Facebook connection')
      }
    } catch (err) {
      console.error('Save connection error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setAuthData(null)
    setSelectedPages([])
    setError(null)
    setLoading(false)
    if (authWindow) {
      authWindow.close()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content linkedin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 1 && (
          <div className="modal-step">
            <div className="linkedin-icon" style={{ background: 'rgba(24, 119, 242, 0.1)' }}>
              <svg viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>

            <h2>Connect to Facebook</h2>
            <p className="modal-description">
              Authorize ZenPost to access your Facebook account and pages
            </p>

            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <button 
              className="btn btn-primary btn-block"
              onClick={handleStartAuth}
              disabled={loading}
              style={{ background: '#1877F2' }}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Connecting to Facebook...
                </>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Continue with Facebook
                </>
              )}
            </button>

            <p className="modal-note">
              You'll be redirected to Facebook to authorize this connection
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="modal-step">
            <h2>Select Pages</h2>
            <p className="modal-description">
              Your profile will be connected. Select any pages you want to manage.
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="accounts-selection">
              {authData.pages && authData.pages.length > 0 ? (
                authData.pages.map((page) => (
                  <div 
                    key={page.id}
                    className={`account-option ${selectedPages.find(p => p.id === page.id) ? 'selected' : ''}`}
                    onClick={() => togglePageSelection(page)}
                  >
                    <div className="account-option-left">
                      <div className="account-option-avatar">
                        {page.picture_url ? (
                          <img src={page.picture_url} alt={page.name} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                      </div>
                      <div className="account-option-info">
                        <div className="account-option-name">{page.name}</div>
                        <div className="account-option-type">{page.followers.toLocaleString()} followers</div>
                      </div>
                    </div>
                    <div className="account-option-checkbox">
                      {selectedPages.find(p => p.id === page.id) && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-companies-message">
                  <p>No Facebook Pages found. Your profile will still be connected.</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                style={{ background: '#1877F2' }}
                onClick={handleFinishConnection}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Connecting...
                  </>
                ) : (
                  `Connect Profile${selectedPages.length > 0 ? ` + ${selectedPages.length} Page${selectedPages.length !== 1 ? 's' : ''}` : ''}`
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="modal-step success-step">
            <div className="success-icon" style={{ background: 'rgba(24, 119, 242, 0.1)', color: '#1877F2' }}>✓</div>
            <h2>Successfully Connected!</h2>
            <p className="modal-description">
              Your Facebook account has been connected to ZenPost
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacebookConnectionModal

import { useState, useEffect } from 'react'
import './LinkedInConnectionModal.css' // Reuse styles

const InstagramConnectionModal = ({ isOpen, onClose, onConnect, userId }) => {
  const [step, setStep] = useState(1) // 1: Auth, 2: Select accounts, 3: Success
  const [loading, setLoading] = useState(false)
  const [authWindow, setAuthWindow] = useState(null)
  const [authData, setAuthData] = useState(null)
  const [selectedPages, setSelectedPages] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === 'INSTAGRAM_AUTH_SUCCESS') {
        console.log('Instagram auth success:', event.data.data)
        console.log('Pages received:', event.data.data.pages)
        
        // Debug each page
        if (event.data.data.pages) {
          event.data.data.pages.forEach((page, idx) => {
            console.log(`Page ${idx + 1}:`, {
              id: page.id,
              name: page.name,
              hasInstagram: !!page.instagram,
              instagramBusinessAccount: page.instagram_business_account,
              fullPage: page
            })
            
            // Show access token and Instagram ID prominently
            if (page.instagram) {
              console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #833ab4; font-weight: bold')
              console.log('%c📋 COPY THESE FOR CURL TESTING:', 'color: #833ab4; font-weight: bold; font-size: 14px')
              console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #833ab4; font-weight: bold')
              console.log('Access Token:', event.data.data.access_token)
              console.log('Instagram Account ID:', page.instagram.id)
              console.log('Instagram Username:', page.instagram.username)
              console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #833ab4; font-weight: bold')
            }
          })
        }
        
        setAuthData(event.data.data)
        setStep(2)
        setLoading(false)
        
        if (authWindow) {
          authWindow.close()
        }
      } else if (event.data.type === 'INSTAGRAM_AUTH_ERROR') {
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

      const response = await fetch(`${apiBaseUrl}/api/auth/instagram/initiate`, {
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
          'Instagram Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        )
        
        setAuthWindow(popup)
      } else {
        throw new Error(data.message || 'Failed to initiate Instagram auth')
      }
    } catch (err) {
      console.error('Instagram auth error:', err)
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

      const response = await fetch(`${apiBaseUrl}/api/auth/instagram/save-connection`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: userId,
          access_token: authData.access_token,
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
        throw new Error(data.message || 'Failed to save Instagram connection')
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

  const pagesWithInstagram = authData?.pages?.filter(p => p.instagram) || []

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
            <div className="linkedin-icon" style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}>
              <svg viewBox="0 0 24 24" fill="#fff">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="none" stroke="rgba(131,58,180,0.3)" strokeWidth="2"/>
                <circle cx="17.5" cy="6.5" r="1.5" fill="rgba(131,58,180,0.3)"/>
              </svg>
            </div>

            <h2>Connect to Instagram</h2>
            <p className="modal-description">
              Connect your Instagram Business account to start posting
            </p>

            <div className="info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4m0-4h.01" />
              </svg>
              <div>
                <strong>Requirements:</strong>
                <ul>
                  <li>Instagram Business or Creator account</li>
                  <li>Connected to a Facebook Page</li>
                </ul>
              </div>
            </div>

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
              style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Connecting to Instagram...
                </>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Continue with Instagram
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
            <h2>Select Instagram Accounts</h2>
            <p className="modal-description">
              Select the Instagram accounts you want to connect
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="accounts-selection">
              {pagesWithInstagram.length > 0 ? (
                pagesWithInstagram.map((page) => (
                  <div 
                    key={page.id}
                    className={`account-option ${selectedPages.find(p => p.id === page.id) ? 'selected' : ''}`}
                    onClick={() => togglePageSelection(page)}
                  >
                    <div className="account-option-left">
                      <div className="account-option-avatar">
                        {page.instagram.profile_picture_url ? (
                          <img src={page.instagram.profile_picture_url} alt={page.instagram.username} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                            <circle cx="12" cy="12" r="4" />
                          </svg>
                        )}
                      </div>
                      <div className="account-option-info">
                        <div className="account-option-name">@{page.instagram.username}</div>
                        <div className="account-option-type">
                          {page.instagram.followers_count?.toLocaleString() || 0} followers
                        </div>
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
              ) : authData?.pages && authData.pages.length > 0 ? (
                <div className="no-companies-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  <p>
                    <strong>Found {authData.pages.length} Facebook Page(s), but none have Instagram connected</strong><br/>
                    To fix this, you need to:
                  </p>
                  <ol style={{ textAlign: 'left', marginTop: '10px', paddingLeft: '20px' }}>
                    <li>Convert your Instagram account to a <strong>Business</strong> or <strong>Creator</strong> account</li>
                    <li>Go to your Instagram settings → "Account" → "Linked Accounts"</li>
                    <li>Link your Instagram to one of your Facebook Pages:
                      <ul style={{ marginTop: '5px', fontSize: '13px', color: '#666' }}>
                        {authData.pages.map((page, idx) => (
                          <li key={idx}>{page.name}</li>
                        ))}
                      </ul>
                    </li>
                  </ol>
                  <div style={{ marginTop: '15px', padding: '10px', background: '#f3f4f6', borderRadius: '8px', fontSize: '13px' }}>
                    <strong>📱 Quick Guide:</strong><br/>
                    Instagram App → Profile → ☰ Menu → Settings → Business → Page → Select a Facebook Page
                  </div>
                  <a 
                    href="https://help.instagram.com/399237934150902" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#833ab4', marginTop: '15px', display: 'inline-block' }}
                  >
                    View Instagram's Official Guide →
                  </a>
                </div>
              ) : (
                <div className="no-companies-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                  <p>
                    <strong>No Facebook Pages found</strong><br/>
                    You need to create a Facebook Page first to connect Instagram.
                  </p>
                  <ol style={{ textAlign: 'left', marginTop: '10px', paddingLeft: '20px' }}>
                    <li>Go to <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer" style={{ color: '#833ab4' }}>Facebook Pages</a></li>
                    <li>Create a Page for your business</li>
                    <li>Convert your Instagram to Business account</li>
                    <li>Link Instagram to your Facebook Page</li>
                    <li>Come back and try connecting again</li>
                  </ol>
                  <a 
                    href="https://www.facebook.com/business/help/898752960195806" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#833ab4', marginTop: '15px', display: 'inline-block' }}
                  >
                    Learn more about Facebook Pages →
                  </a>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
                onClick={handleFinishConnection}
                disabled={loading || selectedPages.length === 0}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Connecting...
                  </>
                ) : (
                  `Connect ${selectedPages.length} Account${selectedPages.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="modal-step success-step">
            <div className="success-icon" style={{ 
              background: 'linear-gradient(135deg, rgba(131,58,180,0.1) 0%, rgba(253,29,29,0.1) 50%, rgba(252,176,69,0.1) 100%)',
              color: '#833ab4'
            }}>✓</div>
            <h2>Successfully Connected!</h2>
            <p className="modal-description">
              Your Instagram account has been connected to ZenPost
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InstagramConnectionModal

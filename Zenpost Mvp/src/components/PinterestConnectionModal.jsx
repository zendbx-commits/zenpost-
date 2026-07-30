import { useState, useEffect } from 'react'
import './LinkedInConnectionModal.css' // Reuse existing styles

const PinterestConnectionModal = ({ isOpen, onClose, onConnect, userId }) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [authWindow, setAuthWindow] = useState(null)

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = async (event) => {
      // Security: verify origin (in production, check event.origin)
      if (event.data.type === 'PINTEREST_AUTH_SUCCESS') {
        console.log('Pinterest auth success:', event.data.data)
        
        const { access_token, refresh_token, user_info } = event.data.data
        
        try {
          setIsConnecting(true)
          setError(null)
          
          // Save the connection to the database
          const response = await fetch('http://localhost:8001/api/auth/pinterest/save-connection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              access_token: access_token,
              refresh_token: refresh_token,
              username: user_info.username,
              account_type: user_info.account_type || 'PERSONAL'
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Failed to save Pinterest connection')
          }
          
          const data = await response.json()
          console.log('Pinterest connection saved:', data)
          
          // Notify parent component
          if (onConnect) {
            onConnect(data.accounts || [])
          }
          
          // Close modal
          onClose()
          
        } catch (err) {
          console.error('Error saving Pinterest connection:', err)
          setError(err.message)
        } finally {
          setIsConnecting(false)
          if (authWindow) {
            authWindow.close()
          }
        }
      } else if (event.data.type === 'PINTEREST_AUTH_ERROR') {
        console.error('Pinterest auth error:', event.data.error)
        setError(event.data.error)
        setIsConnecting(false)
        if (authWindow) {
          authWindow.close()
        }
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [userId, onConnect, onClose, authWindow])

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      
      // For now, use direct connection (app not approved yet)
      // This will use the access token configured in backend .env
      const response = await fetch('http://localhost:8001/api/auth/pinterest/connect-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to connect Pinterest')
      }
      
      const data = await response.json()
      console.log('Pinterest connected:', data)
      
      // Notify parent component
      if (onConnect && data.accounts) {
        onConnect(data.accounts)
      }
      
      // Close modal
      onClose()
      
    } catch (err) {
      console.error('Pinterest connection error:', err)
      setError(err.message)
    } finally {
      setIsConnecting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <svg 
              viewBox="0 0 24 24" 
              fill="#E60023" 
              style={{ width: '32px', height: '32px', marginRight: '12px' }}
            >
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
            </svg>
            Connect Pinterest
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="connection-info">
            <p className="info-text">
              Connect your Pinterest account to automatically create and schedule pins.
            </p>
            
            <div className="features-list">
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Create pins automatically</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Manage boards and sections</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Schedule content in advance</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Track engagement analytics</span>
              </div>
            </div>

            <div className="info-box">
              <div className="info-icon" style={{ color: '#E60023' }}>ℹ</div>
              <div>
                <strong>Direct Connection (Development Mode)</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                  Using pre-configured access token. Full OAuth available once your Pinterest app is approved.
                </p>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-primary btn-block btn-lg"
            onClick={handleConnect}
            disabled={isConnecting}
            style={{ background: '#E60023', borderColor: '#E60023' }}
          >
            {isConnecting ? (
              <>
                <div className="spinner-small"></div>
                Connecting to Pinterest...
              </>
            ) : (
              <>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                </svg>
                Connect Pinterest Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PinterestConnectionModal

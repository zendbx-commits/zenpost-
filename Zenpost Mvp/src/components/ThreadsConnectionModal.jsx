import { useState, useEffect } from 'react'
import './LinkedInConnectionModal.css' // Reuse existing styles

const ThreadsConnectionModal = ({ isOpen, onClose, onConnect, userId }) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [authWindow, setAuthWindow] = useState(null)

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = async (event) => {
      // Security: verify origin (in production, check event.origin)
      if (event.data.type === 'THREADS_AUTH_SUCCESS') {
        console.log('Threads auth success:', event.data.data)
        
        const { access_token, threads_user_id, profile } = event.data.data
        
        try {
          setIsConnecting(true)
          setError(null)
          
          // Use environment variable for API base URL
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'
          
          // Save the connection to the database
          const response = await fetch(`${apiBaseUrl}/api/auth/threads/save-connection`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              access_token: access_token,
              threads_user_id: threads_user_id,
              username: profile.username
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Failed to save Threads connection')
          }
          
          const data = await response.json()
          console.log('Threads connection saved:', data)
          
          // Notify parent component
          if (onConnect) {
            onConnect(data.accounts || [])
          }
          
          // Close modal
          onClose()
          
        } catch (err) {
          console.error('Error saving Threads connection:', err)
          setError(err.message)
        } finally {
          setIsConnecting(false)
          if (authWindow) {
            authWindow.close()
          }
        }
      } else if (event.data.type === 'THREADS_AUTH_ERROR') {
        console.error('Threads auth error:', event.data.error)
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
      
      // Use environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'
      
      // Step 1: Get authorization URL from backend
      const response = await fetch(`${apiBaseUrl}/api/auth/threads/initiate`, {
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
        throw new Error(errorData.detail || 'Failed to initiate Threads OAuth')
      }
      
      const data = await response.json()
      console.log('Threads OAuth URL:', data.auth_url)
      
      // Step 2: Open Threads authorization in popup
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      
      const popup = window.open(
        data.auth_url,
        'Threads Authorization',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no`
      )
      
      setAuthWindow(popup)
      
      // Check if popup was blocked
      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.')
      }
      
    } catch (err) {
      console.error('Threads connection error:', err)
      setError(err.message)
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
              fill="#000000" 
              style={{ width: '32px', height: '32px', marginRight: '12px' }}
            >
              <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 013.02.142l-.126 1.974a11.9 11.9 0 00-2.64-.119c-1.06.061-1.98.396-2.6.945-.63.56-.94 1.268-.896 2.05.046.813.436 1.491 1.13 1.963.563.385 1.27.57 2.1.537 1.187-.05 2.064-.48 2.694-1.318.423-.563.684-1.27.773-2.102.007-.065.011-.133.013-.2.03-.874-.257-1.657-.844-2.27-.61-.638-1.52-1.01-2.64-1.08a8.124 8.124 0 00-.926-.03c-2.383.03-4.33.773-5.645 2.154-.973 1.023-1.535 2.33-1.628 3.787-.1 1.548.285 2.96 1.113 4.087.794.955 1.903 1.637 3.301 2.032 1.168.33 2.484.462 3.912.392 1.976-.096 3.646-.835 4.964-2.196 1.442-1.49 2.28-3.523 2.49-6.039.06-.69.09-1.39.09-2.084 0-2.606-.547-4.62-1.628-5.986-1.088-1.377-2.78-2.13-5.033-2.24-3.218.11-5.502 1.424-6.792 3.913-.63 1.215-.95 2.603-1.002 4.137v.007c.002.083.006.165.01.248.044 1.15.255 2.186.63 3.091.357.867.858 1.608 1.49 2.205.628.6 1.384 1.054 2.245 1.355.86.3 1.813.451 2.832.451a10.414 10.414 0 003.43-.577l.636 1.898c-1.246.434-2.637.651-4.135.651-1.356 0-2.577-.191-3.631-.569-1.058-.379-1.983-.94-2.754-1.667-.77-.726-1.37-1.619-1.784-2.658-.414-1.04-.636-2.196-.668-3.444-.004-.114-.007-.227-.01-.34v-.007c.063-1.81.455-3.468 1.165-4.93 1.565-3.214 4.485-4.982 8.685-5.114 2.745.132 4.897 1.087 6.4 2.843 1.343 1.57 2.024 3.853 2.024 6.783 0 .772-.03 1.544-.09 2.297-.24 2.863-1.235 5.227-2.961 7.036-1.636 1.714-3.736 2.654-6.242 2.791-.42.023-.838.034-1.254.034z"/>
            </svg>
            Connect Threads
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
              Connect your Threads account to automatically post and engage with your audience.
            </p>
            
            <div className="features-list">
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Post text and media automatically</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Schedule threads in advance</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Reply to threads</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>Track engagement analytics</span>
              </div>
            </div>

            <div className="info-box">
              <div className="info-icon" style={{ color: '#000000' }}>ℹ</div>
              <div>
                <strong>What you'll need:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>A Threads account</li>
                  <li>Connected to Instagram Professional account</li>
                  <li>Linked to a Facebook Page</li>
                </ul>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-primary btn-block btn-lg"
            onClick={handleConnect}
            disabled={isConnecting}
            style={{ background: '#000000', borderColor: '#000000' }}
          >
            {isConnecting ? (
              <>
                <div className="spinner-small"></div>
                Connecting to Threads...
              </>
            ) : (
              <>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 013.02.142l-.126 1.974a11.9 11.9 0 00-2.64-.119c-1.06.061-1.98.396-2.6.945-.63.56-.94 1.268-.896 2.05.046.813.436 1.491 1.13 1.963.563.385 1.27.57 2.1.537 1.187-.05 2.064-.48 2.694-1.318.423-.563.684-1.27.773-2.102.007-.065.011-.133.013-.2.03-.874-.257-1.657-.844-2.27-.61-.638-1.52-1.01-2.64-1.08a8.124 8.124 0 00-.926-.03c-2.383.03-4.33.773-5.645 2.154-.973 1.023-1.535 2.33-1.628 3.787-.1 1.548.285 2.96 1.113 4.087.794.955 1.903 1.637 3.301 2.032 1.168.33 2.484.462 3.912.392 1.976-.096 3.646-.835 4.964-2.196 1.442-1.49 2.28-3.523 2.49-6.039.06-.69.09-1.39.09-2.084 0-2.606-.547-4.62-1.628-5.986-1.088-1.377-2.78-2.13-5.033-2.24-3.218.11-5.502 1.424-6.792 3.913-.63 1.215-.95 2.603-1.002 4.137v.007c.002.083.006.165.01.248.044 1.15.255 2.186.63 3.091.357.867.858 1.608 1.49 2.205.628.6 1.384 1.054 2.245 1.355.86.3 1.813.451 2.832.451a10.414 10.414 0 003.43-.577l.636 1.898c-1.246.434-2.637.651-4.135.651-1.356 0-2.577-.191-3.631-.569-1.058-.379-1.983-.94-2.754-1.667-.77-.726-1.37-1.619-1.784-2.658-.414-1.04-.636-2.196-.668-3.444-.004-.114-.007-.227-.01-.34v-.007c.063-1.81.455-3.468 1.165-4.93 1.565-3.214 4.485-4.982 8.685-5.114 2.745.132 4.897 1.087 6.4 2.843 1.343 1.57 2.024 3.853 2.024 6.783 0 .772-.03 1.544-.09 2.297-.24 2.863-1.235 5.227-2.961 7.036-1.636 1.714-3.736 2.654-6.242 2.791-.42.023-.838.034-1.254.034z"/>
                </svg>
                Connect Threads Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ThreadsConnectionModal

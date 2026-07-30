import React, { useState, useEffect } from 'react'
import './LinkedInConnectionModal.css' // Reuse the same styles

const TwitterConnectionModal = ({ isOpen, onClose, onConnect, userId }) => {
  const [step, setStep] = useState(1) // 1: Auth, 2: Enter PIN, 3: Success
  const [loading, setLoading] = useState(false)
  const [authData, setAuthData] = useState(null)
  const [pinCode, setPinCode] = useState('')
  const [error, setError] = useState(null)

  const handleStartAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // Call backend to get Twitter auth URL
      const response = await fetch('http://localhost:8001/api/auth/twitter/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId
        })
      })

      const data = await response.json()

      if (data.success) {
        // Open Twitter auth in new tab
        window.open(data.auth_url, '_blank')
        
        // Store oauth_token for later
        setAuthData({
          oauth_token: data.oauth_token,
          state: data.state
        })
        
        // Move to PIN entry step
        setStep(2)
        setLoading(false)
      } else {
        throw new Error(data.message || 'Failed to initiate X auth')
      }
    } catch (err) {
      console.error('Twitter auth error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleVerifyPin = async () => {
    if (!pinCode || pinCode.length < 7) {
      setError('Please enter a valid PIN code')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Verify PIN with backend
      const response = await fetch('http://localhost:8001/api/auth/twitter/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          oauth_token: authData.oauth_token,
          pin_code: pinCode
        })
      })

      const result = await response.json()

      if (result.success) {
        // Save the connection with all token data
        await saveConnection(result.data)
      } else {
        throw new Error(result.message || 'Failed to verify PIN')
      }
    } catch (err) {
      console.error('PIN verification error:', err)
      setError(err.message || 'Invalid PIN code. Please try again.')
      setLoading(false)
    }
  }

  const saveConnection = async (data) => {
    try {
      // Save connection to backend
      const response = await fetch('http://localhost:8001/api/auth/twitter/save-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          access_token: data.access_token,
          access_token_secret: data.access_token_secret,
          refresh_token: data.refresh_token || null,
          profile: data.profile
        })
      })

      const result = await response.json()

      if (result.success) {
        setStep(3)
        setTimeout(() => {
          onConnect([result.account])
          handleClose()
        }, 2000)
      } else {
        throw new Error(result.message || 'Failed to save X connection')
      }
    } catch (err) {
      console.error('Save connection error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setAuthData(null)
    setPinCode('')
    setError(null)
    setLoading(false)
    onClose()
  }

  const handlePinKeyPress = (e) => {
    if (e.key === 'Enter' && pinCode.length >= 7) {
      handleVerifyPin()
    }
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

        {/* Step 1: Authorization */}
        {step === 1 && (
          <div className="modal-step">
            <div className="linkedin-icon" style={{ background: 'rgba(29, 161, 242, 0.1)' }}>
              <svg viewBox="0 0 24 24" fill="#000000">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>

            <h2>Connect to X</h2>
            <p className="modal-description">
              Authorize ZenPost to access your X (Twitter) account
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
              style={{ background: '#000000' }}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Opening X...
                </>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Continue with X
                </>
              )}
            </button>

            <p className="modal-note">
              A new tab will open for X authorization
            </p>
          </div>
        )}

        {/* Step 2: Enter PIN */}
        {step === 2 && (
          <div className="modal-step">
            <div className="linkedin-icon" style={{ background: 'rgba(29, 161, 242, 0.1)' }}>
              <svg viewBox="0 0 24 24" fill="#000000">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>

            <h2>Enter PIN Code</h2>
            <p className="modal-description">
              After authorizing on X, you'll receive a PIN code. Enter it below.
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

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Enter 7-digit PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                onKeyPress={handlePinKeyPress}
                maxLength={7}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '18px',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <button 
              className="btn btn-primary btn-block"
              onClick={handleVerifyPin}
              disabled={loading || pinCode.length < 7}
              style={{ background: '#000000' }}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Verifying...
                </>
              ) : (
                'Verify PIN'
              )}
            </button>

            <p className="modal-note">
              The PIN is displayed on X after you authorize the app
            </p>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="modal-step success-step">
            <div className="success-icon" style={{ background: 'rgba(29, 161, 242, 0.1)', color: '#1DA1F2' }}>✓</div>
            <h2>Successfully Connected!</h2>
            <p className="modal-description">
              Your X account has been connected to ZenPost
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TwitterConnectionModal

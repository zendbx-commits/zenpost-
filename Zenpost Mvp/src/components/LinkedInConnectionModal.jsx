import React, { useState, useEffect } from 'react'
import './LinkedInConnectionModal.css'

const LinkedInConnectionModal = ({ isOpen, onClose, onConnect, userId }) => {
  const [step, setStep] = useState(1) // 1: Auth, 2: Select companies, 2.5: Add company URL, 3: Success
  const [loading, setLoading] = useState(false)
  const [authWindow, setAuthWindow] = useState(null)
  const [authData, setAuthData] = useState(null)
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [error, setError] = useState(null)
  const [companyUrl, setCompanyUrl] = useState('')
  const [organizationId, setOrganizationId] = useState('')

  // Listen for OAuth callback from popup window
  useEffect(() => {
    const handleMessage = async (event) => {
      // In production, verify event.origin
      if (event.data.type === 'LINKEDIN_AUTH_SUCCESS') {
        console.log('LinkedIn auth success:', event.data.data)
        setAuthData(event.data.data)
        
        // Auto-select user profile
        const userProfile = {
          id: event.data.data.profile.sub,
          name: event.data.data.profile.name || event.data.data.profile.email,
          type: 'profile',
          logo_url: event.data.data.profile.picture
        }
        setSelectedAccounts([userProfile])
        
        setStep(2)
        setLoading(false)
        
        if (authWindow) {
          authWindow.close()
        }
      } else if (event.data.type === 'LINKEDIN_AUTH_ERROR') {
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

      // Open popup IMMEDIATELY (before async call) to avoid popup blocker
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      
      const popup = window.open(
        'about:blank',
        'LinkedIn Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      )
      
      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.')
      }
      
      setAuthWindow(popup)

      // Use environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'

      // Call backend to get LinkedIn auth URL
      const response = await fetch(`${apiBaseUrl}/api/auth/linkedin/initiate`, {
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
        // Navigate the already-open popup to the auth URL
        popup.location.href = data.auth_url
      } else {
        popup.close()
        throw new Error(data.message || 'Failed to initiate LinkedIn auth')
      }
    } catch (err) {
      console.error('LinkedIn auth error:', err)
      setError(err.message)
      setLoading(false)
      if (authWindow) {
        authWindow.close()
      }
    }
  }

  const toggleAccountSelection = (account) => {
    setSelectedAccounts(prev => {
      const exists = prev.find(a => a.id === account.id && a.type === account.type)
      if (exists) {
        return prev.filter(a => !(a.id === account.id && a.type === account.type))
      } else {
        return [...prev, account]
      }
    })
  }

  const handleFinishConnection = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'

      // Save connections to backend
      const response = await fetch(`${apiBaseUrl}/api/auth/linkedin/save-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          access_token: authData.access_token,
          selected_companies: selectedAccounts
        })
      })

      const data = await response.json()

      if (data.success) {
        // Move to company URL step instead of success
        setStep(2.5)
      } else {
        throw new Error(data.message || 'Failed to save LinkedIn connection')
      }
    } catch (err) {
      console.error('Save connection error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompanyPage = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate URL
      if (!companyUrl.includes('linkedin.com/company/')) {
        throw new Error('Please enter a valid LinkedIn company page URL')
      }

      // Validate Organization ID
      if (!organizationId.trim()) {
        throw new Error('Please enter the LinkedIn Organization ID')
      }

      // Validate it's numeric
      if (!/^\d+$/.test(organizationId.trim())) {
        throw new Error('Organization ID must be numeric (e.g., 12345678)')
      }

      // Use environment variable for API base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_PUBLIC_API_BASE_URL || 'http://localhost:8001'

      // Call backend to add company page manually
      const response = await fetch(`${apiBaseUrl}/api/auth/linkedin/add-company-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          company_url: companyUrl,
          organization_id: organizationId.trim(),
          access_token: authData.access_token
        })
      })

      const data = await response.json()

      if (data.success) {
        // Move to success step
        setStep(3)
        setTimeout(() => {
          onConnect([...selectedAccounts, data.account])
          handleClose()
        }, 2000)
      } else {
        throw new Error(data.message || 'Failed to add company page')
      }
    } catch (err) {
      console.error('Add company page error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSkipCompanyPage = () => {
    setStep(3)
    setTimeout(() => {
      onConnect(selectedAccounts)
      handleClose()
    }, 2000)
  }

  const handleClose = () => {
    setStep(1)
    setAuthData(null)
    setSelectedAccounts([])
    setError(null)
    setLoading(false)
    setCompanyUrl('')
    setOrganizationId('')
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

        {/* Step 1: Authorization */}
        {step === 1 && (
          <div className="modal-step">
            <div className="linkedin-icon">
              <svg viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>

            <h2>Connect to LinkedIn</h2>
            <p className="modal-description">
              Authorize ZenPost to access your LinkedIn profile and company pages
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
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Connecting to LinkedIn...
                </>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Continue with LinkedIn
                </>
              )}
            </button>

            <p className="modal-note">
              You'll be redirected to LinkedIn to authorize this connection
            </p>
          </div>
        )}

        {/* Step 2: Select Company Pages */}
        {step === 2 && (
          <div className="modal-step">
            <h2>Select Accounts</h2>
            <p className="modal-description">
              Choose which LinkedIn profiles and pages you want to connect
            </p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="accounts-selection">
              {/* User Profile (Always available) */}
              <div 
                className={`account-option ${selectedAccounts.find(a => a.type === 'profile') ? 'selected' : ''}`}
                onClick={() => toggleAccountSelection({
                  id: authData.profile.sub,
                  name: authData.profile.name || authData.profile.email,
                  type: 'profile',
                  logo_url: authData.profile.picture
                })}
              >
                <div className="account-option-left">
                  <div className="account-option-avatar">
                    {authData.profile.picture ? (
                      <img src={authData.profile.picture} alt={authData.profile.name} />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="account-option-info">
                    <div className="account-option-name">
                      {authData.profile.name || authData.profile.email}
                    </div>
                    <div className="account-option-type">Personal Profile</div>
                  </div>
                </div>
                <div className="account-option-checkbox">
                  {selectedAccounts.find(a => a.type === 'profile') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Company Pages */}
              {authData.companies && authData.companies.length > 0 ? (
                authData.companies.map((company) => (
                  <div 
                    key={company.id}
                    className={`account-option ${selectedAccounts.find(a => a.id === company.id && a.type === 'company') ? 'selected' : ''}`}
                    onClick={() => toggleAccountSelection({
                      id: company.id,
                      name: company.name,
                      type: 'company',
                      vanity_name: company.vanity_name,
                      logo_url: company.logo_url
                    })}
                  >
                    <div className="account-option-left">
                      <div className="account-option-avatar">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        )}
                      </div>
                      <div className="account-option-info">
                        <div className="account-option-name">{company.name}</div>
                        <div className="account-option-type">Company Page</div>
                      </div>
                    </div>
                    <div className="account-option-checkbox">
                      {selectedAccounts.find(a => a.id === company.id && a.type === 'company') && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-companies-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '48px', height: '48px', margin: '0 auto 16px', color: '#9ca3af'}}>
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p><strong>Company Pages Not Available</strong></p>
                  <p style={{marginTop: '8px', fontSize: '14px'}}>
                    To connect company pages, your LinkedIn app needs approval for the Marketing Developer Platform.
                  </p>
                  <p style={{marginTop: '8px', fontSize: '13px', color: '#9ca3af'}}>
                    You can still connect your personal profile to start posting!
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleFinishConnection}
                disabled={loading || selectedAccounts.length === 0}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Connecting...
                  </>
                ) : (
                  `Connect ${selectedAccounts.length} Account${selectedAccounts.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2.5: Add Company Page Manually */}
        {step === 2.5 && (
          <div className="modal-step">
            <h2>Add Company Page</h2>
            <p className="modal-description">
              Want to add a company page? Enter the LinkedIn company page URL below
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

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Company Page URL
              </label>
              <input 
                type="text"
                placeholder="https://www.linkedin.com/company/your-company"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                Example: https://www.linkedin.com/company/microsoft
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Organization ID <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text"
                placeholder="12345678"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                Numeric ID only (e.g., 12345678)
              </p>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', marginBottom: '24px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4m0-4h.01" />
                </svg>
                <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
                  <strong>How to find your Organization ID:</strong>
                  <ol style={{ marginTop: '8px', marginLeft: '16px', paddingLeft: '0' }}>
                    <li>Go to your company page on LinkedIn</li>
                    <li>Right-click → View Page Source (or press Ctrl+U)</li>
                    <li>Search for "organizationId" (Ctrl+F)</li>
                    <li>Copy the numeric value (e.g., "organizationId":"12345678")</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={handleSkipCompanyPage}
                disabled={loading}
              >
                Skip for Now
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddCompanyPage}
                disabled={loading || !companyUrl.trim() || !organizationId.trim()}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Adding Company...
                  </>
                ) : (
                  <>
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                    Add Company Page
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="modal-step success-step">
            <div className="success-icon">✓</div>
            <h2>Successfully Connected!</h2>
            <p className="modal-description">
              Your LinkedIn account{selectedAccounts.length > 1 ? 's have' : ' has'} been connected to ZenPost
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default LinkedInConnectionModal

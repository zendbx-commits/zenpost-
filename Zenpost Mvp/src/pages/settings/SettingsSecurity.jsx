import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Settings.css'

const SettingsSecurity = () => {
  const navigate = useNavigate()
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [twoFactor, setTwoFactor] = useState(false)

  useEffect(() => {
    const currentUser = localStorage.getItem('zenpost_current_user')
    if (!currentUser) {
      navigate('/login')
      return
    }

    loadSecuritySettings()
  }, [navigate])

  const loadSecuritySettings = () => {
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    const security = localStorage.getItem(`zenpost_security_${currentUser.id}`)
    if (security) {
      const parsed = JSON.parse(security)
      setTwoFactor(parsed.twoFactor || false)
    }
  }

  const handlePasswordChange = (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match!')
      return
    }
    
    alert('Password changed successfully!')
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const handleToggle2FA = () => {
    const newValue = !twoFactor
    setTwoFactor(newValue)
    
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    localStorage.setItem(`zenpost_security_${currentUser.id}`, JSON.stringify({
      twoFactor: newValue
    }))
    
    if (newValue) {
      alert('Two-factor authentication enabled!')
    } else {
      alert('Two-factor authentication disabled!')
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="container">
          <div className="header-content">
            <div className="header-text">
              <h1 className="page-title">
                <span className="gradient-text">Settings</span>
              </h1>
              <p className="page-subtitle">
                Manage your account settings and preferences
              </p>
            </div>
          </div>

          <div className="settings-nav">
            <Link to="/settings/profile" className="settings-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            <Link to="/settings/workspace" className="settings-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Workspace
            </Link>
            <Link to="/settings/preferences" className="settings-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Preferences
            </Link>
            <Link to="/settings/security" className="settings-nav-item active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Security
            </Link>
            <Link to="/settings/account" className="settings-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Account
            </Link>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          <div className="settings-layout">
            {/* Change Password */}
            <div className="settings-section card">
              <h2 className="section-title">Change Password</h2>
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="settings-section card">
              <h2 className="section-title">Two-Factor Authentication</h2>
              
              <div className="preference-item">
                <div className="preference-info">
                  <h3>Enable 2FA</h3>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={handleToggle2FA}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="settings-section card">
              <h2 className="section-title">Active Sessions</h2>
              <p className="section-description">
                Manage devices where you're currently logged in
              </p>

              <div className="workspace-card">
                <div className="workspace-header">
                  <div className="workspace-info">
                    <h3>Current Device</h3>
                    <p>Windows • Chrome • Your current session</p>
                  </div>
                  <span className="workspace-badge">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsSecurity

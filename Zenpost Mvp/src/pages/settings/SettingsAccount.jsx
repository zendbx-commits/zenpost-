import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Settings.css'

const SettingsAccount = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const currentUser = localStorage.getItem('zenpost_current_user')
    if (!currentUser) {
      navigate('/login')
      return
    }

    setUser(JSON.parse(currentUser))
  }, [navigate])

  const handleExportData = () => {
    alert('Your data export has been queued. You will receive an email when it\'s ready.')
  }

  const handleDeactivateAccount = () => {
    if (window.confirm('Are you sure you want to deactivate your account? This action can be reversed.')) {
      alert('Account deactivation initiated. You will receive a confirmation email.')
    }
  }

  const handleDeleteAccount = () => {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmation === 'DELETE') {
      // Clear all user data
      localStorage.removeItem('zenpost_current_user')
      localStorage.removeItem('zenpost_remember')
      alert('Your account has been scheduled for deletion. You will be logged out.')
      navigate('/login')
    }
  }

  if (!user) return null

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
            <Link to="/settings/security" className="settings-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Security
            </Link>
            <Link to="/settings/account" className="settings-nav-item active">
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
            {/* Account Information */}
            <div className="settings-section card">
              <h2 className="section-title">Account Information</h2>
              
              <div className="form-group">
                <label className="form-label">User ID</label>
                <p className="display-value">{user.id}</p>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <p className="display-value">{user.email}</p>
              </div>

              <div className="form-group">
                <label className="form-label">Account Created</label>
                <p className="display-value">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Data Management */}
            <div className="settings-section card">
              <h2 className="section-title">Data Management</h2>
              <p className="section-description">
                Download or manage your personal data
              </p>

              <button className="btn btn-secondary btn-block" onClick={handleExportData}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Your Data
              </button>
            </div>

            {/* Danger Zone */}
            <div className="settings-section card danger-zone">
              <h2 className="section-title">Danger Zone</h2>
              <p className="section-description">
                Irreversible actions that affect your account
              </p>

              <div className="danger-actions">
                <div className="danger-item">
                  <div className="danger-item-info">
                    <h3>Deactivate Account</h3>
                    <p>Temporarily disable your account. You can reactivate anytime.</p>
                  </div>
                  <button className="btn btn-danger" onClick={handleDeactivateAccount}>
                    Deactivate
                  </button>
                </div>

                <div className="danger-item">
                  <div className="danger-item-info">
                    <h3>Delete Account</h3>
                    <p>Permanently delete your account and all data. This cannot be undone.</p>
                  </div>
                  <button className="btn btn-danger" onClick={handleDeleteAccount}>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsAccount

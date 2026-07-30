import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Settings.css'

const SettingsPreferences = () => {
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReport: true,
    productUpdates: true,
    marketingEmails: false,
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    theme: 'dark'
  })

  useEffect(() => {
    const currentUser = localStorage.getItem('zenpost_current_user')
    if (!currentUser) {
      navigate('/login')
      return
    }

    loadPreferences()
  }, [navigate])

  const loadPreferences = () => {
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    const saved = localStorage.getItem(`zenpost_preferences_${currentUser.id}`)
    if (saved) {
      setPreferences(JSON.parse(saved))
    }
  }

  const handleToggle = (key) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key]
    }
    setPreferences(updated)
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    localStorage.setItem(`zenpost_preferences_${currentUser.id}`, JSON.stringify(updated))
  }

  const handleChange = (key, value) => {
    const updated = {
      ...preferences,
      [key]: value
    }
    setPreferences(updated)
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    localStorage.setItem(`zenpost_preferences_${currentUser.id}`, JSON.stringify(updated))
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
            <Link to="/settings/preferences" className="settings-nav-item active">
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
            {/* Notifications */}
            <div className="settings-section card">
              <h2 className="section-title">Notifications</h2>
              
              <div className="preference-item">
                <div className="preference-info">
                  <h3>Email Notifications</h3>
                  <p>Receive email notifications about your account activity</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={() => handleToggle('emailNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h3>Push Notifications</h3>
                  <p>Receive push notifications in your browser</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.pushNotifications}
                    onChange={() => handleToggle('pushNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h3>Weekly Report</h3>
                  <p>Receive weekly summary of your activity</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.weeklyReport}
                    onChange={() => handleToggle('weeklyReport')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h3>Product Updates</h3>
                  <p>Get notified about new features and updates</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.productUpdates}
                    onChange={() => handleToggle('productUpdates')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h3>Marketing Emails</h3>
                  <p>Receive emails about promotions and news</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={preferences.marketingEmails}
                    onChange={() => handleToggle('marketingEmails')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* Display Settings */}
            <div className="settings-section card">
              <h2 className="section-title">Display Settings</h2>
              
              <div className="form-group">
                <label className="form-label">Language</label>
                <select
                  className="form-select"
                  value={preferences.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date Format</label>
                  <select
                    className="form-select"
                    value={preferences.dateFormat}
                    onChange={(e) => handleChange('dateFormat', e.target.value)}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Time Format</label>
                  <select
                    className="form-select"
                    value={preferences.timeFormat}
                    onChange={(e) => handleChange('timeFormat', e.target.value)}
                  >
                    <option value="12h">12-hour</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Theme</label>
                <select
                  className="form-select"
                  value={preferences.theme}
                  onChange={(e) => handleChange('theme', e.target.value)}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPreferences

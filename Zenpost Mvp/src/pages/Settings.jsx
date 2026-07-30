import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import './Settings.css'

const Settings = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    company: '',
    website: '',
    bio: ''
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    postReminders: true,
    theme: 'dark'
  })

  const [apiKeys, setApiKeys] = useState({
    stability: '••••••••',
    groq: '••••••••',
    openrouter: '••••••••'
  })

  useEffect(() => {
    checkAuthAndLoadSettings()
  }, [])

  const checkAuthAndLoadSettings = async () => {
    try {
      const user = await zendbx.auth.getUser()
      if (!user || !user.id) {
        navigate('/login')
        return
      }
      setUser(user)
      setProfileData(prev => ({
        ...prev,
        email: user.email || ''
      }))
    } catch (error) {
      console.error('Auth error:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Update user profile logic here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePreferencesUpdate = async () => {
    setSaving(true)
    
    try {
      // Update preferences logic here
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Preferences updated successfully!')
    } catch (error) {
      console.error('Error updating preferences:', error)
      alert('Failed to update preferences')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const currentPassword = formData.get('currentPassword')
    const newPassword = formData.get('newPassword')
    const confirmPassword = formData.get('confirmPassword')

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }

    setSaving(true)
    try {
      // Password change logic here
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Password changed successfully!')
      e.target.reset()
    } catch (error) {
      console.error('Error changing password:', error)
      alert('Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!window.confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return
    }

    setSaving(true)
    try {
      // Delete account logic here
      await zendbx.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      {/* Header */}
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
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="container">
          <div className="settings-layout">
            {/* Sidebar */}
            <div className="settings-sidebar">
              <nav className="settings-nav">
                <button
                  className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>

                <button
                  className={`settings-nav-item ${activeTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preferences')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Preferences
                </button>

                <button
                  className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Security
                </button>

                <button
                  className={`settings-nav-item ${activeTab === 'api' ? 'active' : ''}`}
                  onClick={() => setActiveTab('api')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  API Keys
                </button>

                <button
                  className={`settings-nav-item ${activeTab === 'billing' ? 'active' : ''}`}
                  onClick={() => setActiveTab('billing')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Billing
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="settings-main">
              {activeTab === 'profile' && (
                <div className="settings-section">
                  <h2 className="section-title">Profile Information</h2>
                  <p className="section-description">
                    Update your account profile information and email address.
                  </p>

                  <form onSubmit={handleProfileUpdate} className="settings-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          placeholder="John Doe"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          className="form-input"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={profileData.company}
                          onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                          placeholder="Acme Inc."
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Website</label>
                        <input
                          type="url"
                          className="form-input"
                          value={profileData.website}
                          onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Bio</label>
                      <textarea
                        className="form-textarea"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        rows="4"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="settings-section">
                  <h2 className="section-title">Notifications & Preferences</h2>
                  <p className="section-description">
                    Manage how you receive notifications and updates.
                  </p>

                  <div className="preferences-list">
                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>Email Notifications</h4>
                        <p>Receive email updates about your campaigns</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.emailNotifications}
                          onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>Push Notifications</h4>
                        <p>Get push notifications for important updates</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.pushNotifications}
                          onChange={(e) => setPreferences({...preferences, pushNotifications: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>Weekly Reports</h4>
                        <p>Receive weekly analytics reports</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.weeklyReports}
                          onChange={(e) => setPreferences({...preferences, weeklyReports: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>Post Reminders</h4>
                        <p>Get reminded about scheduled posts</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={preferences.postReminders}
                          onChange={(e) => setPreferences({...preferences, postReminders: e.target.checked})}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button onClick={handlePreferencesUpdate} className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="settings-section">
                  <h2 className="section-title">Security Settings</h2>
                  <p className="section-description">
                    Manage your password and account security.
                  </p>

                  <form onSubmit={handlePasswordChange} className="settings-form">
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        className="form-input"
                        required
                        minLength="8"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        className="form-input"
                        required
                        minLength="8"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>

                  <div className="danger-zone">
                    <h3>Danger Zone</h3>
                    <p>Once you delete your account, there is no going back.</p>
                    <button onClick={handleDeleteAccount} className="btn btn-danger" disabled={saving}>
                      Delete Account
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="settings-section">
                  <h2 className="section-title">API Keys</h2>
                  <p className="section-description">
                    Manage your API keys for third-party integrations.
                  </p>

                  <div className="api-keys-list">
                    <div className="api-key-item card">
                      <div className="api-key-header">
                        <h4>Stability AI</h4>
                        <span className="badge badge-success">Active</span>
                      </div>
                      <p>Used for AI image generation</p>
                      <div className="api-key-display">
                        <input type="text" value={apiKeys.stability} readOnly className="form-input" />
                        <button className="btn btn-secondary">Reveal</button>
                      </div>
                    </div>

                    <div className="api-key-item card">
                      <div className="api-key-header">
                        <h4>Groq AI</h4>
                        <span className="badge badge-success">Active</span>
                      </div>
                      <p>Used for content generation</p>
                      <div className="api-key-display">
                        <input type="text" value={apiKeys.groq} readOnly className="form-input" />
                        <button className="btn btn-secondary">Reveal</button>
                      </div>
                    </div>

                    <div className="api-key-item card">
                      <div className="api-key-header">
                        <h4>OpenRouter</h4>
                        <span className="badge badge-warning">Inactive</span>
                      </div>
                      <p>Alternative AI provider</p>
                      <div className="api-key-display">
                        <input type="text" value={apiKeys.openrouter} readOnly className="form-input" />
                        <button className="btn btn-secondary">Reveal</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="settings-section">
                  <h2 className="section-title">Billing & Subscription</h2>
                  <p className="section-description">
                    Manage your subscription and billing information.
                  </p>

                  <div className="billing-info card">
                    <h3>Current Plan</h3>
                    <div className="plan-details">
                      <div className="plan-name">Free Plan</div>
                      <div className="plan-price">$0 / month</div>
                    </div>
                    <button className="btn btn-primary">Upgrade to Pro</button>
                  </div>

                  <div className="billing-history">
                    <h3>Billing History</h3>
                    <p>No billing history available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

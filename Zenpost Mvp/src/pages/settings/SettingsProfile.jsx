import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Settings.css'

const SettingsProfile = () => {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    company: '',
    jobTitle: '',
    timezone: 'UTC'
  })

  useEffect(() => {
    const currentUser = localStorage.getItem('zenpost_current_user')
    if (!currentUser) {
      navigate('/login')
      return
    }

    loadProfile()
  }, [navigate])

  const loadProfile = () => {
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    const savedProfile = localStorage.getItem(`zenpost_profile_${currentUser.id}`)
    
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile))
    } else {
      setProfile(prev => ({
        ...prev,
        fullName: currentUser.fullName,
        email: currentUser.email
      }))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = () => {
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    localStorage.setItem(`zenpost_profile_${currentUser.id}`, JSON.stringify(profile))
    
    // Update current user
    const updatedUser = {
      ...currentUser,
      fullName: profile.fullName,
      email: profile.email
    }
    localStorage.setItem('zenpost_current_user', JSON.stringify(updatedUser))
    
    setIsEditing(false)
  }

  const handleCancel = () => {
    loadProfile()
    setIsEditing(false)
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
            {!isEditing ? (
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            ) : (
              <div className="header-actions">
                <button className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Settings Navigation */}
          <div className="settings-nav">
            <Link to="/settings/profile" className="settings-nav-item active">
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

      {/* Content */}
      <div className="page-content">
        <div className="container">
          <div className="settings-layout">
            {/* Profile Picture */}
            <div className="settings-section card">
              <h2 className="section-title">Profile Picture</h2>
              <div className="profile-picture-section">
                <div className="profile-avatar-large">
                  {profile.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="profile-picture-actions">
                  <p className="profile-picture-text">
                    Upload a profile picture to personalize your account
                  </p>
                  <div className="profile-picture-buttons">
                    <button className="btn btn-secondary btn-sm">Upload Photo</button>
                    <button className="btn btn-text btn-sm">Remove</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="settings-section card">
              <h2 className="section-title">Personal Information</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="fullName"
                      className="form-input"
                      value={profile.fullName}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="display-value">{profile.fullName}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={profile.email}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="display-value">{profile.email}</p>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      placeholder="+1 (555) 000-0000"
                      value={profile.phone}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="display-value">{profile.phone || 'Not set'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      className="form-input"
                      placeholder="City, Country"
                      value={profile.location}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="display-value">{profile.location || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bio</label>
                {isEditing ? (
                  <textarea
                    name="bio"
                    className="form-textarea"
                    placeholder="Tell us about yourself..."
                    rows="4"
                    value={profile.bio}
                    onChange={handleChange}
                  />
                ) : (
                  <p className="display-value">{profile.bio || 'Not set'}</p>
                )}
              </div>
            </div>

            {/* Professional Information */}
            <div className="settings-section card">
              <h2 className="section-title">Professional Information</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="company"
                      className="form-input"
                      placeholder="Your company name"
                      value={profile.company}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="display-value">{profile.company || 'Not set'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="jobTitle"
                      className="form-input"
                      placeholder="Your job title"
                      value={profile.jobTitle}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="display-value">{profile.jobTitle || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Website</label>
                  {isEditing ? (
                    <input
                      type="url"
                      name="website"
                      className="form-input"
                      placeholder="https://yourwebsite.com"
                      value={profile.website}
                      onChange={handleChange}
                    />
                  ) : (
                    <p className="display-value">
                      {profile.website ? (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="link">
                          {profile.website}
                        </a>
                      ) : 'Not set'}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  {isEditing ? (
                    <select
                      name="timezone"
                      className="form-select"
                      value={profile.timezone}
                      onChange={handleChange}
                    >
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="EST">Eastern Time (GMT-5)</option>
                      <option value="CST">Central Time (GMT-6)</option>
                      <option value="MST">Mountain Time (GMT-7)</option>
                      <option value="PST">Pacific Time (GMT-8)</option>
                      <option value="GMT">London (GMT+0)</option>
                      <option value="CET">Central Europe (GMT+1)</option>
                      <option value="IST">India (GMT+5:30)</option>
                      <option value="JST">Japan (GMT+9)</option>
                      <option value="AEST">Australia East (GMT+10)</option>
                    </select>
                  ) : (
                    <p className="display-value">{profile.timezone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsProfile

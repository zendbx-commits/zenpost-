import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Settings.css'

const SettingsWorkspace = () => {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])

  useEffect(() => {
    const currentUser = localStorage.getItem('zenpost_current_user')
    if (!currentUser) {
      navigate('/login')
      return
    }

    loadWorkspaces()
  }, [navigate])

  const loadWorkspaces = () => {
    const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
    const savedWorkspaces = localStorage.getItem(`zenpost_workspaces_${currentUser.id}`)
    
    if (savedWorkspaces) {
      setWorkspaces(JSON.parse(savedWorkspaces))
    } else {
      // Create default workspace
      const defaultWorkspace = {
        id: Date.now(),
        name: 'My Workspace',
        description: 'Default workspace',
        members: 1,
        projects: 0,
        isDefault: true
      }
      setWorkspaces([defaultWorkspace])
      localStorage.setItem(`zenpost_workspaces_${currentUser.id}`, JSON.stringify([defaultWorkspace]))
    }
  }

  const handleCreateWorkspace = () => {
    const name = prompt('Enter workspace name:')
    if (name) {
      const newWorkspace = {
        id: Date.now(),
        name,
        description: '',
        members: 1,
        projects: 0,
        isDefault: false
      }
      
      const currentUser = JSON.parse(localStorage.getItem('zenpost_current_user'))
      const updatedWorkspaces = [...workspaces, newWorkspace]
      setWorkspaces(updatedWorkspaces)
      localStorage.setItem(`zenpost_workspaces_${currentUser.id}`, JSON.stringify(updatedWorkspaces))
    }
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
            <button className="btn btn-primary" onClick={handleCreateWorkspace}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4v16m8-8H4" />
              </svg>
              New Workspace
            </button>
          </div>

          {/* Settings Navigation */}
          <div className="settings-nav">
            <Link to="/settings/profile" className="settings-nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            <Link to="/settings/workspace" className="settings-nav-item active">
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
            <div className="settings-section card">
              <h2 className="section-title">Your Workspaces</h2>
              <p className="section-description">
                Organize your projects and collaborate with team members in different workspaces
              </p>

              {workspaces.map((workspace) => (
                <div key={workspace.id} className="workspace-card">
                  <div className="workspace-header">
                    <div className="workspace-info">
                      <h3>{workspace.name}</h3>
                      <p>{workspace.description || 'No description'}</p>
                    </div>
                    {workspace.isDefault && (
                      <span className="workspace-badge">Default</span>
                    )}
                  </div>

                  <div className="workspace-stats">
                    <div className="workspace-stat">
                      <span>Members</span>
                      <span>{workspace.members}</span>
                    </div>
                    <div className="workspace-stat">
                      <span>Projects</span>
                      <span>{workspace.projects}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsWorkspace

import React from 'react'
import { useNavigate } from 'react-router-dom'
import './QuickActions.css'

const QuickActions = () => {
  const navigate = useNavigate()
  const actions = [
    {
      title: 'AI Studio',
      description: 'Generate content with AI',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'purple',
      onClick: () => navigate('/ai')
    },
    {
      title: 'Campaigns',
      description: 'Manage your campaigns',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      color: 'blue',
      onClick: () => navigate('/campaigns')
    },
    {
      title: 'Manage Websites',
      description: 'View and analyze your websites',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      color: 'green',
      onClick: () => navigate('/websites')
    },
    {
      title: 'Social Accounts',
      description: 'Connect and manage accounts',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      color: 'orange',
      onClick: () => navigate('/social/accounts')
    }
  ]

  return (
    <div className="quick-actions">
      <div className="section-header">
        <h2 className="section-title">Quick Actions</h2>
      </div>

      <div className="actions-grid">
        {actions.map((action, index) => (
          <button 
            key={index} 
            className={`action-card card action-${action.color}`}
            onClick={action.onClick}
          >
            <div className="action-icon">{action.icon}</div>
            <div className="action-content">
              <h3 className="action-title">{action.title}</h3>
              <p className="action-description">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions

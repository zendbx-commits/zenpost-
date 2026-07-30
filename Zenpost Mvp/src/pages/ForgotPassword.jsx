import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './Auth.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle forgot password logic here
    console.log('Reset password for:', email)
    setIsSubmitted(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-single">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <span className="logo-text">ZenPost</span>
            </Link>
            
            {!isSubmitted ? (
              <>
                <h1 className="auth-title">Forgot your password?</h1>
                <p className="auth-subtitle">
                  No worries! Enter your email and we'll send you reset instructions.
                </p>
              </>
            ) : (
              <>
                <div className="success-icon">✓</div>
                <h1 className="auth-title">Check your email</h1>
                <p className="auth-subtitle">
                  We've sent password reset instructions to <strong>{email}</strong>
                </p>
              </>
            )}
          </div>

          {!isSubmitted ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Send Reset Link
              </button>
            </form>
          ) : (
            <div className="success-actions">
              <button
                className="btn btn-primary btn-block"
                onClick={() => window.open('mailto:', '_blank')}
              >
                Open Email App
              </button>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => setIsSubmitted(false)}
              >
                Didn't receive email? Resend
              </button>
            </div>
          )}

          <div className="auth-footer">
            <Link to="/login" className="auth-link back-link">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword

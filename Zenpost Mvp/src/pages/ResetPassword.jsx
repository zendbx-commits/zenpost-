import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Auth.css'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    // Handle reset password logic here
    console.log('Reset password:', formData)
    setIsSubmitted(true)
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      navigate('/login')
    }, 2000)
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
                <h1 className="auth-title">Set new password</h1>
                <p className="auth-subtitle">
                  Your new password must be different from previously used passwords.
                </p>
              </>
            ) : (
              <>
                <div className="success-icon">✓</div>
                <h1 className="auth-title">Password reset successful</h1>
                <p className="auth-subtitle">
                  Your password has been updated. Redirecting to login...
                </p>
              </>
            )}
          </div>

          {!isSubmitted ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  New Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className="form-input"
                    placeholder="Create a new password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="form-hint">Must be at least 8 characters</p>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="password-requirements">
                <p className="requirements-title">Password must contain:</p>
                <ul className="requirements-list">
                  <li className={formData.password.length >= 8 ? 'valid' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>
                    One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(formData.password) ? 'valid' : ''}>
                    One number
                  </li>
                </ul>
              </div>

              <button type="submit" className="btn btn-primary btn-block">
                Reset Password
              </button>
            </form>
          ) : (
            <div className="success-message">
              <div className="loader"></div>
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

export default ResetPassword

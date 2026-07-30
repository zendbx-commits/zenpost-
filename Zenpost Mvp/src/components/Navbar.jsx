import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in
    const currentUser = localStorage.getItem('zenpost_current_user')
    setIsLoggedIn(!!currentUser)
  }, [location])

  const handleLogout = () => {
    localStorage.removeItem('zenpost_current_user')
    localStorage.removeItem('zenpost_remember')
    setIsLoggedIn(false)
    navigate('/')
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    // Marketing pages removed - focusing on core MVP workflow
  ]

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <Link to="/" className="logo">
          <span className="logo-text">ZenPost</span>
        </Link>

        <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <Link to="/dashboard">
                <button className="btn-login">Dashboard</button>
              </Link>
              <button className="btn btn-primary" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <button className="btn-login">Login</button>
              </Link>
              <Link to="/signup">
                <button className="btn btn-primary">
                  Sign Up <span className="arrow">→</span>
                </button>
              </Link>
            </>
          )}
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  )
}

export default Navbar

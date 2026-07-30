import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    Product: [
      { label: 'Dashboard', path: '/dashboard' }
    ],
    Company: [
      { label: 'Get Started', path: '/signup' }
    ],
    Social: [
      { label: 'Twitter', path: '#' },
      { label: 'LinkedIn', path: '#' },
      { label: 'GitHub', path: '#' }
    ]
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-text">ZenPost</span>
            </div>
            <p className="footer-description">
              Simplify your social media management with powerful scheduling and analytics tools.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="footer-column">
              <h4 className="footer-title">{category}</h4>
              <ul className="footer-links">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} ZenPost. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

import React from 'react'
import './Preloader.css'

const Preloader = ({ message = 'Loading...' }) => {
  return (
    <div className="preloader-overlay">
      <div className="preloader-content">
        <div className="preloader-logo">
          <div className="logo-circle">
            <div className="logo-inner"></div>
          </div>
          <div className="logo-text">ZenPost</div>
        </div>
        
        <div className="preloader-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        
        <div className="preloader-message">{message}</div>
        
        <div className="preloader-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  )
}

export default Preloader

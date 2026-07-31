import React from 'react';
import './PremiumModal.css';

const PremiumModal = ({ isOpen, onClose, feature }) => {
  if (!isOpen) return null;

  const premiumFeatures = [
    'Unlimited AI Content Generation',
    'Unlimited Website Analysis',
    'Unlimited Scheduling',
    'Marketing Intelligence',
    'Competitor Analysis',
    'AI Campaigns',
    'Advanced Analytics',
    'Best Posting Times',
    'Marketing Reports',
    'Brand Kit',
    'Priority Support'
  ];

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
        <button className="premium-modal-close" onClick={onClose}>×</button>
        
        <div className="premium-modal-header">
          <div className="premium-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Unlock the Full Marketing OS</h2>
          <p>Upgrade to Pro and supercharge your social media marketing</p>
        </div>

        <div className="premium-modal-body">
          <div className="premium-features">
            {premiumFeatures.map((feat, index) => (
              <div key={index} className="premium-feature-item">
                <span className="premium-checkmark">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="premium-pricing">
            <div className="premium-price">
              <span className="currency">₹</span>
              <span className="amount">399</span>
              <span className="period">/month</span>
            </div>
            <div className="premium-price-note">
              or ₹3,999/year (save ₹999)
            </div>
          </div>
        </div>

        <div className="premium-modal-footer">
          <button className="premium-upgrade-btn" onClick={() => {
            window.open('https://zenpost.co.in/upgrade', '_blank');
          }}>
            Upgrade to Pro
          </button>
          <button className="premium-maybe-btn" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;

import React from 'react';
import './UsageCard.css';

const UsageCard = ({ label, used, limit, icon, color = '#64b5f6' }) => {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const remaining = isUnlimited ? -1 : Math.max(0, limit - used);
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div className="usage-card">
      <div className="usage-card-header">
        <div className="usage-icon" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <div className="usage-info">
          <div className="usage-label">{label}</div>
          <div className="usage-stats">
            {isUnlimited ? (
              <span className="usage-unlimited">∞</span>
            ) : (
              <>
                <span className="usage-used">{used}</span>
                <span className="usage-separator">/</span>
                <span className="usage-limit">{limit}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {!isUnlimited && (
        <div className="usage-progress-wrapper">
          <div className="usage-progress-bar">
            <div 
              className={`usage-progress-fill ${isNearLimit ? 'near-limit' : ''}`}
              style={{ 
                width: `${percentage}%`,
                background: isNearLimit ? '#f44336' : color
              }}
            />
          </div>
          <div className="usage-remaining">
            {remaining} remaining
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageCard;

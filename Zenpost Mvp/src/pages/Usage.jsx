import React, { useEffect } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import UsageCard from '../components/UsageCard';
import PremiumModal from '../components/PremiumModal';
import './Usage.css';

const Usage = () => {
  const { plan, usage, loading, refreshData, isPro } = useSubscription();
  const [showUpgrade, setShowUpgrade] = React.useState(false);

  useEffect(() => {
    console.log('Usage page mounted');
    console.log('Plan:', plan);
    console.log('Usage:', usage);
    console.log('Loading:', loading);
    refreshData();
  }, []);

  console.log('Rendering Usage page - loading:', loading, 'plan:', plan, 'usage:', usage);

  if (loading) {
    return (
      <div className="usage-page">
        <div className="loading">Loading your plan details...</div>
      </div>
    );
  }

  const usageItems = usage?.usage || [];
  
  console.log('Usage items:', usageItems);

  return (
    <div className="usage-page">
      <div className="usage-header">
        <div className="usage-header-content">
          <h1>Current Plan</h1>
          <div className="plan-badge" data-plan={plan?.plan_name}>
            {plan?.display_name || 'Free'}
          </div>
        </div>
        {!isPro && (
          <button className="upgrade-btn-header" onClick={() => setShowUpgrade(true)}>
            Upgrade to Pro
          </button>
        )}
      </div>

      {usageItems.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
          <p>No usage data available yet.</p>
          <p>Plan: {plan?.plan_name || 'Unknown'}</p>
          <button onClick={refreshData}>Refresh Data</button>
        </div>
      )}

      <div className="usage-grid">
        {usageItems.map((item, index) => (
          <UsageCard
            key={index}
            label={item.label}
            used={item.used}
            limit={item.limit}
            icon={getIconForFeature(item.feature)}
            color={getColorForFeature(item.feature)}
          />
        ))}
      </div>

      {!isPro && (
        <div className="upgrade-card">
          <div className="upgrade-card-content">
            <h2>Unlock Unlimited Everything</h2>
            <p>Upgrade to Pro and remove all limits</p>
            <button className="upgrade-btn-large" onClick={() => setShowUpgrade(true)}>
              Upgrade to Pro - ₹399/month
            </button>
          </div>
        </div>
      )}

      <PremiumModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)} 
      />
    </div>
  );
};

function getIconForFeature(feature) {
  // Return empty string - icons will be handled by CSS/SVG
  return '';
}

function getColorForFeature(feature) {
  const colors = {
    website_analysis: '#64b5f6',
    competitor_analysis: '#9c27b0',
    ai_captions: '#ff9800',
    ai_images: '#e91e63',
    content_calendar: '#4caf50',
    scheduled_posts_active: '#2196f3',
    social_accounts_connected: '#00bcd4'
  };
  return colors[feature] || '#64b5f6';
}

export default Usage;

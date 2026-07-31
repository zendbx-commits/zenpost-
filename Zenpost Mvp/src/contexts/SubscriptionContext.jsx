import React, { createContext, useContext, useState, useEffect } from 'react';
import zendbx from '../lib/zendbx';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [plan, setPlan] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const userData = await zendbx.auth.getUser();
      if (!userData || !userData.id) {
        setLoading(false);
        return;
      }
      
      setUser(userData);

      // Fetch plan and usage from backend
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      
      const [planResponse, usageResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/subscription/plan/${userData.id}`),
        fetch(`${apiBaseUrl}/api/subscription/summary/${userData.id}`)
      ]);

      if (planResponse.ok) {
        const planData = await planResponse.json();
        setPlan(planData.plan);
      }

      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFeature = async (feature) => {
    if (!user) return { allowed: false, info: {} };

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      
      const response = await fetch(`${apiBaseUrl}/api/subscription/check-feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          feature
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { allowed: data.allowed, info: data };
      }

      return { allowed: false, info: {} };
    } catch (error) {
      console.error('Failed to check feature:', error);
      return { allowed: false, info: {} };
    }
  };

  const incrementUsage = async (feature, amount = 1) => {
    if (!user) return false;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      
      const response = await fetch(`${apiBaseUrl}/api/subscription/increment-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          feature,
          amount
        })
      });

      if (response.ok) {
        // Reload usage data
        await loadSubscriptionData();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to increment usage:', error);
      return false;
    }
  };

  const refreshData = () => {
    return loadSubscriptionData();
  };

  const value = {
    plan,
    usage,
    loading,
    user,
    checkFeature,
    incrementUsage,
    refreshData,
    isPro: plan?.plan_name === 'PRO' || plan?.plan_name === 'ENTERPRISE',
    isFree: plan?.plan_name === 'FREE'
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import zendbx from '../lib/zendbx';
import '../theme-blue-black.css';
import './Autopilot.css';

export default function Autopilot() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [settings, setSettings] = useState({
    platforms: {
      LinkedIn: true,
      Twitter: true,
      Facebook: false,
      Instagram: false
    },
    schedule: {
      frequency: 'daily', // daily, weekly, custom
      timesPerDay: 2,
      bestTimes: true,
      customTimes: ['09:00', '15:00']
    },
    content: {
      autoGenerate: true,
      bufferDays: 7,
      approvalRequired: false,
      postTypes: ['Educational', 'Promotional', 'Engagement']
    },
    rules: {
      minEngagementRate: 2.5,
      pauseOnLowPerformance: true,
      skipWeekends: false,
      maxPostsPerDay: 3
    }
  });
  const [stats, setStats] = useState({
    postsScheduled: 0,
    nextPostDate: null,
    averageEngagement: 0,
    bufferRemaining: 0
  });

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        navigate('/login');
        return;
      }
      loadAutopilotSettings();
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    }
  };

  const loadAutopilotSettings = async () => {
    try {
      const user = await zendbx.auth.getUser();
      
      // Load saved settings from localStorage
      const savedSettings = localStorage.getItem('zenpost_autopilot_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed.settings || settings);
        setAutopilotEnabled(parsed.enabled || false);
      }

      // Fetch real data from ZenDBX
      const calendarResponse = await zendbx.from('calendar_posts').select('*');
      const allCalendarPosts = calendarResponse?.data || [];
      
      // Also check localStorage
      const savedPosts = localStorage.getItem('zenpost_scheduled_posts');
      const localPosts = savedPosts ? JSON.parse(savedPosts) : [];
      
      // Combine posts
      const allPosts = [...allCalendarPosts, ...localPosts];
      
      // Filter scheduled posts (not yet published)
      const scheduledPosts = allPosts.filter(p => p.status === 'scheduled' || p.status === 'draft');
      const futurePosts = scheduledPosts.filter(p => {
        const postDate = new Date(p.scheduled_date || p.date);
        return postDate >= new Date();
      }).sort((a, b) => {
        const dateA = new Date(a.scheduled_date || a.date);
        const dateB = new Date(b.scheduled_date || b.date);
        return dateA - dateB;
      });
      
      // Calculate average engagement from published posts
      const publishedPosts = allPosts.filter(p => p.status === 'published');
      const totalEngagement = publishedPosts.reduce((sum, p) => {
        const likes = p.likes || 0;
        const comments = p.comments || 0;
        const shares = p.shares || 0;
        const reach = p.reach || 1;
        return sum + ((likes + comments + shares) / reach) * 100;
      }, 0);
      const avgEngagement = publishedPosts.length > 0 ? (totalEngagement / publishedPosts.length).toFixed(2) : 0;
      
      setStats({
        postsScheduled: futurePosts.length,
        nextPostDate: futurePosts[0]?.scheduled_date || futurePosts[0]?.date || null,
        averageEngagement: parseFloat(avgEngagement),
        bufferRemaining: futurePosts.length
      });
      
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    const data = {
      enabled: autopilotEnabled,
      settings
    };
    localStorage.setItem('zenpost_autopilot_settings', JSON.stringify(data));
    alert('Autopilot settings saved successfully!');
  };

  const toggleAutopilot = () => {
    const newState = !autopilotEnabled;
    setAutopilotEnabled(newState);
    
    if (newState) {
      alert('🚀 Autopilot activated! Your posts will be published automatically.');
    } else {
      alert('⏸️ Autopilot paused. Auto-publishing is disabled.');
    }
  };

  const updatePlatform = (platform, value) => {
    setSettings(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: value
      }
    }));
  };

  const updateSchedule = (key, value) => {
    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [key]: value
      }
    }));
  };

  const updateContent = (key, value) => {
    setSettings(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: value
      }
    }));
  };

  const updateRules = (key, value) => {
    setSettings(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="autopilot-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading autopilot settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="autopilot-page">
      {/* Header */}
      <div className="autopilot-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1 className="page-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="gradient-text">Autopilot Mode</span>
              </h1>
              <p className="page-subtitle">Set it and forget it - automated social media posting</p>
            </div>
            <div className="autopilot-toggle">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autopilotEnabled}
                  onChange={toggleAutopilot}
                />
                <span className="slider"></span>
              </label>
              <span className="toggle-label">
                {autopilotEnabled ? '🟢 Active' : '⚫ Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="status-section">
        <div className="container">
          <div className="status-grid">
            <div className="status-card">
              <div className="status-icon">📅</div>
              <div className="status-content">
                <div className="status-value">{stats.postsScheduled}</div>
                <div className="status-label">Posts in Queue</div>
              </div>
            </div>
            <div className="status-card">
              <div className="status-icon">⏰</div>
              <div className="status-content">
                <div className="status-value">
                  {stats.nextPostDate ? new Date(stats.nextPostDate).toLocaleDateString() : 'N/A'}
                </div>
                <div className="status-label">Next Post</div>
              </div>
            </div>
            <div className="status-card">
              <div className="status-icon">📊</div>
              <div className="status-content">
                <div className="status-value">{stats.averageEngagement}%</div>
                <div className="status-label">Avg. Engagement</div>
              </div>
            </div>
            <div className="status-card">
              <div className="status-icon">🔋</div>
              <div className="status-content">
                <div className="status-value">{stats.bufferRemaining} days</div>
                <div className="status-label">Content Buffer</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="settings-section">
        <div className="container">
          <div className="settings-grid">
            {/* Platforms */}
            <div className="settings-card">
              <h3 className="card-title">📱 Active Platforms</h3>
              <p className="card-description">Select platforms for auto-publishing</p>
              <div className="platforms-list">
                {Object.keys(settings.platforms).map(platform => (
                  <label key={platform} className="platform-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.platforms[platform]}
                      onChange={(e) => updatePlatform(platform, e.target.checked)}
                    />
                    <span className="platform-name">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="settings-card">
              <h3 className="card-title">⏰ Publishing Schedule</h3>
              <p className="card-description">When to publish posts automatically</p>
              <div className="schedule-settings">
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={settings.schedule.frequency}
                    onChange={(e) => updateSchedule('frequency', e.target.value)}
                    className="form-select"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Posts per day</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.schedule.timesPerDay}
                    onChange={(e) => updateSchedule('timesPerDay', parseInt(e.target.value))}
                    className="form-input"
                  />
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.schedule.bestTimes}
                    onChange={(e) => updateSchedule('bestTimes', e.target.checked)}
                  />
                  <span>Use AI-optimized posting times</span>
                </label>
              </div>
            </div>

            {/* Content */}
            <div className="settings-card">
              <h3 className="card-title">📝 Content Settings</h3>
              <p className="card-description">How to manage content generation</p>
              <div className="content-settings">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.content.autoGenerate}
                    onChange={(e) => updateContent('autoGenerate', e.target.checked)}
                  />
                  <span>Auto-generate content when buffer is low</span>
                </label>
                <div className="form-group">
                  <label>Content buffer (days ahead)</label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={settings.content.bufferDays}
                    onChange={(e) => updateContent('bufferDays', parseInt(e.target.value))}
                    className="form-input"
                  />
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.content.approvalRequired}
                    onChange={(e) => updateContent('approvalRequired', e.target.checked)}
                  />
                  <span>Require approval before publishing</span>
                </label>
              </div>
            </div>

            {/* Rules */}
            <div className="settings-card">
              <h3 className="card-title">⚙️ Automation Rules</h3>
              <p className="card-description">Control when autopilot should pause</p>
              <div className="rules-settings">
                <div className="form-group">
                  <label>Minimum engagement rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={settings.rules.minEngagementRate}
                    onChange={(e) => updateRules('minEngagementRate', parseFloat(e.target.value))}
                    className="form-input"
                  />
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.rules.pauseOnLowPerformance}
                    onChange={(e) => updateRules('pauseOnLowPerformance', e.target.checked)}
                  />
                  <span>Pause if engagement drops below minimum</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.rules.skipWeekends}
                    onChange={(e) => updateRules('skipWeekends', e.target.checked)}
                  />
                  <span>Skip weekends</span>
                </label>
                <div className="form-group">
                  <label>Max posts per day</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.rules.maxPostsPerDay}
                    onChange={(e) => updateRules('maxPostsPerDay', parseInt(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="save-section">
            <button className="btn btn-primary btn-large" onClick={saveSettings}>
              💾 Save Settings
            </button>
            <button
              className="btn btn-secondary btn-large"
              onClick={() => navigate('/content-calendar')}
            >
              View Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

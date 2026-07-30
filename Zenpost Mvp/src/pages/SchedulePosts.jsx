import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import zendbx from '../lib/zendbx';
import Preloader from '../components/Preloader';
import PlatformIcon from '../components/PlatformIcon';
import '../theme-blue-black.css';
import './SchedulePosts.css';

export default function SchedulePosts() {
  const location = useLocation();
  const navigate = useNavigate();
  const { generatedCampaigns } = location.state || {};

  const [posts, setPosts] = useState([]);
  const [selectedPosts, setSelectedPosts] = useState(new Set());
  const [scheduleData, setScheduleData] = useState({});
  const [isScheduling, setIsScheduling] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const userData = await zendbx.auth.getUser();
      if (!userData || !userData.id) {
        navigate('/login');
        return;
      }
      setUser(userData);

      // Check if we have campaign data from navigation state
      if (!generatedCampaigns || !generatedCampaigns.master_calendar) {
        console.log('No campaign data found, redirecting to campaigns page');
        alert('Please generate a content calendar first from the Website Analysis page.');
        navigate('/campaigns');
        return;
      }

      console.log('Loading calendar posts:', generatedCampaigns);

      // Load posts from calendar
      const calendarPosts = generatedCampaigns.master_calendar.map((post, index) => ({
        ...post,
        id: `post-${index}`,
        selected: false
      }));

      console.log('Loaded posts:', calendarPosts.length);
      setPosts(calendarPosts);

      // Initialize schedule data with default times
      const initialSchedule = {};
      calendarPosts.forEach(post => {
        initialSchedule[post.id] = {
          time: post.best_time || '10:00',
          platforms: post.platforms || ['LinkedIn']
        };
      });
      setScheduleData(initialSchedule);

    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const togglePostSelection = (postId) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(posts.map(p => p.id)));
    }
  };

  const updateScheduleTime = (postId, time) => {
    setScheduleData(prev => ({
      ...prev,
      [postId]: { ...prev[postId], time }
    }));
  };

  const togglePlatform = (postId, platform) => {
    setScheduleData(prev => {
      const currentPlatforms = prev[postId]?.platforms || [];
      const newPlatforms = currentPlatforms.includes(platform)
        ? currentPlatforms.filter(p => p !== platform)
        : [...currentPlatforms, platform];
      
      return {
        ...prev,
        [postId]: { ...prev[postId], platforms: newPlatforms }
      };
    });
  };

  const handleSchedulePosts = async () => {
    if (selectedPosts.size === 0) {
      alert('Please select at least one post to schedule');
      return;
    }

    setIsScheduling(true);

    try {
      const scheduledPosts = Array.from(selectedPosts).map(postId => {
        const post = posts.find(p => p.id === postId);
        const schedule = scheduleData[postId];

        return {
          post_id: postId,
          date: post.date,
          time: schedule.time,
          platforms: schedule.platforms,
          content: {
            headline: post.headline,
            hook: post.hook,
            caption: post.caption,
            call_to_action: post.call_to_action,
            hashtags: post.hashtags,
            image_prompt: post.image_prompt
          }
        };
      });

      // Send to backend
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/schedule-posts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            posts: scheduledPosts
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to schedule posts');
      }

      const result = await response.json();

      alert(`✅ Successfully scheduled ${selectedPosts.size} posts!\n\nPosts will be automatically published at their scheduled times.`);
      
      // Navigate to a monitoring page or campaigns
      navigate('/campaigns', { 
        state: { message: 'Posts scheduled successfully!' }
      });

    } catch (error) {
      console.error('Error scheduling posts:', error);
      alert('Failed to schedule posts. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };



  if (loading) {
    return <Preloader message="Loading schedule page..." />;
  }

  if (!generatedCampaigns) {
    return (
      <div className="schedule-posts-page">
        <div className="container">
          <div className="empty-state">
            <h2>No calendar data found</h2>
            <p>Please generate a content calendar first.</p>
            <button className="btn btn-primary" onClick={() => navigate('/campaigns')}>
              Go to Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-posts-page">
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>

          <div className="header-content">
            <div className="header-text">
              <h1 className="page-title">
                <span className="gradient-text">📅 Schedule Posts</span>
              </h1>
              <p className="page-subtitle">
                Select posts, set times, and enable auto-posting
              </p>
            </div>
            <div className="header-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/campaigns')}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSchedulePosts}
                disabled={isScheduling || selectedPosts.size === 0}
              >
                {isScheduling ? (
                  <>
                    <div className="spinner-small"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    🚀 Schedule {selectedPosts.size} Post{selectedPosts.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        <div className="container">
          
          {/* Selection Controls */}
          <div className="selection-controls card">
            <div className="control-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedPosts.size === posts.length && posts.length > 0}
                  onChange={toggleSelectAll}
                />
                <span>Select All ({posts.length} posts)</span>
              </label>
            </div>
            <div className="selection-info">
              <span className="selected-count">
                {selectedPosts.size} selected
              </span>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="schedule-posts-grid">
            {posts.map((post) => {
              const isSelected = selectedPosts.has(post.id);
              const schedule = scheduleData[post.id] || {};

              return (
                <div 
                  key={post.id} 
                  className={`schedule-post-card card ${isSelected ? 'selected' : ''}`}
                >
                  {/* Selection Checkbox */}
                  <div className="post-select">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePostSelection(post.id)}
                    />
                  </div>

                  {/* Post Content */}
                  <div className="post-header">
                    <span className="post-date">{post.date}</span>
                    <span className="post-type">{post.post_type}</span>
                  </div>

                  <h3 className="post-headline">{post.headline}</h3>
                  <p className="post-hook">{post.hook}</p>

                  {/* Schedule Settings */}
                  {isSelected && (
                    <div className="schedule-settings">
                      {/* Time Picker */}
                      <div className="setting-group">
                        <label>⏰ Posting Time</label>
                        <input
                          type="time"
                          value={schedule.time || '10:00'}
                          onChange={(e) => updateScheduleTime(post.id, e.target.value)}
                          className="time-input"
                        />
                      </div>

                      {/* Platform Selector */}
                      <div className="setting-group">
                        <label>📱 Platforms</label>
                        <div className="platform-toggles">
                          {['LinkedIn', 'Twitter', 'Facebook'].map(platform => (
                            <button
                              key={platform}
                              className={`platform-toggle ${schedule.platforms?.includes(platform) ? 'active' : ''}`}
                              onClick={() => togglePlatform(post.id, platform)}
                            >
                              <PlatformIcon platform={platform} size="small" showLabel={true} />
                            </button>
                          ))}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                          Instagram requires images - coming soon
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import './CalendarPreview.css';

const CalendarPreview = ({ websiteInfo, analysis, intelligence, onApprove, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [calendar, setCalendar] = useState(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  useEffect(() => {
    generateCalendar();
  }, []);

  const generateCalendar = async (regenerateParams = null) => {
    setIsGenerating(true);
    setShowRegenerateModal(false);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Generate mock calendar
    const mockPosts = [];
    const platforms = intelligence?.platforms?.map(p => p.name) || ['LinkedIn', 'Instagram', 'Twitter'];
    const pillars = intelligence?.content_pillars || ['Tips', 'Stories', 'Updates', 'Insights'];
    
    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      mockPosts.push({
        id: `post-${i + 1}`,
        date: date.toISOString().split('T')[0],
        time: ['9:00 AM', '12:00 PM', '3:00 PM', '7:00 PM'][Math.floor(Math.random() * 4)],
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        title: `${pillars[Math.floor(Math.random() * pillars.length)]} Post ${i + 1}`,
        type: ['Image', 'Video', 'Carousel', 'Text'][Math.floor(Math.random() * 4)],
        caption: `Engaging content for your audience about ${pillars[Math.floor(Math.random() * pillars.length)].toLowerCase()}. This will help grow your brand presence.`,
        hashtags: intelligence?.hashtag_strategy?.slice(0, 3) || ['#Business', '#Growth', '#Marketing']
      });
    }

    setCalendar({ posts: mockPosts });
    setIsGenerating(false);
  };

  const handleApprove = () => {
    onApprove(calendar);
  };

  const handleRegenerate = () => {
    setShowRegenerateModal(true);
  };

  const handleRegenerateConfirm = (params) => {
    generateCalendar(params);
  };

  if (isGenerating) {
    return (
      <div className="calendar-preview-view">
        <div className="preview-card card">
          <div className="generating-state">
            <div className="loading-animation">
              <div className="calendar-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <h2>Generating Your Content Calendar</h2>
            <p>Creating a personalized 30-day content strategy...</p>
          </div>
        </div>
      </div>
    );
  }

  const platformCount = new Set(calendar.posts.map(p => p.platform)).size;
  const typeCount = new Set(calendar.posts.map(p => p.type)).size;

  return (
    <div className="calendar-preview-view">
      <div className="preview-card card">
        <div className="preview-header">
          <div className="success-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Calendar Ready
          </div>
          <h2>Your Content Calendar</h2>
          <p>Review your personalized 30-day content strategy</p>
        </div>

        {/* Summary Stats */}
        <div className="calendar-stats">
          <div className="stat-item">
            <div className="stat-value">{calendar.posts.length}</div>
            <div className="stat-label">Total Posts</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{platformCount}</div>
            <div className="stat-label">Platforms</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{typeCount}</div>
            <div className="stat-label">Content Types</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">30</div>
            <div className="stat-label">Days</div>
          </div>
        </div>

        {/* Calendar Posts Preview */}
        <div className="calendar-posts-preview">
          <h3 className="preview-section-title">Sample Posts</h3>
          <div className="posts-grid">
            {calendar.posts.slice(0, 6).map((post, index) => (
              <div key={index} className="preview-post-card">
                <div className="post-card-header">
                  <span className="post-date">{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="post-time">{post.time}</span>
                </div>
                <h4 className="post-title">{post.title}</h4>
                <p className="post-caption">{post.caption}</p>
                <div className="post-card-footer">
                  <span className="post-platform">{post.platform}</span>
                  <span className="post-type">{post.type}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="preview-note">+ {calendar.posts.length - 6} more posts in your full calendar</p>
        </div>

        {/* Platform Distribution */}
        <div className="distribution-section">
          <h3 className="preview-section-title">Platform Distribution</h3>
          <div className="platform-bars">
            {Array.from(new Set(calendar.posts.map(p => p.platform))).map(platform => {
              const count = calendar.posts.filter(p => p.platform === platform).length;
              const percentage = (count / calendar.posts.length) * 100;
              
              return (
                <div key={platform} className="platform-bar">
                  <div className="platform-bar-label">
                    <span>{platform}</span>
                    <span>{count} posts</span>
                  </div>
                  <div className="platform-bar-track">
                    <div 
                      className="platform-bar-fill" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="preview-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button className="btn btn-outline" onClick={handleRegenerate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </button>
          <button className="btn btn-primary btn-large" onClick={handleApprove}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Approve & Continue
          </button>
        </div>
      </div>

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <div className="modal-overlay" onClick={() => setShowRegenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Regenerate Calendar</h3>
            <p>Generate a new calendar with different content variations</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRegenerateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => handleRegenerateConfirm()}>
                Generate New Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPreview;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import zendbx from '../lib/zendbx';
import PlatformIcon from '../components/PlatformIcon';
import '../theme-blue-black.css';
import './CreatePost.css';

export default function CreatePost() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    caption: '',
    hook: '',
    body: '',
    call_to_action: '',
    platforms: ['LinkedIn'],
    scheduled_date: '',
    scheduled_time: '09:00',
    hashtags: '',
    image_prompt: '',
    content_type: 'Educational',
    content_pillar: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlatformToggle = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        alert('Please login first');
        navigate('/login');
        return;
      }

      // Parse hashtags
      const hashtagsArray = formData.hashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      // Use backend API to schedule the post
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      
      const scheduleData = {
        user_id: user.id,
        posts: [{
          post_id: crypto.randomUUID(),
          campaign_id: crypto.randomUUID(),
          calendar_post_id: crypto.randomUUID(),
          date: formData.scheduled_date,
          time: formData.scheduled_time || '10:00',
          platforms: formData.platforms,
          content: {
            headline: formData.title,
            hook: formData.hook || '',
            caption: formData.caption,
            call_to_action: formData.call_to_action || '',
            hashtags: hashtagsArray,
            image_prompt: formData.image_prompt || ''
          }
        }]
      };

      console.log('📤 Scheduling post via API:', scheduleData);

      const response = await fetch(`${apiBaseUrl}/api/schedule-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to schedule post');
      }

      const result = await response.json();
      console.log('Post scheduled successfully:', result);

      // Show success message
      alert(`Post scheduled successfully for ${formData.scheduled_date} at ${formData.scheduled_time}!\n\nThe post will be published to ${formData.platforms.join(', ')}.`);
      
      // Navigate to calendar
      navigate('/content-calendar');

    } catch (error) {
      console.error('Error creating post:', error);
      alert(`Failed to create post: ${error.message}\n\nPlease try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-page">
      <div className="page-header">
        <div className="container">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <h1 className="page-title">Create Manual Post</h1>
          <p className="page-subtitle">Compose and schedule your social media post</p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          <form className="create-post-form" onSubmit={handleSubmit}>
            {/* Platform Selection */}
            <div className="form-section">
              <label className="section-label">Select Platforms *</label>
              <div className="platform-grid">
                {['LinkedIn', 'Twitter', 'Facebook', 'Instagram'].map(platform => (
                  <button
                    key={platform}
                    type="button"
                    className={`platform-btn ${formData.platforms.includes(platform) ? 'active' : ''}`}
                    onClick={() => handlePlatformToggle(platform)}
                  >
                    <PlatformIcon platform={platform} size="small" showLabel={true} />
                  </button>
                ))}
              </div>
            </div>

            {/* Post Title */}
            <div className="form-section">
              <label className="section-label">Post Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter an attention-grabbing title..."
                className="form-input"
                required
              />
            </div>

            {/* Hook */}
            <div className="form-section">
              <label className="section-label">Hook (Opening Line)</label>
              <input
                type="text"
                name="hook"
                value={formData.hook}
                onChange={handleChange}
                placeholder="Start with something that grabs attention..."
                className="form-input"
              />
            </div>

            {/* Caption/Body */}
            <div className="form-section">
              <label className="section-label">Post Caption/Body *</label>
              <textarea
                name="caption"
                value={formData.caption}
                onChange={handleChange}
                placeholder="Write your post content here..."
                className="form-textarea"
                rows="8"
                required
              />
              <small className="form-hint">
                Character count: {formData.caption.length}
              </small>
            </div>

            {/* Call to Action */}
            <div className="form-section">
              <label className="section-label">Call to Action</label>
              <input
                type="text"
                name="call_to_action"
                value={formData.call_to_action}
                onChange={handleChange}
                placeholder="e.g., Visit our website, Sign up now, Learn more..."
                className="form-input"
              />
            </div>

            {/* Hashtags */}
            <div className="form-section">
              <label className="section-label">Hashtags</label>
              <input
                type="text"
                name="hashtags"
                value={formData.hashtags}
                onChange={handleChange}
                placeholder="marketing, socialmedia, business (comma separated)"
                className="form-input"
              />
              <small className="form-hint">
                Separate hashtags with commas. # will be added automatically.
              </small>
            </div>

            {/* Schedule Date & Time */}
            <div className="form-row">
              <div className="form-section">
                <label className="section-label">Schedule Date *</label>
                <input
                  type="date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleChange}
                  className="form-input"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-section">
                <label className="section-label">Schedule Time *</label>
                <input
                  type="time"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Content Type & Pillar */}
            <div className="form-row">
              <div className="form-section">
                <label className="section-label">Content Type</label>
                <select
                  name="content_type"
                  value={formData.content_type}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="Educational">Educational</option>
                  <option value="Promotional">Promotional</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Inspirational">Inspirational</option>
                  <option value="News">News/Update</option>
                </select>
              </div>

              <div className="form-section">
                <label className="section-label">Content Pillar</label>
                <input
                  type="text"
                  name="content_pillar"
                  value={formData.content_pillar}
                  onChange={handleChange}
                  placeholder="e.g., Product Updates, Tips & Tricks"
                  className="form-input"
                />
              </div>
            </div>

            {/* Image Prompt (for AI generation) */}
            <div className="form-section">
              <label className="section-label">Image Prompt (for AI)</label>
              <textarea
                name="image_prompt"
                value={formData.image_prompt}
                onChange={handleChange}
                placeholder="Describe the image you want AI to generate..."
                className="form-textarea"
                rows="3"
              />
            </div>

            {/* Submit Buttons */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Schedule Post
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

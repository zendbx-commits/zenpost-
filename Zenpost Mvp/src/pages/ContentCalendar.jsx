import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import zendbx from '../lib/zendbx';
import PlatformIcon from '../components/PlatformIcon';
import { addSamplePostsToLocalStorage, clearAllPosts } from '../utils/calendarTestData';
import './ContentCalendar.css';

export default function ContentCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [editableDate, setEditableDate] = useState('');
  const [editableTime, setEditableTime] = useState('');
  const [showDevTools, setShowDevTools] = useState(false);

  console.log('ContentCalendar component loaded');

  useEffect(() => {
    console.log('ContentCalendar useEffect running');
    // Check auth and load scheduled posts from database
    checkAuthAndLoad();

    // Listen for storage changes (when posts are added from other tabs/pages)
    const handleStorageChange = (e) => {
      if (e.key === 'zenpost_scheduled_posts') {
        console.log('Posts updated, reloading...');
        checkAuthAndLoad();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also reload when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible, reloading posts...');
        checkAuthAndLoad();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        navigate('/login');
        return;
      }
      // Load posts for THIS user only
      await loadScheduledPosts(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    }
  };

  const loadScheduledPosts = async (userId) => {
    console.log(`📥 Loading scheduled posts for user: ${userId}...`);
    setLoading(true);
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      
      // Method 1: Fetch from backend API (includes in-memory posts)
      console.log(`🌐 Fetching from backend API: ${apiBaseUrl}/api/scheduled-posts`);
      
      const apiResponse = await fetch(`${apiBaseUrl}/api/scheduled-posts?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log(`📦 API response:`, apiData);
        
        const apiPosts = apiData.posts || [];
        console.log(`📊 Found ${apiPosts.length} posts from backend API`);
        
        if (apiPosts.length > 0) {
          console.log(`✅ Total posts loaded from API: ${apiPosts.length}`);
          console.log(`📋 First post sample:`, apiPosts[0]);
          setPosts(apiPosts);
          // Save to localStorage as backup
          localStorage.setItem(`zenpost_scheduled_posts_${userId}`, JSON.stringify(apiPosts));
          return;
        }
      } else {
        console.warn(`⚠️ API returned ${apiResponse.status}, falling back to ZenDBX`);
      }
      
      // Method 2: Fallback to ZenDBX direct access
      console.log(`🌐 Fetching from ZenDBX calendar_posts and scheduled_posts tables...`);
      
      // Fetch both draft posts (calendar_posts) and scheduled posts (scheduled_posts)
      const [calendarResponse, scheduledResponse] = await Promise.all([
        zendbx.from('calendar_posts').select('*'),
        zendbx.from('scheduled_posts').select('*')
      ]);
      
      console.log(`📦 Calendar posts response:`, calendarResponse);
      console.log(`📦 Scheduled posts response:`, scheduledResponse);
      
      const allCalendarPosts = calendarResponse?.data || [];
      const allScheduledPosts = scheduledResponse?.data || [];
      
      console.log(`📊 Raw data - Calendar posts: ${allCalendarPosts.length}, Scheduled posts: ${allScheduledPosts.length}`);
      
      // Filter to only approved calendar posts
      const calendarPosts = allCalendarPosts.filter(post => post.status === 'approved');
      
      // Filter scheduled posts by user_id (check both metadata and direct column)
      const scheduledPosts = allScheduledPosts.filter(post => {
        // Check direct user_id column
        if (post.user_id === userId) return true;
        // Check metadata.user_id
        if (post.metadata && post.metadata.user_id === userId) return true;
        return false;
      });
      
      console.log(`📊 Found ${calendarPosts.length} approved calendar posts and ${scheduledPosts.length} scheduled posts for user ${userId}`);
      
      // Format calendar posts (from campaigns, status: approved)
      const formattedCalendarPosts = calendarPosts.map(post => ({
        id: post.id,
        date: post.scheduled_date || new Date().toISOString().split('T')[0],
        time: '10:00', // Default time for calendar posts
        platform: (post.platforms && post.platforms[0]) || 'LinkedIn',
        platforms: post.platforms || ['LinkedIn'],
        type: post.content_type || 'Image',
        status: 'draft', // Calendar posts are drafts until scheduled
        title: post.title || post.content_topic || 'Untitled Post',
        caption: post.post_brief || '',
        hook: post.hook || '',
        call_to_action: post.call_to_action || '',
        hashtags: post.hashtags || [],
        body: post.post_brief || '',
        image_prompt: post.image_prompt || null,
        image_url: post.image_url || null,
        campaign_id: post.campaign_id,
        content_pillar: post.content_pillar,
        content_topic: post.content_topic,
        engagement_goal: post.engagement_goal
      }));
      
      // Format scheduled posts (actually scheduled for publishing)
      const formattedScheduledPosts = scheduledPosts.map(post => {
        const scheduledAt = post.scheduled_at || post.scheduled_datetime;
        const scheduledDateTime = scheduledAt ? new Date(scheduledAt) : new Date();
        const metadata = post.metadata || {};
        const content = metadata || {};
        
        return {
          id: post.id,
          date: scheduledDateTime.toISOString().split('T')[0],
          time: scheduledDateTime.toTimeString().slice(0, 5), // HH:MM format
          platform: post.platform || (post.platforms && post.platforms[0]) || 'LinkedIn',
          platforms: post.platforms || [post.platform] || ['LinkedIn'],
          type: content.content_type || 'Image',
          status: post.status === 'completed' ? 'published' : 'scheduled',
          title: metadata.headline || content.headline || content.title || 'Untitled Post',
          caption: metadata.caption || content.caption || content.text || '',
          hook: metadata.hook || content.hook || '',
          call_to_action: metadata.call_to_action || content.call_to_action || '',
          hashtags: metadata.hashtags || content.hashtags || [],
          body: metadata.caption || content.caption || content.text || '',
          image_prompt: metadata.image_prompt || content.image_prompt || null,
          image_url: metadata.image_url || content.image_url || null,
          campaign_id: metadata.campaign_id || post.campaign_id,
          calendar_post_id: metadata.calendar_post_id || post.calendar_post_id
        };
      });
      
      // Combine both types of posts
      const allPosts = [...formattedCalendarPosts, ...formattedScheduledPosts];
      
      console.log(`✅ Total posts loaded: ${allPosts.length}`);
      
      if (allPosts.length > 0) {
        console.log(`📋 First post sample:`, allPosts[0]);
        setPosts(allPosts);
        // Save to localStorage as backup
        localStorage.setItem(`zenpost_scheduled_posts_${userId}`, JSON.stringify(allPosts));
      } else {
        console.log(`ℹ️  No posts found in ZenDBX or API`);
        
        // Try localStorage as final fallback
        const savedPosts = localStorage.getItem(`zenpost_scheduled_posts_${userId}`);
        if (savedPosts) {
          try {
            const parsedPosts = JSON.parse(savedPosts);
            console.log(`✅ Loaded ${parsedPosts.length} posts from localStorage (fallback)`);
            setPosts(parsedPosts);
          } catch (parseError) {
            console.error('❌ Failed to parse localStorage posts:', parseError);
            setPosts([]);
          }
        } else {
          console.log('⚠️ No saved posts found - calendar is empty');
          console.log('💡 Tip: Schedule posts from Marketing Intelligence or Create Post');
          setPosts([]);
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading posts:', error);
      console.error('   Error details:', error.message);
      console.error('   Stack:', error.stack);
      
      // Try localStorage as final fallback
      try {
        const savedPosts = localStorage.getItem(`zenpost_scheduled_posts_${userId}`);
        if (savedPosts) {
          const parsedPosts = JSON.parse(savedPosts);
          console.log(`🔄 Fallback: Loaded ${parsedPosts.length} posts from localStorage`);
          setPosts(parsedPosts);
        } else {
          console.log('🔄 Fallback: No posts in localStorage either');
          setPosts([]);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        setPosts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSamplePosts = () => {
    const today = new Date();
    const samplePosts = [];
    
    for (let i = 0; i < 15; i++) {
      const postDate = new Date(today);
      postDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
      
      const platforms = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn'];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      
      const types = ['Image', 'Video', 'Carousel', 'Story'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const statuses = ['scheduled', 'draft', 'published'];
      const status = i < 10 ? 'scheduled' : statuses[Math.floor(Math.random() * statuses.length)];
      
      samplePosts.push({
        id: `post-${i + 1}`,
        date: postDate.toISOString().split('T')[0],
        time: `${Math.floor(Math.random() * 12) + 8}:${['00', '15', '30', '45'][Math.floor(Math.random() * 4)]} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
        platform,
        type,
        status,
        title: `Engaging ${platform} Post #${i + 1}`,
        caption: `This is a sample caption for post ${i + 1}. It includes engaging content that will resonate with your audience.`,
        hashtags: ['#marketing', '#socialmedia', '#content', '#branding']
      });
    }
    
    return samplePosts.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i)
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i)
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i)
      });
    }
    
    return days;
  };

  const getPostsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter(post => {
      const matchesDate = post.date === dateStr;
      const matchesFilter = filter === 'all' || post.platform.toLowerCase() === filter;
      return matchesDate && matchesFilter;
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handlePostClick = (post, e) => {
    if (e) e.stopPropagation();
    setSelectedPost(post);
    setEditableDate(post.date);
    setEditableTime(post.time || '10:00');
  };

  const handlePublish = async () => {
    if (!selectedPost) return;
    
    try {
      setLoading(true);
      
      // Get user info
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        alert('Please login first');
        return;
      }

      // Check if user has connected social accounts
      const accountsResponse = await zendbx.from('socials').select('*');
      const allAccounts = accountsResponse?.data || [];
      const userAccounts = allAccounts.filter(acc => acc.user_id === user.id);
      
      if (userAccounts.length === 0) {
        if (window.confirm('You haven\'t connected any social media accounts yet. Would you like to connect them now?')) {
          navigate('/social/accounts');
        }
        return;
      }

      // Prepare post data
      const postData = {
        user_id: user.id,
        post_id: selectedPost.id,
        platforms: selectedPost.platforms || [selectedPost.platform],
        content: {
          text: selectedPost.caption || selectedPost.post_brief || selectedPost.body,
          title: selectedPost.title,
          hook: selectedPost.hook,
          call_to_action: selectedPost.call_to_action,
          hashtags: selectedPost.hashtags || [],
          image_prompt: selectedPost.image_prompt || null
        },
        image_url: selectedPost.image_url || null
      };

      console.log('📤 Publishing post:', postData);

      // Call backend to publish
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/publish-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to publish post');
      }

      const result = await response.json();
      console.log('✅ Published successfully:', result);

      // Update post status to published
      const updatedPosts = posts.map(post =>
        post.id === selectedPost.id
          ? { ...post, status: 'published', published_at: new Date().toISOString() }
          : post
      );
      setPosts(updatedPosts);
      localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));

      // Try to update in ZenDBX as well
      try {
        await zendbx.from('calendar_posts')
          .update({ status: 'published' })
          .eq('id', selectedPost.id);
      } catch (dbError) {
        console.warn('Failed to update ZenDBX:', dbError);
      }

      alert(`✅ Post published successfully to ${postData.platforms.join(', ')}!`);
      setSelectedPost(null);

    } catch (error) {
      console.error('❌ Publish error:', error);
      alert(`Failed to publish post: ${error.message}\n\nMake sure you've connected your social media accounts in Settings > Social Accounts.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedPost) return;
    
    try {
      setLoading(true);
      
      // Get user info
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        alert('Please login first');
        return;
      }

      // Prepare post data for scheduling using editable date/time
      const scheduleData = {
        user_id: user.id,
        posts: [{
          post_id: selectedPost.id,
          campaign_id: selectedPost.campaign_id || null,
          calendar_post_id: selectedPost.id,
          date: editableDate,  // Use editable date
          time: editableTime,  // Use editable time
          platforms: selectedPost.platforms || [selectedPost.platform],
          content: {
            headline: selectedPost.title,
            hook: selectedPost.hook,
            caption: selectedPost.caption || selectedPost.post_brief || selectedPost.body,
            call_to_action: selectedPost.call_to_action,
            hashtags: selectedPost.hashtags || [],
            image_prompt: selectedPost.image_prompt || null,
            image_url: selectedPost.image_url || null
          }
        }]
      };

      console.log('📅 Scheduling post:', scheduleData);

      // Call backend to schedule
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/schedule-posts`, {
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
      console.log('✅ Scheduled successfully:', result);

      // Update post status to scheduled
      const updatedPosts = posts.map(post =>
        post.id === selectedPost.id
          ? { ...post, status: 'scheduled', scheduled_at: new Date().toISOString(), date: editableDate, time: editableTime }
          : post
      );
      setPosts(updatedPosts);
      localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));

      // Try to update in ZenDBX as well
      try {
        await zendbx.from('calendar_posts')
          .update({ status: 'scheduled' })
          .eq('id', selectedPost.id);
      } catch (dbError) {
        console.warn('Failed to update ZenDBX:', dbError);
      }

      const scheduledTime = `${editableDate} at ${editableTime}`;
      alert(`✅ Post scheduled successfully for ${scheduledTime}!\n\nThe scheduler will automatically publish it to ${scheduleData.posts[0].platforms.join(', ')}.`);
      setSelectedPost(null);

    } catch (error) {
      console.error('❌ Schedule error:', error);
      alert(`Failed to schedule post: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!selectedPost) return;
    alert('Edit functionality will open a form to modify the post content.');
    // TODO: Implement edit modal or navigate to edit page
  };

  const handleDelete = () => {
    if (!selectedPost) return;
    
    if (window.confirm('Are you sure you want to delete this post?')) {
      const updatedPosts = posts.filter(post => post.id !== selectedPost.id);
      setPosts(updatedPosts);
      localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));
      setSelectedPost(null);
    }
  };

  const handleAddSamplePosts = async () => {
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        alert('Please login first');
        return;
      }
      
      const allPosts = addSamplePostsToLocalStorage(user.id, 15);
      setPosts(allPosts);
      alert('✅ Added 15 sample posts! Refresh the page if you don\'t see them.');
      setShowDevTools(false);
    } catch (error) {
      console.error('Error adding sample posts:', error);
      alert('Failed to add sample posts. See console for details.');
    }
  };

  const handleClearAllPosts = async () => {
    if (!window.confirm('⚠️ This will delete ALL posts from the calendar. Are you sure?')) {
      return;
    }
    
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        alert('Please login first');
        return;
      }
      
      clearAllPosts(user.id);
      setPosts([]);
      alert('🗑️ All posts cleared!');
      setShowDevTools(false);
    } catch (error) {
      console.error('Error clearing posts:', error);
      alert('Failed to clear posts. See console for details.');
    }
  };

  const getPlatformColor = (platform) => {
    const colors = {
      instagram: '#E4405F',
      facebook: '#1877F2',
      twitter: '#1DA1F2',
      linkedin: '#0A66C2'
    };
    return colors[platform.toLowerCase()] || '#6366F1';
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: '#10B981',
      draft: '#F59E0B',
      published: '#6366F1'
    };
    return colors[status] || '#6B7280';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="content-calendar-page">
      {/* Header */}
      <div className="calendar-page-header">
        <div className="container">
          <div className="header-top">
            <div className="header-text">
              <h1 className="page-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="gradient-text">Content Calendar</span>
              </h1>
              <p className="page-subtitle">Plan, schedule, and manage your social media content</p>
            </div>
            <div className="header-actions">
              {process.env.NODE_ENV === 'development' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowDevTools(!showDevTools)}
                  style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <line x1="9" y1="1" x2="9" y2="4" />
                    <line x1="15" y1="1" x2="15" y2="4" />
                    <line x1="9" y1="20" x2="9" y2="23" />
                    <line x1="15" y1="20" x2="15" y2="23" />
                    <line x1="20" y1="9" x2="23" y2="9" />
                    <line x1="20" y1="14" x2="23" y2="14" />
                    <line x1="1" y1="9" x2="4" y2="9" />
                    <line x1="1" y1="14" x2="4" y2="14" />
                  </svg>
                  Dev Tools
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => navigate('/marketing-intelligence')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Marketing Intelligence
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/create-post')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="calendar-stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{posts.filter(p => p.status === 'scheduled').length}</div>
                <div className="stat-label">Scheduled Posts</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{posts.filter(p => p.status === 'published').length}</div>
                <div className="stat-label">Published</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{posts.filter(p => p.status === 'draft').length}</div>
                <div className="stat-label">Drafts</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{new Set(posts.map(p => p.platform)).size}</div>
                <div className="stat-label">Platforms</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Tools Panel */}
      {showDevTools && (
        <div style={{
          background: '#fef3c7',
          borderTop: '2px solid #f59e0b',
          borderBottom: '2px solid #f59e0b',
          padding: '1.5rem 0'
        }}>
          <div className="container">
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              border: '2px solid #f59e0b'
            }}>
              <h3 style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                marginBottom: '1rem',
                color: '#92400e',
                fontSize: '1.25rem',
                fontWeight: '700'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}>
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
                🛠️ Developer Tools
              </h3>
              <p style={{ color: '#78350f', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Quick tools for testing the Content Calendar. These buttons are only visible in development mode.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={handleAddSamplePosts}
                  style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add 15 Sample Posts
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleClearAllPosts}
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: 'white' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                  Clear All Posts
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                  style={{ background: '#6366f1', borderColor: '#6366f1', color: 'white' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Reload Calendar
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    console.log('📊 Current Calendar State:');
                    console.log('Posts:', posts);
                    console.log('Loading:', loading);
                    console.log('Filter:', filter);
                    alert('Check browser console (F12) for calendar state');
                  }}
                  style={{ background: '#8b5cf6', borderColor: '#8b5cf6', color: 'white' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Log State to Console
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Controls */}
      <div className="calendar-controls">
        <div className="container">
          <div className="controls-content">
            <div className="calendar-navigation">
              <button className="nav-btn" onClick={() => navigateMonth(-1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className="current-month">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button className="nav-btn" onClick={() => navigateMonth(1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button className="btn-today" onClick={goToToday}>Today</button>
            </div>

            <div className="calendar-filters">
              <button 
                className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All Platforms
              </button>
              <button 
                className={`filter-chip ${filter === 'instagram' ? 'active' : ''}`}
                onClick={() => setFilter('instagram')}
              >
                <PlatformIcon platform="instagram" size="small" />
                Instagram
              </button>
              <button 
                className={`filter-chip ${filter === 'facebook' ? 'active' : ''}`}
                onClick={() => setFilter('facebook')}
              >
                <PlatformIcon platform="facebook" size="small" />
                Facebook
              </button>
              <button 
                className={`filter-chip ${filter === 'twitter' ? 'active' : ''}`}
                onClick={() => setFilter('twitter')}
              >
                <PlatformIcon platform="twitter" size="small" />
                Twitter
              </button>
              <button 
                className={`filter-chip ${filter === 'linkedin' ? 'active' : ''}`}
                onClick={() => setFilter('linkedin')}
              >
                <PlatformIcon platform="linkedin" size="small" />
                LinkedIn
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-content">
        <div className="container">
          {loading ? (
            /* Loading State */
            <div className="empty-state card" style={{
              textAlign: 'center',
              padding: '60px 20px',
              marginTop: '40px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 20px',
                border: '4px solid #f3f4f6',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                Loading Calendar...
              </h3>
              <p style={{ color: '#6b7280', fontSize: '16px' }}>
                Fetching your scheduled posts
              </p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : posts.length === 0 ? (
            /* Empty State */
            <div className="empty-state card" style={{
              textAlign: 'center',
              padding: '60px 20px',
              marginTop: '40px'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 20px',
                opacity: 0.5
              }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                No Posts Scheduled Yet
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '16px' }}>
                Your calendar is empty. Get started by creating posts or generating content with AI.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/marketing-intelligence')}
                  style={{ minWidth: '200px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate AI Content
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate('/create-post')}
                  style={{ minWidth: '200px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Manual Post
                </button>
              </div>
              <div style={{ 
                marginTop: '32px', 
                padding: '20px', 
                background: '#f0f9ff', 
                borderRadius: '8px',
                maxWidth: '600px',
                margin: '32px auto 0'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#0369a1' }}>
                  💡 Quick Start Tips
                </h4>
                <ul style={{ 
                  textAlign: 'left', 
                  color: '#075985', 
                  fontSize: '14px', 
                  lineHeight: '1.6',
                  paddingLeft: '20px',
                  margin: 0
                }}>
                  <li>Use <strong>Marketing Intelligence</strong> to analyze a website and auto-generate 30 days of content</li>
                  <li>Or create individual posts with <strong>Create Post</strong> and schedule them manually</li>
                  <li>View and approve generated posts in the <strong>Approvals</strong> page</li>
                </ul>
              </div>
            </div>
          ) : (
          <div className="calendar-grid-container card">
            {/* Weekday Headers */}
            <div className="calendar-weekdays">
              <div className="weekday-header">Sun</div>
              <div className="weekday-header">Mon</div>
              <div className="weekday-header">Tue</div>
              <div className="weekday-header">Wed</div>
              <div className="weekday-header">Thu</div>
              <div className="weekday-header">Fri</div>
              <div className="weekday-header">Sat</div>
            </div>

            {/* Calendar Days */}
            <div className="calendar-days">
              {getCalendarDays().map((dayInfo, index) => {
                const postsForDay = getPostsForDate(dayInfo.date);
                const isToday = dayInfo.date.toISOString().split('T')[0] === todayStr;
                
                return (
                  <div
                    key={index}
                    className={`calendar-day-cell ${!dayInfo.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${postsForDay.length > 0 ? 'has-posts' : ''}`}
                  >
                    <div className="day-number">{dayInfo.day}</div>
                    {postsForDay.length > 0 && (
                      <div className="day-posts-list">
                        {postsForDay.slice(0, 3).map((post, idx) => (
                          <div
                            key={idx}
                            className="post-pill"
                            style={{ borderLeftColor: getPlatformColor(post.platform) }}
                            onClick={(e) => handlePostClick(post, e)}
                            title={post.title}
                          >
                            <span className="post-pill-time">{post.time}</span>
                            <span className="post-pill-title">{post.title}</span>
                          </div>
                        ))}
                        {postsForDay.length > 3 && (
                          <div className="post-pill-more">
                            +{postsForDay.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedPost(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="modal-header">
              <div className="modal-title-row">
                <h2>{selectedPost.title}</h2>
                <span 
                  className="status-badge"
                  style={{ background: getStatusColor(selectedPost.status) }}
                >
                  {selectedPost.status}
                </span>
              </div>
              <div className="modal-meta">
                <span className="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <input 
                    type="date" 
                    value={editableDate} 
                    onChange={(e) => setEditableDate(e.target.value)}
                    style={{ 
                      border: 'none', 
                      background: 'transparent', 
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: 'inherit'
                    }}
                  />
                </span>
                <span className="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <input 
                    type="time" 
                    value={editableTime} 
                    onChange={(e) => setEditableTime(e.target.value)}
                    style={{ 
                      border: 'none', 
                      background: 'transparent', 
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: 'inherit'
                    }}
                  />
                </span>
                <span 
                  className="meta-item"
                  style={{ color: getPlatformColor(selectedPost.platform) }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  {selectedPost.platform}
                </span>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <label className="section-label">Hook</label>
                <p className="section-content hook-text">{selectedPost.hook || 'No hook available'}</p>
              </div>

              <div className="modal-section">
                <label className="section-label">Caption / Body</label>
                <p className="section-content">{selectedPost.caption}</p>
                {selectedPost.body && selectedPost.body !== selectedPost.caption && (
                  <p className="section-content body-text">{selectedPost.body}</p>
                )}
              </div>

              <div className="modal-section">
                <label className="section-label">Call to Action</label>
                <p className="section-content cta-text">{selectedPost.call_to_action || 'N/A'}</p>
              </div>

              <div className="modal-section">
                <label className="section-label">Content Type</label>
                <span className="type-badge">{selectedPost.type}</span>
              </div>

              {selectedPost.engagement_goal && (
                <div className="modal-section">
                  <label className="section-label">Engagement Goal</label>
                  <span className="goal-badge">{selectedPost.engagement_goal}</span>
                </div>
              )}

              {selectedPost.image_prompt && (
                <div className="modal-section">
                  <label className="section-label">Image Prompt (for AI)</label>
                  <p className="section-content image-prompt-text">{selectedPost.image_prompt}</p>
                </div>
              )}

              <div className="modal-section">
                <label className="section-label">Hashtags</label>
                <div className="hashtags-container">
                  {selectedPost.hashtags.map((tag, idx) => (
                    <span key={idx} className="hashtag-chip">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleEdit}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
              {selectedPost.status !== 'published' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleSchedule}
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {loading ? 'Scheduling...' : 'Schedule'}
                </button>
              )}
              {selectedPost.status !== 'published' && (
                <button 
                  className="btn btn-primary" 
                  onClick={handlePublish}
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  {loading ? 'Publishing...' : 'Publish Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

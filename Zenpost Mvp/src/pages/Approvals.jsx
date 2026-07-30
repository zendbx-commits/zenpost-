import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import zendbx from '../lib/zendbx';
import PlatformIcon from '../components/PlatformIcon';
import '../theme-blue-black.css';
import './Approvals.css';

export default function Approvals() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [filter, posts]);

  const checkAuthAndLoad = async () => {
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        navigate('/login');
        return;
      }
      loadPosts();
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    }
  };

  const loadPosts = () => {
    try {
      const savedPosts = localStorage.getItem('zenpost_scheduled_posts');
      if (savedPosts) {
        const allPosts = JSON.parse(savedPosts);
        // Add approval status if not exists
        const postsWithStatus = allPosts.map(post => ({
          ...post,
          approvalStatus: post.approvalStatus || 'pending'
        }));
        setPosts(postsWithStatus);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = () => {
    if (filter === 'all') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.approvalStatus === filter));
    }
  };

  const approvePost = (postId) => {
    updatePostStatus(postId, 'approved');
  };

  const rejectPost = (postId) => {
    updatePostStatus(postId, 'rejected');
  };

  const updatePostStatus = (postId, status) => {
    const updatedPosts = posts.map(post =>
      post.id === postId ? { ...post, approvalStatus: status, status: status === 'approved' ? 'scheduled' : 'draft' } : post
    );
    setPosts(updatedPosts);
    localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));
  };

  const bulkApprove = () => {
    const updatedPosts = posts.map(post =>
      selectedPosts.includes(post.id) ? { ...post, approvalStatus: 'approved', status: 'scheduled' } : post
    );
    setPosts(updatedPosts);
    localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));
    setSelectedPosts([]);
  };

  const bulkReject = () => {
    const updatedPosts = posts.map(post =>
      selectedPosts.includes(post.id) ? { ...post, approvalStatus: 'rejected', status: 'draft' } : post
    );
    setPosts(updatedPosts);
    localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));
    setSelectedPosts([]);
  };

  const toggleSelectPost = (postId) => {
    setSelectedPosts(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const selectAll = () => {
    const allFilteredIds = filteredPosts.map(p => p.id);
    setSelectedPosts(allFilteredIds);
  };

  const deselectAll = () => {
    setSelectedPosts([]);
  };

  const deletePost = (postId) => {
    const updatedPosts = posts.filter(post => post.id !== postId);
    setPosts(updatedPosts);
    localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));
  };



  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      approved: '#10B981',
      rejected: '#EF4444'
    };
    return colors[status] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="approvals-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="approvals-page">
      {/* Header */}
      <div className="approvals-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1 className="page-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="gradient-text">Content Approvals</span>
              </h1>
              <p className="page-subtitle">Review and approve generated content before publishing</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/content-calendar')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              View Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="approvals-stats">
        <div className="container">
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#F59E0B' }}>
                {posts.filter(p => p.approvalStatus === 'pending').length}
              </div>
              <div className="stat-label">Pending Review</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#10B981' }}>
                {posts.filter(p => p.approvalStatus === 'approved').length}
              </div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#EF4444' }}>
                {posts.filter(p => p.approvalStatus === 'rejected').length}
              </div>
              <div className="stat-label">Rejected</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{posts.length}</div>
              <div className="stat-label">Total Posts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="approvals-controls">
        <div className="container">
          <div className="controls-row">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                onClick={() => setFilter('pending')}
              >
                Pending ({posts.filter(p => p.approvalStatus === 'pending').length})
              </button>
              <button
                className={`filter-tab ${filter === 'approved' ? 'active' : ''}`}
                onClick={() => setFilter('approved')}
              >
                Approved ({posts.filter(p => p.approvalStatus === 'approved').length})
              </button>
              <button
                className={`filter-tab ${filter === 'rejected' ? 'active' : ''}`}
                onClick={() => setFilter('rejected')}
              >
                Rejected ({posts.filter(p => p.approvalStatus === 'rejected').length})
              </button>
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({posts.length})
              </button>
            </div>

            {selectedPosts.length > 0 && (
              <div className="bulk-actions">
                <span className="selected-count">{selectedPosts.length} selected</span>
                <button className="btn btn-success btn-sm" onClick={bulkApprove}>
                  ✓ Approve All
                </button>
                <button className="btn btn-danger btn-sm" onClick={bulkReject}>
                  ✕ Reject All
                </button>
                <button className="btn btn-secondary btn-sm" onClick={deselectAll}>
                  Deselect
                </button>
              </div>
            )}

            {filteredPosts.length > 0 && selectedPosts.length === 0 && (
              <button className="btn btn-secondary btn-sm" onClick={selectAll}>
                Select All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="approvals-content">
        <div className="container">
          {filteredPosts.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>No posts to review</h3>
              <p>Generate content from Marketing Intelligence to see posts here</p>
              <button className="btn btn-primary" onClick={() => navigate('/websites')}>
                Start Analysis
              </button>
            </div>
          ) : (
            <div className="posts-grid">
              {filteredPosts.map(post => (
                <div key={post.id} className={`post-card ${selectedPosts.includes(post.id) ? 'selected' : ''}`}>
                  <div className="post-header">
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post.id)}
                      onChange={() => toggleSelectPost(post.id)}
                      className="post-checkbox"
                    />
                    <span
                      className="status-badge"
                      style={{ background: getStatusColor(post.approvalStatus) }}
                    >
                      {post.approvalStatus}
                    </span>
                    <span className="platform-badge">
                      <PlatformIcon platform={post.platform} size="small" showLabel={true} />
                    </span>
                  </div>

                  <div className="post-body">
                    <h3 className="post-title">{post.title}</h3>
                    {post.hook && (
                      <p className="post-hook">"{post.hook}"</p>
                    )}
                    <p className="post-caption">
                      {post.caption?.substring(0, 150)}
                      {post.caption?.length > 150 ? '...' : ''}
                    </p>
                    {post.call_to_action && (
                      <div className="post-cta">
                        <strong>CTA:</strong> {post.call_to_action}
                      </div>
                    )}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="post-hashtags">
                        {post.hashtags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="hashtag">{tag}</span>
                        ))}
                        {post.hashtags.length > 3 && (
                          <span className="hashtag-more">+{post.hashtags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="post-meta">
                    <span className="meta-date">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {post.date}
                    </span>
                    <span className="meta-time">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {post.time}
                    </span>
                  </div>

                  <div className="post-actions">
                    {post.approvalStatus === 'pending' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => approvePost(post.id)}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => rejectPost(post.id)}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                    {post.approvalStatus === 'approved' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => updatePostStatus(post.id, 'pending')}
                      >
                        ↶ Move to Pending
                      </button>
                    )}
                    {post.approvalStatus === 'rejected' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => updatePostStatus(post.id, 'pending')}
                      >
                        ↶ Move to Pending
                      </button>
                    )}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingPost(post)}
                    >
                      ✎ Edit
                    </button>
                    <button
                      className="btn btn-outline btn-sm btn-delete"
                      onClick={() => {
                        if (confirm('Delete this post?')) deletePost(post.id);
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingPost && (
        <div className="modal-overlay" onClick={() => setEditingPost(null)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditingPost(null)}>
              ✕
            </button>
            <h2>Edit Post</h2>
            <div className="edit-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Hook</label>
                <input
                  type="text"
                  value={editingPost.hook || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, hook: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Caption</label>
                <textarea
                  value={editingPost.caption}
                  onChange={(e) => setEditingPost({ ...editingPost, caption: e.target.value })}
                  className="form-textarea"
                  rows="6"
                />
              </div>
              <div className="form-group">
                <label>Call to Action</label>
                <input
                  type="text"
                  value={editingPost.call_to_action || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, call_to_action: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setEditingPost(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const updatedPosts = posts.map(p =>
                      p.id === editingPost.id ? editingPost : p
                    );
                    setPosts(updatedPosts);
                    localStorage.setItem('zenpost_scheduled_posts', JSON.stringify(updatedPosts));
                    setEditingPost(null);
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

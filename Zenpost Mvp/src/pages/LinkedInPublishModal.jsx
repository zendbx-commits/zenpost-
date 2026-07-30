import { useState, useEffect } from 'react';
import zendbx from '../lib/zendbx';
import './LinkedInPublishModal.css';

export default function LinkedInPublishModal({ post, onClose, onPublished }) {
  const [linkedInAccounts, setLinkedInAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Content editing
  const [editedContent, setEditedContent] = useState('');
  
  // Image generation
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(null);
  
  // Publishing
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    loadLinkedInAccounts();
    prepareContent();
  }, [post]);

  const loadLinkedInAccounts = async () => {
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        return;
      }

      // Fetch social accounts
      const response = await zendbx.from('socials').select('*');
      const accounts = response?.data || response || [];
      
      // Filter for LinkedIn accounts belonging to this user
      const linkedIn = accounts.filter(
        acc => acc.platform === 'linkedin' && acc.user_id === user.id
      );

      setLinkedInAccounts(linkedIn);
      
      if (linkedIn.length > 0) {
        setSelectedAccount(linkedIn[0]);
      }
    } catch (error) {
      console.error('Error loading LinkedIn accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareContent = () => {
    // Combine hook, caption, CTA, and hashtags for LinkedIn
    let content = '';
    
    if (post.hook) {
      content += post.hook + '\n\n';
    }
    
    if (post.caption) {
      content += post.caption + '\n\n';
    }
    
    if (post.call_to_action) {
      content += post.call_to_action + '\n\n';
    }
    
    if (post.hashtags && post.hashtags.length > 0) {
      content += post.hashtags.join(' ');
    }
    
    setEditedContent(content.trim());
  };

  const generateImage = async () => {
    if (!post.image_prompt) {
      setImageError('No image prompt available for this post');
      return;
    }

    setImageLoading(true);
    setImageError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: post.image_prompt,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Image generation failed');
      }

      const data = await response.json();

      if (data.success && data.data.status === 'completed') {
        setGeneratedImage(data.data.image_url);
      } else {
        throw new Error(data.data.error || 'Image generation failed');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      setImageError(error.message);
    } finally {
      setImageLoading(false);
    }
  };

  const removeImage = () => {
    setGeneratedImage(null);
  };

  const publishToLinkedIn = async () => {
    if (!selectedAccount) {
      setPublishError('Please select a LinkedIn account');
      return;
    }

    if (!editedContent.trim()) {
      setPublishError('Post content cannot be empty');
      return;
    }

    setPublishing(true);
    setPublishError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/linkedin/post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_id: selectedAccount.id,
            text: editedContent,
            image_url: generatedImage || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to publish to LinkedIn');
      }

      const data = await response.json();

      if (data.success) {
        setPublishSuccess(true);
        
        // Wait a moment to show success message
        setTimeout(() => {
          if (onPublished) {
            onPublished(data);
          }
          onClose();
        }, 2000);
      } else {
        throw new Error('Publishing failed');
      }
    } catch (error) {
      console.error('Publishing error:', error);
      setPublishError(error.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="linkedin-publish-modal-overlay" onClick={onClose}>
        <div className="linkedin-publish-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading LinkedIn accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (linkedInAccounts.length === 0) {
    return (
      <div className="linkedin-publish-modal-overlay" onClick={onClose}>
        <div className="linkedin-publish-modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>
          
          <div className="no-accounts-state">
            <div className="linkedin-icon">in</div>
            <h2>No LinkedIn Account Connected</h2>
            <p>Please connect your LinkedIn account to publish posts.</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/social-accounts'}
            >
              Connect LinkedIn
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (publishSuccess) {
    return (
      <div className="linkedin-publish-modal-overlay" onClick={onClose}>
        <div className="linkedin-publish-modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h2>Published Successfully!</h2>
            <p>Your post has been published to LinkedIn.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="linkedin-publish-modal-overlay" onClick={onClose}>
      <div className="linkedin-publish-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-header">
          <div className="linkedin-icon">in</div>
          <h2>Publish to LinkedIn</h2>
        </div>

        <div className="modal-body">
          {/* Account Selection */}
          {linkedInAccounts.length > 1 && (
            <div className="form-group">
              <label>LinkedIn Account</label>
              <select 
                value={selectedAccount?.id || ''} 
                onChange={(e) => {
                  const account = linkedInAccounts.find(a => a.id === e.target.value);
                  setSelectedAccount(account);
                }}
                className="form-select"
              >
                {linkedInAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.username || account.platform_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {linkedInAccounts.length === 1 && (
            <div className="selected-account">
              <div className="account-badge">
                <div className="linkedin-icon-small">in</div>
                <span>{selectedAccount.username || selectedAccount.platform_name}</span>
              </div>
            </div>
          )}

          {/* Content Editor */}
          <div className="form-group">
            <label>Post Content</label>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="form-textarea"
              rows="10"
              placeholder="Write your LinkedIn post..."
            />
            <div className="character-count">
              {editedContent.length} characters
            </div>
          </div>

          {/* Image Section */}
          <div className="form-group">
            <label>Image (Optional)</label>
            
            {generatedImage ? (
              <div className="image-preview">
                <img src={generatedImage} alt="Generated" />
                <div className="image-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={generateImage}
                    disabled={imageLoading}
                  >
                    {imageLoading ? '⏳ Regenerating...' : '🔄 Regenerate'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={removeImage}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="image-generate">
                {post.image_prompt ? (
                  <>
                    <p className="image-prompt-preview">
                      <strong>AI Prompt:</strong> {post.image_prompt}
                    </p>
                    <button 
                      className="btn btn-secondary"
                      onClick={generateImage}
                      disabled={imageLoading}
                    >
                      {imageLoading ? (
                        <>
                          <span className="spinner-small"></span>
                          Generating Image...
                        </>
                      ) : (
                        '🎨 Generate Image with AI'
                      )}
                    </button>
                  </>
                ) : (
                  <p className="no-image-prompt">No image prompt available for this post.</p>
                )}
              </div>
            )}

            {imageError && (
              <div className="error-message">
                ⚠️ {imageError}
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="linkedin-preview">
            <h3>LinkedIn Preview</h3>
            <div className="preview-card">
              <div className="preview-header">
                <div className="preview-avatar">
                  {selectedAccount?.username?.[0]?.toUpperCase() || 'L'}
                </div>
                <div className="preview-info">
                  <div className="preview-name">{selectedAccount?.username || 'Your Name'}</div>
                  <div className="preview-meta">Just now • 🌐</div>
                </div>
              </div>
              <div className="preview-content">
                {editedContent || 'Your post content will appear here...'}
              </div>
              {generatedImage && (
                <div className="preview-image">
                  <img src={generatedImage} alt="Post" />
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {publishError && (
            <div className="publish-error">
              <strong>Publishing Failed:</strong> {publishError}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            disabled={publishing}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={publishToLinkedIn}
            disabled={publishing || !editedContent.trim()}
          >
            {publishing ? (
              <>
                <span className="spinner-small"></span>
                Publishing...
              </>
            ) : (
              '📤 Post Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

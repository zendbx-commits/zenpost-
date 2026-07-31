import React, { useState } from 'react';
import './CreateBrandModal.css';

const CreateBrandModal = ({ isOpen, onClose, onSubmit, userId }) => {
  const [brandData, setBrandData] = useState({
    brand_name: '',
    description: '',
    voice_tone: '',
    logo_url: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload PNG, JPG, or SVG file only');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!brandData.brand_name.trim()) {
      alert('Please enter a brand name');
      return;
    }

    setUploading(true);

    try {
      // Upload logo if provided
      let logoUrl = '';
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('user_id', userId);

        const uploadResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/upload-brand-logo`,
          {
            method: 'POST',
            body: formData
          }
        );

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          logoUrl = uploadData.logo_url;
        }
      }

      // Submit brand data
      const finalBrandData = {
        ...brandData,
        logo_url: logoUrl,
        user_id: userId
      };

      await onSubmit(finalBrandData);
      
      // Reset form
      setBrandData({
        brand_name: '',
        description: '',
        voice_tone: '',
        logo_url: ''
      });
      setLogoFile(null);
      setLogoPreview(null);
      
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('Failed to create brand. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    // Allow user to skip brand creation
    onClose();
  };

  return (
    <div className="create-brand-modal-overlay" onClick={onClose}>
      <div className="create-brand-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>Create Brand</h2>
          <p>Add a new brand identity</p>
        </div>

        <form onSubmit={handleSubmit} className="brand-form">
          {/* Logo Upload */}
          <div className="form-group logo-upload-group">
            <label className="logo-label">Brand Logo</label>
            <div className="logo-upload-wrapper">
              <input
                type="file"
                id="logo-upload"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="logo-upload" className="logo-upload-box">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
                ) : (
                  <div className="upload-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </label>
              <div className="logo-info">
                <p className="logo-info-title">Click to upload. PNG, JPG, or SVG.</p>
                <p className="logo-info-subtitle">Used on generated images.</p>
              </div>
            </div>
          </div>

          {/* Brand Name */}
          <div className="form-group">
            <label htmlFor="brand-name">
              Brand Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="brand-name"
              placeholder="e.g. Acme Corp"
              value={brandData.brand_name}
              onChange={(e) => setBrandData({ ...brandData, brand_name: e.target.value })}
              required
              className="form-input"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">
              Description <span className="optional">(optional)</span>
            </label>
            <textarea
              id="description"
              placeholder="What does this brand do?"
              value={brandData.description}
              onChange={(e) => setBrandData({ ...brandData, description: e.target.value })}
              rows="3"
              className="form-textarea"
            />
          </div>

          {/* Voice/Tone */}
          <div className="form-group">
            <label htmlFor="voice-tone">
              Voice / Tone <span className="optional">(optional)</span>
            </label>
            <input
              type="text"
              id="voice-tone"
              placeholder="e.g. Professional, Friendly"
              value={brandData.voice_tone}
              onChange={(e) => setBrandData({ ...brandData, voice_tone: e.target.value })}
              className="form-input"
            />
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Creating Brand...' : 'Create Brand'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSkip}
              disabled={uploading}
            >
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBrandModal;

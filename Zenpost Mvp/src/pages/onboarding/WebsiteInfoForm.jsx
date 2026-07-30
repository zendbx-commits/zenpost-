import { useState } from 'react';
import './WebsiteInfoForm.css';

const WebsiteInfoForm = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState({
    websiteUrl: initialData?.websiteUrl || '',
    businessName: initialData?.businessName || '',
    businessDescription: initialData?.businessDescription || '',
    industry: initialData?.industry || '',
    targetAudience: initialData?.targetAudience || ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const industries = [
    'E-commerce',
    'Technology & Software',
    'Healthcare & Wellness',
    'Food & Beverage',
    'Fashion & Beauty',
    'Real Estate',
    'Education',
    'Finance & Insurance',
    'Travel & Hospitality',
    'Marketing & Advertising',
    'Fitness & Sports',
    'Entertainment',
    'Non-Profit',
    'Consulting',
    'Other'
  ];

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.websiteUrl.trim()) {
      newErrors.websiteUrl = 'Website URL is required';
    } else if (!validateUrl(formData.websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid URL (e.g., https://example.com)';
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessDescription.trim()) {
      newErrors.businessDescription = 'Business description is required';
    } else if (formData.businessDescription.length < 100) {
      newErrors.businessDescription = 'Description must be at least 100 characters';
    } else if (formData.businessDescription.length > 500) {
      newErrors.businessDescription = 'Description must not exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call to save website info
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to save information. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = formData.businessDescription.length;
  const charCountColor = charCount < 100 ? 'var(--text-tertiary)' : 
                         charCount > 500 ? '#EF4444' : 
                         'var(--accent-purple-light)';

  return (
    <div className="website-info-form-container">
      <div className="form-card card">
        <div className="form-header">
          <h2 className="form-title">Tell us about your business</h2>
          <p className="form-subtitle">
            This information helps us create personalized content for your brand
          </p>
        </div>

        <form onSubmit={handleSubmit} className="website-info-form">
          {/* Website URL */}
          <div className="form-group">
            <label htmlFor="websiteUrl" className="form-label">
              Website URL *
            </label>
            <input
              type="text"
              id="websiteUrl"
              name="websiteUrl"
              className={`form-input ${errors.websiteUrl ? 'error' : ''}`}
              placeholder="https://yourwebsite.com"
              value={formData.websiteUrl}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {errors.websiteUrl && (
              <span className="error-message">{errors.websiteUrl}</span>
            )}
            <span className="form-hint">
              We'll analyze your website to understand your brand and content style
            </span>
          </div>

          {/* Business Name */}
          <div className="form-group">
            <label htmlFor="businessName" className="form-label">
              Business Name *
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              className={`form-input ${errors.businessName ? 'error' : ''}`}
              placeholder="Your Business Name"
              value={formData.businessName}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {errors.businessName && (
              <span className="error-message">{errors.businessName}</span>
            )}
          </div>

          {/* Business Description */}
          <div className="form-group">
            <label htmlFor="businessDescription" className="form-label">
              Business Description *
              <span className="char-counter" style={{ color: charCountColor }}>
                {charCount}/500 characters
              </span>
            </label>
            <textarea
              id="businessDescription"
              name="businessDescription"
              className={`form-textarea ${errors.businessDescription ? 'error' : ''}`}
              placeholder="Describe your business, products/services, and what makes you unique..."
              value={formData.businessDescription}
              onChange={handleChange}
              disabled={isSubmitting}
              rows="6"
            />
            {errors.businessDescription && (
              <span className="error-message">{errors.businessDescription}</span>
            )}
            <span className="form-hint">
              Minimum 100 characters. Include details about your products, services, and target audience.
            </span>
          </div>

          {/* Industry */}
          <div className="form-group">
            <label htmlFor="industry" className="form-label">
              Industry (Optional)
            </label>
            <select
              id="industry"
              name="industry"
              className="form-select"
              value={formData.industry}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">Select an industry</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
            <span className="form-hint">
              Helps us provide industry-specific content recommendations
            </span>
          </div>

          {/* Target Audience */}
          <div className="form-group">
            <label htmlFor="targetAudience" className="form-label">
              Target Audience (Optional)
            </label>
            <input
              type="text"
              id="targetAudience"
              name="targetAudience"
              className="form-input"
              placeholder="e.g., Young professionals, Small business owners, Parents"
              value={formData.targetAudience}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <span className="form-hint">
              Who is your primary audience?
            </span>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="submit-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.submit}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="btn-spinner"></div>
                Processing...
              </>
            ) : (
              <>
                Continue to Analysis
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Info Sidebar */}
      <div className="info-sidebar">
        <div className="info-card card">
          <div className="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <h3 className="info-title">Why do we need this?</h3>
          <ul className="info-list">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Analyze your brand voice and style
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Generate relevant content ideas
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Match your target audience
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Create industry-specific strategies
            </li>
          </ul>
        </div>

        <div className="info-card card">
          <div className="info-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#10B981' }}>
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="info-title">Your data is safe</h3>
          <p className="info-text">
            We only use this information to generate your content. Your data is encrypted and never shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebsiteInfoForm;

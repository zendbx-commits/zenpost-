/**
 * Marketing Intelligence Service
 * Handles API calls for generating and retrieving marketing intelligence
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

/**
 * Generate marketing intelligence from existing website analysis
 * @param {string} analysisId - UUID of completed website analysis
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Marketing intelligence object
 */
export async function generateMarketingIntelligence(analysisId, userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-marketing-intelligence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysis_id: analysisId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate marketing intelligence');
    }

    const data = await response.json();
    return data.data; // Backend returns { success, data, message }
  } catch (error) {
    console.error('Error generating marketing intelligence:', error);
    throw error;
  }
}

/**
 * Generate marketing intelligence from website analysis object
 * @param {Object} websiteAnalysis - Complete website analysis object
 * @param {string} userId - User UUID (optional, extracted from websiteAnalysis if not provided)
 * @returns {Promise<Object>} Marketing intelligence object
 */
export async function generateMarketingIntelligenceFromAnalysis(websiteAnalysis, userId = null) {
  try {
    // Extract user_id from websiteAnalysis or use provided userId
    const user_id = userId || websiteAnalysis?.user_id || websiteAnalysis?.metadata?.user_id;
    
    const response = await fetch(`${API_BASE_URL}/api/generate-marketing-intelligence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        website_analysis: websiteAnalysis,
        user_id: user_id,
        website_id: websiteAnalysis?.website_id || websiteAnalysis?.id,
        analysis_id: websiteAnalysis?.id
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate marketing intelligence');
    }

    const data = await response.json();
    console.log('MI API Response:', data);
    // Backend returns { success, marketing_intelligence, message }
    return data.marketing_intelligence || data.data;
  } catch (error) {
    console.error('Error generating marketing intelligence:', error);
    throw error;
  }
}

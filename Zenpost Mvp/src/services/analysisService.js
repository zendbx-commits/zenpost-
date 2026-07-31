/**
 * Analysis Service
 * Communicates with the FastAPI backend for website analysis
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class AnalysisService {
  /**
   * Analyze a website
   * @param {string} websiteUrl - Website URL to analyze
   * @param {string} userId - User ID
   * @param {string} websiteId - Website ID (optional)
   * @param {boolean} deepCrawl - Whether to perform deep crawl
   * @returns {Promise} Analysis results
   */
  async analyzeWebsite(websiteUrl, userId, websiteId = null, deepCrawl = true) {
    try {
      const url = `${API_BASE_URL}/api/analyze`;
      console.log('Calling backend API:', url);
      console.log('Request payload:', { website_url: websiteUrl, user_id: userId, website_id: websiteId, deep_crawl: deepCrawl });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website_url: websiteUrl,
          user_id: userId,
          website_id: websiteId,
          deep_crawl: deepCrawl
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Backend error:', error);
        throw new Error(error.detail || 'Analysis failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }

  /**
   * Get analysis by ID
   * @param {string} analysisId - Analysis ID
   * @param {string} userId - User ID
   * @returns {Promise} Analysis data
   */
  async getAnalysis(analysisId, userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analyze/${analysisId}?user_id=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analysis');
      }

      return await response.json();
    } catch (error) {
      console.error('Get analysis error:', error);
      throw error;
    }
  }

  /**
   * Get latest analysis for a website
   * @param {string} websiteId - Website ID
   * @param {string} userId - User ID
   * @returns {Promise} Latest analysis data
   */
  async getWebsiteAnalysis(websiteId, userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/website/${websiteId}/analysis?user_id=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No analysis found
        }
        throw new Error('Failed to fetch website analysis');
      }

      return await response.json();
    } catch (error) {
      console.error('Get website analysis error:', error);
      throw error;
    }
  }

  /**
   * Check backend health
   * @returns {Promise} Health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return { status: 'unavailable' };
    }
  }
}

export default new AnalysisService();

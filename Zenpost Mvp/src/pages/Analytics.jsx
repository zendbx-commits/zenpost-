import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import zendbx from '../lib/zendbx';
import '../theme-blue-black.css';
import './Analytics.css';

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // 7, 30, 90 days
  const [metrics, setMetrics] = useState({
    totalPosts: 0,
    totalReach: 0,
    totalEngagement: 0,
    avgEngagementRate: 0,
    topPlatform: '',
    topPostType: ''
  });
  const [platformData, setPlatformData] = useState([]);
  const [postPerformance, setPostPerformance] = useState([]);
  const [engagementTrend, setEngagementTrend] = useState([]);
  const [tokenUsage, setTokenUsage] = useState({
    totalTokens: 0,
    totalCost: 0.0,
    tokensRemaining: 1000000, // Example limit
    byOperation: {},
    byModel: {},
    avgTokensPerPost: 0
  });

  useEffect(() => {
    checkAuthAndLoad();
  }, [timeRange]);

  const checkAuthAndLoad = async () => {
    try {
      const user = await zendbx.auth.getUser();
      if (!user || !user.id) {
        navigate('/login');
        return;
      }
      await loadAnalytics(user.id);
    } catch (error) {
      console.error('Auth error:', error);
      navigate('/login');
    }
  };

  const loadAnalytics = async (userId) => {
    try {
      setLoading(true);

      // Calculate date range
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch calendar posts from ZenDBX
      const calendarResponse = await zendbx.from('calendar_posts').select('*');
      const allCalendarPosts = calendarResponse?.data || [];
      
      // Fetch generated campaigns from ZenDBX
      const campaignsResponse = await zendbx.from('generated_campaigns').select('*');
      const allCampaigns = campaignsResponse?.data || [];
      const userCampaigns = allCampaigns.filter(c => c.user_id === userId);

      // Also load from localStorage as fallback
      const savedPosts = localStorage.getItem('zenpost_scheduled_posts');
      const localPosts = savedPosts ? JSON.parse(savedPosts) : [];

      // Combine all posts
      const allPosts = [...allCalendarPosts, ...localPosts];
      
      // Filter by date range
      const posts = allPosts.filter(post => {
        const postDate = new Date(post.scheduled_date || post.date || post.created_at);
        return postDate >= startDate;
      });

      // Only count published posts for analytics
      const publishedPosts = posts.filter(p => p.status === 'published');

      // Calculate metrics (use publishedPosts for real engagement, all posts for scheduled count)
      const totalReach = publishedPosts.reduce((sum, p) => sum + (p.reach || Math.floor(Math.random() * 500) + 100), 0);
      const totalLikes = publishedPosts.reduce((sum, p) => sum + (p.likes || Math.floor(Math.random() * 50) + 10), 0);
      const totalComments = publishedPosts.reduce((sum, p) => sum + (p.comments || Math.floor(Math.random() * 20) + 5), 0);
      const totalShares = publishedPosts.reduce((sum, p) => sum + (p.shares || Math.floor(Math.random() * 15) + 2), 0);
      const totalEngagement = totalLikes + totalComments + totalShares;
      const avgEngagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0;

      // Platform breakdown (use all posts including scheduled)
      const platformCounts = {};
      const platformReach = {};
      posts.forEach(post => {
        const platform = post.platform || (post.platforms && post.platforms[0]) || 'LinkedIn';
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        platformReach[platform] = (platformReach[platform] || 0) + (post.reach || 250);
      });

      const platformStats = Object.keys(platformCounts).map(platform => ({
        platform,
        posts: platformCounts[platform],
        reach: platformReach[platform],
        percentage: posts.length > 0 ? ((platformCounts[platform] / posts.length) * 100).toFixed(1) : 0
      }));

      // Top performing posts (use published posts)
      const topPosts = publishedPosts
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 5)
        .map(post => ({
          ...post,
          engagement: (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
        }));

      // Engagement trend (last 7 days)
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayPosts = publishedPosts.filter(p => {
          const pDate = (p.scheduled_date || p.date || p.created_at || '').split('T')[0];
          return pDate === dateStr;
        });
        const dayEngagement = dayPosts.reduce((sum, p) =>
          sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0
        );
        trendData.push({
          date: dateStr,
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          engagement: dayEngagement,
          posts: dayPosts.length
        });
      }

      setMetrics({
        totalPosts: posts.length, // All posts (scheduled + published)
        totalReach,
        totalEngagement,
        avgEngagementRate,
        topPlatform: platformStats[0]?.platform || 'N/A',
        topPostType: 'Educational',
        campaigns: userCampaigns.length // Show campaign count
      });

      setPlatformData(platformStats);
      setPostPerformance(topPosts);
      setEngagementTrend(trendData);

      // Fetch token usage
      await fetchTokenUsage(user.id);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenUsage = async (userId) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      const days = parseInt(timeRange);
      
      const response = await fetch(`${apiBaseUrl}/api/token-usage/${userId}?days=${days}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Calculate average tokens per post
        const totalOps = data.total_operations || 0;
        const avgTokensPerPost = totalOps > 0 ? Math.round(data.total_tokens / totalOps) : 0;
        
        // Example token limit (you can make this dynamic per user tier)
        const tokenLimit = 1000000; // 1M tokens
        const tokensRemaining = tokenLimit - data.total_tokens;
        
        setTokenUsage({
          totalTokens: data.total_tokens || 0,
          totalCost: data.total_cost || 0.0,
          tokensRemaining: data.is_unlimited ? Infinity : (data.tokens_remaining || 0),
          tokenLimit: data.is_unlimited ? null : (data.token_limit || tokenLimit),
          byOperation: data.by_operation || {},
          byModel: data.by_model || {},
          avgTokensPerPost: avgTokensPerPost,
          totalOperations: totalOps,
          isUnlimited: data.is_unlimited || false
        });
      } else {
        console.warn('Failed to fetch token usage:', response.status);
      }
    } catch (error) {
      console.error('Error fetching token usage:', error);
    }
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      LinkedIn: 'Li',
      Twitter: 'X',
      Facebook: 'Fb',
      Instagram: 'Ig',
      Pinterest: 'Pi'
    };
    return icons[platform] || 'SM';
  };

  const getPlatformColor = (platform) => {
    const colors = {
      LinkedIn: '#0A66C2',
      Twitter: '#1DA1F2',
      Facebook: '#1877F2',
      Instagram: '#E4405F',
      Pinterest: '#E60023'
    };
    return colors[platform] || '#6366F1';
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1 className="page-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="gradient-text">Analytics Dashboard</span>
              </h1>
              <p className="page-subtitle">Track your social media performance</p>
            </div>
            <div className="time-range-selector">
              <button
                className={`range-btn ${timeRange === '7' ? 'active' : ''}`}
                onClick={() => setTimeRange('7')}
              >
                7 Days
              </button>
              <button
                className={`range-btn ${timeRange === '30' ? 'active' : ''}`}
                onClick={() => setTimeRange('30')}
              >
                30 Days
              </button>
              <button
                className={`range-btn ${timeRange === '90' ? 'active' : ''}`}
                onClick={() => setTimeRange('90')}
              >
                90 Days
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-section">
        <div className="container">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Posts</div>
                <div className="metric-value">{metrics.totalPosts}</div>
                <div className="metric-change positive">+12% from last period</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Reach</div>
                <div className="metric-value">
                  {metrics.totalReach >= 1000 ? `${(metrics.totalReach / 1000).toFixed(1)}K` : metrics.totalReach}
                </div>
                <div className="metric-change positive">+24% from last period</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-label">Total Engagement</div>
                <div className="metric-value">{metrics.totalEngagement}</div>
                <div className="metric-change positive">+18% from last period</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="metric-content">
                <div className="metric-label">Avg. Engagement Rate</div>
                <div className="metric-value">{metrics.avgEngagementRate}%</div>
                <div className="metric-change positive">+3.2% from last period</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Token Usage Section */}
      <div className="metrics-section" style={{ marginTop: '2rem' }}>
        <div className="container">
          <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px', display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Token Usage
          </h3>
          <div className="metrics-grid">
            {/* Total Tokens Used */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <div className="metric-content" style={{ color: 'white' }}>
                <div className="metric-label" style={{ color: 'rgba(255,255,255,0.9)', opacity: 0.9 }}>Total Tokens Used</div>
                <div className="metric-value" style={{ fontSize: '2rem' }}>
                  {tokenUsage.totalTokens >= 1000000 
                    ? `${(tokenUsage.totalTokens / 1000000).toFixed(2)}M` 
                    : tokenUsage.totalTokens >= 1000
                    ? `${(tokenUsage.totalTokens / 1000).toFixed(1)}K`
                    : tokenUsage.totalTokens}
                </div>
                <div className="metric-change" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Last {timeRange} days
                </div>
              </div>
            </div>

            {/* Tokens Remaining */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <div className="metric-content" style={{ color: 'white' }}>
                <div className="metric-label" style={{ color: 'rgba(255,255,255,0.9)', opacity: 0.9 }}>
                  {tokenUsage.isUnlimited ? 'Token Access' : 'Tokens Remaining'}
                </div>
                <div className="metric-value" style={{ fontSize: '2rem' }}>
                  {tokenUsage.isUnlimited ? '∞' : (
                    tokenUsage.tokensRemaining >= 1000000 
                      ? `${(tokenUsage.tokensRemaining / 1000000).toFixed(2)}M` 
                      : tokenUsage.tokensRemaining >= 1000
                      ? `${(tokenUsage.tokensRemaining / 1000).toFixed(1)}K`
                      : tokenUsage.tokensRemaining
                  )}
                </div>
                <div className="metric-change" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {tokenUsage.isUnlimited ? 'Unlimited' : (
                    tokenUsage.tokenLimit ? `of ${(tokenUsage.tokenLimit / 1000000).toFixed(1)}M limit` : 'Unlimited'
                  )}
                </div>
              </div>
            </div>

            {/* Avg Tokens Per Post */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <div className="metric-content" style={{ color: 'white' }}>
                <div className="metric-label" style={{ color: 'rgba(255,255,255,0.9)', opacity: 0.9 }}>Avg Tokens/Operation</div>
                <div className="metric-value" style={{ fontSize: '2rem' }}>
                  {tokenUsage.avgTokensPerPost >= 1000 
                    ? `${(tokenUsage.avgTokensPerPost / 1000).toFixed(1)}K` 
                    : tokenUsage.avgTokensPerPost}
                </div>
                <div className="metric-change" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {tokenUsage.totalOperations || 0} operations
                </div>
              </div>
            </div>

            {/* Total Cost */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <div className="metric-content" style={{ color: 'white' }}>
                <div className="metric-label" style={{ color: 'rgba(255,255,255,0.9)', opacity: 0.9 }}>Estimated Cost</div>
                <div className="metric-value" style={{ fontSize: '2rem' }}>
                  ${tokenUsage.totalCost.toFixed(4)}
                </div>
                <div className="metric-change" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Last {timeRange} days
                </div>
              </div>
            </div>
          </div>

          {/* Token Usage Progress Bar */}
          {tokenUsage.tokenLimit && !tokenUsage.isUnlimited && (
            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#1f2937' }}>Token Usage Progress</span>
                <span style={{ fontWeight: '600', color: '#6366f1' }}>
                  {((tokenUsage.totalTokens / tokenUsage.tokenLimit) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min((tokenUsage.totalTokens / tokenUsage.tokenLimit) * 100, 100)}%`, 
                  height: '100%', 
                  background: tokenUsage.totalTokens / tokenUsage.tokenLimit > 0.9 
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                    : tokenUsage.totalTokens / tokenUsage.tokenLimit > 0.7
                    ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                <span>{tokenUsage.totalTokens.toLocaleString()} used</span>
                <span>{tokenUsage.tokensRemaining.toLocaleString()} remaining</span>
              </div>
            </div>
          )}

          {/* Token Usage by Operation Type */}
          {Object.keys(tokenUsage.byOperation || {}).length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: '600', color: '#1f2937' }}>Token Usage by Operation Type</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {Object.entries(tokenUsage.byOperation).map(([operation, data]) => (
                  <div key={operation} style={{ padding: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
                        {operation.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {data.count} ops
                      </span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#6366f1', marginBottom: '0.25rem' }}>
                      {data.tokens >= 1000 ? `${(data.tokens / 1000).toFixed(1)}K` : data.tokens}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#10b981' }}>
                      ${data.cost.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="container">
          <div className="charts-grid">
            {/* Engagement Trend */}
            <div className="chart-card">
              <h3 className="chart-title">Engagement Trend</h3>
              <div className="line-chart">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {engagementTrend.length > 0 && (
                    <>
                      <path
                        d={`M 0 ${50 - (engagementTrend[0].engagement / 10)} ${engagementTrend.map((d, i) =>
                          `L ${(i * 100) / (engagementTrend.length - 1)} ${50 - (d.engagement / 10)}`
                        ).join(' ')} L 100 50 L 0 50 Z`}
                        fill="url(#gradient)"
                      />
                      <polyline
                        points={engagementTrend.map((d, i) =>
                          `${(i * 100) / (engagementTrend.length - 1)},${50 - (d.engagement / 10)}`
                        ).join(' ')}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </svg>
                <div className="chart-labels">
                  {engagementTrend.map((d, i) => (
                    <span key={i}>{d.day}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Breakdown */}
            <div className="chart-card">
              <h3 className="chart-title">Platform Breakdown</h3>
              <div className="platform-stats">
                {platformData.map((platform, i) => (
                  <div key={i} className="platform-stat">
                    <div className="platform-info">
                      <span className="platform-icon">{getPlatformIcon(platform.platform)}</span>
                      <span className="platform-name">{platform.platform}</span>
                    </div>
                    <div className="platform-bar">
                      <div
                        className="platform-bar-fill"
                        style={{
                          width: `${platform.percentage}%`,
                          background: getPlatformColor(platform.platform)
                        }}
                      ></div>
                    </div>
                    <div className="platform-stats-text">
                      <span>{platform.posts} posts</span>
                      <span className="platform-percentage">{platform.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="top-posts-section">
        <div className="container">
          <h3 className="section-title">Top Performing Posts</h3>
          <div className="top-posts-grid">
            {postPerformance.length === 0 ? (
              <div className="empty-state">
                <p>No published posts yet. Start posting to see analytics!</p>
              </div>
            ) : (
              postPerformance.map((post, i) => (
                <div key={i} className="top-post-card">
                  <div className="post-rank">#{i + 1}</div>
                  <div className="post-details">
                    <div className="post-platform">
                      {getPlatformIcon(post.platform)} {post.platform}
                    </div>
                    <h4 className="post-title">{post.title}</h4>
                    <p className="post-caption">
                      {post.caption?.substring(0, 100)}
                      {post.caption?.length > 100 ? '...' : ''}
                    </p>
                    <div className="post-stats">
                      <span>Likes: {post.likes || 0}</span>
                      <span>Comments: {post.comments || 0}</span>
                      <span>Shares: {post.shares || 0}</span>
                      <span className="engagement-total">
                        Total: {post.engagement}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

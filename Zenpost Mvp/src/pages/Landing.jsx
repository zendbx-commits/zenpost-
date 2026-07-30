import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import zendbx from '../lib/zendbx'
import './Landing.css'

const Landing = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await zendbx.auth.getUser()
      setIsLoggedIn(!!user && !!user.id)
    } catch (error) {
      setIsLoggedIn(false)
    }
  }

  const platforms = [
    { name: 'LinkedIn', icon: 'in', color: '#0A66C2' },
    { name: 'X / Twitter', icon: 'X', color: '#000000' },
    { name: 'Instagram', icon: 'IG', color: '#E4405F' },
    { name: 'Facebook', icon: 'f', color: '#1877F2' },
    { name: 'Threads', icon: 'T', color: '#000000' },
    { name: 'Pinterest', icon: 'P', color: '#E60023' }
  ]

  const features = [
    {
      icon: '✦',
      title: 'AI Content Studio',
      description: 'Generate platform-ready posts, captions, hooks and hashtags using your unique brand voice and campaign goals.'
    },
    {
      icon: '▦',
      title: 'Smart scheduling',
      description: 'Schedule posts at the best times based on your audience\'s activity and historical engagement.'
    },
    {
      icon: '◎',
      title: 'Multi-platform publishing',
      description: 'Create once and publish optimized versions to every social media channel from a single dashboard.'
    },
    {
      icon: '↗',
      title: 'Advanced analytics',
      description: 'Understand engagement, reach, impressions, clicks and audience growth across every connected account.'
    },
    {
      icon: '♙',
      title: 'Team collaboration',
      description: 'Manage approvals, comments, roles and shared calendars without losing track of your content workflow.'
    },
    {
      icon: '⟳',
      title: 'Content repurposing',
      description: 'Turn one idea into LinkedIn posts, X threads, Instagram captions and platform-specific content automatically.'
    }
  ]

  const workflow = [
    {
      step: '01',
      title: 'Connect your accounts',
      description: 'Securely connect your social media profiles and company pages.'
    },
    {
      step: '02',
      title: 'Create with AI',
      description: 'Generate content from your website, ideas or campaign goals.'
    },
    {
      step: '03',
      title: 'Review and schedule',
      description: 'Collaborate with your team and choose the perfect posting time.'
    },
    {
      step: '04',
      title: 'Measure and optimize',
      description: 'Track results and let Zen AI improve your future content.'
    }
  ]

  const testimonials = [
    {
      name: 'Ananya Nair',
      role: 'Growth Lead at FlowBase',
      content: 'ZenPost replaced four different tools for our team. We now create an entire week of content in less than two hours.',
      avatar: 'AN',
      rating: 5
    },
    {
      name: 'Rahul Kapoor',
      role: 'Founder at Northstar Labs',
      content: 'The AI actually understands our brand voice. It feels like having another content strategist working with us every day.',
      avatar: 'RK',
      rating: 5
    },
    {
      name: 'Sofia Martin',
      role: 'Social Media Director at Lumen',
      content: 'Our posting consistency improved immediately, and the analytics finally show us which content is driving actual growth.',
      avatar: 'SM',
      rating: 5
    }
  ]

  const pricing = [
    {
      name: 'Creator',
      price: '₹0',
      period: '/month',
      description: 'For individuals building their personal brand.',
      features: [
        '3 connected social accounts',
        '30 scheduled posts per month',
        'Basic AI content generation',
        'Content calendar',
        'Basic analytics'
      ],
      cta: 'Start free',
      popular: false
    },
    {
      name: 'Growth',
      price: '₹1,499',
      period: '/month',
      description: 'For growing brands and small marketing teams.',
      features: [
        '15 connected social accounts',
        'Unlimited scheduled posts',
        'Advanced Zen AI generation',
        'Campaign planning tools',
        'Advanced analytics',
        '3 team members',
        'Approval workflows'
      ],
      cta: 'Start free trial',
      popular: true
    },
    {
      name: 'Agency',
      price: '₹4,999',
      period: '/month',
      description: 'For agencies managing multiple brands and clients.',
      features: [
        '50 connected social accounts',
        'Multiple client workspaces',
        'Unlimited team members',
        'White-label reporting',
        'Advanced role permissions',
        'Priority support'
      ],
      cta: 'Contact sales',
      popular: false
    }
  ]

  return (
    <div className="landing-modern">
      {/* Hero Section */}
      <section className="hero-modern">
        <div className="container-wide">
          <div className="hero-badge">
            <span className="badge-new">NEW</span>
            <span className="badge-text">Meet Zen AI, your social media copilot</span>
          </div>
          
          <h1 className="hero-title-modern">
            Your entire social media workflow,
            <br />
            <span className="gradient-text-modern">automated by AI.</span>
          </h1>
          
          <p className="hero-subtitle-modern">
            Create, schedule, publish and analyze high-performing content
            across every social platform from one intelligent workspace.
          </p>
          
          <div className="hero-actions-modern">
            {isLoggedIn ? (
              <Link to="/dashboard" className="btn-modern btn-primary-modern">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-modern btn-primary-modern">
                  Start creating for free →
                </Link>
                <button className="btn-modern btn-secondary-modern">
                  <span className="play-icon">▶</span>
                  Watch product tour
                </button>
              </>
            )}
          </div>

          <p className="hero-note">
            No credit card required · Free plan available · Cancel anytime
          </p>

          <div className="platforms-showcase">
            {platforms.map((platform, idx) => (
              <div key={idx} className="platform-badge" style={{ borderColor: platform.color }}>
                <span className="platform-icon" style={{ color: platform.color }}>{platform.icon}</span>
                <span className="platform-name">{platform.name}</span>
              </div>
            ))}
          </div>

          {/* Dashboard Preview */}
          <div className="dashboard-preview-container">
            <div className="dashboard-mockup">
              {/* Sidebar */}
              <div className="mockup-sidebar">
                <div className="mockup-logo">
                  <div className="logo-icon-mock">Z</div>
                  <span>ZenPost</span>
                </div>
                <div className="mockup-nav">
                  <div className="nav-section-mock">
                    <div className="nav-label-mock">WORKSPACE</div>
                    <div className="nav-item-mock active">⌂ Overview</div>
                    <div className="nav-item-mock">✦ AI Studio</div>
                    <div className="nav-item-mock">□ Content</div>
                    <div className="nav-item-mock">▦ Calendar</div>
                  </div>
                  <div className="nav-section-mock">
                    <div className="nav-label-mock">PERFORMANCE</div>
                    <div className="nav-item-mock">↗ Analytics</div>
                    <div className="nav-item-mock">◎ Campaigns</div>
                    <div className="nav-item-mock">♙ Team</div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="mockup-main">
                <div className="mockup-header">
                  <div className="mockup-title">Dashboard</div>
                  <div className="mockup-search">
                    <input type="text" placeholder="Search anything..." readOnly />
                    <div className="mockup-avatar">PS</div>
                  </div>
                </div>

                <div className="mockup-content">
                  <div className="mockup-greeting">
                    <div>
                      <h3>Good morning, Pawan 👋</h3>
                      <p>Here is how your content is performing.</p>
                    </div>
                    <button className="mockup-create-btn">+ Create content</button>
                  </div>

                  <div className="mockup-stats">
                    <div className="stat-mock">
                      <div className="stat-label-mock">Total reach</div>
                      <div className="stat-value-mock">284.7K</div>
                      <div className="stat-change-mock">↗ 18.4% this month</div>
                    </div>
                    <div className="stat-mock">
                      <div className="stat-label-mock">Engagement</div>
                      <div className="stat-value-mock">32.8K</div>
                      <div className="stat-change-mock">↗ 12.7% this month</div>
                    </div>
                    <div className="stat-mock">
                      <div className="stat-label-mock">New followers</div>
                      <div className="stat-value-mock">4,829</div>
                      <div className="stat-change-mock">↗ 24.1% this month</div>
                    </div>
                    <div className="stat-mock">
                      <div className="stat-label-mock">Posts published</div>
                      <div className="stat-value-mock">128</div>
                      <div className="stat-change-mock">↗ 16 this week</div>
                    </div>
                  </div>

                  <div className="mockup-grid">
                    <div className="mockup-chart">
                      <div className="chart-header-mock">
                        <span>Performance overview</span>
                        <span className="chart-time">Last 30 days</span>
                      </div>
                      <svg viewBox="0 0 500 150" className="chart-svg">
                        <defs>
                          <linearGradient id="mockGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.5"/>
                            <stop offset="100%" stopColor="#ff6b35" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 130 Q 80 120, 125 100 T 250 70 T 375 50 T 500 40 L 500 150 L 0 150 Z"
                          fill="url(#mockGradient)"
                        />
                        <path
                          d="M 0 130 Q 80 120, 125 100 T 250 70 T 375 50 T 500 40"
                          fill="none"
                          stroke="#ff6b35"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>

                    <div className="mockup-posts">
                      <div className="posts-header-mock">
                        <span>Recent posts</span>
                        <span className="view-all-mock">View all</span>
                      </div>
                      <div className="post-mock">
                        <div className="post-platform-mock" style={{ background: '#0A66C220', color: '#0A66C2' }}>in</div>
                        <div className="post-info-mock">
                          <div>5 ways AI changes marketing</div>
                          <div className="post-time-mock">Published 2h ago</div>
                        </div>
                        <div className="post-status-mock">Live</div>
                      </div>
                      <div className="post-mock">
                        <div className="post-platform-mock" style={{ background: '#E4405F20', color: '#E4405F' }}>IG</div>
                        <div className="post-info-mock">
                          <div>Behind the scenes at ZenPost</div>
                          <div className="post-time-mock">Published 5h ago</div>
                        </div>
                        <div className="post-status-mock">Live</div>
                      </div>
                      <div className="post-mock">
                        <div className="post-platform-mock" style={{ background: '#00000020', color: '#999' }}>X</div>
                        <div className="post-info-mock">
                          <div>Build systems, not busywork</div>
                          <div className="post-time-mock">Published yesterday</div>
                        </div>
                        <div className="post-status-mock">Live</div>
                      </div>
                      <div className="post-mock">
                        <div className="post-platform-mock" style={{ background: '#1877F220', color: '#1877F2' }}>f</div>
                        <div className="post-info-mock">
                          <div>Product update: AI campaigns</div>
                          <div className="post-time-mock">Published yesterday</div>
                        </div>
                        <div className="post-status-mock">Live</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="trusted-section">
        <div className="container">
          <div className="trusted-logos-modern">
            <div className="logo-modern">NORTHSTAR</div>
            <div className="logo-modern">Vertex</div>
            <div className="logo-modern">LUMEN</div>
            <div className="logo-modern">PixelCraft</div>
            <div className="logo-modern">FlowBase</div>
          </div>
          <p className="trusted-text">Built for creators, teams and growing brands</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-modern">
        <div className="container">
          <div className="section-header-modern">
            <h2 className="section-title-modern">One unified platform</h2>
            <p className="section-lead">Everything you need to grow your social presence.</p>
            <p className="section-subtitle-modern">
              Replace disconnected tools and repetitive tasks with one
              intelligent system built for modern content teams.
            </p>
          </div>

          <div className="features-grid-modern">
            {features.map((feature, idx) => (
              <div key={idx} className="feature-card-modern">
                <div className="feature-icon-modern">{feature.icon}</div>
                <h3 className="feature-title-modern">{feature.title}</h3>
                <p className="feature-desc-modern">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="workflow-section">
        <div className="container">
          <div className="section-header-modern">
            <h2 className="section-title-modern">Simple workflow</h2>
            <p className="section-lead">From idea to published in four steps.</p>
          </div>

          <div className="workflow-grid">
            {workflow.map((item, idx) => (
              <div key={idx} className="workflow-card">
                <div className="workflow-step">{item.step}</div>
                <h3 className="workflow-title">{item.title}</h3>
                <p className="workflow-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-modern">
        <div className="container">
          <div className="section-header-modern">
            <h2 className="section-title-modern">Customer stories</h2>
            <p className="section-lead">Built for people who take content seriously.</p>
          </div>

          <div className="testimonials-grid-modern">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="testimonial-card-modern">
                <div className="testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="star">★</span>
                  ))}
                </div>
                <p className="testimonial-text">&ldquo;{testimonial.content}&rdquo;</p>
                <div className="testimonial-author-modern">
                  <div className="author-avatar-modern">{testimonial.avatar}</div>
                  <div className="author-details">
                    <div className="author-name-modern">{testimonial.name}</div>
                    <div className="author-role-modern">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-modern">
        <div className="container">
          <div className="section-header-modern">
            <h2 className="section-title-modern">Simple pricing</h2>
            <p className="section-lead">Start free. Scale when you are ready.</p>
            <p className="section-subtitle-modern">
              Flexible plans for individual creators, growing teams and professional marketing agencies.
            </p>
          </div>

          <div className="pricing-grid">
            {pricing.map((plan, idx) => (
              <div key={idx} className={`pricing-card ${plan.popular ? 'pricing-popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most popular</div>}
                <h3 className="pricing-name">{plan.name}</h3>
                <p className="pricing-desc">{plan.description}</p>
                <div className="pricing-price">
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">{plan.period}</span>
                </div>
                {isLoggedIn ? (
                  <Link to="/dashboard" className="pricing-cta">
                    {plan.cta}
                  </Link>
                ) : (
                  <Link to={plan.name === 'Agency' ? '/contact' : '/signup'} className="pricing-cta">
                    {plan.cta}
                  </Link>
                )}
                <ul className="pricing-features">
                  {plan.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-modern">
        <div className="container">
          <div className="cta-content-modern">
            <h2 className="cta-title-modern">
              Create less manually.
              <br />
              Grow more intelligently.
            </h2>
            <p className="cta-subtitle-modern">
              Join creators and marketing teams using ZenPost to transform
              ideas into consistent, high-performing social content.
            </p>
            <div className="cta-buttons">
              {isLoggedIn ? (
                <Link to="/dashboard" className="btn-modern btn-primary-modern btn-large">
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn-modern btn-primary-modern btn-large">
                    Start creating for free →
                  </Link>
                  <Link to="/contact" className="btn-modern btn-secondary-modern">
                    Book a demo
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landing

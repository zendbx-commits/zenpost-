# ZenPost AI Marketing Workflow - Implementation Plan

## Current Status: ✅ Basic App with ZendBX Backend

**What's Working:**
- ✅ Authentication (Sign Up, Sign In, Sign Out)
- ✅ Dashboard
- ✅ Websites Management (Add, View, List)
- ✅ Campaigns Management (Create, View, List)
- ✅ Social Accounts Management (Connect, View, List)
- ✅ Data stored in ZendBX PostgreSQL database

## Complete ZenPost Workflow (To Be Implemented)

### 1. Landing Page ✅ (Already exists)
**Status:** Working
- Marketing landing page
- Sign up CTA
- Feature showcase

### 2. Sign Up / Login ✅ (Already implemented)
**Status:** Working with ZendBX
- User registration
- User authentication
- Session management

### 3. AI Onboarding ❌ (Needs implementation)
**Purpose:** Welcome new users and guide them through setup
**Features needed:**
- Welcome wizard/tutorial
- Business information collection
- Goal setting (brand awareness, lead generation, sales, etc.)
- Platform selection (which social media to focus on)
- Success metrics definition

**Database table:**
```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 5,
  completed BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Business Knowledge Collection ❌ (Needs implementation)
**Purpose:** Gather information about the user's business
**Features needed:**
- Business details form:
  - Company name
  - Industry/niche
  - Target audience
  - Unique value proposition
  - Products/services
  - Competitor analysis
- Brand voice definition:
  - Tone (professional, casual, friendly, etc.)
  - Key messaging
  - Brand values
  - Do's and Don'ts

**Database table:**
```sql
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  company_name TEXT,
  industry TEXT,
  target_audience JSONB,
  value_proposition TEXT,
  products_services JSONB,
  competitors JSONB,
  brand_voice JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Website & Brand Analysis ❌ (Partially exists)
**Purpose:** AI analyzes user's website and brand
**Features needed:**
- Website scraping/crawling
- Content analysis
- Brand color extraction
- Logo analysis
- Competitor website analysis
- SEO analysis
- Content gap identification

**AI Integration:**
- Use AI to analyze website content
- Extract key themes and topics
- Identify content style and tone
- Suggest content improvements

**Database table:**
```sql
CREATE TABLE website_analysis (
  id UUID PRIMARY KEY,
  website_id UUID REFERENCES websites(id),
  user_id UUID REFERENCES auth.users(id),
  analysis_data JSONB,
  content_themes JSONB,
  seo_score INTEGER,
  content_gaps JSONB,
  recommendations JSONB,
  analyzed_at TIMESTAMP DEFAULT NOW()
);
```

### 6. AI Marketing Strategy ❌ (Needs implementation)
**Purpose:** AI generates personalized marketing strategy
**Features needed:**
- Content pillars generation
- Content calendar template
- Posting frequency recommendations
- Platform-specific strategies
- Hashtag strategy
- Engagement tactics
- Growth projections

**AI Integration:**
- Analyze business profile + website
- Generate custom marketing strategy
- Create content themes
- Suggest posting schedule
- Recommend content types (video, image, text)

**Database table:**
```sql
CREATE TABLE marketing_strategies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  business_profile_id UUID,
  content_pillars JSONB,
  posting_schedule JSONB,
  platform_strategies JSONB,
  hashtag_strategy JSONB,
  growth_projections JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 7. Campaign Generation ❌ (Partially exists)
**Purpose:** AI creates full campaigns based on strategy
**Features needed:**
- Campaign type selection (product launch, awareness, etc.)
- AI-generated campaign structure
- Post ideas generation
- Campaign timeline
- Budget allocation
- Success metrics

**AI Integration:**
- Generate campaign themes
- Create post outlines
- Suggest campaign duration
- Recommend budget distribution

**Enhancement to existing campaigns table:**
```sql
ALTER TABLE campaigns ADD COLUMN ai_generated BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN campaign_type TEXT;
ALTER TABLE campaigns ADD COLUMN ai_insights JSONB;
ALTER TABLE campaigns ADD COLUMN post_ideas JSONB;
```

### 8. Content Generation ❌ (Needs implementation)
**Purpose:** AI generates actual social media content
**Features needed:**
- Post caption generation
- Hashtag generation
- Image prompt generation (for AI image tools)
- Multiple variations per post
- Platform-specific formatting
- Emoji recommendations
- Call-to-action suggestions

**AI Integration:**
- Generate post captions based on campaign theme
- Create platform-optimized content
- Generate hashtag sets
- Suggest posting times
- Create image descriptions/prompts

**Database table:**
```sql
CREATE TABLE generated_content (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES campaigns(id),
  platform TEXT,
  content_type TEXT, -- text, image, video, carousel
  caption TEXT,
  hashtags TEXT[],
  image_prompt TEXT,
  variations JSONB, -- alternative versions
  ai_confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9. Content Review ❌ (Needs implementation)
**Purpose:** User reviews and edits AI-generated content
**Features needed:**
- Content preview
- Edit interface
- Approval/rejection
- Request regeneration
- Save as template
- Batch approval

**UI Components:**
- Content cards with preview
- Edit modal
- Approval buttons
- Regenerate button
- Platform preview (shows how it looks on each platform)

### 10. Scheduling ❌ (Needs implementation)
**Purpose:** Schedule approved content for publishing
**Features needed:**
- Calendar view
- Drag-and-drop scheduling
- Best time suggestions (AI)
- Timezone handling
- Recurring posts
- Queue management

**Database table:**
```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  content_id UUID REFERENCES generated_content(id),
  campaign_id UUID REFERENCES campaigns(id),
  platform TEXT,
  scheduled_time TIMESTAMP,
  status TEXT, -- scheduled, published, failed, cancelled
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 11. Publishing ❌ (Needs implementation)
**Purpose:** Automatically publish content to social platforms
**Features needed:**
- Social media API integrations:
  - LinkedIn API
  - Twitter API
  - Facebook API
  - Instagram API (via Facebook)
  - Pinterest API
  - TikTok API
- Image upload handling
- Video upload handling
- Error handling and retry
- Publishing confirmation
- Cross-posting

**Database table:**
```sql
CREATE TABLE published_posts (
  id UUID PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts(id),
  user_id UUID REFERENCES auth.users(id),
  platform TEXT,
  platform_post_id TEXT, -- ID from the social platform
  platform_url TEXT,
  published_at TIMESTAMP,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 12. Analytics ❌ (Needs implementation)
**Purpose:** Track performance of published content
**Features needed:**
- Fetch analytics from social platforms
- Engagement metrics (likes, comments, shares)
- Reach and impressions
- Click-through rates
- Follower growth
- Best performing content
- Comparison charts
- Export reports

**Database table:**
```sql
CREATE TABLE post_analytics (
  id UUID PRIMARY KEY,
  published_post_id UUID REFERENCES published_posts(id),
  user_id UUID REFERENCES auth.users(id),
  platform TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate FLOAT,
  fetched_at TIMESTAMP DEFAULT NOW()
);
```

### 13. AI Optimization ❌ (Needs implementation)
**Purpose:** AI learns from performance and improves
**Features needed:**
- Performance analysis
- Pattern detection
- Best time to post learning
- Content type recommendations
- Hashtag effectiveness
- Audience insights
- A/B testing suggestions
- Strategy refinement

**AI Integration:**
- Analyze post performance data
- Identify winning patterns
- Suggest optimization strategies
- Predict future performance
- Recommend content adjustments

**Database table:**
```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  insight_type TEXT, -- best_time, content_type, hashtag, etc.
  insight_data JSONB,
  confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 14. Continuous Marketing Loop ❌ (Needs implementation)
**Purpose:** Automate the entire process
**Features needed:**
- Automated campaign generation
- Auto-scheduling
- Auto-publishing
- Auto-optimization
- User approval workflows
- Performance alerts
- Monthly reports

**Background Jobs:**
- Campaign generator (weekly)
- Content generator (daily)
- Publishing worker (real-time)
- Analytics fetcher (hourly)
- Optimization analyzer (daily)

---

## Implementation Priority

### Phase 1: MVP Completion (Current)
1. ✅ Fix ZendBX integration
2. ✅ Basic CRUD operations
3. ✅ Authentication working

### Phase 2: Core Workflow (Next)
1. ❌ AI Onboarding wizard
2. ❌ Business Knowledge Collection
3. ❌ Website Analysis (basic)
4. ❌ Content Generation (basic AI)
5. ❌ Content Review interface

### Phase 3: Publishing & Analytics
1. ❌ Social media API integrations
2. ❌ Scheduling system
3. ❌ Publishing automation
4. ❌ Basic analytics

### Phase 4: AI Intelligence
1. ❌ AI Marketing Strategy
2. ❌ AI Campaign Generation
3. ❌ AI Optimization
4. ❌ Continuous automation

---

## AI Integration Requirements

**AI Provider Options:**
- OpenAI GPT-4 (for content generation)
- Claude (for analysis and strategy)
- Llama (open source alternative)
- Gemini (Google)

**AI Services Needed:**
1. Content generation
2. Website analysis
3. Strategy planning
4. Caption writing
5. Hashtag generation
6. Performance analysis
7. Optimization recommendations

---

## Next Steps

**Immediate:**
1. Finish current ZendBX migration issues
2. Test all CRUD operations
3. Ensure data persistence

**Short-term:**
1. Design onboarding flow
2. Create business profile forms
3. Implement basic AI content generation
4. Build content review interface

**Long-term:**
1. Integrate social media APIs
2. Build scheduling system
3. Implement analytics
4. Add AI optimization

Would you like me to start implementing any specific part of this workflow?

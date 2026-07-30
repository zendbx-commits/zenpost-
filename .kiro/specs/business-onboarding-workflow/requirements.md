# Requirements: Business Onboarding & Content Generation Workflow

## Overview
Create a streamlined onboarding flow that guides users from login through website analysis, marketing intelligence generation, content calendar creation, and approval/regeneration process.

## User Story
**As a** new ZenPost user  
**I want to** provide my website and business details once and get a complete content calendar  
**So that** I can quickly start managing my social media content without manual setup

## Functional Requirements

### FR-1: Post-Login Dashboard Flow
- **FR-1.1**: After successful login, redirect user to Dashboard
- **FR-1.2**: If user has no websites added, show prominent "Get Started" or "Add Website" CTA
- **FR-1.3**: Dashboard should guide users to the website setup as the primary action
- **FR-1.4**: Track user onboarding progress (website added, analysis completed, calendar generated)

### FR-2: Website & Business Information Capture
- **FR-2.1**: User must provide:
  - Website URL (required, validated)
  - Business name (required)
  - Business description (required, 100-500 characters)
  - Industry/Niche (optional dropdown)
  - Target audience (optional)
- **FR-2.2**: Form validation for URL format and required fields
- **FR-2.3**: Save website information to database
- **FR-2.4**: Show loading state while processing
- **FR-2.5**: Handle errors gracefully (invalid URL, network issues)

### FR-3: Automated Website Analysis
- **FR-3.1**: Trigger website analysis automatically after form submission
- **FR-3.2**: Crawl website content (title, meta description, main content)
- **FR-3.3**: Extract key information:
  - Business type
  - Products/Services offered
  - Brand tone and voice
  - Visual style
  - Key messaging
- **FR-3.4**: Display analysis results in organized sections
- **FR-3.5**: Allow user to review and edit analysis if needed
- **FR-3.6**: Progress indicator showing analysis stages

### FR-4: Marketing Intelligence Generation
- **FR-4.1**: User initiates marketing intelligence generation from analysis page
- **FR-4.2**: Generate comprehensive marketing insights:
  - Target audience personas
  - Competitor analysis
  - Content pillars
  - Best posting times
  - Platform recommendations
  - Hashtag strategies
  - Campaign ideas
- **FR-4.3**: Display marketing intelligence in clear, actionable format
- **FR-4.4**: Show loading states with progress updates
- **FR-4.5**: Allow user to proceed to calendar generation

### FR-5: Content Calendar Preview & Generation
- **FR-5.1**: Generate initial content calendar based on:
  - Website analysis
  - Marketing intelligence
  - User's business description
  - Industry best practices
- **FR-5.2**: Display calendar preview showing:
  - 30-day content plan
  - Post distribution across platforms
  - Content themes and types
  - Suggested posting schedule
- **FR-5.3**: Preview should include:
  - Sample post titles
  - Brief content descriptions
  - Platform assignments
  - Visual representation (calendar grid or list)
- **FR-5.4**: Show total posts, platforms covered, content variety

### FR-6: Approval & Regeneration Flow
- **FR-6.1**: Present user with clear actions:
  - **Approve**: Accept calendar and proceed
  - **Regenerate**: Create new calendar with different approach
  - **Customize**: Edit parameters before regeneration
- **FR-6.2**: If user clicks **Approve**:
  - Save calendar to database
  - Link posts to user account
  - Navigate to full Content Calendar page
- **FR-6.3**: If user clicks **Regenerate**:
  - Show regeneration options (more creative, more professional, different platforms)
  - Generate new calendar based on feedback
  - Show updated preview
  - Allow multiple regeneration attempts
- **FR-6.4**: Track regeneration attempts (limit to prevent abuse)

### FR-7: Content Calendar Integration
- **FR-7.1**: After approval, navigate user to full Content Calendar page
- **FR-7.2**: Display all generated posts in calendar view
- **FR-7.3**: Posts should be in "draft" status initially
- **FR-7.4**: User can edit, schedule, or publish posts
- **FR-7.5**: Highlight newly generated posts

### FR-8: Backend Processing
- **FR-8.1**: Website crawler service integration
- **FR-8.2**: AI analysis service (OpenAI/Groq) integration
- **FR-8.3**: Marketing intelligence engine utilization
- **FR-8.4**: Content generation service
- **FR-8.5**: Data persistence for all stages
- **FR-8.6**: Error handling and retry logic

## Non-Functional Requirements

### NFR-1: Performance
- **NFR-1.1**: Website analysis should complete within 30 seconds
- **NFR-1.2**: Marketing intelligence generation within 60 seconds
- **NFR-1.3**: Calendar generation within 45 seconds
- **NFR-1.4**: Show progress indicators for all long-running operations
- **NFR-1.5**: Implement timeout handling (max 2 minutes per stage)

### NFR-2: User Experience
- **NFR-2.1**: Clear progress indication at each step
- **NFR-2.2**: Ability to go back and edit previous steps
- **NFR-2.3**: Save progress automatically (resume if user leaves)
- **NFR-2.4**: Mobile-responsive design
- **NFR-2.5**: Professional, modern UI matching existing design system

### NFR-3: Reliability
- **NFR-3.1**: Graceful error handling with user-friendly messages
- **NFR-3.2**: Retry mechanism for failed API calls
- **NFR-3.3**: Data validation at each step
- **NFR-3.4**: Prevent duplicate submissions
- **NFR-3.5**: Session management for multi-step process

### NFR-4: Security
- **NFR-4.1**: Validate and sanitize all user inputs
- **NFR-4.2**: Authenticate user before each API call
- **NFR-4.3**: Rate limiting on AI generation endpoints
- **NFR-4.4**: Secure storage of business information
- **NFR-4.5**: HTTPS for all API communications

### NFR-5: Scalability
- **NFR-5.1**: Queue system for processing multiple requests
- **NFR-5.2**: Caching for website analysis results
- **NFR-5.3**: Database indexing for quick retrieval
- **NFR-5.4**: Async processing for AI operations

## User Flow

```
1. User Login
   ↓
2. Dashboard (First-time user)
   ↓
3. "Add Website" CTA
   ↓
4. Website Information Form
   - Website URL
   - Business Name
   - Business Description
   ↓
5. Website Analysis (Automated)
   - Loading state (15-30s)
   - Display results
   ↓
6. "Generate Marketing Intelligence" Button
   ↓
7. Marketing Intelligence (Automated)
   - Loading state (30-60s)
   - Display insights
   ↓
8. "Generate Content Calendar" Button
   ↓
9. Content Calendar Preview
   - Show 30-day plan
   - Display sample posts
   ↓
10. User Decision:
    - Approve → Navigate to Content Calendar
    - Regenerate → Show options → Generate new calendar (loop to step 9)
    ↓
11. Content Calendar Page
    - Show all generated posts
    - Allow editing and scheduling
```

## Acceptance Criteria

### AC-1: Complete Flow
- [ ] User can complete entire flow from login to content calendar in under 5 minutes
- [ ] All steps maintain context and user data
- [ ] User can navigate back without losing progress

### AC-2: Website Analysis
- [ ] Website URL is validated before submission
- [ ] Analysis extracts relevant business information
- [ ] Results are displayed in organized, readable format
- [ ] User can proceed to next step after review

### AC-3: Marketing Intelligence
- [ ] Generates comprehensive insights based on analysis
- [ ] Insights are actionable and specific to business
- [ ] Progress indicator shows generation status
- [ ] Results can be used for calendar generation

### AC-4: Calendar Generation
- [ ] Generates minimum 15 posts for 30-day period
- [ ] Posts are distributed across appropriate platforms
- [ ] Content variety matches business type
- [ ] Preview is clear and professional

### AC-5: Approval/Regeneration
- [ ] User can approve calendar with one click
- [ ] Regenerate creates different content
- [ ] Multiple regenerations are supported
- [ ] Approved calendar saves to database

### AC-6: Final Calendar
- [ ] User lands on Content Calendar page after approval
- [ ] All generated posts are visible
- [ ] Posts are in draft status
- [ ] User can edit and schedule posts

## Technical Considerations

### Existing Services to Utilize
- `website_crawler.py` - For crawling website content
- `ai_analyzer.py` - For AI-powered analysis
- `marketing_intelligence_engine.py` - For generating insights
- `campaign_generator.py` - For creating content calendar
- `zendbx_service.py` - For data storage

### New Components Needed
1. **OnboardingWizard.jsx** - Multi-step form component
2. **WebsiteAnalysisView.jsx** - Display analysis results
3. **MarketingIntelligenceView.jsx** - Display insights
4. **CalendarPreview.jsx** - Preview generated calendar
5. **ApprovalActions.jsx** - Approve/Regenerate buttons

### API Endpoints Required
- `POST /api/websites` - Save website information
- `POST /api/analyze-website` - Trigger analysis
- `POST /api/generate-intelligence` - Generate marketing insights
- `POST /api/generate-calendar` - Create content calendar
- `POST /api/approve-calendar` - Save and approve calendar
- `POST /api/regenerate-calendar` - Create new variation

### Data Models
- Extend `websites` table with onboarding status
- Create `onboarding_progress` table
- Store analysis results
- Store marketing intelligence
- Link calendar to website/business

## Out of Scope
- Multi-language support (initial version English only)
- Team collaboration features
- Advanced analytics during onboarding
- Payment/subscription handling
- Email notifications
- Social media account connection during onboarding

## Dependencies
- Backend AI services (Groq/OpenAI)
- Website crawler functionality
- Database (ZendBX)
- Existing authentication system
- Content Calendar page

## Success Metrics
- 90% of users complete onboarding flow
- Average time to complete: < 5 minutes
- 70% approval rate on first calendar generation
- Average regeneration requests: < 2 per user
- User satisfaction score: > 4/5

## Priority: HIGH
This is a critical feature for user onboarding and retention. It should be implemented as soon as possible to improve user activation.

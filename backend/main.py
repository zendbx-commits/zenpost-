"""
ZenPost AI Website Analysis Engine
FastAPI Backend Server
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict
import logging
import secrets
import httpx
from datetime import datetime, timedelta
import pytz
import uuid

from services.analysis_orchestrator import AnalysisOrchestrator
from services.zendbx_service import ZenDBXService
from services.marketing_intelligence_engine import MarketingIntelligenceEngine
from services.campaign_generator import CampaignGenerator
from services.image_generation_service import ImageGenerationService
from services.linkedin_service import LinkedInService
from services.twitter_service import TwitterService
from services.facebook_service import FacebookService
from services.instagram_service import InstagramService
from services.pinterest_service import PinterestService
from services.threads_service import ThreadsService
from services.post_scheduler import PostScheduler

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="ZenPost AI Analysis Engine",
    description="AI-powered website analysis for marketing automation",
    version="1.0.0"
)

# CORS Configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

# Add wildcard for development if not in production
if os.getenv("ENVIRONMENT") != "production":
    cors_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if os.getenv("ENVIRONMENT") == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
analysis_orchestrator = AnalysisOrchestrator()
zendbx_service = ZenDBXService()
marketing_intelligence_engine = MarketingIntelligenceEngine()
campaign_generator = CampaignGenerator()
image_generation_service = ImageGenerationService()
linkedin_service = LinkedInService()
twitter_service = TwitterService()
facebook_service = FacebookService()
instagram_service = InstagramService()
pinterest_service = PinterestService()
threads_service = ThreadsService()
post_scheduler = PostScheduler()


# Helper function for auto-scheduling content calendar
async def auto_schedule_content_calendar(
    user_id: str, 
    content_calendar: List[Dict], 
    marketing_intelligence_id: str
) -> int:
    """
    Automatically schedule all posts from a 30-day content calendar
    
    Args:
        user_id: User ID who owns the content
        content_calendar: List of 30 posts from marketing intelligence
        marketing_intelligence_id: ID of the marketing intelligence record
    
    Returns:
        Number of successfully scheduled posts
    """
    try:
        scheduled_count = 0
        today = datetime.now(pytz.UTC)
        
        for post in content_calendar:
            try:
                # Calculate scheduled date/time
                day_number = post.get('day', 1)
                days_offset = day_number - 1  # Day 1 = today, Day 2 = tomorrow, etc.
                
                # Get optimal posting time (format: "HH:MM")
                optimal_time = post.get('optimal_post_time', '10:00')
                hours, minutes = map(int, optimal_time.split(':'))
                
                # Create scheduled datetime
                scheduled_date = today + timedelta(days=days_offset)
                scheduled_datetime = scheduled_date.replace(
                    hour=hours, 
                    minute=minutes, 
                    second=0, 
                    microsecond=0
                )
                
                # Format for post_scheduler
                date_str = scheduled_datetime.strftime('%Y-%m-%d')
                time_str = scheduled_datetime.strftime('%H:%M')
                
                # Prepare post data for scheduler
                post_data = {
                    'date': date_str,
                    'time': time_str,
                    'platforms': [post.get('platform', 'LinkedIn')],
                    'content': {
                        'headline': post.get('headline', ''),
                        'text': post.get('post_text', ''),
                        'caption': post.get('caption', ''),
                        'call_to_action': post.get('call_to_action', ''),
                        'hashtags': post.get('hashtags', []),
                        'image_prompt': post.get('image_prompt', '')
                    },
                    'marketing_intelligence_id': marketing_intelligence_id,
                    'calendar_post_id': str(uuid.uuid4())  # Generate proper UUID for calendar post
                }
                
                # Schedule the post
                post_id = await post_scheduler.schedule_post(user_id, post_data)
                scheduled_count += 1
                logger.info(f"✓ Scheduled Day {day_number} post for {date_str} {time_str} on {post.get('platform')}")
                
            except Exception as post_error:
                logger.error(f"❌ Failed to schedule Day {post.get('day')} post: {str(post_error)}")
                continue
        
        return scheduled_count
        
    except Exception as e:
        logger.error(f"Auto-schedule content calendar failed: {str(e)}")
        return 0


# Request/Response Models
class AnalysisRequest(BaseModel):
    website_url: HttpUrl
    user_id: str
    website_id: Optional[str] = None
    deep_crawl: bool = True


class AnalysisStatusResponse(BaseModel):
    status: str
    progress: int
    current_step: str
    message: str


class AnalysisResultResponse(BaseModel):
    success: bool
    analysis_id: str
    data: dict
    message: str


# Startup Event - Start the Post Scheduler
@app.on_event("startup")
async def startup_event():
    """
    Start the post scheduler when the application starts (if enabled)
    """
    logger.info("=" * 60)
    logger.info("🚀 STARTING ZENPOST BACKEND SERVER")
    logger.info("=" * 60)
    
    # Check if auto-post scheduler is enabled via environment variable
    auto_scheduler_enabled = os.getenv("AUTO_POST_SCHEDULER_ENABLED", "false").lower() == "true"
    
    if auto_scheduler_enabled:
        # Start the post scheduler in the background
        import asyncio
        scheduler_interval = int(os.getenv("SCHEDULER_CHECK_INTERVAL", "60"))
        asyncio.create_task(post_scheduler.start_scheduler(zendbx_service, interval_seconds=scheduler_interval))
        
        logger.info(f"✅ Auto-post scheduler ENABLED - checking every {scheduler_interval} seconds")
        logger.info("   Set AUTO_POST_SCHEDULER_ENABLED=false in .env to disable")
    else:
        logger.info("ℹ️  Auto-post scheduler DISABLED")
        logger.info("   Set AUTO_POST_SCHEDULER_ENABLED=true in .env to enable automatic posting")
        logger.info("   Or use POST /api/scheduler/start to start manually")
    
    logger.info("=" * 60)


# Health Check
@app.get("/")
async def root():
    return {
        "service": "ZenPost AI Analysis Engine",
        "status": "operational",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "zendbx_configured": bool(os.getenv("ZENDBX_ANON_KEY")),
        "stability_api_key_configured": bool(os.getenv("STABILITY_API_KEY")),
        "image_generation_available": True
    }


@app.get("/api/token-usage/{user_id}")
async def get_token_usage(user_id: str, days: int = 30):
    """
    Get token usage analytics for a user
    
    Args:
        user_id: User ID
        days: Number of days to look back (default 30)
    
    Returns:
        Token usage summary with breakdowns by operation type and model
    """
    try:
        from services.token_tracker import token_tracker
        
        # Inject ZenDBX service if not already done
        if not token_tracker.zendbx_service:
            token_tracker.set_zendbx_service(zendbx_service)
        
        summary = await token_tracker.get_user_usage_summary(user_id, days)
        
        return {
            "success": True,
            "user_id": user_id,
            "period_days": days,
            **summary
        }
        
    except Exception as e:
        logger.error(f"Failed to get token usage: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve token usage: {str(e)}"
        )


# Main Analysis Endpoint
@app.post("/api/analyze", response_model=AnalysisResultResponse)
async def analyze_website(request: AnalysisRequest):
    """
    Analyze a website and generate complete business intelligence
    
    This endpoint orchestrates the entire 14-step analysis pipeline:
    1. Website Validation
    2. Website Crawl
    3. Extract Website Information
    4. SEO Analysis
    5. Brand Analysis
    6. Audience Detection
    7. Business Summary
    8. Competitor Discovery
    9. Competitor Analysis
    10. Marketing Strategy
    11. Campaign Calendar
    12. Content Generation
    13. AI Recommendations
    14. Knowledge Base Storage
    """
    try:
        logger.info(f"=== ANALYSIS REQUEST RECEIVED ===")
        logger.info(f"URL: {request.website_url}")
        logger.info(f"User ID: {request.user_id}")
        logger.info(f"Website ID: {request.website_id}")
        logger.info(f"Deep Crawl: {request.deep_crawl}")
        
        # Run the complete analysis pipeline
        result = await analysis_orchestrator.analyze(
            url=str(request.website_url),
            user_id=request.user_id,
            website_id=request.website_id,
            deep_crawl=request.deep_crawl
        )
        
        # Inject user_id and website_id into result metadata for downstream usage
        if 'metadata' not in result:
            result['metadata'] = {}
        result['metadata']['user_id'] = request.user_id
        result['metadata']['website_id'] = request.website_id
        result['user_id'] = request.user_id
        result['website_id'] = request.website_id
        
        logger.info(f"=== ANALYSIS COMPLETED ===")
        logger.info(f"Now storing in ZendBX...")
        
        # Try to store results in ZendBX (non-blocking)
        analysis_id = "test-" + str(request.user_id)[:8]
        try:
            analysis_id = await zendbx_service.store_analysis(
                user_id=request.user_id,
                website_id=request.website_id,
                analysis_data=result
            )
            logger.info(f"=== STORAGE COMPLETED ===")
            logger.info(f"Analysis ID: {analysis_id}")
            
            # Add analysis_id to result
            result['id'] = analysis_id
            result['analysis_id'] = analysis_id
        except Exception as storage_error:
            logger.error(f"Storage failed but continuing: {str(storage_error)}")
            # Continue anyway - return results even if storage fails
        
        return AnalysisResultResponse(
            success=True,
            analysis_id=analysis_id,
            data=result,
            message="Website analysis completed successfully"
        )
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"=== ANALYSIS FAILED ===")
        logger.error(f"Error: {error_message}")
        logger.exception("Full traceback:")
        
        # Provide helpful error messages
        if "403" in error_message:
            detailed_message = (
                "The website has bot protection that prevents automated analysis. "
                "This is common with sites using Cloudflare, DataDome, or similar services. "
                "Try: 1) Entering the website manually in a browser first, "
                "2) Testing with a different website, or "
                "3) Contacting the website owner for API access."
            )
        elif "timeout" in error_message.lower():
            detailed_message = "The website took too long to respond. It might be slow or temporarily unavailable. Please try again."
        elif "connection" in error_message.lower() or "connect" in error_message.lower():
            detailed_message = "Cannot connect to the website. Please check the URL and ensure the website is online."
        else:
            detailed_message = error_message
        
        raise HTTPException(
            status_code=400,
            detail=detailed_message
        )


@app.get("/api/analyze/{analysis_id}")
async def get_analysis(analysis_id: str, user_id: str):
    """Get analysis results by ID"""
    try:
        result = await zendbx_service.get_analysis(analysis_id, user_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/website/{website_id}/analysis")
async def get_website_analysis(website_id: str, user_id: str):
    """Get latest analysis for a website"""
    try:
        result = await zendbx_service.get_website_latest_analysis(website_id, user_id)
        
        if not result:
            raise HTTPException(
                status_code=404, 
                detail="No analysis found for this website"
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve website analysis: {str(e)}")
        # Return 404 instead of 500 for not found
        raise HTTPException(status_code=404, detail="No analysis found")


@app.post("/api/generate-campaigns")
async def generate_campaigns_endpoint(request: dict):
    """
    Generate executable campaigns from marketing intelligence
    
    Request body (Option 1 - Direct data):
    {
        "marketing_intelligence": {...},
        "website_analysis": {...},
        "duration_days": 30,
        "user_id": "user-uuid"
    }
    
    OR (Option 2 - By ID):
    {
        "user_id": "user-uuid",
        "intelligence_id": "intelligence-uuid",
        "duration_days": 30
    }
    """
    try:
        logger.info("=" * 60)
        logger.info("CAMPAIGN GENERATION REQUEST")
        logger.info("=" * 60)
        logger.info(f"Request body keys: {list(request.keys())}")
        
        user_id = request.get("user_id")
        duration_days = request.get("duration_days", 30)
        
        if not user_id:
            logger.error("Missing user_id in request")
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Check if data is provided directly or needs to be fetched
        if "marketing_intelligence" in request and "website_analysis" in request:
            # Option 1: Data provided directly
            logger.info("Using provided marketing intelligence and website analysis")
            marketing_intelligence = request.get("marketing_intelligence")
            website_analysis = request.get("website_analysis")
            
        elif "intelligence_id" in request:
            # Option 2: Fetch by ID
            intelligence_id = request.get("intelligence_id")
            logger.info(f"Fetching marketing intelligence: {intelligence_id}")
            
            marketing_intelligence = await zendbx_service.get_marketing_intelligence(
                intelligence_id=intelligence_id,
                user_id=user_id
            )
            
            if not marketing_intelligence:
                raise HTTPException(
                    status_code=404,
                    detail="Marketing intelligence not found"
                )
            
            # Get website analysis
            analysis_id = marketing_intelligence.get('analysis_id')
            website_analysis = None
            
            if analysis_id:
                website_analysis = await zendbx_service.get_analysis(analysis_id, user_id)
            
            if not website_analysis:
                website_analysis = {
                    'business': {
                        'business_name': marketing_intelligence.get('metadata', {}).get('business_name', ''),
                        'website': '',
                        'description': ''
                    }
                }
        else:
            logger.error("Neither direct data nor intelligence_id provided")
            raise HTTPException(
                status_code=400,
                detail="Either provide 'marketing_intelligence' and 'website_analysis', or 'intelligence_id'"
            )
        
        # Generate campaigns using campaign generator
        logger.info(f"Generating campaigns for {duration_days} days...")
        campaigns_result = await campaign_generator.generate_campaigns_from_intelligence(
            marketing_intelligence=marketing_intelligence,
            website_analysis=website_analysis,
            duration_days=duration_days
        )
        
        logger.info("=" * 60)
        logger.info("✅ CAMPAIGN GENERATION COMPLETE")
        logger.info(f"Generated {len(campaigns_result['campaigns'])} campaigns")
        logger.info(f"Total posts: {campaigns_result['summary']['total_posts']}")
        logger.info("=" * 60)
        
        return {
            "success": True,
            **campaigns_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Campaign generation failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Campaign generation failed: {str(e)}"
        )


@app.post("/api/generate-marketing-intelligence")
async def generate_marketing_intelligence(request: dict):
    """
    Generate Marketing Intelligence from existing Website Analysis
    
    This endpoint transforms completed website analysis into comprehensive
    marketing intelligence with 8 modules:
    1. Business Intelligence
    2. Competitor Intelligence
    3. Market Intelligence
    4. SWOT Analysis
    5. Audience Personas
    6. Positioning Strategy
    7. Marketing Strategy (90-day)
    8. Campaign Blueprints
    
    Request body:
    {
        "analysis_id": "uuid-of-completed-analysis",
        "user_id": "user-uuid"
    }
    OR
    {
        "website_analysis": {...complete website_analysis object...}
    }
    """
    try:
        logger.info("=" * 60)
        logger.info("MARKETING INTELLIGENCE REQUEST RECEIVED")
        logger.info("=" * 60)
        
        # Get website analysis (either from ID or directly provided)
        if "website_analysis" in request:
            website_analysis = request["website_analysis"]
            logger.info("Using provided website_analysis object")
        elif "analysis_id" in request and "user_id" in request:
            logger.info(f"Fetching analysis: {request['analysis_id']}")
            website_analysis = await zendbx_service.get_analysis(
                request["analysis_id"], 
                request["user_id"]
            )
            if not website_analysis:
                raise HTTPException(status_code=404, detail="Analysis not found")
        else:
            raise HTTPException(
                status_code=400, 
                detail="Either 'website_analysis' or both 'analysis_id' and 'user_id' required"
            )
        
        # Generate marketing intelligence
        logger.info("Starting marketing intelligence generation...")
        marketing_intelligence = await marketing_intelligence_engine.generate_intelligence(
            website_analysis
        )
        
        logger.info("=" * 60)
        logger.info("✅ MARKETING INTELLIGENCE COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Business: {marketing_intelligence['metadata']['business_name']}")
        logger.info(f"Personas: {len(marketing_intelligence['audience_personas'])}")
        logger.info(f"Content Calendar: {len(marketing_intelligence.get('content_calendar', []))} days")
        logger.info("=" * 60)
        
        # Store marketing intelligence in database
        try:
            user_id = request.get("user_id")
            website_id = website_analysis.get("website_id")
            analysis_id = request.get("analysis_id") or website_analysis.get("id")
            
            if user_id:
                intelligence_id = await zendbx_service.store_marketing_intelligence(
                    user_id=user_id,
                    website_id=website_id,
                    analysis_id=analysis_id,
                    intelligence_data=marketing_intelligence
                )
                logger.info(f"✅ Marketing intelligence stored in database: {intelligence_id}")
                marketing_intelligence["intelligence_id"] = intelligence_id
                
                # Note: Content calendar auto-scheduling removed
                # User must explicitly call /api/generate-content-calendar endpoint
            else:
                logger.warning("No user_id provided - skipping database storage")
        except Exception as storage_error:
            logger.error(f"Failed to store marketing intelligence in database: {str(storage_error)}")
            logger.exception("Storage error traceback:")
            # Continue anyway - return the intelligence even if storage fails
        
        return {
            "success": True,
            "marketing_intelligence": marketing_intelligence,
            "message": "Marketing intelligence generated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Marketing intelligence generation failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Marketing intelligence generation failed: {str(e)}"
        )


@app.post("/api/generate-content-calendar")
async def generate_content_calendar_endpoint(request: dict):
    """
    Generate and schedule a 30-day content calendar from marketing intelligence
    
    This endpoint generates content posts and optionally schedules them automatically.
    
    Request body:
    {
        "user_id": "user-uuid",
        "intelligence_id": "intelligence-uuid",
        "auto_schedule": true,  // Optional: if true, automatically schedules all posts
        "duration_days": 30  // Optional: defaults to 30 days
    }
    
    Response:
    {
        "success": true,
        "content_calendar": [...],
        "scheduled_count": 30,  // Only if auto_schedule=true
        "message": "Content calendar generated successfully"
    }
    """
    try:
        logger.info("=" * 60)
        logger.info("CONTENT CALENDAR GENERATION REQUEST")
        logger.info("=" * 60)
        
        user_id = request.get("user_id")
        intelligence_id = request.get("intelligence_id")
        auto_schedule = request.get("auto_schedule", False)
        duration_days = request.get("duration_days", 30)
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        if not intelligence_id:
            raise HTTPException(status_code=400, detail="intelligence_id is required")
        
        # Fetch marketing intelligence from database
        logger.info(f"Fetching marketing intelligence: {intelligence_id}")
        marketing_intelligence = await zendbx_service.get_marketing_intelligence(
            intelligence_id=intelligence_id,
            user_id=user_id
        )
        
        if not marketing_intelligence:
            raise HTTPException(
                status_code=404,
                detail="Marketing intelligence not found"
            )
        
        # Generate content calendar using AI
        logger.info(f"Generating {duration_days}-day content calendar...")
        
        # Extract data - handle both dict and string formats
        import json
        
        def safe_get(data, key, default=None):
            """Safely get data, parsing JSON strings if needed"""
            value = data.get(key, default) if isinstance(data, dict) else default
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except:
                    return default
            return value if value is not None else default
        
        brand_data = safe_get(marketing_intelligence, 'business_intelligence', {})
        audience_personas = safe_get(marketing_intelligence, 'audience_personas', [])
        audience_data = audience_personas[0] if audience_personas and len(audience_personas) > 0 else {}
        strategy = safe_get(marketing_intelligence, 'marketing_strategy', {})
        
        logger.info(f"Brand data type: {type(brand_data)}")
        logger.info(f"Audience data type: {type(audience_data)}")
        logger.info(f"Strategy type: {type(strategy)}")
        
        # Use AI analyzer to generate calendar
        from services.ai_analyzer import AIAnalyzer
        ai_analyzer = AIAnalyzer()
        
        content_calendar = await ai_analyzer.generate_campaign_calendar(
            brand_data=brand_data,
            audience_data=audience_data,
            marketing_strategy=strategy
        )
        
        logger.info(f"✅ Generated {len(content_calendar)} posts")
        
        result = {
            "success": True,
            "content_calendar": content_calendar,
            "message": f"Content calendar with {len(content_calendar)} posts generated successfully"
        }
        
        # Auto-schedule if requested
        if auto_schedule and len(content_calendar) > 0:
            logger.info(f"📅 AUTO-SCHEDULING: Scheduling {len(content_calendar)} posts...")
            scheduled_count = await auto_schedule_content_calendar(
                user_id=user_id,
                content_calendar=content_calendar,
                marketing_intelligence_id=intelligence_id
            )
            logger.info(f"✅ AUTO-SCHEDULED {scheduled_count}/{len(content_calendar)} posts")
            result["scheduled_count"] = scheduled_count
            result["message"] = f"Generated and scheduled {scheduled_count} posts successfully"
        
        logger.info("=" * 60)
        logger.info("✅ CONTENT CALENDAR GENERATION COMPLETE")
        logger.info("=" * 60)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Content calendar generation failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Content calendar generation failed: {str(e)}"
        )


@app.post("/api/generate-image")
async def generate_image(request: dict):
    """
    Generate an image using Stability AI and store in ZendBX Storage
    
    Request body:
    {
        "prompt": "A premium futuristic AI marketing automation SaaS dashboard, modern design",
        "user_id": "optional-user-id",
        "campaign_id": "optional-campaign-id"
    }
    
    Response:
    {
        "success": true,
        "data": {
            "status": "completed",
            "prompt": "...",
            "model": "stable-diffusion-xl-1024-v1-0",
            "provider": "stability_ai",
            "bucket": "image",
            "storage_path": "generated/test/uuid.png",
            "image_url": "https://api.zendbx.in/.../image/preview/uuid"
        }
    }
    """
    try:
        logger.info("=" * 60)
        logger.info("IMAGE GENERATION REQUEST RECEIVED")
        logger.info("=" * 60)
        
        prompt = request.get('prompt')
        if not prompt:
            raise HTTPException(
                status_code=400,
                detail="'prompt' is required in request body"
            )
        
        user_id = request.get('user_id')
        campaign_id = request.get('campaign_id')
        
        # Generate image and upload to ZendBX Storage
        result = await image_generation_service.generate_image(
            prompt=prompt,
            user_id=user_id,
            campaign_id=campaign_id
        )
        
        logger.info("=" * 60)
        if result.get('status') == 'completed':
            logger.info("✅ IMAGE GENERATION AND STORAGE COMPLETE")
            logger.info(f"Storage: {result.get('bucket')}/{result.get('storage_path')}")
            logger.info(f"URL: {result.get('image_url')}")
        else:
            logger.info(f"⚠️ IMAGE GENERATION FAILED: {result.get('error')}")
        logger.info("=" * 60)
        
        # Remove raw image_bytes from response (can't serialize to JSON)
        # Keep it in result for internal use by post_scheduler
        response_data = {k: v for k, v in result.items() if k != 'image_bytes'}
        
        return {
            "success": result.get('status') == 'completed',
            "data": response_data,
            "message": "Image generated and stored successfully" if result.get('status') == 'completed' else result.get('message', 'Image generation failed')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image generation endpoint error: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed: {str(e)}"
        )


# Mount static files for serving generated images
# This allows accessing images via /generated-images/{filename}
try:
    app.mount(
        "/generated-images",
        StaticFiles(directory="generated_images"),
        name="generated_images"
    )
    logger.info("✓ Static file serving configured: /generated-images")
except Exception as e:
    logger.warning(f"Could not mount generated_images directory: {str(e)}")


# ============================================================================
# LINKEDIN OAUTH ENDPOINTS
# ============================================================================

# Temporary storage for OAuth states (in production, use Redis or database)
oauth_states = {}
pkce_verifiers = {}  # Store PKCE verifiers for OAuth 2.0
oauth_secrets = {}  # Store OAuth token secrets for Twitter OAuth 1.0a

# Global token storage (workaround for missing account_data column)
global_token_storage = {}

class LinkedInAuthRequest(BaseModel):
    user_id: str

class LinkedInCallbackRequest(BaseModel):
    code: str
    state: str
    user_id: str

class LinkedInCompanySelectionRequest(BaseModel):
    user_id: str
    access_token: str
    selected_companies: List[Dict]  # List of {id, name, type: 'profile' or 'company'}


@app.post("/api/auth/linkedin/initiate")
async def linkedin_initiate_auth(request: LinkedInAuthRequest):
    """
    Step 1: Initiate LinkedIn OAuth flow
    Returns authorization URL for frontend to open
    """
    try:
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)
        oauth_states[state] = request.user_id
        
        # Get authorization URL
        auth_url = linkedin_service.get_authorization_url(state)
        
        return {
            "success": True,
            "auth_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"LinkedIn auth initiation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/linkedin/callback")
async def linkedin_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    """
    Step 2: LinkedIn OAuth callback
    This is called by LinkedIn after user authorizes
    """
    from fastapi.responses import HTMLResponse
    
    try:
        # Check if LinkedIn returned an error
        if error:
            error_msg = error_description or error
            logger.error(f"LinkedIn OAuth error: {error_msg}")
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }}
                    .container {{
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                    }}
                    .error-icon {{
                        color: #ef4444;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }}
                    h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                    p {{ color: #6b7280; margin: 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">✕</div>
                    <h1>Authorization Failed</h1>
                    <p>{error_msg}</p>
                </div>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'LINKEDIN_AUTH_ERROR',
                            error: '{error_msg}'
                        }}, '*');
                        setTimeout(() => window.close(), 3000);
                    }}
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=error_html, status_code=400)
        
        # Check if we have the required parameters
        if not code or not state:
            error_msg = "Missing authorization code or state parameter"
            logger.error(error_msg)
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }}
                    .container {{
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                    }}
                    .error-icon {{
                        color: #ef4444;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }}
                    h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                    p {{ color: #6b7280; margin: 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">✕</div>
                    <h1>Authorization Failed</h1>
                    <p>{error_msg}</p>
                </div>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'LINKEDIN_AUTH_ERROR',
                            error: '{error_msg}'
                        }}, '*');
                        setTimeout(() => window.close(), 3000);
                    }}
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=error_html, status_code=400)
        
        # Verify state
        if state not in oauth_states:
            raise HTTPException(status_code=400, detail="Invalid state parameter - possible CSRF attack")
        
        user_id = oauth_states.pop(state)
        
        # Exchange code for access token
        token_data = await linkedin_service.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in")
        
        # Get user profile
        profile = await linkedin_service.get_user_profile(access_token)
        
        # Get user's company pages
        companies = await linkedin_service.get_user_companies(access_token)
        
        # Prepare data for JavaScript (properly escaped)
        import json
        profile_json = json.dumps(profile)
        companies_json = json.dumps(companies)
        
        # Return HTML that sends data back to the parent window
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>LinkedIn Authorization Complete</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }}
                .success-icon {{
                    color: #10b981;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Authorization Successful</h1>
                <p>Redirecting back to the application...</p>
            </div>
            <script>
                // Send data back to parent window
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'LINKEDIN_AUTH_SUCCESS',
                        data: {{
                            access_token: '{access_token}',
                            expires_in: {expires_in},
                            user_id: '{user_id}',
                            profile: {profile_json},
                            companies: {companies_json}
                        }}
                    }}, '*');
                    setTimeout(() => window.close(), 1000);
                }} else {{
                    // If no opener, redirect to frontend
                    window.location.href = 'http://localhost:5173/social-accounts?linkedin_success=true';
                }}
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"LinkedIn OAuth callback failed: {str(e)}")
        logger.exception("Full traceback:")
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Failed</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 400px;
                }}
                .error-icon {{
                    color: #ef4444;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">✕</div>
                <h1>Authorization Failed</h1>
                <p>{str(e)}</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'LINKEDIN_AUTH_ERROR',
                        error: '{str(e)}'
                    }}, '*');
                    setTimeout(() => window.close(), 3000);
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)


@app.post("/api/auth/linkedin/save-connection")
async def linkedin_save_connection(request: LinkedInCompanySelectionRequest):
    """
    Step 3: Save LinkedIn connection after user selects company pages
    """
    try:
        user_id = request.user_id
        access_token = request.access_token
        selected_companies = request.selected_companies
        
        # Verify token is still valid by fetching profile
        profile = await linkedin_service.get_user_profile(access_token)
        
        logger.info(f"Saving LinkedIn connections for user {user_id}")
        logger.info(f"Selected accounts: {len(selected_companies)}")
        
        saved_accounts = []
        for company in selected_companies:
            try:
                # Prepare data for NEW socials table
                socials_data = {
                    "user_id": user_id,
                    "platform": "linkedin",
                    "account_name": company.get("name"),
                    "account_id": company.get("id") or profile.get("sub"),
                    "access_token": access_token,
                    "refresh_token": None,  # LinkedIn doesn't provide refresh tokens in basic OAuth
                    "token_expires_at": None,  # Would need to calculate based on expires_in
                    "is_active": True
                }
                
                # Also save to old social_accounts table for backwards compatibility
                account_data = {
                    "user_id": user_id,
                    "platform": "linkedin",
                    "platform_name": "LinkedIn",
                    "username": company.get("name"),
                    "followers": 0,
                    "posts": 0,
                    "status": "connected"
                }
                
                logger.info(f"Inserting to socials table: {socials_data}")
                
                # Insert into ZendBX
                import httpx
                zendbx_url = os.getenv("ZENDBX_API_URL")
                zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
                project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
                
                async with httpx.AsyncClient() as client:
                    # Save to NEW socials table (with tokens)
                    socials_response = await client.post(
                        f"{zendbx_url}/p/{project_slug}/v1/rest/socials",
                        json=socials_data,
                        headers={
                            "Authorization": f"Bearer {zendbx_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    logger.info(f"Socials table response status: {socials_response.status_code}")
                    
                    if socials_response.status_code in [200, 201]:
                        socials_result = socials_response.json()
                        saved_account = socials_result if isinstance(socials_result, dict) else socials_result[0] if isinstance(socials_result, list) else socials_data
                        saved_accounts.append(saved_account)
                        
                        logger.info(f"✅ Saved to socials table: {company.get('name')} (ID: {saved_account.get('id')})")
                        
                        # Also save to old table for backwards compatibility
                        try:
                            old_response = await client.post(
                                f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                                json=account_data,
                                headers={
                                    "Authorization": f"Bearer {zendbx_key}",
                                    "Content-Type": "application/json"
                                }
                            )
                            if old_response.status_code in [200, 201]:
                                logger.info(f"✅ Also saved to social_accounts table for compatibility")
                        except Exception as compat_error:
                            logger.warning(f"⚠️ Could not save to old table: {compat_error}")
                    else:
                        logger.error(f"Failed to save to socials table: {socials_response.text}")
                        saved_accounts.append(socials_data)
                        
            except Exception as account_error:
                logger.error(f"Error saving individual account: {str(account_error)}")
                # Continue with other accounts
                saved_accounts.append(socials_data)
                saved_accounts.append(account_data)
        
        return {
            "success": True,
            "accounts": saved_accounts,
            "message": f"Connected {len(saved_accounts)} LinkedIn account(s)"
        }
        
    except Exception as e:
        logger.error(f"Failed to save LinkedIn connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class ManualCompanyPageRequest(BaseModel):
    user_id: str
    company_url: str
    organization_id: str  # LinkedIn numeric organization ID
    access_token: str  # From connected LinkedIn account


@app.post("/api/auth/linkedin/add-company-manual")
async def add_linkedin_company_manual(request: ManualCompanyPageRequest):
    """
    Manually add a LinkedIn company page by URL and Organization ID
    User must already have LinkedIn connected and be admin of the page
    """
    try:
        logger.info(f"📋 Adding company page manually: {request.company_url}")
        logger.info(f"📋 Organization ID: {request.organization_id}")
        
        # Extract company info from URL
        company_info = await linkedin_service.get_company_info_by_url(request.company_url)
        logger.info(f"✓ Extracted company info: {company_info}")
        
        # Prepare data for socials table - USE THE NUMERIC ORG ID HERE!
        socials_data = {
            "user_id": request.user_id,
            "platform": "linkedin",
            "account_name": f"{company_info['name']} (Company)",
            "account_id": request.organization_id,  # Store the NUMERIC organization ID here!
            "access_token": request.access_token,
            "refresh_token": None,
            "token_expires_at": None,
            "is_active": True
        }
        
        logger.info(f"💾 Saving company page with Organization ID: {request.organization_id}")
        
        # Save to database
        import httpx
        zendbx_url = os.getenv("ZENDBX_API_URL")
        zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
        project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{zendbx_url}/p/{project_slug}/v1/rest/socials",
                json=socials_data,
                headers={
                    "Authorization": f"Bearer {zendbx_key}",
                    "Content-Type": "application/json"
                }
            )
            
            logger.info(f"Database response: {response.status_code}")
            logger.info(f"Database response body: {response.text}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                saved_account = result if isinstance(result, dict) else (result[0] if isinstance(result, list) else socials_data)
                
                logger.info(f"✅ Manually added company page: {company_info['name']}")
                
                # Also try to save to old social_accounts table for compatibility
                try:
                    account_data = {
                        "user_id": request.user_id,
                        "platform": "linkedin",
                        "platform_name": "LinkedIn",
                        "username": f"{company_info['name']} (Company)",
                        "followers": 0,
                        "posts": 0,
                        "status": "connected"
                    }
                    
                    old_response = await client.post(
                        f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                        json=account_data,
                        headers={
                            "Authorization": f"Bearer {zendbx_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    if old_response.status_code in [200, 201]:
                        logger.info(f"✅ Also saved to social_accounts table for compatibility")
                except Exception as compat_error:
                    logger.warning(f"⚠️ Could not save to old table: {compat_error}")
                
                return {
                    "success": True,
                    "account": saved_account,
                    "company_info": company_info,
                    "message": f"Added company page: {company_info['name']}"
                }
            else:
                error_detail = response.text
                logger.error(f"❌ Database error: {error_detail}")
                raise HTTPException(status_code=500, detail=f"Failed to save: {error_detail}")
                
    except ValueError as ve:
        logger.error(f"❌ Validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"❌ Failed to add company page manually: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TWITTER/X OAUTH ENDPOINTS
# ============================================================================

class TwitterAuthRequest(BaseModel):
    user_id: str

@app.post("/api/auth/twitter/initiate")
async def twitter_initiate_auth(request: TwitterAuthRequest):
    """
    Step 1: Initiate Twitter OAuth 1.0a flow
    Returns authorization URL for frontend to open
    """
    try:
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)
        oauth_states[state] = request.user_id
        
        # Get authorization URL and tokens
        auth_url, oauth_token, oauth_token_secret = twitter_service.get_authorization_url(state)
        
        # Store the oauth_token_secret for later use
        oauth_secrets[oauth_token] = oauth_token_secret
        
        return {
            "success": True,
            "auth_url": auth_url,
            "state": state,
            "oauth_token": oauth_token
        }
    except Exception as e:
        logger.error(f"Twitter auth initiation failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


class TwitterVerifyPinRequest(BaseModel):
    user_id: str
    oauth_token: str
    pin_code: str


@app.post("/api/auth/twitter/verify-pin")
async def twitter_verify_pin(request: TwitterVerifyPinRequest):
    """
    Step 2: Verify PIN code and complete OAuth
    """
    try:
        oauth_token = request.oauth_token
        pin_code = request.pin_code
        user_id = request.user_id
        
        # Get the oauth_token_secret we stored earlier
        oauth_token_secret = oauth_secrets.pop(oauth_token, None)
        
        if not oauth_token_secret:
            raise HTTPException(status_code=400, detail="OAuth session expired. Please try again.")
        
        # Exchange oauth_token + PIN for access token
        token_data = await twitter_service.exchange_token_for_access(oauth_token, pin_code, oauth_token_secret)
        access_token = token_data.get("oauth_token")
        access_token_secret = token_data.get("oauth_token_secret")
        
        # Get user profile
        profile = await twitter_service.get_user_profile(access_token, access_token_secret)
        
        return {
            "success": True,
            "data": {
                "access_token": access_token,
                "access_token_secret": access_token_secret,
                "user_id": user_id,
                "profile": profile
            }
        }
        
    except Exception as e:
        logger.error(f"Twitter PIN verification failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/twitter/callback")
async def twitter_oauth_callback(
    oauth_token: Optional[str] = None, 
    oauth_verifier: Optional[str] = None,
    denied: Optional[str] = None
):
    """
    Step 2: Twitter OAuth 1.0a callback
    This is called by Twitter after user authorizes
    """
    from fastapi.responses import HTMLResponse
    
    # Log all received parameters for debugging
    logger.info(f"Twitter callback received - oauth_token: {oauth_token is not None}, oauth_verifier: {oauth_verifier is not None}, denied: {denied}")
    
    try:
        # Check if user denied authorization
        if denied:
            error_msg = "User denied authorization"
            logger.error(f"Twitter OAuth denied: {denied}")
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Denied</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #1DA1F2 0%, #14171A 100%);
                    }}
                    .container {{
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                    }}
                    .error-icon {{
                        color: #ef4444;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }}
                    h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                    p {{ color: #6b7280; margin: 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">✕</div>
                    <h1>Authorization Denied</h1>
                    <p>You denied access to the application.</p>
                </div>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'TWITTER_AUTH_ERROR',
                            error: '{error_msg}'
                        }}, '*');
                        setTimeout(() => window.close(), 3000);
                    }}
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=error_html, status_code=400)
        
        # Check if we have the required parameters
        if not oauth_token or not oauth_verifier:
            error_msg = "Missing oauth_token or oauth_verifier parameter"
            logger.error(error_msg)
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #1DA1F2 0%, #14171A 100%);
                    }}
                    .container {{
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                    }}
                    .error-icon {{
                        color: #ef4444;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }}
                    h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                    p {{ color: #6b7280; margin: 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">✕</div>
                    <h1>Authorization Failed</h1>
                    <p>{error_msg}</p>
                </div>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'TWITTER_AUTH_ERROR',
                            error: '{error_msg}'
                        }}, '*');
                        setTimeout(() => window.close(), 3000);
                    }}
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=error_html, status_code=400)
        
        # Get the oauth_token_secret we stored earlier
        oauth_token_secret = oauth_secrets.pop(oauth_token, None)
        
        if not oauth_token_secret:
            raise HTTPException(status_code=400, detail="OAuth token secret not found - session may have expired")
        
        # Find user_id (we don't have state in OAuth 1.0a callback, so we'll need to match by oauth_token)
        # For now, we'll get it from the first oauth_state (in production, map oauth_token to state)
        user_id = None
        for state, uid in list(oauth_states.items()):
            user_id = uid
            oauth_states.pop(state)
            break
        
        if not user_id:
            user_id = "unknown"  # Fallback
        
        # Exchange oauth_token + oauth_verifier for access token
        token_data = await twitter_service.exchange_token_for_access(oauth_token, oauth_verifier, oauth_token_secret)
        access_token = token_data.get("oauth_token")
        access_token_secret = token_data.get("oauth_token_secret")
        
        # Get user profile
        profile = await twitter_service.get_user_profile(access_token, access_token_secret)
        
        # Prepare data for JavaScript (properly escaped)
        import json
        profile_json = json.dumps(profile)
        
        # Return HTML that sends data back to the parent window
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>X Authorization Complete</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #1DA1F2 0%, #14171A 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }}
                .success-icon {{
                    color: #1DA1F2;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Authorization Successful</h1>
                <p>Redirecting back to the application...</p>
            </div>
            <script>
                // Send data back to parent window
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'TWITTER_AUTH_SUCCESS',
                        data: {{
                            access_token: '{access_token}',
                            access_token_secret: '{access_token_secret}',
                            user_id: '{user_id}',
                            profile: {profile_json}
                        }}
                    }}, '*');
                    setTimeout(() => window.close(), 1000);
                }} else {{
                    // If no opener, redirect to frontend
                    window.location.href = 'http://localhost:5173/social-accounts?twitter_success=true';
                }}
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Twitter OAuth callback failed: {str(e)}")
        logger.exception("Full traceback:")
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authorization Failed</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #1DA1F2 0%, #14171A 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 400px;
                }}
                .error-icon {{
                    color: #ef4444;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">✕</div>
                <h1>Authorization Failed</h1>
                <p>{str(e)}</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'TWITTER_AUTH_ERROR',
                        error: '{str(e)}'
                    }}, '*');
                    setTimeout(() => window.close(), 3000);
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)


class TwitterSaveConnectionRequest(BaseModel):
    user_id: str
    access_token: str
    access_token_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    profile: Dict


@app.post("/api/auth/twitter/save-connection")
async def twitter_save_connection(request: TwitterSaveConnectionRequest):
    """
    Step 3: Save Twitter connection
    """
    try:
        user_id = request.user_id
        access_token = request.access_token
        access_token_secret = request.access_token_secret if hasattr(request, 'access_token_secret') else None
        refresh_token = request.refresh_token
        profile = request.profile
        
        logger.info(f"Saving Twitter connection for user {user_id}")
        logger.info(f"Profile: @{profile.get('username')}")
        
        # Prepare data for social_accounts table
        account_data = {
            "user_id": user_id,
            "platform": "twitter",
            "platform_name": "X (Twitter)",
            "username": profile.get("username"),
            "followers": profile.get("public_metrics", {}).get("followers_count", 0),
            "posts": profile.get("public_metrics", {}).get("tweet_count", 0),
            "status": "active"
        }
        
        logger.info(f"Inserting account: {account_data}")
        
        # Insert into ZendBX social_accounts table
        zendbx_url = os.getenv("ZENDBX_API_URL")
        zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
        project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                json=account_data,
                headers={
                    "Authorization": f"Bearer {zendbx_key}",
                    "Content-Type": "application/json"
                }
            )
            
            logger.info(f"ZendBX response status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                saved_account = result if isinstance(result, dict) else result[0] if isinstance(result, list) else account_data
                account_id = saved_account.get('id')
                
                # Now save tokens to socials table
                # For Twitter OAuth 1.0a: access_token = oauth_token, refresh_token = oauth_token_secret
                socials_data = {
                    "user_id": user_id,
                    "platform": "twitter",
                    "account_id": profile.get("id"),
                    "account_name": f"@{profile.get('username')}",
                    "access_token": access_token,
                    "refresh_token": access_token_secret,  # Store oauth_token_secret in refresh_token field
                    "token_expires_at": None,
                    "is_active": True
                }
                
                socials_response = await client.post(
                    f"{zendbx_url}/p/{project_slug}/v1/rest/socials",
                    json=socials_data,
                    headers={
                        "Authorization": f"Bearer {zendbx_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if socials_response.status_code in [200, 201]:
                    logger.info(f"✓ Saved tokens to socials table")
                else:
                    logger.error(f"Failed to save tokens: {socials_response.text}")
                
                logger.info(f"✓ Saved account: @{profile.get('username')}")
                
                return {
                    "success": True,
                    "account": saved_account,
                    "message": f"Connected X account @{profile.get('username')}"
                }
            else:
                logger.error(f"Failed to save account: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to save account to database")
        
    except Exception as e:
        logger.error(f"Failed to save Twitter connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TWITTER POSTING ENDPOINT (TEST)
# ============================================================================

class TwitterPostRequest(BaseModel):
    account_id: str
    text: str


@app.post("/api/twitter/post")
async def post_tweet(request: TwitterPostRequest):
    """
    Post a tweet to the connected Twitter account
    """
    try:
        account_id = request.account_id
        text = request.text
        
        # Get tokens from cache
        if not hasattr(twitter_save_connection, 'token_cache'):
            raise HTTPException(status_code=400, detail="No Twitter accounts connected. Please connect an account first.")
        
        tokens = twitter_save_connection.token_cache.get(account_id)
        if not tokens:
            raise HTTPException(status_code=404, detail="Account not found or tokens expired. Please reconnect the account.")
        
        access_token = tokens['access_token']
        access_token_secret = tokens['access_token_secret']
        
        logger.info(f"Posting tweet for account {account_id}")
        logger.info(f"Tweet text: {text}")
        
        # Post tweet
        result = await twitter_service.post_tweet(access_token, access_token_secret, text)
        
        logger.info(f"✓ Tweet posted successfully!")
        logger.info(f"Tweet data: {result}")
        
        return {
            "success": True,
            "tweet": result.get('data', result),
            "message": "Tweet posted successfully!"
        }
        
    except Exception as e:
        logger.error(f"Failed to post tweet: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LINKEDIN POSTING ENDPOINT (TEST)
# ============================================================================

class LinkedInPostRequest(BaseModel):
    account_id: str
    text: str
    image_url: Optional[str] = None


@app.post("/api/linkedin/post")
async def post_linkedin(request: LinkedInPostRequest):
    """
    Post to LinkedIn profile with optional image
    
    Supports:
    - Text-only posts
    - Posts with images (image_url must be publicly accessible)
    """
    try:
        account_id = request.account_id
        text = request.text
        image_url = request.image_url
        
        # Get tokens from cache (similar to Twitter)
        if not hasattr(linkedin_save_connection, 'token_cache'):
            raise HTTPException(status_code=400, detail="No LinkedIn accounts connected. Please connect an account first.")
        
        tokens = linkedin_save_connection.token_cache.get(account_id)
        if not tokens:
            raise HTTPException(status_code=404, detail="Account not found or tokens expired. Please reconnect the account.")
        
        access_token = tokens['access_token']
        
        logger.info(f"Posting to LinkedIn for account {account_id}")
        logger.info(f"Post text: {text[:100]}...")
        if image_url:
            logger.info(f"With image: {image_url}")
        
        # Post to LinkedIn
        result = await linkedin_service.post_to_profile(access_token, text, image_url)
        
        logger.info(f"✓ Posted to LinkedIn successfully!")
        logger.info(f"Post data: {result}")
        
        return {
            "success": True,
            "post": result,
            "message": "Posted to LinkedIn successfully!"
        }
        
    except Exception as e:
        logger.error(f"Failed to post to LinkedIn: {str(e)}")
        logger.exception("Full traceback:")
        
        # Provide helpful error messages
        error_detail = str(e)
        if "401" in error_detail or "token" in error_detail.lower():
            error_detail = "LinkedIn token expired. Please reconnect your LinkedIn account."
        elif "403" in error_detail or "forbidden" in error_detail.lower():
            error_detail = "LinkedIn API permission error. Please ensure your LinkedIn app has the correct permissions."
        elif "400" in error_detail:
            error_detail = f"Invalid request to LinkedIn API: {error_detail}"
        
        raise HTTPException(status_code=500, detail=error_detail)


# ============================================================================
# FACEBOOK OAUTH ENDPOINTS
# ============================================================================

class FacebookAuthRequest(BaseModel):
    user_id: str

class FacebookSaveConnectionRequest(BaseModel):
    user_id: str
    access_token: str
    profile: Dict
    pages: Optional[List[Dict]] = None


@app.post("/api/auth/facebook/initiate")
async def facebook_initiate_auth(request: FacebookAuthRequest):
    """
    Step 1: Initiate Facebook OAuth flow
    Returns authorization URL for frontend to open
    """
    try:
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)
        oauth_states[state] = request.user_id
        
        # Get authorization URL
        auth_url = facebook_service.get_authorization_url(state)
        
        return {
            "success": True,
            "auth_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"Facebook auth initiation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/facebook/callback")
async def facebook_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    """
    Step 2: Facebook OAuth callback
    This is called by Facebook after user authorizes
    """
    from fastapi.responses import HTMLResponse
    
    logger.info(f"Facebook callback received - code: {code is not None}, state: {state is not None}, error: {error}")
    
    try:
        # Check if Facebook returned an error
        if error:
            error_msg = error_description or error
            logger.error(f"Facebook OAuth error: {error_msg}")
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #1877F2 0%, #0C5698 100%);
                    }}
                    .container {{
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                    }}
                    .error-icon {{
                        color: #ef4444;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }}
                    h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                    p {{ color: #6b7280; margin: 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">✕</div>
                    <h1>Authorization Failed</h1>
                    <p>{error_msg}</p>
                </div>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'FACEBOOK_AUTH_ERROR',
                            error: '{error_msg}'
                        }}, '*');
                        setTimeout(() => window.close(), 3000);
                    }}
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=error_html, status_code=400)
        
        # Check if we have the required parameters
        if not code or not state:
            error_msg = "Missing authorization code or state parameter"
            logger.error(error_msg)
            return HTMLResponse(content=f"<html><body><h1>Error</h1><p>{error_msg}</p></body></html>", status_code=400)
        
        # Verify state
        if state not in oauth_states:
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        user_id = oauth_states.pop(state)
        
        # Exchange code for access token
        token_data = await facebook_service.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        
        # Get long-lived token (60 days)
        long_lived_data = await facebook_service.get_long_lived_token(access_token)
        long_lived_token = long_lived_data.get("access_token", access_token)
        
        # Get user profile
        profile = await facebook_service.get_user_profile(long_lived_token)
        
        # Get user's Facebook Pages
        pages = await facebook_service.get_user_pages(long_lived_token)
        
        # Prepare data for JavaScript
        import json
        profile_json = json.dumps(profile)
        pages_json = json.dumps(pages)
        
        # Return HTML that sends data back to the parent window
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Facebook Authorization Complete</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #1877F2 0%, #0C5698 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }}
                .success-icon {{
                    color: #1877F2;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Authorization Successful</h1>
                <p>Redirecting back to the application...</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'FACEBOOK_AUTH_SUCCESS',
                        data: {{
                            access_token: '{long_lived_token}',
                            user_id: '{user_id}',
                            profile: {profile_json},
                            pages: {pages_json}
                        }}
                    }}, '*');
                    setTimeout(() => window.close(), 1000);
                }} else {{
                    window.location.href = 'http://localhost:5173/social-accounts?facebook_success=true';
                }}
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Facebook OAuth callback failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/facebook/save-connection")
async def facebook_save_connection(request: FacebookSaveConnectionRequest):
    """
    Step 3: Save Facebook connection after user selects pages
    """
    try:
        user_id = request.user_id
        access_token = request.access_token
        profile = request.profile
        pages = request.pages or []
        
        logger.info(f"Saving Facebook connection for user {user_id}")
        logger.info(f"Profile: {profile.get('name')}")
        logger.info(f"Pages: {len(pages)}")
        
        saved_accounts = []
        
        # Save user profile connection
        profile_data = {
            "user_id": user_id,
            "platform": "facebook",
            "platform_name": "Facebook",
            "username": profile.get("name"),
            "followers": 0,
            "posts": 0,
            "status": "active"
        }
        
        # Save to database
        zendbx_url = os.getenv("ZENDBX_API_URL")
        zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
        project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                json=profile_data,
                headers={
                    "Authorization": f"Bearer {zendbx_key}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                saved_account = result if isinstance(result, dict) else result[0] if isinstance(result, list) else profile_data
                
                # Store token for profile
                account_id = saved_account.get('id')
                if account_id:
                    if not hasattr(facebook_save_connection, 'token_cache'):
                        facebook_save_connection.token_cache = {}
                    facebook_save_connection.token_cache[account_id] = {
                        'access_token': access_token,
                        'type': 'profile'
                    }
                    logger.info(f"✓ Stored Facebook token for profile {account_id}")
                
                saved_accounts.append(saved_account)
        
        # Save pages and check for Instagram accounts
        for page in pages:
            page_data = {
                "user_id": user_id,
                "platform": "facebook_page",
                "platform_name": f"Facebook Page: {page.get('name')}",
                "username": page.get('name'),
                "followers": page.get('followers', 0),
                "posts": 0,
                "status": "active"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                    json=page_data,
                    headers={
                        "Authorization": f"Bearer {zendbx_key}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    saved_page = result if isinstance(result, dict) else result[0] if isinstance(result, list) else page_data
                    
                    # Store page access token
                    page_account_id = saved_page.get('id')
                    page_access_token = page.get('access_token')
                    page_id = page.get('id')
                    
                    if page_account_id and page_access_token:
                        if not hasattr(facebook_save_connection, 'token_cache'):
                            facebook_save_connection.token_cache = {}
                        facebook_save_connection.token_cache[page_account_id] = {
                            'access_token': page_access_token,
                            'type': 'page',
                            'page_id': page_id
                        }
                        logger.info(f"✓ Stored Facebook Page token for {page.get('name')}")
                    
                    saved_accounts.append(saved_page)
                    
                    # Check if this page has an Instagram Business account connected
                    try:
                        logger.info(f"Checking for Instagram account on page {page.get('name')}...")
                        ig_account = await instagram_service.get_instagram_accounts_from_pages(
                            page_access_token=page_access_token,
                            page_id=page_id
                        )
                        
                        if ig_account:
                            logger.info(f"Found Instagram account: @{ig_account.get('username')}")
                            
                            # Save Instagram account
                            ig_data = {
                                "user_id": user_id,
                                "platform": "instagram",
                                "platform_name": "Instagram",
                                "username": ig_account.get('username'),
                                "followers": ig_account.get('followers_count', 0),
                                "posts": ig_account.get('media_count', 0),
                                "status": "active"
                            }
                            
                            ig_response = await client.post(
                                f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                                json=ig_data,
                                headers={
                                    "Authorization": f"Bearer {zendbx_key}",
                                    "Content-Type": "application/json"
                                }
                            )
                            
                            if ig_response.status_code in [200, 201]:
                                ig_result = ig_response.json()
                                saved_ig = ig_result if isinstance(ig_result, dict) else ig_result[0] if isinstance(ig_result, list) else ig_data
                                
                                # Store Instagram token (uses page token)
                                ig_account_id = saved_ig.get('id')
                                if ig_account_id:
                                    facebook_save_connection.token_cache[ig_account_id] = {
                                        'access_token': page_access_token,
                                        'type': 'instagram',
                                        'instagram_id': ig_account.get('id'),
                                        'page_id': page_id
                                    }
                                    logger.info(f"✓ Stored Instagram token for @{ig_account.get('username')}")
                                
                                saved_accounts.append(saved_ig)
                        else:
                            logger.info(f"No Instagram account connected to page {page.get('name')}")
                            
                    except Exception as ig_error:
                        logger.warning(f"Could not fetch Instagram for page {page.get('name')}: {str(ig_error)}")
                        # Continue even if Instagram fetch fails
        
        logger.info(f"✓ Saved {len(saved_accounts)} Facebook account(s)")
        
        return {
            "success": True,
            "accounts": saved_accounts,
            "message": f"Connected {len(saved_accounts)} Facebook account(s)"
        }
        
    except Exception as e:
        logger.error(f"Failed to save Facebook connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("DEBUG", "True") == "True"
    )


# ============================================================================
# FACEBOOK POSTING ENDPOINT
# ============================================================================

class FacebookPostRequest(BaseModel):
    account_id: str
    text: str
    link: Optional[str] = None


@app.post("/api/facebook/post")
async def post_to_facebook(request: FacebookPostRequest):
    """
    Post to Facebook profile or page
    """
    try:
        account_id = request.account_id
        text = request.text
        link = request.link
        
        # Get tokens from cache
        if not hasattr(facebook_save_connection, 'token_cache'):
            raise HTTPException(status_code=400, detail="No Facebook accounts connected. Please connect an account first.")
        
        tokens = facebook_save_connection.token_cache.get(account_id)
        if not tokens:
            raise HTTPException(status_code=404, detail="Account not found or tokens expired. Please reconnect the account.")
        
        access_token = tokens['access_token']
        account_type = tokens['type']
        
        logger.info(f"Posting to Facebook {account_type} for account {account_id}")
        logger.info(f"Post text: {text}")
        
        # Post to Facebook
        if account_type == 'page':
            # Post to Facebook Page
            page_id = tokens['page_id']
            result = await facebook_service.post_to_page(access_token, page_id, text, link)
        else:
            # Post to profile
            result = await facebook_service.post_to_profile(access_token, text)
        
        logger.info(f"✓ Posted to Facebook successfully!")
        logger.info(f"Post ID: {result.get('id')}")
        
        return {
            "success": True,
            "post": result,
            "message": "Posted to Facebook successfully!"
        }
        
    except Exception as e:
        logger.error(f"Failed to post to Facebook: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# INSTAGRAM OAUTH ENDPOINTS
# ============================================================================

class InstagramAuthRequest(BaseModel):
    user_id: str

class InstagramSaveConnectionRequest(BaseModel):
    user_id: str
    access_token: str
    pages: List[Dict]  # Pages with Instagram accounts


@app.post("/api/auth/instagram/initiate")
async def instagram_initiate_auth(request: InstagramAuthRequest):
    """
    Step 1: Initiate Instagram OAuth flow
    Returns authorization URL for frontend to open
    """
    try:
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)
        oauth_states[state] = request.user_id
        
        # Get authorization URL
        auth_url = instagram_service.get_authorization_url(state)
        
        return {
            "success": True,
            "auth_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"Instagram auth initiation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/instagram/callback")
async def instagram_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None, error_description: Optional[str] = None):
    """
    Step 2: Instagram OAuth callback
    This is called by Facebook after user authorizes
    """
    from fastapi.responses import HTMLResponse
    
    logger.info(f"Instagram callback received - code: {code is not None}, state: {state is not None}, error: {error}")
    
    try:
        # Check if returned an error
        if error:
            error_msg = error_description or error
            logger.error(f"Instagram OAuth error: {error_msg}")
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authorization Failed</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
                    }}
                    .container {{
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                    }}
                    .error-icon {{
                        color: #ef4444;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }}
                    h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                    p {{ color: #6b7280; margin: 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">✕</div>
                    <h1>Authorization Failed</h1>
                    <p>{error_msg}</p>
                </div>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'INSTAGRAM_AUTH_ERROR',
                            error: '{error_msg}'
                        }}, '*');
                        setTimeout(() => window.close(), 3000);
                    }}
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=error_html, status_code=400)
        
        # Check if we have the required parameters
        if not code or not state:
            error_msg = "Missing authorization code or state parameter"
            logger.error(error_msg)
            return HTMLResponse(content=f"<html><body><h1>Error</h1><p>{error_msg}</p></body></html>", status_code=400)
        
        # Verify state
        if state not in oauth_states:
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        user_id = oauth_states.pop(state)
        
        # Exchange code for access token
        token_data = await instagram_service.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        
        # Get long-lived token (60 days)
        long_lived_data = await instagram_service.get_long_lived_token(access_token)
        long_lived_token = long_lived_data.get("access_token", access_token)
        
        # Get user's pages with Instagram accounts
        pages = await instagram_service.get_user_pages(long_lived_token)
        
        # Prepare data for JavaScript
        import json
        pages_json = json.dumps(pages)
        
        # Return HTML that sends data back to the parent window
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Instagram Authorization Complete</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }}
                .success-icon {{
                    color: #833ab4;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Authorization Successful</h1>
                <p>Redirecting back to the application...</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'INSTAGRAM_AUTH_SUCCESS',
                        data: {{
                            access_token: '{long_lived_token}',
                            user_id: '{user_id}',
                            pages: {pages_json}
                        }}
                    }}, '*');
                    setTimeout(() => window.close(), 1000);
                }} else {{
                    window.location.href = 'http://localhost:5173/social-accounts?instagram_success=true';
                }}
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Instagram OAuth callback failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/instagram/save-connection")
async def instagram_save_connection(request: InstagramSaveConnectionRequest):
    """
    Step 3: Save Instagram connection after user selects pages
    """
    try:
        user_id = request.user_id
        access_token = request.access_token
        pages = request.pages
        
        logger.info(f"Saving Instagram connections for user {user_id}")
        logger.info(f"Pages with Instagram: {len(pages)}")
        
        saved_accounts = []
        zendbx_url = os.getenv("ZENDBX_API_URL")
        zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
        project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
        
        for page in pages:
            if page.get("instagram"):
                ig = page["instagram"]
                
                # Prepare data for NEW socials table (with tokens)
                socials_data = {
                    "user_id": user_id,
                    "platform": "instagram",
                    "account_name": f"@{ig.get('username')}",
                    "account_id": ig.get('id'),  # Instagram Business Account ID
                    "access_token": page.get('access_token'),  # Page access token
                    "refresh_token": None,
                    "token_expires_at": None,
                    "is_active": True
                }
                
                # Also prepare for old social_accounts table (backwards compatibility)
                ig_data = {
                    "user_id": user_id,
                    "platform": "instagram",
                    "platform_name": "Instagram",
                    "username": ig.get("username"),
                    "followers": ig.get("followers_count", 0),
                    "posts": ig.get("media_count", 0),
                    "status": "active"
                }
                
                async with httpx.AsyncClient() as client:
                    # Save to NEW socials table (with tokens) - PRIMARY
                    socials_response = await client.post(
                        f"{zendbx_url}/p/{project_slug}/v1/rest/socials",
                        json=socials_data,
                        headers={
                            "Authorization": f"Bearer {zendbx_key}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    logger.info(f"Socials table response status: {socials_response.status_code}")
                    
                    if socials_response.status_code in [200, 201]:
                        socials_result = socials_response.json()
                        saved_account = socials_result if isinstance(socials_result, dict) else socials_result[0] if isinstance(socials_result, list) else socials_data
                        saved_accounts.append(saved_account)
                        
                        logger.info(f"✅ Saved Instagram @{ig.get('username')} to socials table (ID: {saved_account.get('id')})")
                        
                        # Also save to old table for backwards compatibility
                        try:
                            old_response = await client.post(
                                f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                                json=ig_data,
                                headers={
                                    "Authorization": f"Bearer {zendbx_key}",
                                    "Content-Type": "application/json"
                                }
                            )
                            if old_response.status_code in [200, 201]:
                                logger.info(f"✅ Also saved to social_accounts table for compatibility")
                        except Exception as compat_error:
                            logger.warning(f"⚠️ Could not save to old table: {compat_error}")
                    else:
                        logger.error(f"Failed to save to socials table: {socials_response.text}")
                        # Still add to saved_accounts so user sees something
                        saved_accounts.append(socials_data)
        
        logger.info(f"✓ Saved {len(saved_accounts)} Instagram account(s)")
        
        return {
            "success": True,
            "accounts": saved_accounts,
            "message": f"Connected {len(saved_accounts)} Instagram account(s)"
        }
        
    except Exception as e:
        logger.error(f"Failed to save Instagram connection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# INSTAGRAM POSTING ENDPOINT
# ============================================================================

class InstagramPostRequest(BaseModel):
    account_id: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    caption: Optional[str] = None
    post_type: str = "feed"  # feed, story, reel


@app.post("/api/instagram/post")
async def post_to_instagram(request: InstagramPostRequest):
    """
    Post to Instagram (Feed, Story, or Reel)
    
    NOTE: Instagram requires:
    - Image/video URL must be publicly accessible
    - Instagram Business account connected to Facebook Page
    - Proper permissions granted
    """
    try:
        account_id = request.account_id
        image_url = request.image_url
        video_url = request.video_url
        caption = request.caption
        post_type = request.post_type
        
        # Get tokens from cache
        if not hasattr(instagram_save_connection, 'token_cache'):
            raise HTTPException(
                status_code=400,
                detail="No Instagram accounts connected. Please connect your Instagram Business account."
            )
        
        tokens = instagram_save_connection.token_cache.get(account_id)
        if not tokens:
            raise HTTPException(
                status_code=404,
                detail="Account not found or tokens expired. Please reconnect your Instagram account."
            )
        
        access_token = tokens['access_token']
        instagram_account_id = tokens.get('instagram_id')
        
        if not instagram_account_id:
            raise HTTPException(
                status_code=400,
                detail="No Instagram account linked to this Facebook Page. Please connect an Instagram Business account to your Facebook Page."
            )
        
        logger.info(f"Posting to Instagram {post_type} for account {account_id}")
        logger.info(f"Instagram ID: {instagram_account_id}")
        
        # Post based on type
        if post_type == "story":
            result = await instagram_service.create_instagram_story(
                instagram_account_id=instagram_account_id,
                access_token=access_token,
                image_url=image_url,
                video_url=video_url
            )
        elif post_type == "reel":
            if not video_url:
                raise HTTPException(status_code=400, detail="video_url is required for Reels")
            result = await instagram_service.create_instagram_reel(
                instagram_account_id=instagram_account_id,
                access_token=access_token,
                video_url=video_url,
                caption=caption
            )
        else:  # feed
            if not image_url and not video_url:
                raise HTTPException(status_code=400, detail="Either image_url or video_url is required")
            result = await instagram_service.post_to_instagram(
                instagram_account_id=instagram_account_id,
                access_token=access_token,
                image_url=image_url,
                video_url=video_url,
                caption=caption
            )
        
        logger.info(f"✓ Posted to Instagram successfully!")
        logger.info(f"Post ID: {result.get('id')}")
        
        return {
            "success": True,
            "post": result,
            "message": f"Posted to Instagram {post_type} successfully!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to post to Instagram: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# INSTAGRAM DIRECT TEST ENDPOINT (for debugging)
# ============================================================================

class InstagramDirectTestRequest(BaseModel):
    access_token: str
    instagram_account_id: str
    image_url: str
    caption: Optional[str] = None


class InstagramGetAccountsRequest(BaseModel):
    access_token: str


@app.post("/api/instagram/get-accounts")
async def get_instagram_accounts_info(request: InstagramGetAccountsRequest):
    """
    Get Instagram accounts from access token - for testing
    """
    try:
        pages = await instagram_service.get_user_pages(request.access_token)
        
        result = {
            "total_pages": len(pages),
            "pages_with_instagram": [],
            "all_pages": pages
        }
        
        for page in pages:
            if page.get("instagram"):
                result["pages_with_instagram"].append({
                    "page_id": page.get("id"),
                    "page_name": page.get("name"),
                    "instagram_id": page.get("instagram", {}).get("id"),
                    "instagram_username": page.get("instagram", {}).get("username"),
                    "followers": page.get("instagram", {}).get("followers_count"),
                })
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to get Instagram accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/instagram/test-post")
async def test_instagram_post_direct(request: InstagramDirectTestRequest):
    """
    Direct Instagram posting test - bypasses database
    Use this to test if your Instagram connection works
    """
    try:
        logger.info("=" * 60)
        logger.info("DIRECT INSTAGRAM TEST POST")
        logger.info(f"Instagram Account ID: {request.instagram_account_id}")
        logger.info(f"Image URL: {request.image_url}")
        logger.info("=" * 60)
        
        result = await instagram_service.post_to_instagram(
            instagram_account_id=request.instagram_account_id,
            access_token=request.access_token,
            image_url=request.image_url,
            caption=request.caption
        )
        
        logger.info("=" * 60)
        logger.info("✅ INSTAGRAM TEST POST SUCCESS!")
        logger.info(f"Post ID: {result.get('id')}")
        logger.info("=" * 60)
        
        return {
            "success": True,
            "post_id": result.get('id'),
            "message": "Test post published successfully!",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Instagram test post failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to post: {str(e)}"
        )


# ============================================================================
# PINTEREST OAUTH ENDPOINTS
# ============================================================================

class PinterestAuthRequest(BaseModel):
    user_id: str

class PinterestDirectConnectRequest(BaseModel):
    user_id: str

class PinterestSaveConnectionRequest(BaseModel):
    user_id: str
    access_token: str
    refresh_token: Optional[str] = None
    username: str
    account_type: str = "PERSONAL"

class PinterestPostRequest(BaseModel):
    account_id: str
    board_id: str
    title: str
    description: Optional[str] = None
    link: Optional[str] = None
    image_url: str  # Must be publicly accessible URL
    alt_text: Optional[str] = None


@app.post("/api/auth/pinterest/initiate")
async def pinterest_initiate_auth(request: PinterestAuthRequest):
    """
    Step 1: Initiate Pinterest OAuth flow
    Returns authorization URL for frontend to open
    """
    try:
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)
        oauth_states[state] = request.user_id
        
        # Get authorization URL
        auth_url = pinterest_service.get_authorization_url(state)
        
        logger.info(f"Pinterest OAuth initiated for user {request.user_id}")
        
        return {
            "success": True,
            "auth_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"Pinterest auth initiation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/pinterest/connect-direct")
async def pinterest_connect_direct(request: PinterestDirectConnectRequest):
    """
    Direct Pinterest connection using access token from .env
    (For development/testing when app is not approved yet)
    """
    try:
        user_id = request.user_id
        
        # Use access token from environment
        access_token = os.getenv("PINTEREST_ACCESS_TOKEN")
        if not access_token:
            raise HTTPException(
                status_code=500,
                detail="Pinterest access token not configured in .env file"
            )
        
        logger.info(f"Direct Pinterest connection for user {user_id}")
        
        # Get user info using the access token
        user_info = await pinterest_service.get_user_info(access_token)
        username = user_info.get("username", "Unknown")
        
        logger.info(f"✓ Pinterest user: @{username}")
        
        # Store in token cache
        if not hasattr(pinterest_save_connection, 'token_cache'):
            pinterest_save_connection.token_cache = {}
        
        # Prepare account data
        account_data = {
            "user_id": user_id,
            "platform": "pinterest",
            "platform_name": "Pinterest",
            "username": username,
            "followers": 0,
            "posts": 0,
            "status": "active"
        }
        
        logger.info(f"Saving Pinterest account: {account_data}")
        
        # Insert into ZendBX social_accounts table
        zendbx_url = os.getenv("ZENDBX_API_URL")
        zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
        project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                json=account_data,
                headers={
                    "Authorization": f"Bearer {zendbx_key}",
                    "Content-Type": "application/json"
                }
            )
            
            logger.info(f"ZendBX response status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                account_response = response.json()
                logger.info(f"✓ Pinterest account saved: {account_response}")
                
                account_id = account_response.get("id")
                
                # Store token in cache
                pinterest_save_connection.token_cache[account_id] = {
                    "access_token": access_token,
                    "username": username,
                    "user_id": user_id
                }
                
                logger.info("✓ Pinterest connected successfully!")
                
                return {
                    "success": True,
                    "accounts": [account_response],
                    "message": f"Pinterest account @{username} connected successfully!"
                }
            else:
                error_text = response.text
                logger.error(f"ZendBX error: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=error_text)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to connect Pinterest directly: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/pinterest/callback")
async def pinterest_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    """
    Step 2: Pinterest OAuth callback
    This is called by Pinterest after user authorizes
    """
    from fastapi.responses import HTMLResponse
    
    try:
        logger.info(f"Pinterest callback received - code: {bool(code)}, state: {bool(state)}, error: {error}")
        
        # Check if Pinterest returned an error
        if error:
            logger.error(f"Pinterest OAuth error: {error}")
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pinterest Authorization Failed</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #E60023 0%, #C5001A 100%);
                    }}
                    .container {{
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 400px;
                    }}
                    .error-icon {{
                        color: #ef4444;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }}
                    h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                    p {{ color: #6b7280; margin: 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">✕</div>
                    <h1>Authorization Failed</h1>
                    <p>{error}</p>
                </div>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{
                            type: 'PINTEREST_AUTH_ERROR',
                            error: '{error}'
                        }}, '*');
                        setTimeout(() => window.close(), 3000);
                    }}
                </script>
            </body>
            </html>
            """
            return HTMLResponse(content=error_html, status_code=400)
        
        # Check required parameters
        if not code or not state:
            error_msg = "Missing authorization code or state"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Verify state
        if state not in oauth_states:
            raise HTTPException(status_code=400, detail="Invalid state parameter - possible CSRF attack")
        
        user_id = oauth_states.pop(state)
        
        # Exchange code for access token
        token_data = await pinterest_service.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 0)
        
        logger.info(f"✓ Pinterest token exchange successful")
        logger.info(f"Expires in: {expires_in} seconds")
        
        # Get user info
        user_info = await pinterest_service.get_user_info(access_token)
        username = user_info.get("username", "Unknown")
        
        logger.info(f"✓ Pinterest user info retrieved: @{username}")
        
        # Get user's boards
        boards = await pinterest_service.get_boards(access_token)
        
        logger.info(f"✓ Found {len(boards)} Pinterest boards")
        
        # Prepare data for JavaScript
        import json
        user_info_json = json.dumps(user_info)
        boards_json = json.dumps(boards)
        
        # Return HTML that sends data back to the parent window
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pinterest Authorization Complete</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #E60023 0%, #C5001A 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                }}
                .success-icon {{
                    color: #E60023;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Pinterest Connected!</h1>
                <p>You can close this window...</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'PINTEREST_AUTH_SUCCESS',
                        data: {{
                            access_token: '{access_token}',
                            refresh_token: '{refresh_token}',
                            expires_in: {expires_in},
                            user_id: '{user_id}',
                            user_info: {user_info_json},
                            boards: {boards_json}
                        }}
                    }}, '*');
                    setTimeout(() => window.close(), 1000);
                }}
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"Pinterest OAuth callback failed: {str(e)}")
        logger.exception("Full traceback:")
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pinterest Authorization Failed</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #E60023 0%, #C5001A 100%);
                }}
                .container {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 400px;
                }}
                .error-icon {{
                    color: #ef4444;
                    font-size: 48px;
                    margin-bottom: 20px;
                }}
                h1 {{ margin: 0 0 10px 0; color: #1f2937; }}
                p {{ color: #6b7280; margin: 0; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">✕</div>
                <h1>Authorization Failed</h1>
                <p>{str(e)}</p>
            </div>
            <script>
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'PINTEREST_AUTH_ERROR',
                        error: '{str(e)}'
                    }}, '*');
                    setTimeout(() => window.close(), 3000);
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=error_html, status_code=400)


@app.post("/api/auth/pinterest/save-connection")
async def pinterest_save_connection(request: PinterestSaveConnectionRequest):
    """
    Step 3: Save Pinterest connection to database
    """
    try:
        user_id = request.user_id
        access_token = request.access_token
        refresh_token = request.refresh_token
        username = request.username
        
        logger.info(f"Saving Pinterest connection for user {user_id}")
        logger.info(f"Username: @{username}")
        
        # Store tokens in cache (in production, use encrypted database)
        if not hasattr(pinterest_save_connection, 'token_cache'):
            pinterest_save_connection.token_cache = {}
        
        # Prepare account data
        account_data = {
            "user_id": user_id,
            "platform": "pinterest",
            "platform_name": "Pinterest",
            "username": username,
            "followers": 0,
            "posts": 0,
            "status": "active"
        }
        
        logger.info(f"Inserting Pinterest account: {account_data}")
        
        # Insert into ZendBX social_accounts table
        zendbx_url = os.getenv("ZENDBX_API_URL")
        zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
        project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts",
                json=account_data,
                headers={
                    "Authorization": f"Bearer {zendbx_key}",
                    "Content-Type": "application/json"
                }
            )
            
            logger.info(f"ZendBX response status: {response.status_code}")
            
            if response.status_code in [200, 201]:
                account_response = response.json()
                logger.info(f"✓ Pinterest account saved: {account_response}")
                
                account_id = account_response.get("id")
                
                # Store tokens in cache with account_id
                pinterest_save_connection.token_cache[account_id] = {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "username": username,
                    "user_id": user_id
                }
                
                return {
                    "success": True,
                    "accounts": [account_response],
                    "message": "Pinterest account connected successfully!"
                }
            else:
                error_text = response.text
                logger.error(f"ZendBX error: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=error_text)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save Pinterest connection: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pinterest/post")
async def post_to_pinterest(request: PinterestPostRequest):
    """
    Create a Pin on Pinterest
    
    NOTE: Pinterest requires:
    - Image URL must be publicly accessible HTTPS URL
    - User must have boards created
    """
    try:
        account_id = request.account_id
        board_id = request.board_id
        title = request.title
        description = request.description
        link = request.link
        image_url = request.image_url
        alt_text = request.alt_text
        
        # Get tokens from cache
        if not hasattr(pinterest_save_connection, 'token_cache'):
            raise HTTPException(
                status_code=400,
                detail="No Pinterest accounts connected. Please connect your Pinterest account first."
            )
        
        tokens = pinterest_save_connection.token_cache.get(account_id)
        if not tokens:
            raise HTTPException(
                status_code=404,
                detail="Account not found or tokens expired. Please reconnect your Pinterest account."
            )
        
        access_token = tokens['access_token']
        
        logger.info(f"Creating Pinterest pin for account {account_id}")
        logger.info(f"Board ID: {board_id}")
        logger.info(f"Title: {title}")
        
        # Create the pin
        result = await pinterest_service.create_pin(
            access_token=access_token,
            board_id=board_id,
            title=title,
            description=description,
            link=link,
            media_source_url=image_url,
            alt_text=alt_text
        )
        
        logger.info(f"✓ Pin created successfully!")
        logger.info(f"Pin ID: {result.get('id')}")
        
        return {
            "success": True,
            "pin": result,
            "message": "Pin created on Pinterest successfully!"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create Pinterest pin: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))



# ============================================================================
# THREADS OAUTH ENDPOINTS
# ============================================================================

class ThreadsAuthRequest(BaseModel):
    user_id: str

class ThreadsSaveConnectionRequest(BaseModel):
    user_id: str
    access_token: str
    threads_user_id: str
    username: str

class ThreadsPostRequest(BaseModel):
    account_id: str
    text: str
    media_type: str = "TEXT"
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    reply_to_id: Optional[str] = None


@app.post("/api/auth/threads/initiate")
async def threads_initiate_auth(request: ThreadsAuthRequest):
    try:
        state = secrets.token_urlsafe(32)
        oauth_states[state] = request.user_id
        auth_url = threads_service.get_authorization_url(state)
        logger.info(f"Threads OAuth initiated for user {request.user_id}")
        return {"success": True, "auth_url": auth_url, "state": state}
    except Exception as e:
        logger.error(f"Threads auth initiation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/threads/callback")
async def threads_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    from fastapi.responses import HTMLResponse
    try:
        if error:
            return HTMLResponse(content=f'<html><body><h1>Error: {error}</h1><script>if(window.opener){{window.opener.postMessage({{type:"THREADS_AUTH_ERROR",error:"{error}"}},"*");window.close();}}</script></body></html>', status_code=400)
        if not code or not state:
            raise HTTPException(status_code=400, detail="Missing code or state")
        if state not in oauth_states:
            raise HTTPException(status_code=400, detail="Invalid state")
        user_id = oauth_states.pop(state)
        token_data = await threads_service.exchange_code_for_token(code)
        short_lived_token = token_data.get("access_token")
        threads_user_id = token_data.get("user_id")
        long_lived_data = await threads_service.get_long_lived_token(short_lived_token)
        access_token = long_lived_data.get("access_token")
        profile = await threads_service.get_user_profile(access_token, threads_user_id)
        username = profile.get("username", "Unknown")
        import json
        profile_json = json.dumps(profile)
        html = f'<html><body><h1>Threads Connected!</h1><script>if(window.opener){{window.opener.postMessage({{type:"THREADS_AUTH_SUCCESS",data:{{access_token:"{access_token}",user_id:"{user_id}",threads_user_id:"{threads_user_id}",profile:{profile_json}}}}},"*");setTimeout(()=>window.close(),1000);}}</script></body></html>'
        return HTMLResponse(content=html)
    except Exception as e:
        logger.error(f"Threads callback failed: {str(e)}")
        return HTMLResponse(content=f'<html><body><h1>Error: {str(e)}</h1></body></html>', status_code=400)


@app.post("/api/auth/threads/save-connection")
async def threads_save_connection(request: ThreadsSaveConnectionRequest):
    try:
        if not hasattr(threads_save_connection, 'token_cache'):
            threads_save_connection.token_cache = {}
        account_data = {"user_id": request.user_id, "platform": "threads", "platform_name": "Threads", "username": request.username, "followers": 0, "posts": 0, "status": "active"}
        zendbx_url = os.getenv("ZENDBX_API_URL")
        zendbx_key = os.getenv("ZENDBX_SERVICE_KEY")
        project_slug = os.getenv("ZENDBX_PROJECT_SLUG")
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{zendbx_url}/p/{project_slug}/v1/rest/social_accounts", json=account_data, headers={"Authorization": f"Bearer {zendbx_key}", "Content-Type": "application/json"})
            if response.status_code in [200, 201]:
                account_response = response.json()
                account_id = account_response.get("id")
                threads_save_connection.token_cache[account_id] = {"access_token": request.access_token, "threads_user_id": request.threads_user_id, "username": request.username, "user_id": request.user_id}
                return {"success": True, "accounts": [account_response], "message": "Threads connected!"}
            else:
                raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        logger.error(f"Failed to save Threads: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/threads/post")
async def post_to_threads(request: ThreadsPostRequest):
    try:
        if not hasattr(threads_save_connection, 'token_cache'):
            raise HTTPException(status_code=400, detail="No Threads accounts connected")
        tokens = threads_save_connection.token_cache.get(request.account_id)
        if not tokens:
            raise HTTPException(status_code=404, detail="Account not found")
        result = await threads_service.create_thread_post(user_id=tokens['threads_user_id'], access_token=tokens['access_token'], text=request.text, media_type=request.media_type, image_url=request.image_url, video_url=request.video_url, reply_to_id=request.reply_to_id)
        return {"success": True, "thread": result, "message": "Posted to Threads successfully!"}
    except Exception as e:
        logger.error(f"Failed to post to Threads: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# POST SCHEDULER ENDPOINTS
# ============================================================================

class SchedulePostsRequest(BaseModel):
    user_id: str
    posts: List[Dict]


@app.post("/api/schedule-posts")
async def schedule_posts(request: SchedulePostsRequest):
    """
    Schedule multiple posts for automatic publishing
    
    Request body:
    {
        "user_id": "uuid",
        "posts": [
            {
                "post_id": "post-1",
                "date": "2024-07-25",
                "time": "10:00",
                "platforms": ["LinkedIn", "Twitter"],
                "content": {
                    "headline": "...",
                    "hook": "...",
                    "caption": "...",
                    "call_to_action": "...",
                    "hashtags": ["#marketing", "#ai"],
                    "image_prompt": "..."
                }
            }
        ]
    }
    """
    try:
        logger.info("=" * 60)
        logger.info("📅 SCHEDULE POSTS REQUEST")
        logger.info(f"User: {request.user_id}")
        logger.info(f"Posts to schedule: {len(request.posts)}")
        logger.info("=" * 60)
        
        scheduled_ids = []
        
        for post_data in request.posts:
            post_id = await post_scheduler.schedule_post(request.user_id, post_data)
            scheduled_ids.append(post_id)
        
        logger.info(f"✅ Scheduled {len(scheduled_ids)} posts successfully")
        
        return {
            "success": True,
            "scheduled_ids": scheduled_ids,
            "message": f"Successfully scheduled {len(scheduled_ids)} posts"
        }
        
    except Exception as e:
        logger.error(f"Failed to schedule posts: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to schedule posts: {str(e)}"
        )


@app.get("/api/scheduled-posts")
async def get_scheduled_posts(user_id: Optional[str] = None):
    """
    Get all scheduled posts, optionally filtered by user
    """
    try:
        # Get posts from memory (formatted by post_scheduler)
        memory_posts = post_scheduler.get_scheduled_posts(user_id)
        
        # Also fetch directly from database to get all posts
        all_posts = []
        
        if zendbx_service and user_id:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=30.0) as client:
                    # Fetch all scheduled posts from database for this user
                    response = await client.get(
                        f"{zendbx_service.base_url}/scheduled_posts?select=*",
                        headers=zendbx_service.headers
                    )
                    
                    if response.status_code == 200:
                        db_posts = response.json()
                        
                        # Filter and format posts
                        for db_post in db_posts:
                            metadata = db_post.get('metadata', {})
                            
                            # Parse metadata if it's a string
                            if isinstance(metadata, str):
                                import json
                                try:
                                    metadata = json.loads(metadata)
                                except:
                                    metadata = {}
                            
                            # Check if this post belongs to the user
                            post_user_id = db_post.get('user_id') or metadata.get('user_id')
                            if user_id and post_user_id != user_id:
                                continue
                            
                            # Parse scheduled_at
                            scheduled_at = db_post.get('scheduled_at', '')
                            if scheduled_at:
                                try:
                                    from datetime import datetime
                                    if isinstance(scheduled_at, str):
                                        scheduled_dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                                    else:
                                        scheduled_dt = scheduled_at
                                    
                                    date_str = scheduled_dt.strftime('%Y-%m-%d')
                                    time_str = scheduled_dt.strftime('%H:%M')
                                except:
                                    date_str = scheduled_at.split('T')[0] if 'T' in str(scheduled_at) else str(scheduled_at)[:10]
                                    time_str = '10:00'
                            else:
                                date_str = '2026-07-29'
                                time_str = '10:00'
                            
                            # Format post with flattened metadata - MATCH FRONTEND STRUCTURE
                            formatted_post = {
                                'id': db_post.get('id'),
                                'date': date_str,
                                'time': time_str,
                                'platform': db_post.get('platform', 'LinkedIn'),
                                'platforms': [db_post.get('platform', 'LinkedIn')],
                                'status': db_post.get('status', 'scheduled'),
                                'type': 'Image',
                                # FLATTEN metadata fields to top level for frontend
                                'title': metadata.get('headline') or metadata.get('title') or metadata.get('hook') or 'Untitled Post',
                                'caption': metadata.get('caption') or metadata.get('text') or '',
                                'hook': metadata.get('hook') or '',
                                'call_to_action': metadata.get('call_to_action') or 'N/A',
                                'hashtags': metadata.get('hashtags', []) if isinstance(metadata.get('hashtags'), list) else [],
                                'image_prompt': metadata.get('image_prompt') or '',
                                'image_url': metadata.get('image_url') or '',
                                'body': metadata.get('caption') or metadata.get('text') or '',
                                'scheduled_datetime': scheduled_at,
                                'posted_at': db_post.get('posted_at'),
                                'campaign_id': metadata.get('campaign_id'),
                                'calendar_post_id': metadata.get('calendar_post_id')
                            }
                            
                            all_posts.append(formatted_post)
                            
                        logger.info(f"✅ Loaded {len(all_posts)} posts from database for user {user_id}")
                        
            except Exception as db_error:
                logger.warning(f"Failed to fetch from database, using memory only: {db_error}")
                # Fall back to memory posts
                all_posts = memory_posts
        else:
            all_posts = memory_posts
        
        # If we got DB posts, use those; otherwise use memory
        if len(all_posts) == 0:
            all_posts = memory_posts
        
        logger.info(f"📦 Returning {len(all_posts)} posts to frontend")
        if len(all_posts) > 0:
            logger.info(f"📋 Sample post keys: {list(all_posts[0].keys())}")
            logger.info(f"   title: {all_posts[0].get('title')}")
            logger.info(f"   caption: {all_posts[0].get('caption')[:50] if all_posts[0].get('caption') else 'None'}...")
        
        return {
            "success": True,
            "posts": all_posts,
            "count": len(all_posts)
        }
        
    except Exception as e:
        logger.error(f"Failed to get scheduled posts: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get scheduled posts: {str(e)}"
        )


@app.post("/api/publish-post")
async def publish_post(request: dict):
    """
    Publish a post to connected social media accounts
    
    Request body:
    {
        "user_id": "uuid",
        "post_id": "post-id",
        "platforms": ["LinkedIn", "Twitter", "Facebook", "Instagram"],
        "content": {
            "text": "Main post caption/body",
            "title": "Optional title",
            "hook": "Optional hook",
            "call_to_action": "Optional CTA",
            "hashtags": ["#tag1", "#tag2"]
        },
        "image_url": "optional-image-url"
    }
    
    Response:
    {
        "success": true,
        "results": {
            "LinkedIn": {"success": true, "post_id": "..."},
            "Twitter": {"success": false, "error": "..."}
        }
    }
    """
    try:
        logger.info("=" * 60)
        logger.info("📤 PUBLISH POST REQUEST")
        logger.info("=" * 60)
        
        user_id = request.get('user_id')
        post_id = request.get('post_id')
        platforms = request.get('platforms', [])
        content = request.get('content', {})
        image_url = request.get('image_url')
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if not platforms:
            raise HTTPException(status_code=400, detail="At least one platform is required")
        
        if not content or not content.get('text'):
            raise HTTPException(status_code=400, detail="content.text is required")
        
        # Generate image if image_prompt is provided
        generated_image_url = image_url
        generated_image_bytes = None
        image_prompt = content.get('image_prompt')
        
        if image_prompt and not generated_image_url:
            logger.info(f"🎨 Generating image from prompt: {image_prompt}")
            try:
                image_result = await image_generation_service.generate_image(
                    prompt=image_prompt,
                    user_id=user_id,
                    campaign_id=post_id
                )
                
                if image_result.get('status') == 'completed':
                    generated_image_url = image_result.get('public_image_url') or image_result.get('image_url')
                    generated_image_bytes = image_result.get('image_bytes')  # Get the raw bytes
                    logger.info(f"✅ Image generated: {generated_image_url}")
                    logger.info(f"✅ Image bytes available: {len(generated_image_bytes) if generated_image_bytes else 0} bytes")
                else:
                    logger.warning(f"⚠️ Image generation failed: {image_result.get('message')}")
            except Exception as img_error:
                logger.error(f"❌ Image generation error: {str(img_error)}")
                # Continue without image
        
        # Get user's connected social accounts from ZenDBX
        logger.info(f"Fetching social accounts for user {user_id}...")
        accounts_response = await zendbx_service.get_user_social_accounts(user_id)
        
        if not accounts_response or len(accounts_response) == 0:
            raise HTTPException(
                status_code=400,
                detail="No social media accounts connected. Please connect accounts first."
            )
        
        logger.info(f"Found {len(accounts_response)} connected accounts")
        
        # Format post content
        post_text = content.get('text', '')
        
        # Add hook if present
        if content.get('hook'):
            post_text = f"{content.get('hook')}\n\n{post_text}"
        
        # Add call to action if present
        if content.get('call_to_action'):
            post_text = f"{post_text}\n\n{content.get('call_to_action')}"
        
        # Add hashtags if present
        if content.get('hashtags') and len(content.get('hashtags')) > 0:
            hashtags = ' '.join(content.get('hashtags'))
            post_text = f"{post_text}\n\n{hashtags}"
        
        # Use generated image if available
        if generated_image_url:
            image_url = generated_image_url
        
        image_bytes = generated_image_bytes  # Use the bytes we already have
        
        # Store results for each platform
        results = {}
        
        # Publish to each requested platform
        for platform in platforms:
            platform_lower = platform.lower()
            logger.info(f"📱 Publishing to {platform}...")
            
            try:
                # Find matching account
                account = None
                for acc in accounts_response:
                    if acc.get('platform', '').lower() == platform_lower:
                        account = acc
                        break
                
                if not account:
                    results[platform] = {
                        "success": False,
                        "error": f"No connected {platform} account found"
                    }
                    continue
                
                # Get account credentials - try socials table format first, then old format
                account_id = account.get('id')
                access_token = account.get('access_token')  # New socials table has this directly
                account_data = {}
                
                if access_token:
                    # New socials table format - token is directly in the row
                    logger.info(f"✅ Found token directly in account record (socials table)")
                    account_data = {
                        'access_token': access_token,
                        'account_type': 'profile',  # Default, can enhance later
                        'company_id': account.get('account_id') if account.get('account_name') != account.get('account_id') else None
                    }
                elif account_id in global_token_storage:
                    # Fallback to global memory storage
                    account_data = global_token_storage[account_id]
                    access_token = account_data.get('access_token')
                    logger.info(f"✅ Found token in GLOBAL memory for account {account_id}")
                elif account.get('account_data'):
                    # Fallback to old account_data column if it exists
                    account_data = account.get('account_data', {})
                    access_token = account_data.get('access_token')
                    logger.info(f"✅ Found token in database account_data for account {account_id}")
                else:
                    logger.error(f"❌ No token found for account {account_id}")
                    logger.error(f"   Account keys: {list(account.keys())}")
                    logger.error(f"   Global storage keys: {list(global_token_storage.keys())}")
                    results[platform] = {
                        "success": False,
                        "error": f"{platform} account has no stored credentials. Please reconnect your account."
                    }
                    continue
                
                if not access_token:
                    results[platform] = {
                        "success": False,
                        "error": f"{platform} account missing access token"
                    }
                    continue
                
                # Publish based on platform
                if platform_lower == 'linkedin':
                    # LinkedIn post
                    account_type = account_data.get('account_type', 'profile')
                    
                    if account_type == 'profile':
                        response = await linkedin_service.post_to_profile(
                            access_token=access_token,
                            content=post_text,
                            image_url=image_url,
                            image_bytes=image_bytes  # Pass the bytes directly
                        )
                    else:
                        company_id = account_data.get('company_id')
                        response = await linkedin_service.post_to_company_page(
                            access_token=access_token,
                            company_id=company_id,
                            content=post_text,
                            image_url=image_url,
                            image_bytes=image_bytes  # Pass the bytes directly
                        )
                    
                    results[platform] = {
                        "success": True,
                        "post_id": response.get('id'),
                        "message": "Published to LinkedIn successfully"
                    }
                    logger.info(f"✅ LinkedIn: Published successfully")
                
                elif platform_lower == 'twitter' or platform_lower == 'x':
                    # Twitter post
                    oauth_token_secret = account_data.get('oauth_token_secret')
                    
                    if not oauth_token_secret:
                        results[platform] = {
                            "success": False,
                            "error": "Twitter account missing oauth_token_secret"
                        }
                        continue
                    
                    # Twitter has 280 character limit
                    tweet_text = post_text[:280] if len(post_text) > 280 else post_text
                    
                    response = await twitter_service.post_tweet(
                        oauth_token=access_token,
                        oauth_token_secret=oauth_token_secret,
                        text=tweet_text
                    )
                    
                    results[platform] = {
                        "success": True,
                        "post_id": response.get('data', {}).get('id'),
                        "message": "Published to Twitter successfully"
                    }
                    logger.info(f"✅ Twitter: Published successfully")
                
                elif platform_lower == 'facebook':
                    # Facebook post
                    account_type = account_data.get('account_type', 'page')
                    
                    if account_type == 'page':
                        page_id = account_data.get('page_id')
                        page_access_token = account_data.get('page_access_token', access_token)
                        
                        response = await facebook_service.post_to_page(
                            page_access_token=page_access_token,
                            page_id=page_id,
                            message=post_text,
                            link=image_url
                        )
                    else:
                        response = await facebook_service.post_to_profile(
                            access_token=access_token,
                            message=post_text
                        )
                    
                    results[platform] = {
                        "success": True,
                        "post_id": response.get('id'),
                        "message": "Published to Facebook successfully"
                    }
                    logger.info(f"✅ Facebook: Published successfully")
                
                elif platform_lower == 'instagram':
                    # Instagram Business Account ID is stored in account_id (socials table)
                    instagram_account_id = account.get('account_id') or account_data.get('instagram_account_id')

                    if not instagram_account_id:
                        results[platform] = {
                            "success": False,
                            "error": "Instagram account ID not found. Reconnect your Instagram account."
                        }
                        continue

                    if not image_url and not image_bytes:
                        results[platform] = {
                            "success": False,
                            "error": "Instagram requires an image. Add image_prompt or image_url to the post."
                        }
                        continue

                    from services.post_scheduler import ensure_public_image_url
                    instagram_image_url = await ensure_public_image_url(
                        image_url=image_url,
                        image_bytes=image_bytes,
                        filename_hint=f"ig-{post_id or 'manual'}",
                    )

                    if not instagram_image_url:
                        results[platform] = {
                            "success": False,
                            "error": "Could not prepare a public image URL for Instagram"
                        }
                        continue

                    response = await instagram_service.post_to_instagram(
                        instagram_account_id=instagram_account_id,
                        access_token=access_token,
                        image_url=instagram_image_url,
                        caption=post_text
                    )
                    
                    results[platform] = {
                        "success": True,
                        "post_id": response.get('id'),
                        "message": "Published to Instagram successfully"
                    }
                    logger.info(f"✅ Instagram: Published successfully")
                
                else:
                    results[platform] = {
                        "success": False,
                        "error": f"Platform {platform} not supported yet"
                    }
            
            except Exception as platform_error:
                logger.error(f"❌ {platform} publish failed: {str(platform_error)}")
                results[platform] = {
                    "success": False,
                    "error": str(platform_error)
                }
        
        # Check if any platforms succeeded
        success_count = sum(1 for r in results.values() if r.get('success'))
        overall_success = success_count > 0
        
        logger.info("=" * 60)
        logger.info(f"✅ Published to {success_count}/{len(platforms)} platforms")
        logger.info("=" * 60)
        
        return {
            "success": overall_success,
            "results": results,
            "message": f"Published to {success_count} out of {len(platforms)} platforms"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Publish post failed: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to publish post: {str(e)}"
        )



        logger.error(f"Failed to get scheduled posts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get scheduled posts: {str(e)}"
        )


@app.delete("/api/scheduled-posts/{post_id}")
async def cancel_scheduled_post(post_id: str):
    """
    Cancel a scheduled post
    """
    try:
        success = post_scheduler.cancel_post(post_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Post not found or already published"
            )
        
        return {
            "success": True,
            "message": "Post cancelled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel post: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel post: {str(e)}"
        )


@app.get("/api/scheduler/stats")
async def get_scheduler_stats():
    """
    Get scheduler statistics
    """
    try:
        stats = post_scheduler.get_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to get scheduler stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}"
        )


@app.post("/api/scheduler/start")
async def start_scheduler_endpoint():
    """
    Start the background post scheduler manually
    """
    try:
        if post_scheduler.is_running:
            return {
                "success": False,
                "message": "Scheduler is already running"
            }
        
        # Start scheduler in background with configured interval
        import asyncio
        scheduler_interval = int(os.getenv("SCHEDULER_CHECK_INTERVAL", "60"))
        asyncio.create_task(post_scheduler.start_scheduler(zendbx_service, interval_seconds=scheduler_interval))
        
        logger.info(f"✅ Scheduler started manually - checking every {scheduler_interval} seconds")
        
        return {
            "success": True,
            "message": f"Scheduler started successfully (checking every {scheduler_interval}s)"
        }
        
    except Exception as e:
        logger.error(f"Failed to start scheduler: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start scheduler: {str(e)}"
        )


@app.post("/api/scheduler/trigger")
async def trigger_scheduler_check():
    """
    Manually trigger a single scheduler check cycle
    This will check for and publish any posts that are due NOW
    """
    try:
        logger.info("🔄 Manual scheduler trigger requested")
        
        # Run a single check cycle
        await post_scheduler.check_and_post(zendbx_service)
        
        # Get stats
        stats = post_scheduler.get_stats()
        
        logger.info("✅ Manual scheduler check completed")
        
        return {
            "success": True,
            "message": "Scheduler check completed",
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger scheduler: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger scheduler: {str(e)}"
        )


@app.post("/api/scheduler/stop")
async def stop_scheduler():
    """
    Stop the background post scheduler
    """
    try:
        post_scheduler.stop_scheduler()
        
        return {
            "success": True,
            "message": "Scheduler stopped successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to stop scheduler: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop scheduler: {str(e)}"
        )


@app.on_event("shutdown")
async def shutdown_event():
    """
    Stop the scheduler when the server shuts down
    """
    logger.info("=" * 60)
    logger.info("🛑 ZENPOST BACKEND SHUTTING DOWN")
    logger.info("=" * 60)
    
    post_scheduler.stop_scheduler()
    
    logger.info("✅ Post scheduler stopped")
    logger.info("=" * 60)


# ============================================================
# SUBSCRIPTION & FEATURE GATING ENDPOINTS
# ============================================================

from services.subscription_service import subscription_service

@app.get("/api/subscription/plan/{user_id}")
async def get_user_plan(user_id: str):
    """Get user's subscription plan with features"""
    try:
        plan = await subscription_service.get_user_plan(user_id)
        return {
            "success": True,
            "plan": plan
        }
    except Exception as e:
        logger.error(f"Failed to get user plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/subscription/usage/{user_id}")
async def get_user_usage(user_id: str):
    """Get user's usage statistics"""
    try:
        usage = await subscription_service.get_user_usage(user_id)
        return {
            "success": True,
            "usage": usage
        }
    except Exception as e:
        logger.error(f"Failed to get user usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/subscription/summary/{user_id}")
async def get_usage_summary(user_id: str):
    """Get complete usage summary with limits and progress"""
    try:
        summary = await subscription_service.get_usage_summary(user_id)
        return {
            "success": True,
            **summary
        }
    except Exception as e:
        logger.error(f"Failed to get usage summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/subscription/check-feature")
async def check_feature(request: dict):
    """
    Check if user can access a feature
    
    Request: {
        "user_id": "uuid",
        "feature": "website_analysis"
    }
    """
    try:
        user_id = request.get("user_id")
        feature = request.get("feature")
        
        if not user_id or not feature:
            raise HTTPException(status_code=400, detail="user_id and feature are required")
        
        allowed, info = await subscription_service.check_feature_limit(user_id, feature, increment=0)
        
        return {
            "success": True,
            "allowed": allowed,
            **info
        }
    except Exception as e:
        logger.error(f"Failed to check feature: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/subscription/increment-usage")
async def increment_usage(request: dict):
    """
    Increment usage counter for a feature
    
    Request: {
        "user_id": "uuid",
        "feature": "ai_captions",
        "amount": 1
    }
    """
    try:
        user_id = request.get("user_id")
        feature = request.get("feature")
        amount = request.get("amount", 1)
        
        if not user_id or not feature:
            raise HTTPException(status_code=400, detail="user_id and feature are required")
        
        success = await subscription_service.increment_usage(user_id, feature, amount)
        
        return {
            "success": success,
            "message": f"Usage incremented for {feature}"
        }
    except Exception as e:
        logger.error(f"Failed to increment usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ======================
# BRAND MANAGEMENT
# ======================

from fastapi import File, UploadFile, Form
import shutil
from pathlib import Path

# Create uploads directory if not exists
UPLOAD_DIR = Path("uploads/brand_logos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class BrandRequest(BaseModel):
    brand_name: str
    description: Optional[str] = None
    voice_tone: Optional[str] = None
    logo_url: Optional[str] = None
    user_id: str

@app.post("/api/upload-brand-logo")
async def upload_brand_logo(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """
    Upload brand logo
    """
    try:
        # Validate file type
        allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only PNG, JPG, and SVG files are allowed")
        
        # Validate file size (5MB max)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{user_id}_{uuid.uuid4()}.{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Return public URL (relative path)
        logo_url = f"/uploads/brand_logos/{unique_filename}"
        
        logger.info(f"Logo uploaded successfully: {logo_url}")
        
        return {
            "success": True,
            "logo_url": logo_url
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logo upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create-brand")
async def create_brand(request: BrandRequest):
    """
    Create brand identity
    """
    try:
        # Check brand limit for user
        allowed, info = await subscription_service.check_feature_limit(
            request.user_id,
            'brands',
            increment=1
        )
        
        if not allowed:
            raise HTTPException(
                status_code=403,
                detail={
                    "success": False,
                    "code": "PLAN_LIMIT_REACHED",
                    "feature": "brands",
                    "message": f"You've reached your brand limit ({info['limit']}). Upgrade to Pro for unlimited brands.",
                    "upgrade_required": True,
                    "current_usage": info['current_usage'],
                    "limit": info['limit']
                }
            )
        
        brand_data = {
            "id": str(uuid.uuid4()),
            "user_id": request.user_id,
            "brand_name": request.brand_name,
            "description": request.description,
            "voice_tone": request.voice_tone,
            "logo_url": request.logo_url,
            "created_at": datetime.now(pytz.UTC).isoformat(),
            "is_active": True
        }
        
        # Store in database
        response = await zendbx_service.insert_data("brands", brand_data)
        
        if not response or response.get('error'):
            raise HTTPException(status_code=500, detail="Failed to create brand")
        
        # Increment brand usage count
        await subscription_service.increment_usage(request.user_id, 'brands', 1)
        
        logger.info(f"Brand created: {brand_data['id']}")
        
        return {
            "success": True,
            "brand_id": brand_data['id'],
            "message": "Brand created successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create brand error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/brands/{user_id}")
async def get_user_brands(user_id: str):
    """
    Get all brands for a user
    """
    try:
        response = await zendbx_service.query_data(
            "brands",
            filters={"user_id": user_id, "is_active": True}
        )
        
        brands = response.get('data', [])
        
        return {
            "success": True,
            "brands": brands
        }
    
    except Exception as e:
        logger.error(f"Get brands error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files for serving uploaded logos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

"""
Step 14: ZendBX Knowledge Base Storage
Stores all analysis data in structured format
"""
import os
import httpx
from typing import Dict, Optional
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)


class ZenDBXService:
    """Service for storing and retrieving analysis data from ZendBX"""
    
    def __init__(self):
        self.api_url = os.getenv("ZENDBX_API_URL", "https://api.zendbx.in")
        self.anon_key = os.getenv("ZENDBX_ANON_KEY")
        self.project_slug = os.getenv("ZENDBX_PROJECT_SLUG", "zen-smoking-post")
        
        if not self.anon_key:
            raise ValueError("ZENDBX_ANON_KEY environment variable not set")
        
        self.base_url = f"{self.api_url}/p/{self.project_slug}/v1/rest"
        self.headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.anon_key}",
            "Content-Type": "application/json",
            "x-project-slug": self.project_slug
        }
        
        logger.info(f"ZendBX Service initialized - Base URL: {self.base_url}")
        logger.info(f"Project Slug: {self.project_slug}")
    
    async def store_analysis(
        self, 
        user_id: str, 
        website_id: Optional[str],
        analysis_data: Dict
    ) -> str:
        """
        Store complete analysis in ZendBX
        
        Returns:
            analysis_id: UUID of the stored analysis
        """
        try:
            analysis_id = str(uuid.uuid4())
            
            # Prepare analysis record - single object, not array
            analysis_record = {
                "id": analysis_id,
                "user_id": user_id,
                "website_id": website_id,
                "business_name": analysis_data.get('business', {}).get('business_name'),
                "website_url": analysis_data.get('business', {}).get('website'),
                "industry": analysis_data.get('brand', {}).get('industry'),
                "analysis_date": datetime.utcnow().isoformat(),
                "seo_score": analysis_data.get('seo', {}).get('score', 0),
                "status": "completed",
                
                # Store full analysis as JSONB
                "business_data": analysis_data.get('business', {}),
                "brand_data": analysis_data.get('brand', {}),
                "audience_data": analysis_data.get('audience', {}),
                "seo_data": analysis_data.get('seo', {}),
                "competitors_data": analysis_data.get('competitors', []),
                "marketing_strategy": analysis_data.get('marketing_strategy', {}),
                "campaign_calendar": analysis_data.get('campaign_calendar', []),
                "content_ideas": analysis_data.get('content', {}),
                "recommendations": analysis_data.get('recommendations', {}),
            }
            
            # Insert analysis using correct REST API format
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/website_analysis",
                    headers=self.headers,
                    json=analysis_record,  # Single object, not array
                    timeout=30.0
                )
                
                if response.status_code not in [200, 201]:
                    error_detail = response.text
                    logger.error(f"Failed to store analysis: {response.status_code} - {error_detail}")
                    raise Exception(f"Failed to store analysis: {error_detail}")
            
            # Update website record if website_id provided
            if website_id:
                try:
                    await self._update_website_analysis_status(website_id, analysis_id)
                except Exception as e:
                    logger.warning(f"Could not update website record: {str(e)}")
            
            logger.info(f"Analysis stored successfully: {analysis_id}")
            return analysis_id
        
        except Exception as e:
            logger.error(f"Error storing analysis: {str(e)}")
            raise
    
    async def get_analysis(self, analysis_id: str, user_id: str) -> Optional[Dict]:
        """Retrieve analysis by ID and reconstruct full analysis object"""
        try:
            async with httpx.AsyncClient() as client:
                # Fetch all and filter client-side (ZendBX query filters don't work)
                response = await client.get(
                    f"{self.base_url}/website_analysis",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Filter client-side
                    all_analyses = data if isinstance(data, list) else []
                    found = next((a for a in all_analyses if a.get('id') == analysis_id and a.get('user_id') == user_id), None)
                    
                    if found:
                        # Reconstruct full analysis object
                        return self._reconstruct_analysis_object(found)
                    
                return None
        
        except Exception as e:
            logger.error(f"Error retrieving analysis: {str(e)}")
            return None
    
    def _reconstruct_analysis_object(self, db_record: Dict) -> Dict:
        """Reconstruct full analysis object from database record"""
        return {
            'id': db_record.get('id'),
            'user_id': db_record.get('user_id'),
            'website_id': db_record.get('website_id'),
            'business': db_record.get('business_data', {}),
            'brand': db_record.get('brand_data', {}),
            'audience': db_record.get('audience_data', {}),
            'seo': db_record.get('seo_data', {}),
            'competitors': db_record.get('competitors_data', []),
            'marketing_strategy': db_record.get('marketing_strategy', {}),
            'campaign_calendar': db_record.get('campaign_calendar', []),
            'content': db_record.get('content_ideas', {}),
            'recommendations': db_record.get('recommendations', {}),
            'metadata': {
                'user_id': db_record.get('user_id'),
                'website_id': db_record.get('website_id'),
                'analyzed_at': db_record.get('analysis_date'),
                'business_name': db_record.get('business_name'),
                'industry': db_record.get('industry')
            }
        }
    
    async def get_website_latest_analysis(self, website_id: str, user_id: str) -> Optional[Dict]:
        """Get the latest analysis for a website"""
        try:
            async with httpx.AsyncClient() as client:
                # Fetch all and filter client-side
                response = await client.get(
                    f"{self.base_url}/website_analysis",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_analyses = data if isinstance(data, list) else []
                    
                    # Filter for this website and user
                    website_analyses = [
                        a for a in all_analyses 
                        if a.get('website_id') == website_id and a.get('user_id') == user_id
                    ]
                    
                    # Sort by analysis_date and get latest
                    if website_analyses:
                        sorted_analyses = sorted(
                            website_analyses, 
                            key=lambda x: x.get('analysis_date', ''), 
                            reverse=True
                        )
                        latest = sorted_analyses[0]
                        # Reconstruct full analysis object
                        return self._reconstruct_analysis_object(latest)
                    
                    return None
                
                return None
        
        except Exception as e:
            logger.error(f"Error retrieving website analysis: {str(e)}")
            return None
    
    async def _update_website_analysis_status(self, website_id: str, analysis_id: str):
        """Update website record with latest analysis info"""
        try:
            async with httpx.AsyncClient() as client:
                # Fetch all websites first
                get_response = await client.get(
                    f"{self.base_url}/websites",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if get_response.status_code == 200:
                    websites = get_response.json()
                    all_websites = websites if isinstance(websites, list) else []
                    target_website = next((w for w in all_websites if w.get('id') == website_id), None)
                    
                    if target_website:
                        # Update the website
                        update_data = {
                            **target_website,
                            "last_analysis_id": analysis_id,
                            "last_analyzed_at": datetime.utcnow().isoformat(),
                            "updated_at": datetime.utcnow().isoformat()
                        }
                        
                        # Try to update
                        update_response = await client.put(
                            f"{self.base_url}/websites",
                            headers=self.headers,
                            json=update_data,
                            timeout=30.0
                        )
                        
                        if update_response.status_code not in [200, 204]:
                            logger.warning(f"Could not update website: {update_response.status_code}")
        
        except Exception as e:
            logger.warning(f"Error updating website: {str(e)}")

    
    async def store_marketing_intelligence(
        self,
        user_id: str,
        website_id: Optional[str],
        analysis_id: str,
        intelligence_data: Dict
    ) -> str:
        """
        Store marketing intelligence in the marketing_intelligence table
        
        Returns:
            intelligence_id: UUID of stored intelligence
        """
        try:
            intelligence_id = str(uuid.uuid4())
            
            metadata = intelligence_data.get('metadata', {})
            
            record = {
                "id": intelligence_id,
                "user_id": user_id,
                "website_id": website_id,
                "analysis_id": analysis_id,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                
                # Store full intelligence data as JSONB
                "business_intelligence": intelligence_data.get('business_intelligence', {}),
                "competitor_intelligence": intelligence_data.get('competitor_intelligence', {}),
                "market_intelligence": intelligence_data.get('market_intelligence', {}),
                "swot_analysis": intelligence_data.get('swot_analysis', {}),
                "audience_personas": intelligence_data.get('audience_personas', []),
                "positioning": intelligence_data.get('positioning', {}),
                "marketing_strategy": intelligence_data.get('marketing_strategy', {}),
                "campaign_blueprints": intelligence_data.get('campaign_blueprints', []),
                
                # Store business_name, industry, target_market in metadata JSONB
                "metadata": {
                    "business_name": metadata.get('business_name'),
                    "industry": metadata.get('industry'),
                    "target_market": metadata.get('target_market'),
                    "generated_at": metadata.get('generated_at'),
                    "version": metadata.get('version', '1.0')
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/marketing_intelligence",
                    headers=self.headers,
                    json=record,
                    timeout=60.0  # Increased from 30 to 60 seconds
                )
                
                if response.status_code not in [200, 201]:
                    error_detail = response.text
                    logger.error(f"Failed to store marketing intelligence: {response.status_code}")
                    logger.error(f"Error details: {error_detail}")
                    logger.error(f"Request payload keys: {list(record.keys())}")
                    raise Exception(f"Failed to store marketing intelligence: {error_detail}")
            
            logger.info(f"✅ Marketing intelligence stored: {intelligence_id}")
            return intelligence_id
            
        except Exception as e:
            logger.error(f"Error storing marketing intelligence: {str(e)}")
            logger.exception("Full traceback:")
            raise
        except Exception as e:
            logger.error(f"Error storing marketing intelligence: {str(e)}")
            raise
    
    async def get_marketing_intelligence(
        self,
        intelligence_id: str,
        user_id: str
    ) -> Optional[Dict]:
        """
        Retrieve marketing intelligence by ID
        
        Args:
            intelligence_id: UUID of marketing intelligence
            user_id: User ID for security check
        
        Returns:
            Marketing intelligence data or None if not found
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/marketing_intelligence",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_intelligence = data if isinstance(data, list) else []
                    
                    # Find matching record
                    found = next(
                        (mi for mi in all_intelligence 
                         if mi.get('id') == intelligence_id and mi.get('user_id') == user_id),
                        None
                    )
                    
                    if found:
                        logger.info(f"✅ Retrieved marketing intelligence: {intelligence_id}")
                        return found
                    else:
                        logger.warning(f"Marketing intelligence not found: {intelligence_id}")
                        return None
                else:
                    logger.error(f"Failed to fetch marketing intelligence: {response.status_code}")
                    return None
        
        except Exception as e:
            logger.error(f"Error retrieving marketing intelligence: {str(e)}")
            logger.exception("Full traceback:")
            return None
    
    async def store_generated_campaign(
        self,
        user_id: str,
        campaign_data: Dict,
        marketing_intelligence_id: Optional[str] = None
    ) -> str:
        """
        Store generated campaign in the generated_campaigns table
        
        Returns:
            campaign_id: UUID of stored campaign
        """
        try:
            campaign_id = str(uuid.uuid4())
            
            record = {
                "id": campaign_id,
                "user_id": user_id,
                "campaign_name": campaign_data.get('campaign_name'),
                "campaign_goal": campaign_data.get('campaign_goal'),
                "duration_days": campaign_data.get('duration_days'),
                "platforms": campaign_data.get('platforms', []),
                "status": "generated",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                
                # Store campaign details as JSONB (including marketing_intelligence_id if needed)
                "campaign_data": {
                    **campaign_data,
                    "marketing_intelligence_id": marketing_intelligence_id
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/generated_campaigns",
                    headers=self.headers,
                    json=record,
                    timeout=30.0
                )
                
                if response.status_code not in [200, 201]:
                    logger.error(f"Failed to store campaign: {response.status_code} - {response.text}")
                    raise Exception(f"Failed to store campaign")
            
            logger.info(f"✅ Campaign stored: {campaign_id}")
            return campaign_id
            
        except Exception as e:
            logger.error(f"Error storing campaign: {str(e)}")
            raise
    
    async def store_calendar_posts(
        self,
        user_id: str,
        campaign_id: str,
        posts: list
    ) -> list:
        """
        Store multiple calendar posts in the calendar_posts table
        
        Returns:
            List of post_ids
        """
        try:
            post_ids = []
            
            async with httpx.AsyncClient() as client:
                for post in posts:
                    post_id = str(uuid.uuid4())
                    
                    # Map ZenPost fields to ZenDBX table columns
                    record = {
                        "id": post_id,
                        "campaign_id": campaign_id,
                        "day_number": post.get('day', 1),
                        "scheduled_date": post.get('date'),  # Maps to scheduled_date
                        "title": post.get('headline') or post.get('title', ''),  # Maps to title
                        "content_topic": post.get('content_topic', ''),
                        "content_type": post.get('post_type', 'post'),  # Maps to content_type
                        "content_pillar": post.get('content_pillar', ''),
                        "platforms": post.get('platforms', [post.get('platform', 'LinkedIn')]),  # Convert to array
                        "post_brief": post.get('caption') or post.get('post_brief', ''),  # Maps to post_brief
                        "hashtags": post.get('hashtags', []),
                        "call_to_action": post.get('call_to_action', ''),
                        "status": "draft",
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }
                    
                    response = await client.post(
                        f"{self.base_url}/calendar_posts",
                        headers=self.headers,
                        json=record,
                        timeout=30.0
                    )
                    
                    if response.status_code in [200, 201]:
                        post_ids.append(post_id)
                        logger.info(f"✅ Stored calendar post: {post_id}")
                    else:
                        error_detail = response.text
                        logger.error(f"Failed to store calendar post: {response.status_code}")
                        logger.error(f"Error details: {error_detail}")
                        logger.warning(f"Post data keys: {list(post.keys())}")
            
            logger.info(f"✅ Stored {len(post_ids)}/{len(posts)} calendar posts")
            return post_ids
            
        except Exception as e:
            logger.error(f"Error storing calendar posts: {str(e)}")
            raise
    
    async def store_scheduled_post(
        self,
        user_id: str,
        post_data: Dict
    ) -> str:
        """
        Store a scheduled post in the scheduled_posts table
        
        Returns:
            post_id: UUID of stored post
        """
        try:
            post_id = str(uuid.uuid4())
            
            record = {
                "id": post_id,
                "user_id": user_id,
                "campaign_id": post_data.get('campaign_id'),
                "calendar_post_id": post_data.get('calendar_post_id'),
                "scheduled_datetime": post_data.get('scheduled_datetime'),
                "platforms": post_data.get('platforms', []),
                "content": post_data.get('content', {}),
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/scheduled_posts",
                    headers=self.headers,
                    json=record,
                    timeout=30.0
                )
                
                if response.status_code not in [200, 201]:
                    logger.error(f"Failed to store scheduled post: {response.status_code} - {response.text}")
                    raise Exception(f"Failed to store scheduled post")
            
            logger.info(f"✅ Scheduled post stored: {post_id}")
            return post_id
            
        except Exception as e:
            logger.error(f"Error storing scheduled post: {str(e)}")
            raise
    
    async def get_scheduled_posts(
        self,
        user_id: str,
        status: Optional[str] = None
    ) -> list:
        """
        Get scheduled posts from database
        
        Args:
            user_id: User ID to filter posts
            status: Optional status filter ('pending', 'posted', 'failed')
        
        Returns:
            List of scheduled posts
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/scheduled_posts",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_posts = data if isinstance(data, list) else []
                    
                    # Filter by user_id
                    user_posts = [p for p in all_posts if p.get('user_id') == user_id]
                    
                    # Filter by status if provided
                    if status:
                        user_posts = [p for p in user_posts if p.get('status') == status]
                    
                    return user_posts
                
                return []
        
        except Exception as e:
            logger.error(f"Error retrieving scheduled posts: {str(e)}")
            return []

    async def get_user_social_accounts(
        self,
        user_id: str
    ) -> list:
        """
        Get all connected social media accounts for a user from socials table
        
        Args:
            user_id: User ID to fetch accounts for
        
        Returns:
            List of connected social media accounts with tokens
        """
        try:
            async with httpx.AsyncClient() as client:
                # Fetch from socials table only
                response = await client.get(
                    f"{self.base_url}/socials",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_accounts = data if isinstance(data, list) else []
                    
                    # Filter by user_id and is_active=true
                    user_accounts = [
                        acc for acc in all_accounts 
                        if acc.get('user_id') == user_id and acc.get('is_active') == True
                    ]
                    
                    logger.info(f"Found {len(user_accounts)} active accounts in socials table for user {user_id}")
                    return user_accounts
                
                logger.warning(f"Failed to fetch social accounts: {response.status_code}")
                return []
        
        except Exception as e:
            logger.error(f"Error retrieving social accounts: {str(e)}")
            return []
    
    async def store_token_usage(self, usage_record: Dict) -> str:
        """
        Store token usage record in token_usage table
        
        Args:
            usage_record: Token usage data
        
        Returns:
            usage_id: UUID of stored record
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/token_usage",
                    headers=self.headers,
                    json=usage_record,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Token usage stored: {usage_record['id']}")
                    return usage_record['id']
                else:
                    logger.error(f"Failed to store token usage: {response.status_code} - {response.text}")
                    return None
        
        except Exception as e:
            logger.error(f"Error storing token usage: {str(e)}")
            return None
    
    async def get_token_usage(self, user_id: str, days: int = 30) -> list:
        """
        Get token usage records for a user
        
        Args:
            user_id: User ID
            days: Number of days to look back
        
        Returns:
            List of token usage records
        """
        try:
            from datetime import datetime, timedelta
            cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/token_usage",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_records = data if isinstance(data, list) else []
                    
                    # Filter by user_id and date
                    user_records = [
                        r for r in all_records
                        if r.get('user_id') == user_id and r.get('created_at', '') >= cutoff_date
                    ]
                    
                    return user_records
                
                return []
        
        except Exception as e:
            logger.error(f"Error retrieving token usage: {str(e)}")
            return []
    
    async def get_token_usage_since(self, user_id: str, since_date: str) -> list:
        """
        Get token usage records since a specific date
        
        Args:
            user_id: User ID
            since_date: ISO format date string
        
        Returns:
            List of token usage records
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/token_usage",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_records = data if isinstance(data, list) else []
                    
                    # Filter by user_id and date
                    user_records = [
                        r for r in all_records
                        if r.get('user_id') == user_id and r.get('created_at', '') >= since_date
                    ]
                    
                    return user_records
                
                return []
        
        except Exception as e:
            logger.error(f"Error retrieving token usage: {str(e)}")
            return []
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """
        Get user by ID
        
        Args:
            user_id: User ID
        
        Returns:
            User data with email
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/users",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_users = data if isinstance(data, list) else []
                    
                    # Find user by ID
                    user = next((u for u in all_users if u.get('id') == user_id), None)
                    return user
                
                return None
        
        except Exception as e:
            logger.error(f"Error retrieving user: {str(e)}")
            return None
    
    async def get_user_plan(self, user_id: str) -> Optional[Dict]:
        """
        Get user plan/tier information
        
        Args:
            user_id: User ID
        
        Returns:
            User plan data with token limits
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/user_plans",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_plans = data if isinstance(data, list) else []
                    
                    # Find plan by user_id
                    plan = next((p for p in all_plans if p.get('user_id') == user_id), None)
                    return plan
                
                return None
        
        except Exception as e:
            logger.error(f"Error retrieving user plan: {str(e)}")
            return None

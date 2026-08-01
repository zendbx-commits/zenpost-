"""
Threads Service
Handles Threads (by Instagram) OAuth and posting
"""
import os
import logging
from typing import Optional, Dict, List
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ThreadsService:
    """
    Service for Threads (by Instagram) OAuth 2.0 and API interactions
    
    NOTE: Threads uses Instagram's Graph API with special endpoints
    - Requires Instagram Professional/Creator account
    - Must be connected to a Facebook Page
    - Uses Facebook app credentials
    """
    
    def __init__(self):
        # Threads uses the same app credentials as Instagram/Facebook
        # Strip whitespace/newlines to prevent %0A in OAuth requests
        self.app_id = (os.getenv("FACEBOOK_APP_ID") or "").strip()  # Same as Instagram
        self.app_secret = (os.getenv("FACEBOOK_APP_SECRET") or "").strip()
        self.redirect_uri = (os.getenv("THREADS_REDIRECT_URI") or "http://localhost:8001/api/auth/threads/callback").strip()
        
        # Threads API endpoints (uses Instagram Graph API)
        self.api_base = "https://graph.threads.net/v1.0"
        
        # Required scopes for Threads
        # NOTE: threads_basic is REQUIRED for all Threads API calls
        # NOTE: These must be added as permissions in your Facebook App Dashboard first
        self.scopes = [
            "threads_basic",           # Required - base permission for Threads API
            "threads_content_publish"  # Required - for publishing posts
        ]
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Threads OAuth authorization URL
        Uses Instagram Graph API OAuth with Threads permissions
        
        Args:
            state: Random state string for CSRF protection
            
        Returns:
            Authorization URL for user to visit
        """
        # Threads uses Instagram/Facebook OAuth, not a separate endpoint
        scope = ",".join(self.scopes)
        auth_url = "https://www.facebook.com/v18.0/dialog/oauth"
        
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "scope": scope,
            "response_type": "code",
            "state": state
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{auth_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from Threads callback
            
        Returns:
            Token response with access_token
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": self.redirect_uri,
                    "code": code
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_long_lived_token(self, short_lived_token: str) -> Dict:
        """
        Exchange short-lived token for long-lived token (60 days)
        
        Args:
            short_lived_token: Short-lived access token
            
        Returns:
            Long-lived token data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": short_lived_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def refresh_long_lived_token(self, access_token: str) -> Dict:
        """
        Refresh a long-lived token before it expires
        
        Args:
            access_token: Current long-lived token
            
        Returns:
            New long-lived token data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.threads.net/refresh_access_token",
                params={
                    "grant_type": "th_refresh_token",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_profile(self, access_token: str, user_id: str) -> Dict:
        """
        Get Threads user profile information
        
        Args:
            access_token: Threads access token
            user_id: Threads user ID
            
        Returns:
            User profile data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/{user_id}",
                params={
                    "fields": "id,username,threads_profile_picture_url,threads_biography",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def create_thread_post(
        self,
        user_id: str,
        access_token: str,
        text: str,
        media_type: str = "TEXT",
        image_url: Optional[str] = None,
        video_url: Optional[str] = None,
        reply_to_id: Optional[str] = None
    ) -> Dict:
        """
        Create a post on Threads
        
        Args:
            user_id: Threads user ID
            access_token: Threads access token
            text: Post text content (max 500 characters)
            media_type: "TEXT", "IMAGE", "VIDEO", or "CAROUSEL"
            image_url: URL to image (for IMAGE posts)
            video_url: URL to video (for VIDEO posts)
            reply_to_id: ID of thread to reply to (optional)
            
        Returns:
            Created post data with post ID
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Step 1: Create media container
            container_data = {
                "media_type": media_type,
                "text": text[:500],  # Max 500 chars
                "access_token": access_token
            }
            
            if image_url:
                container_data["image_url"] = image_url
            
            if video_url:
                container_data["video_url"] = video_url
            
            if reply_to_id:
                container_data["reply_to_id"] = reply_to_id
            
            # Create container
            container_response = await client.post(
                f"{self.api_base}/{user_id}/threads",
                data=container_data
            )
            container_response.raise_for_status()
            container_id = container_response.json().get("id")
            
            logger.info(f"Threads container created: {container_id}")
            
            # Step 2: Publish the container
            publish_response = await client.post(
                f"{self.api_base}/{user_id}/threads_publish",
                data={
                    "creation_id": container_id,
                    "access_token": access_token
                }
            )
            publish_response.raise_for_status()
            
            return publish_response.json()
    
    async def create_carousel_post(
        self,
        user_id: str,
        access_token: str,
        text: str,
        media_urls: List[str]
    ) -> Dict:
        """
        Create a carousel post (multiple images/videos)
        
        Args:
            user_id: Threads user ID
            access_token: Threads access token
            text: Post caption
            media_urls: List of image/video URLs (2-10 items)
            
        Returns:
            Created carousel post data
        """
        if len(media_urls) < 2 or len(media_urls) > 10:
            raise ValueError("Carousel must have between 2 and 10 media items")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Create containers for each media item
            children_ids = []
            for media_url in media_urls:
                media_type = "IMAGE" if any(media_url.endswith(ext) for ext in ['.jpg', '.jpeg', '.png']) else "VIDEO"
                
                child_data = {
                    "media_type": media_type,
                    "image_url" if media_type == "IMAGE" else "video_url": media_url,
                    "is_carousel_item": True,
                    "access_token": access_token
                }
                
                response = await client.post(
                    f"{self.api_base}/{user_id}/threads",
                    data=child_data
                )
                response.raise_for_status()
                children_ids.append(response.json().get("id"))
            
            # Create carousel container
            carousel_data = {
                "media_type": "CAROUSEL",
                "text": text[:500],
                "children": ",".join(children_ids),
                "access_token": access_token
            }
            
            carousel_response = await client.post(
                f"{self.api_base}/{user_id}/threads",
                data=carousel_data
            )
            carousel_response.raise_for_status()
            carousel_id = carousel_response.json().get("id")
            
            # Publish carousel
            publish_response = await client.post(
                f"{self.api_base}/{user_id}/threads_publish",
                data={
                    "creation_id": carousel_id,
                    "access_token": access_token
                }
            )
            publish_response.raise_for_status()
            
            return publish_response.json()
    
    async def get_thread_post(
        self,
        post_id: str,
        access_token: str
    ) -> Dict:
        """
        Get a specific Threads post
        
        Args:
            post_id: Thread post ID
            access_token: Threads access token
            
        Returns:
            Post data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/{post_id}",
                params={
                    "fields": "id,text,username,permalink,timestamp,media_type,media_url,is_reply,reply_to_id",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_threads(
        self,
        user_id: str,
        access_token: str,
        limit: int = 25
    ) -> List[Dict]:
        """
        Get user's Threads posts
        
        Args:
            user_id: Threads user ID
            access_token: Threads access token
            limit: Number of posts to return
            
        Returns:
            List of thread posts
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/{user_id}/threads",
                params={
                    "fields": "id,text,username,permalink,timestamp,media_type",
                    "limit": limit,
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    
    async def get_thread_insights(
        self,
        post_id: str,
        access_token: str,
        metrics: List[str] = None
    ) -> Dict:
        """
        Get insights/analytics for a Threads post
        
        Args:
            post_id: Thread post ID
            access_token: Threads access token
            metrics: List of metrics to retrieve
            
        Returns:
            Post insights data
        """
        if metrics is None:
            metrics = ["views", "likes", "replies", "reposts", "quotes"]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/{post_id}/insights",
                params={
                    "metric": ",".join(metrics),
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def reply_to_thread(
        self,
        user_id: str,
        access_token: str,
        reply_to_id: str,
        text: str
    ) -> Dict:
        """
        Reply to a Threads post
        
        Args:
            user_id: Your Threads user ID
            access_token: Threads access token
            reply_to_id: ID of thread to reply to
            text: Reply text
            
        Returns:
            Created reply data
        """
        return await self.create_thread_post(
            user_id=user_id,
            access_token=access_token,
            text=text,
            reply_to_id=reply_to_id
        )

"""
Instagram Service
Handles Instagram authentication and posting via Facebook Graph API
"""
import asyncio
import os
import logging
from typing import Optional, Dict, List
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class InstagramService:
    """
    Service for Instagram integration via Facebook Graph API
    
    NOTE: Instagram API requires:
    1. Facebook Business/Developer account
    2. Instagram Business or Creator account
    3. Instagram account connected to Facebook Page
    4. Permissions: instagram_basic, instagram_content_publish, pages_read_engagement
    """
    
    def __init__(self):
        # Use Instagram app credentials (separate from Facebook)
        self.app_id = os.getenv("INSTAGRAM_APP_ID")
        self.app_secret = os.getenv("INSTAGRAM_APP_SECRET")
        self.redirect_uri = os.getenv("INSTAGRAM_REDIRECT_URI")
        
        # Log configuration for debugging
        logger.info(f"Instagram Service initialized with App ID: {self.app_id[:4]}...{self.app_id[-4:] if self.app_id else 'NOT SET'}")
        
        if not self.app_id:
            logger.error("❌ INSTAGRAM_APP_ID is not set in environment variables!")
        if not self.app_secret:
            logger.error("❌ INSTAGRAM_APP_SECRET is not set in environment variables!")
        if not self.redirect_uri:
            logger.error("❌ INSTAGRAM_REDIRECT_URI is not set in environment variables!")
        
        # Facebook Graph API endpoints (Instagram uses Facebook infrastructure)
        self.auth_url = "https://www.facebook.com/v18.0/dialog/oauth"
        self.token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        self.api_base = "https://graph.facebook.com/v18.0"
        
        # Required permissions for Instagram
        self.scopes = [
            "instagram_basic",              # Read Instagram account info
            "instagram_content_publish",     # Publish content to Instagram
            "pages_show_list",              # Required to get pages
            "pages_read_engagement",        # Required for Instagram connection
            "business_management"           # Access to business accounts
        ]
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Instagram OAuth authorization URL
        
        Args:
            state: Random state string for CSRF protection
            
        Returns:
            Authorization URL for user to visit
        """
        scope = ",".join(self.scopes)
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": scope,
            "response_type": "code"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from Instagram/Facebook callback
            
        Returns:
            Token response with access_token
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.token_url,
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
                f"{self.api_base}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": short_lived_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_pages(self, access_token: str) -> List[Dict]:
        """
        Get list of Facebook Pages the user manages (to find Instagram accounts)
        
        Args:
            access_token: User access token
            
        Returns:
            List of page objects with their Instagram accounts
        """
        try:
            async with httpx.AsyncClient() as client:
                # Get pages
                response = await client.get(
                    f"{self.api_base}/me/accounts",
                    params={
                        "fields": "id,name,access_token,picture,instagram_business_account",
                        "access_token": access_token
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                logger.info(f"Instagram: Found {len(data.get('data', []))} Facebook pages")
                
                pages = []
                for page in data.get("data", []):
                    page_info = {
                        "id": page.get("id"),
                        "name": page.get("name"),
                        "access_token": page.get("access_token"),
                        "picture_url": page.get("picture", {}).get("data", {}).get("url"),
                        "instagram_business_account": page.get("instagram_business_account")
                    }
                    
                    logger.info(f"Instagram: Page '{page_info['name']}' - Instagram account: {page_info['instagram_business_account'] is not None}")
                    
                    # Get Instagram account details if connected
                    if page_info["instagram_business_account"]:
                        ig_id = page_info["instagram_business_account"].get("id")
                        try:
                            ig_details = await self.get_instagram_account_info(
                                page.get("access_token"),
                                ig_id
                            )
                            page_info["instagram"] = ig_details
                            logger.info(f"Instagram: Successfully fetched details for @{ig_details.get('username')}")
                        except Exception as ig_error:
                            logger.error(f"Instagram: Failed to get account details for page {page_info['name']}: {str(ig_error)}")
                            # Still include the page even if we can't get details
                            page_info["instagram"] = {
                                "id": ig_id,
                                "username": "unknown",
                                "name": page_info["name"],
                                "error": str(ig_error)
                            }
                    
                    pages.append(page_info)
                
                # Log summary
                pages_with_ig = [p for p in pages if p.get("instagram_business_account")]
                logger.info(f"Instagram: {len(pages_with_ig)} out of {len(pages)} pages have Instagram accounts")
                
                return pages
                
        except Exception as e:
            logger.error(f"Error fetching pages with Instagram accounts: {str(e)}")
            logger.exception("Full traceback:")
            return []
    
    async def get_instagram_accounts_from_pages(self, page_access_token: str, page_id: str) -> Optional[Dict]:
        """
        Get Instagram Business Account connected to a Facebook Page
        
        Args:
            page_access_token: Facebook Page access token
            page_id: Facebook Page ID
            
        Returns:
            Instagram account info or None if not connected
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/{page_id}",
                    params={
                        "fields": "instagram_business_account",
                        "access_token": page_access_token
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    ig_account = data.get("instagram_business_account")
                    
                    if ig_account:
                        # Get Instagram account details
                        ig_id = ig_account.get("id")
                        return await self.get_instagram_account_info(page_access_token, ig_id)
                    
                return None
                
        except Exception as e:
            logger.error(f"Error fetching Instagram account: {str(e)}")
            return None
    
    async def get_instagram_account_info(self, access_token: str, instagram_account_id: str) -> Dict:
        """
        Get detailed Instagram account information
        
        Args:
            access_token: Access token (page or user)
            instagram_account_id: Instagram Business Account ID
            
        Returns:
            Instagram account details
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/{instagram_account_id}",
                params={
                    "fields": "id,username,name,profile_picture_url,followers_count,follows_count,media_count",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def create_instagram_media_container(
        self,
        instagram_account_id: str,
        access_token: str,
        image_url: Optional[str] = None,
        video_url: Optional[str] = None,
        caption: Optional[str] = None,
        is_carousel: bool = False
    ) -> str:
        """
        Create an Instagram media container (Step 1 of posting)
        
        Args:
            instagram_account_id: Instagram Business Account ID
            access_token: Page access token
            image_url: URL to image (must be publicly accessible)
            video_url: URL to video (must be publicly accessible)
            caption: Post caption with hashtags
            is_carousel: Whether this is a carousel post
            
        Returns:
            Container ID for publishing
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            post_data = {
                "access_token": access_token
            }
            
            if image_url:
                post_data["image_url"] = image_url
            elif video_url:
                post_data["video_url"] = video_url
                post_data["media_type"] = "VIDEO"
            
            if caption:
                post_data["caption"] = caption
            
            if is_carousel:
                post_data["is_carousel_item"] = "true"
            
            response = await client.post(
                f"{self.api_base}/{instagram_account_id}/media",
                data=post_data
            )

            if response.status_code >= 400:
                error_body = response.text
                logger.error(f"Instagram media container error: {error_body}")
                response.raise_for_status()
            
            result = response.json()
            return result.get("id")
    
    async def _wait_for_container_ready(
        self,
        container_id: str,
        access_token: str,
        max_wait_seconds: int = 60,
    ) -> None:
        """Wait until Instagram finishes processing the media container."""
        elapsed = 0
        interval = 2

        async with httpx.AsyncClient(timeout=30.0) as client:
            while elapsed < max_wait_seconds:
                response = await client.get(
                    f"{self.api_base}/{container_id}",
                    params={"fields": "status_code,status", "access_token": access_token},
                )
                response.raise_for_status()
                data = response.json()
                status_code = data.get("status_code")

                if status_code == "FINISHED":
                    return
                if status_code == "ERROR":
                    raise Exception(f"Instagram media container failed: {data.get('status', data)}")

                await asyncio.sleep(interval)
                elapsed += interval

        raise Exception("Instagram media container was not ready in time")
    
    async def publish_instagram_media(
        self,
        instagram_account_id: str,
        access_token: str,
        creation_id: str
    ) -> Dict:
        """
        Publish Instagram media container (Step 2 of posting)
        
        Args:
            instagram_account_id: Instagram Business Account ID
            access_token: Page access token
            creation_id: Container ID from create step
            
        Returns:
            Published media information
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/{instagram_account_id}/media_publish",
                data={
                    "creation_id": creation_id,
                    "access_token": access_token
                }
            )
            
            response.raise_for_status()
            return response.json()
    
    async def post_to_instagram(
        self,
        instagram_account_id: str,
        access_token: str,
        image_url: Optional[str] = None,
        video_url: Optional[str] = None,
        caption: Optional[str] = None
    ) -> Dict:
        """
        Complete Instagram posting workflow (2-step process)
        
        Args:
            instagram_account_id: Instagram Business Account ID
            access_token: Page access token
            image_url: URL to image (must be publicly accessible)
            video_url: URL to video (must be publicly accessible)
            caption: Post caption with hashtags
            
        Returns:
            Published post information
        """
        try:
            # Step 1: Create media container
            logger.info(f"Creating Instagram media container...")
            container_id = await self.create_instagram_media_container(
                instagram_account_id=instagram_account_id,
                access_token=access_token,
                image_url=image_url,
                video_url=video_url,
                caption=caption
            )
            
            logger.info(f"Media container created: {container_id}")

            await self._wait_for_container_ready(container_id, access_token)
            
            # Step 2: Publish the container
            logger.info(f"Publishing Instagram media...")
            result = await self.publish_instagram_media(
                instagram_account_id=instagram_account_id,
                access_token=access_token,
                creation_id=container_id
            )
            
            logger.info(f"Instagram post published: {result.get('id')}")
            return result
            
        except Exception as e:
            logger.error(f"Instagram posting failed: {str(e)}")
            raise
    
    async def create_instagram_story(
        self,
        instagram_account_id: str,
        access_token: str,
        image_url: Optional[str] = None,
        video_url: Optional[str] = None
    ) -> Dict:
        """
        Post an Instagram Story
        
        Args:
            instagram_account_id: Instagram Business Account ID
            access_token: Page access token
            image_url: URL to story image
            video_url: URL to story video
            
        Returns:
            Story information
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            post_data = {
                "access_token": access_token,
                "media_type": "STORIES"
            }
            
            if image_url:
                post_data["image_url"] = image_url
            elif video_url:
                post_data["video_url"] = video_url
            
            # Stories use a single-step API
            response = await client.post(
                f"{self.api_base}/{instagram_account_id}/media",
                data=post_data
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Publish immediately
            publish_result = await self.publish_instagram_media(
                instagram_account_id=instagram_account_id,
                access_token=access_token,
                creation_id=result.get("id")
            )
            
            return publish_result
    
    async def create_instagram_reel(
        self,
        instagram_account_id: str,
        access_token: str,
        video_url: str,
        caption: Optional[str] = None,
        share_to_feed: bool = True
    ) -> Dict:
        """
        Post an Instagram Reel
        
        Args:
            instagram_account_id: Instagram Business Account ID
            access_token: Page access token
            video_url: URL to reel video (must be publicly accessible)
            caption: Reel caption with hashtags
            share_to_feed: Whether to also share to feed
            
        Returns:
            Reel information
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            post_data = {
                "access_token": access_token,
                "media_type": "REELS",
                "video_url": video_url,
                "share_to_feed": str(share_to_feed).lower()
            }
            
            if caption:
                post_data["caption"] = caption
            
            # Create reel container
            response = await client.post(
                f"{self.api_base}/{instagram_account_id}/media",
                data=post_data
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Publish the reel
            publish_result = await self.publish_instagram_media(
                instagram_account_id=instagram_account_id,
                access_token=access_token,
                creation_id=result.get("id")
            )
            
            return publish_result
    
    async def get_instagram_media(
        self,
        instagram_account_id: str,
        access_token: str,
        limit: int = 25
    ) -> List[Dict]:
        """
        Get recent Instagram posts
        
        Args:
            instagram_account_id: Instagram Business Account ID
            access_token: Access token
            limit: Number of posts to retrieve
            
        Returns:
            List of media objects
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/{instagram_account_id}/media",
                params={
                    "fields": "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
                    "limit": limit,
                    "access_token": access_token
                }
            )
            
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])

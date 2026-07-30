"""
Facebook OAuth Service
Handles Facebook authentication and posting
"""
import os
import logging
from typing import Optional, Dict, List
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class FacebookService:
    """Service for Facebook OAuth 2.0 and Graph API interactions"""
    
    def __init__(self):
        self.app_id = os.getenv("FACEBOOK_APP_ID")
        self.app_secret = os.getenv("FACEBOOK_APP_SECRET")
        self.redirect_uri = os.getenv("FACEBOOK_REDIRECT_URI")
        
        # Facebook OAuth endpoints
        self.auth_url = "https://www.facebook.com/v18.0/dialog/oauth"
        self.token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
        self.api_base = "https://graph.facebook.com/v18.0"
        
        # Required permissions (includes Instagram)
        self.scopes = [
            "public_profile",
            "email",
            "pages_show_list",  # Read list of pages
            "pages_read_engagement",  # Read page insights
            "pages_manage_posts",  # Create posts on pages
            "pages_manage_engagement",  # Manage page engagement
            "instagram_basic",  # Read Instagram account info
            "instagram_content_publish"  # Publish content to Instagram
        ]
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Facebook OAuth authorization URL
        
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
            code: Authorization code from Facebook callback
            
        Returns:
            Token response with access_token, expires_in, etc.
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
    
    async def get_user_profile(self, access_token: str) -> Dict:
        """
        Get Facebook user profile information
        
        Args:
            access_token: Facebook access token
            
        Returns:
            User profile data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/me",
                params={
                    "fields": "id,name,email,picture.width(200).height(200)",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_pages(self, access_token: str) -> List[Dict]:
        """
        Get list of Facebook Pages the user manages
        
        Args:
            access_token: User access token
            
        Returns:
            List of page objects with page access tokens
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me/accounts",
                    params={
                        "fields": "id,name,access_token,picture,category,fan_count",
                        "access_token": access_token
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                pages = []
                for page in data.get("data", []):
                    pages.append({
                        "id": page.get("id"),
                        "name": page.get("name"),
                        "access_token": page.get("access_token"),
                        "picture_url": page.get("picture", {}).get("data", {}).get("url"),
                        "category": page.get("category"),
                        "followers": page.get("fan_count", 0)
                    })
                
                return pages
                
        except Exception as e:
            logger.error(f"Error fetching user pages: {str(e)}")
            return []
    
    async def post_to_page(self, page_access_token: str, page_id: str, message: str, link: Optional[str] = None) -> Dict:
        """
        Post to a Facebook Page
        
        Args:
            page_access_token: Page access token
            page_id: Facebook Page ID
            message: Post message
            link: Optional link to share
            
        Returns:
            Post response with post_id
        """
        async with httpx.AsyncClient() as client:
            post_data = {
                "message": message,
                "access_token": page_access_token
            }
            
            if link:
                post_data["link"] = link
            
            response = await client.post(
                f"{self.api_base}/{page_id}/feed",
                data=post_data
            )
            response.raise_for_status()
            return response.json()
    
    async def post_to_profile(self, access_token: str, message: str) -> Dict:
        """
        Post to user's personal Facebook profile/timeline
        
        NOTE: As of 2024, Facebook has heavily restricted posting to personal profiles.
        The /me/feed endpoint requires special permissions and app review.
        Most apps should use Facebook Pages instead.
        
        Args:
            access_token: User access token
            message: Post message
            
        Returns:
            Post response
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/me/feed",
                data={
                    "message": message,
                    "access_token": access_token
                }
            )
            
            # Better error handling
            if response.status_code == 403:
                try:
                    error_data = response.json()
                    error_message = error_data.get("error", {}).get("message", "Permission denied")
                except:
                    error_message = "Permission denied"
                
                raise Exception(
                    f"❌ Facebook Personal Profile Posting Not Allowed\n\n"
                    f"Facebook Error: {error_message}\n\n"
                    f"📋 Why This Happens:\n"
                    f"Facebook has restricted posting to personal profiles via API. "
                    f"Your app needs to pass Facebook App Review and get 'publish_to_groups' or similar advanced permissions.\n\n"
                    f"✅ Solutions:\n"
                    f"1. Use Facebook Pages instead (fully supported)\n"
                    f"2. Create a Facebook Page and connect it through ZenPost\n"
                    f"3. Submit your app for Facebook App Review (takes 2-4 weeks)\n\n"
                    f"For now, please create/connect a Facebook Page to post content."
                )
            
            response.raise_for_status()
            return response.json()

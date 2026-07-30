"""
X (Twitter) OAuth Service
Handles X/Twitter authentication using OAuth 1.0a (for now)
"""
import os
import logging
from typing import Optional, Dict, Tuple
import httpx
from dotenv import load_dotenv
from requests_oauthlib import OAuth1Session

load_dotenv()
logger = logging.getLogger(__name__)


class TwitterService:
    """Service for X (Twitter) OAuth 1.0a and API interactions"""
    
    def __init__(self):
        # OAuth 1.0a credentials (Consumer Keys)
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
        self.callback_uri = os.getenv("TWITTER_CALLBACK_URI")
        
        # Twitter OAuth 1.0a endpoints
        self.request_token_url = "https://api.twitter.com/oauth/request_token"
        self.authorize_url = "https://api.twitter.com/oauth/authorize"
        self.access_token_url = "https://api.twitter.com/oauth/access_token"
        self.api_base = "https://api.twitter.com/2"
        
    def get_authorization_url(self, state: str) -> Tuple[str, str]:
        """
        Generate Twitter OAuth 1.0a authorization URL using PIN-based auth (oob)
        
        Args:
            state: Random state string (stored separately for CSRF protection)
            
        Returns:
            Tuple of (authorization_url, oauth_token, oauth_token_secret)
        """
        try:
            # Create OAuth1Session with oob callback (PIN-based auth for desktop apps)
            oauth = OAuth1Session(
                self.api_key,
                client_secret=self.api_secret,
                callback_uri='oob'  # Use 'oob' for PIN-based auth
            )
            
            # Get request token
            response = oauth.fetch_request_token(self.request_token_url)
            oauth_token = response.get('oauth_token')
            oauth_token_secret = response.get('oauth_token_secret')
            
            # Build authorization URL
            auth_url = f"{self.authorize_url}?oauth_token={oauth_token}"
            
            return auth_url, oauth_token, oauth_token_secret
            
        except Exception as e:
            logger.error(f"Error getting authorization URL: {str(e)}")
            raise
    
    async def exchange_token_for_access(self, oauth_token: str, oauth_verifier: str, oauth_token_secret: str) -> Dict:
        """
        Exchange OAuth token and PIN verifier for access token
        
        Args:
            oauth_token: OAuth token from authorization step
            oauth_verifier: PIN code entered by user
            oauth_token_secret: OAuth token secret from request token step
            
        Returns:
            Access token data
        """
        try:
            # Create OAuth1Session with token and verifier (PIN)
            oauth = OAuth1Session(
                self.api_key,
                client_secret=self.api_secret,
                resource_owner_key=oauth_token,
                resource_owner_secret=oauth_token_secret,
                verifier=oauth_verifier
            )
            
            # Fetch access token
            response = oauth.fetch_access_token(self.access_token_url)
            
            return {
                "oauth_token": response.get('oauth_token'),
                "oauth_token_secret": response.get('oauth_token_secret'),
                "user_id": response.get('user_id'),
                "screen_name": response.get('screen_name')
            }
            
        except Exception as e:
            logger.error(f"Error exchanging token: {str(e)}")
            raise
    
    async def get_user_profile(self, oauth_token: str, oauth_token_secret: str) -> Dict:
        """
        Get Twitter user profile information using OAuth 1.0a
        
        Args:
            oauth_token: User's OAuth token
            oauth_token_secret: User's OAuth token secret
            
        Returns:
            User profile data
        """
        try:
            # Use bearer token for API v2 calls (simpler)
            async with httpx.AsyncClient() as client:
                # Get user by username (we have it from access token)
                # First, verify credentials to get user ID
                oauth = OAuth1Session(
                    self.api_key,
                    client_secret=self.api_secret,
                    resource_owner_key=oauth_token,
                    resource_owner_secret=oauth_token_secret
                )
                
                # Use v1.1 API to verify credentials
                verify_response = oauth.get(
                    "https://api.twitter.com/1.1/account/verify_credentials.json",
                    params={"include_email": "true"}
                )
                
                if verify_response.status_code != 200:
                    raise Exception(f"Failed to verify credentials: {verify_response.text}")
                
                user_data = verify_response.json()
                
                # Format to match v2 structure
                return {
                    "id": user_data.get("id_str"),
                    "name": user_data.get("name"),
                    "username": user_data.get("screen_name"),
                    "profile_image_url": user_data.get("profile_image_url_https"),
                    "description": user_data.get("description"),
                    "public_metrics": {
                        "followers_count": user_data.get("followers_count", 0),
                        "following_count": user_data.get("friends_count", 0),
                        "tweet_count": user_data.get("statuses_count", 0)
                    }
                }
                
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            raise
    
    async def post_tweet(self, oauth_token: str, oauth_token_secret: str, text: str) -> Dict:
        """
        Post a tweet using OAuth 1.0a
        
        Args:
            oauth_token: User's OAuth token
            oauth_token_secret: User's OAuth token secret
            text: Tweet text (max 280 characters)
            
        Returns:
            Tweet response
        """
        try:
            oauth = OAuth1Session(
                self.api_key,
                client_secret=self.api_secret,
                resource_owner_key=oauth_token,
                resource_owner_secret=oauth_token_secret
            )
            
            # Use v2 API to post tweet
            response = oauth.post(
                f"{self.api_base}/tweets",
                json={"text": text}
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to post tweet: {response.text}")
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error posting tweet: {str(e)}")
            raise

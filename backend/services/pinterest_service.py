"""
Pinterest Service
Handles Pinterest OAuth and Pin creation
"""
import os
import logging
from typing import Optional, Dict, List
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class PinterestService:
    """
    Service for Pinterest OAuth 2.0 and API interactions
    
    NOTE: Pinterest requires:
    1. Pinterest Developer account
    2. App created in Pinterest Developer Portal
    3. OAuth 2.0 credentials
    """
    
    def __init__(self):
        self.app_id = os.getenv("PINTEREST_APP_ID")
        self.app_secret = os.getenv("PINTEREST_APP_SECRET")
        self.redirect_uri = os.getenv("PINTEREST_REDIRECT_URI")
        
        # Pinterest API endpoints
        self.auth_url = "https://www.pinterest.com/oauth/"
        self.token_url = "https://api.pinterest.com/v5/oauth/token"
        self.api_base = "https://api.pinterest.com/v5"
        
        # Required scopes for Pinterest
        self.scopes = [
            "boards:read",           # Read board info
            "boards:write",          # Create/update boards
            "pins:read",             # Read pins
            "pins:write",            # Create pins
            "user_accounts:read"     # Read user account info
        ]
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate Pinterest OAuth authorization URL
        
        Args:
            state: Random state string for CSRF protection
            
        Returns:
            Authorization URL for user to visit
        """
        scope = ",".join(self.scopes)
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": scope,
            "state": state
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from Pinterest callback
            
        Returns:
            Token response with access_token, refresh_token
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri
                },
                auth=(self.app_id, self.app_secret),
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Refresh token from previous auth
            
        Returns:
            New token data
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token
                },
                auth=(self.app_id, self.app_secret),
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict:
        """
        Get Pinterest user account information
        
        Args:
            access_token: Pinterest access token
            
        Returns:
            User account data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/user_account",
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_boards(self, access_token: str) -> List[Dict]:
        """
        Get user's Pinterest boards
        
        Args:
            access_token: Pinterest access token
            
        Returns:
            List of boards
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/boards",
                headers={
                    "Authorization": f"Bearer {access_token}"
                },
                params={
                    "page_size": 100
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])
    
    async def create_pin(
        self,
        access_token: str,
        board_id: str,
        title: str,
        description: Optional[str] = None,
        link: Optional[str] = None,
        media_source_url: Optional[str] = None,
        alt_text: Optional[str] = None
    ) -> Dict:
        """
        Create a Pin on Pinterest
        
        Args:
            access_token: Pinterest access token
            board_id: ID of the board to pin to
            title: Pin title (required, max 100 chars)
            description: Pin description (max 500 chars)
            link: Destination link when pin is clicked
            media_source_url: URL to the image (must be publicly accessible)
            alt_text: Alt text for accessibility
            
        Returns:
            Created pin data
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            pin_data = {
                "board_id": board_id,
                "title": title,
                "media_source": {
                    "source_type": "image_url",
                    "url": media_source_url
                }
            }
            
            if description:
                pin_data["description"] = description
            
            if link:
                pin_data["link"] = link
            
            if alt_text:
                pin_data["alt_text"] = alt_text
            
            response = await client.post(
                f"{self.api_base}/pins",
                json=pin_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            return response.json()
    
    async def create_board(
        self,
        access_token: str,
        name: str,
        description: Optional[str] = None,
        privacy: str = "PUBLIC"
    ) -> Dict:
        """
        Create a new Pinterest board
        
        Args:
            access_token: Pinterest access token
            name: Board name
            description: Board description
            privacy: "PUBLIC" or "PROTECTED" (secret boards)
            
        Returns:
            Created board data
        """
        async with httpx.AsyncClient() as client:
            board_data = {
                "name": name,
                "privacy": privacy
            }
            
            if description:
                board_data["description"] = description
            
            response = await client.post(
                f"{self.api_base}/boards",
                json=board_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            return response.json()
    
    async def get_pins(
        self,
        access_token: str,
        board_id: Optional[str] = None,
        limit: int = 25
    ) -> List[Dict]:
        """
        Get pins from a board or user's pins
        
        Args:
            access_token: Pinterest access token
            board_id: Optional board ID to filter by
            limit: Number of pins to return
            
        Returns:
            List of pins
        """
        async with httpx.AsyncClient() as client:
            if board_id:
                url = f"{self.api_base}/boards/{board_id}/pins"
            else:
                url = f"{self.api_base}/pins"
            
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}"
                },
                params={
                    "page_size": limit
                }
            )
            
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])
    
    async def delete_pin(self, access_token: str, pin_id: str) -> bool:
        """
        Delete a pin
        
        Args:
            access_token: Pinterest access token
            pin_id: ID of pin to delete
            
        Returns:
            True if successful
        """
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.api_base}/pins/{pin_id}",
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )
            
            return response.status_code == 204
    
    async def get_board_sections(self, access_token: str, board_id: str) -> List[Dict]:
        """
        Get sections within a board
        
        Args:
            access_token: Pinterest access token
            board_id: Board ID
            
        Returns:
            List of board sections
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/boards/{board_id}/sections",
                headers={
                    "Authorization": f"Bearer {access_token}"
                },
                params={
                    "page_size": 100
                }
            )
            
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])

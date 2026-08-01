"""
LinkedIn OAuth Service
Handles LinkedIn authentication and company page management
"""
import os
import logging
from typing import Optional, List, Dict
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class LinkedInService:
    """Service for LinkedIn OAuth and API interactions"""
    
    def __init__(self):
        # Strip whitespace/newlines to prevent %0A in OAuth requests
        self.client_id = (os.getenv("LINKEDIN_CLIENT_ID") or "").strip()
        self.client_secret = (os.getenv("LINKEDIN_CLIENT_SECRET") or "").strip()
        self.redirect_uri = (os.getenv("LINKEDIN_REDIRECT_URI") or "").strip()
        
        # LinkedIn OAuth endpoints
        self.auth_url = "https://www.linkedin.com/oauth/v2/authorization"
        self.token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        self.api_base = "https://api.linkedin.com/v2"
        
        # Scopes for "Share on LinkedIn" product
        # Note: w_organization_social requires Marketing Developer Platform approval
        self.scopes = [
            "openid",
            "profile",
            "email",
            "w_member_social",  # Post on behalf of user
            # "r_organization_social",  # Requires approval
            # "w_organization_social",  # Requires approval - for company pages
        ]
    
    def get_authorization_url(self, state: str) -> str:
        """
        Generate LinkedIn OAuth authorization URL
        
        Args:
            state: Random state string for CSRF protection
            
        Returns:
            Authorization URL for user to visit
        """
        scope = " ".join(self.scopes)
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": scope
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code from LinkedIn callback
            
        Returns:
            Token response with access_token, expires_in, etc.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_profile(self, access_token: str) -> Dict:
        """
        Get LinkedIn user profile information
        
        Args:
            access_token: LinkedIn access token
            
        Returns:
            User profile data
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base}/userinfo",
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_companies(self, access_token: str) -> List[Dict]:
        """
        Get list of company pages the user can manage
        
        Args:
            access_token: LinkedIn access token
            
        Returns:
            List of company page objects
        """
        try:
            async with httpx.AsyncClient() as client:
                # Get user's organization access
                response = await client.get(
                    f"{self.api_base}/organizationAcls",
                    params={
                        "q": "roleAssignee",
                        "projection": "(elements*(organizationalTarget~(id,localizedName,vanityName,logoV2(original~:playableStreams))))"
                    },
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "X-Restli-Protocol-Version": "2.0.0"
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                # Extract company page information
                companies = []
                elements = data.get("elements", [])
                
                for element in elements:
                    org_target = element.get("organizationalTarget~", {})
                    if org_target:
                        company = {
                            "id": org_target.get("id"),
                            "name": org_target.get("localizedName"),
                            "vanity_name": org_target.get("vanityName"),
                            "logo_url": self._extract_logo_url(org_target.get("logoV2")),
                            "role": element.get("role")
                        }
                        companies.append(company)
                
                return companies
                
        except Exception as e:
            logger.error(f"Error fetching user companies: {str(e)}")
            logger.info("💡 User can manually add company page instead")
            # Return empty list if user has no company pages or no API access
            return []
    
    async def get_organization_id_by_vanity(self, access_token: str, vanity_name: str) -> Optional[str]:
        """
        Get numeric organization ID from vanity name
        
        Args:
            access_token: LinkedIn access token
            vanity_name: Company vanity name (from URL)
            
        Returns:
            Numeric organization ID or None
        """
        try:
            async with httpx.AsyncClient() as client:
                # Try to get organization by vanity name
                response = await client.get(
                    f"{self.api_base}/organizations",
                    params={
                        "q": "vanityName",
                        "vanityName": vanity_name
                    },
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "X-Restli-Protocol-Version": "2.0.0"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    elements = data.get("elements", [])
                    if elements:
                        org_id = elements[0].get("id")
                        logger.info(f"✓ Found organization ID: {org_id} for vanity name: {vanity_name}")
                        return str(org_id)
                
                logger.warning(f"Could not find organization ID for vanity name: {vanity_name}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting organization ID: {str(e)}")
            return None
    
    async def get_company_info_by_url(self, company_url: str) -> Dict:
        """
        Extract company information from LinkedIn company page URL
        Works without authentication - just parses the URL
        
        Args:
            company_url: LinkedIn company page URL (e.g., https://www.linkedin.com/company/microsoft)
            
        Returns:
            Company info dict with vanity name extracted from URL
        """
        import re
        
        # Extract vanity name from URL
        # Supports formats:
        # - https://www.linkedin.com/company/microsoft
        # - linkedin.com/company/microsoft/
        # - https://linkedin.com/company/microsoft?trk=...
        
        pattern = r'linkedin\.com/company/([^/?]+)'
        match = re.search(pattern, company_url)
        
        if not match:
            raise ValueError("Invalid LinkedIn company URL. Expected format: https://www.linkedin.com/company/company-name")
        
        vanity_name = match.group(1)
        
        return {
            "vanity_name": vanity_name,
            "name": vanity_name.replace('-', ' ').title(),  # Approximate name
            "url": f"https://www.linkedin.com/company/{vanity_name}",
            "manually_added": True,
            "note": "To post to this page, the connected LinkedIn user must have admin access"
        }
    
    async def validate_company_access(self, access_token: str, company_vanity_name: str) -> bool:
        """
        Check if the authenticated user has access to post to a company page
        
        Args:
            access_token: LinkedIn access token
            company_vanity_name: Company vanity name (from URL)
            
        Returns:
            True if user has access, False otherwise
        """
        try:
            companies = await self.get_user_companies(access_token)
            return any(c.get('vanity_name') == company_vanity_name for c in companies)
        except:
            # If API call fails, assume they have access (they'll find out when posting)
            logger.warning("Could not validate company access - proceeding anyway")
            return True
    
    def _extract_logo_url(self, logo_data: Optional[Dict]) -> Optional[str]:
        """Extract logo URL from LinkedIn logo data"""
        if not logo_data:
            return None
        
        try:
            original = logo_data.get("original~", {})
            elements = original.get("elements", [])
            if elements:
                # Get the largest image
                largest = max(elements, key=lambda x: x.get("data", {}).get("com.linkedin.digitalmedia.mediaartifact.StillImage", {}).get("storageSize", 0))
                identifiers = largest.get("identifiers", [])
                if identifiers:
                    return identifiers[0].get("identifier")
        except Exception as e:
            logger.warning(f"Could not extract logo URL: {str(e)}")
        
        return None
    
    async def refresh_token(self, refresh_token: str) -> Dict:
        """
        Refresh an expired access token
        
        Args:
            refresh_token: LinkedIn refresh token
            
        Returns:
            New token response
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def post_to_profile(self, access_token: str, content: str, image_url: Optional[str] = None, image_bytes: Optional[bytes] = None) -> Dict:
        """
        Post content to user's LinkedIn profile
        
        Args:
            access_token: LinkedIn access token
            content: Post text content
            image_url: Optional image URL to attach (will be downloaded)
            image_bytes: Optional pre-downloaded image bytes (faster, skips download)
            
        Returns:
            Post response
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            # First, get user's profile ID
            profile = await self.get_user_profile(access_token)
            author_id = f"urn:li:person:{profile['sub']}"
            
            # Create post
            post_data = {
                "author": author_id,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Handle image if provided
            if image_bytes or image_url:
                try:
                    logger.info(f"📸 Uploading image to LinkedIn")
                    
                    # Step 1: Register the upload
                    register_response = await client.post(
                        f"{self.api_base}/assets?action=registerUpload",
                        json={
                            "registerUploadRequest": {
                                "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                                "owner": author_id,
                                "serviceRelationships": [{
                                    "relationshipType": "OWNER",
                                    "identifier": "urn:li:userGeneratedContent"
                                }]
                            }
                        },
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "X-Restli-Protocol-Version": "2.0.0",
                            "Content-Type": "application/json"
                        }
                    )
                    register_response.raise_for_status()
                    register_data = register_response.json()
                    
                    asset_id = register_data['value']['asset']
                    upload_url = register_data['value']['uploadMechanism']['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']['uploadUrl']
                    
                    logger.info(f"✓ Image upload registered: {asset_id}")
                    
                    # Step 2: Get image bytes (use provided bytes or download from URL)
                    if image_bytes:
                        logger.info(f"✓ Using provided image bytes: {len(image_bytes)} bytes")
                    else:
                        logger.info(f"📥 Downloading image from: {image_url}")
                        image_response = await client.get(image_url)
                        image_response.raise_for_status()
                        image_bytes = image_response.content
                        logger.info(f"✓ Image downloaded: {len(image_bytes)} bytes")
                    
                    # Step 3: Upload the binary image
                    upload_response = await client.put(
                        upload_url,
                        content=image_bytes,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "application/octet-stream"
                        }
                    )
                    upload_response.raise_for_status()
                    
                    logger.info(f"✓ Image uploaded to LinkedIn successfully")
                    
                    # Step 4: Add image to post
                    post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
                    post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
                        "status": "READY",
                        "description": {
                            "text": "Generated image"
                        },
                        "media": asset_id,
                        "title": {
                            "text": "Post Image"
                        }
                    }]
                    
                except Exception as img_error:
                    logger.error(f"❌ Image upload failed: {str(img_error)}")
                    logger.warning("⚠️  Posting without image...")
                    # Continue without image on error
            
            response = await client.post(
                f"{self.api_base}/ugcPosts",
                json=post_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def post_to_company_page(
        self, 
        access_token: str, 
        company_id: str, 
        content: str, 
        image_url: Optional[str] = None,
        image_bytes: Optional[bytes] = None
    ) -> Dict:
        """
        Post content to a company page
        
        Args:
            access_token: LinkedIn access token
            company_id: LinkedIn company/organization ID or vanity name
            content: Post text content
            image_url: Optional image URL to attach (will be downloaded)
            image_bytes: Optional pre-downloaded image bytes (faster, skips download)
            
        Returns:
            Post response
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            author_id = f"urn:li:organization:{company_id}"
            
            logger.info(f"📝 Posting to LinkedIn company page with organization ID: {company_id}")
            
            # Create post
            post_data = {
                "author": author_id,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Handle image if provided
            if image_bytes or image_url:
                try:
                    logger.info(f"📸 Uploading image to LinkedIn (Company Page)")
                    
                    # Step 1: Register the upload
                    register_response = await client.post(
                        f"{self.api_base}/assets?action=registerUpload",
                        json={
                            "registerUploadRequest": {
                                "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                                "owner": author_id,
                                "serviceRelationships": [{
                                    "relationshipType": "OWNER",
                                    "identifier": "urn:li:userGeneratedContent"
                                }]
                            }
                        },
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "X-Restli-Protocol-Version": "2.0.0",
                            "Content-Type": "application/json"
                        }
                    )
                    register_response.raise_for_status()
                    register_data = register_response.json()
                    
                    asset_id = register_data['value']['asset']
                    upload_url = register_data['value']['uploadMechanism']['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']['uploadUrl']
                    
                    logger.info(f"✓ Image upload registered: {asset_id}")
                    
                    # Step 2: Get image bytes (use provided bytes or download from URL)
                    if image_bytes:
                        logger.info(f"✓ Using provided image bytes: {len(image_bytes)} bytes")
                    else:
                        logger.info(f"📥 Downloading image from: {image_url}")
                        image_response = await client.get(image_url)
                        image_response.raise_for_status()
                        image_bytes = image_response.content
                        logger.info(f"✓ Image downloaded: {len(image_bytes)} bytes")
                    
                    # Step 3: Upload the binary image
                    upload_response = await client.put(
                        upload_url,
                        content=image_bytes,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "application/octet-stream"
                        }
                    )
                    upload_response.raise_for_status()
                    
                    logger.info(f"✓ Image uploaded to LinkedIn successfully")
                    
                    # Step 4: Add image to post
                    post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
                    post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
                        "status": "READY",
                        "description": {
                            "text": "Generated image"
                        },
                        "media": asset_id,
                        "title": {
                            "text": "Post Image"
                        }
                    }]
                    
                except Exception as img_error:
                    logger.error(f"❌ Image upload failed: {str(img_error)}")
                    logger.warning("⚠️  Posting without image...")
                    # Continue without image on error
            
            response = await client.post(
                f"{self.api_base}/ugcPosts",
                json=post_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()

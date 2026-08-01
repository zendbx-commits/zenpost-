"""
Image Generation Service
Generates images using Stability AI and stores in ZendBX Storage
"""
import os
import uuid
from pathlib import Path
from typing import Dict, Optional
import logging
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO
import httpx
import time
import base64

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class ImageGenerationService:
    """Service for generating images using Stability AI and storing in ZendBX Storage"""
    
    def __init__(self):
        """Initialize the image generation service"""
        
        # Verify STABILITY_API_KEY is configured
        self.stability_api_key = os.getenv("STABILITY_API_KEY")
        if not self.stability_api_key:
            logger.error("STABILITY_API_KEY not configured")
            raise ValueError(
                "STABILITY_API_KEY is not configured. "
                "Please add STABILITY_API_KEY to backend/.env file."
            )
        
        # Log API key detection (not the actual key)
        logger.info("STABILITY_API_KEY detected: yes")
        
        # Stability AI Configuration
        self.model = os.getenv("STABILITY_IMAGE_MODEL", "stable-diffusion-xl-1024-v1-0")
        self.stability_api_url = "https://api.stability.ai/v1/generation"
        
        # ZendBX Storage Configuration
        self.zendbx_api_url = os.getenv("ZENDBX_API_URL", "https://api.zendbx.in")
        self.zendbx_service_key = os.getenv("ZENDBX_SERVICE_KEY")
        self.zendbx_project_slug = os.getenv("ZENDBX_PROJECT_SLUG", "zen-smoking-post")
        
        if not self.zendbx_service_key:
            raise ValueError("ZENDBX_SERVICE_KEY not configured")
        
        # Storage bucket name
        self.storage_bucket = "image"
        
        # Create temporary directory for image processing (fallback)
        self.temp_dir = Path("generated_images")
        self.temp_dir.mkdir(exist_ok=True)
        
        logger.info(f"✓ Image Generation Service initialized")
        logger.info(f"✓ Provider: Stability AI")
        logger.info(f"✓ Model: {self.model}")
        logger.info(f"✓ ZendBX Storage Bucket: {self.storage_bucket}")
    
    async def generate_image(
        self, 
        prompt: str, 
        user_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        timeout: int = 120
    ) -> Dict:
        """
        Generate an image from a text prompt using Stability AI and store in ZendBX Storage
        
        Args:
            prompt: Text description of the image to generate
            user_id: User ID for storage path organization (optional)
            campaign_id: Campaign ID for storage path organization (optional)
            timeout: Request timeout in seconds (default 120)
        
        Returns:
            Dictionary containing:
                - status: "completed" or "error"
                - prompt: The input prompt
                - model: Model used
                - provider: "stability_ai"
                - bucket: Storage bucket name
                - storage_path: Path in ZendBX Storage
                - image_url: Permanent ZendBX Storage URL
                - generation_time: Time taken to generate image
                - upload_time: Time taken to upload to storage
                - error: Error message (if status is "error")
        
        Raises:
            ValueError: If prompt is empty
        """
        
        # Validate prompt
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        
        prompt = prompt.strip()
        
        logger.info("=" * 60)
        logger.info("IMAGE GENERATION REQUEST")
        logger.info("=" * 60)
        logger.info(f"Provider: Stability AI")
        logger.info(f"Model: {self.model}")
        logger.info(f"Prompt: {prompt[:100]}...")
        
        generation_start = time.time()
        
        try:
            # Step 1: Generate image using Stability AI
            logger.info("Step 1: Generating image with Stability AI...")
            
            # Stability AI API endpoint
            generation_url = f"{self.stability_api_url}/{self.model}/text-to-image"
            
            headers = {
                "Authorization": f"Bearer {self.stability_api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            payload = {
                "text_prompts": [
                    {
                        "text": prompt,
                        "weight": 1
                    }
                ],
                "cfg_scale": 7,
                "height": 1024,
                "width": 1024,
                "samples": 1,
                "steps": 30
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    generation_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
            
            generation_time = time.time() - generation_start
            
            # Handle response
            if response.status_code == 200:
                logger.info(f"✓ Image generated in {generation_time:.2f}s")
                
                # Parse response
                response_data = response.json()
                artifacts = response_data.get('artifacts', [])
                
                if not artifacts:
                    return {
                        "status": "error",
                        "error": "generation_error",
                        "message": "Stability AI returned no image data",
                        "prompt": prompt,
                        "model": self.model
                    }
                
                # Get first image (base64 encoded)
                image_data = artifacts[0]
                base64_image = image_data.get('base64')
                
                if not base64_image:
                    return {
                        "status": "error",
                        "error": "generation_error",
                        "message": "No base64 image data in response",
                        "prompt": prompt,
                        "model": self.model
                    }
                
                # Decode base64 to image
                image_bytes = base64.b64decode(base64_image)
                image = Image.open(BytesIO(image_bytes))
                
                logger.info(f"✓ Image decoded: {image.size}")
                logger.info(f"✓ Image mode: {image.mode}")
                
            elif response.status_code == 401:
                logger.error("❌ Authentication failed")
                return {
                    "status": "error",
                    "error": "authentication_error",
                    "message": "Invalid Stability AI API key",
                    "prompt": prompt,
                    "model": self.model
                }
            
            elif response.status_code == 402:
                logger.error("❌ Insufficient credits")
                return {
                    "status": "error",
                    "error": "insufficient_credits",
                    "message": "Stability AI account has insufficient credits",
                    "prompt": prompt,
                    "model": self.model
                }
            
            elif response.status_code == 429:
                logger.error("❌ Rate limit exceeded")
                return {
                    "status": "error",
                    "error": "rate_limit_error",
                    "message": "Stability AI rate limit exceeded. Please try again later.",
                    "prompt": prompt,
                    "model": self.model
                }
            
            elif response.status_code == 400:
                error_data = response.json() if response.content else {}
                error_message = error_data.get('message', response.text)
                
                # Check for content policy violation
                if 'content' in error_message.lower() or 'policy' in error_message.lower():
                    logger.error(f"❌ Content policy error: {error_message}")
                    return {
                        "status": "error",
                        "error": "content_policy_error",
                        "message": "Prompt rejected by Stability AI safety filters",
                        "prompt": prompt,
                        "model": self.model
                    }
                
                logger.error(f"❌ Bad request: {error_message}")
                return {
                    "status": "error",
                    "error": "generation_error",
                    "message": f"Stability AI error: {error_message}",
                    "prompt": prompt,
                    "model": self.model
                }
            
            else:
                error_text = response.text
                logger.error(f"❌ API request failed: {response.status_code}")
                logger.error(f"Response: {error_text[:500]}")
                
                return {
                    "status": "error",
                    "error": "generation_error",
                    "message": f"Stability AI returned status {response.status_code}: {error_text[:200]}",
                    "prompt": prompt,
                    "model": self.model
                }
        
        except httpx.TimeoutException:
            logger.error("❌ Request timeout")
            return {
                "status": "error",
                "error": "timeout",
                "message": f"Request timed out after {timeout} seconds.",
                "prompt": prompt,
                "model": self.model
            }
        
        except httpx.ConnectError as e:
            logger.error(f"❌ Connection error: {str(e)}")
            return {
                "status": "error",
                "error": "connection_error",
                "message": "Cannot connect to Stability AI API. Check network configuration.",
                "prompt": prompt,
                "model": self.model
            }
        
        except Exception as e:
            logger.error(f"❌ Image generation failed: {str(e)}")
            logger.exception("Full traceback:")
            return {
                "status": "error",
                "error": "unknown_error",
                "message": str(e),
                "prompt": prompt,
                "model": self.model
            }
        
        # Step 2: Upload to ZendBX Storage
        try:
            logger.info("Step 2: Uploading to ZendBX Storage...")
            upload_start = time.time()
            
            # Generate unique filename
            filename = f"{uuid.uuid4()}.png"
            
            # Construct storage path
            if campaign_id:
                storage_path = f"generated/{user_id or 'unknown'}/{campaign_id}/{filename}"
            elif user_id:
                storage_path = f"generated/{user_id}/{filename}"
            else:
                storage_path = f"generated/test/{filename}"
            
            logger.info(f"Storage path: {self.storage_bucket}/{storage_path}")
            
            # Convert image to PNG bytes
            img_bytes = BytesIO()
            image.save(img_bytes, format="PNG")
            img_bytes.seek(0)
            png_data = img_bytes.getvalue()
            
            logger.info(f"✓ Image converted to PNG: {len(png_data):,} bytes")
            
            # Upload to ZendBX Storage V3 API
            # Format: /p/{project-slug}/storage/buckets/{bucket-slug}/upload
            upload_url = f"{self.zendbx_api_url}/p/{self.zendbx_project_slug}/storage/buckets/{self.storage_bucket}/upload"
            
            logger.info(f"Upload URL: {upload_url}")
            
            headers = {
                "Authorization": f"Bearer {self.zendbx_service_key}",
                "apikey": self.zendbx_service_key,
            }
            
            # Use storage_path as filename for proper organization
            files = {
                'file': (storage_path, png_data, 'image/png')
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:  # Set to 60 seconds
                try:
                    upload_response = await client.post(
                        upload_url,
                        headers=headers,
                        files=files
                    )
                except httpx.TimeoutException:
                    logger.error("❌ ZendBX upload timeout after 60s - falling back to local storage")
                    raise
                except Exception as upload_error:
                    logger.error(f"❌ ZendBX upload failed: {upload_error}")
                    raise
            
            upload_time = time.time() - upload_start
            
            if upload_response.status_code in [200, 201]:
                logger.info(f"✓ Image uploaded to ZendBX Storage in {upload_time:.2f}s")
                
                # Parse response to get file_id
                response_data = upload_response.json()
                logger.info(f"Upload response: {response_data}")
                
                # Get file_id from response
                file_id = response_data.get('id')
                file_name = response_data.get('file_name')
                storage_key = response_data.get('storage_key')
                
                # Try multiple URL formats for public access
                # Format 1: Preview URL (public access with content-type headers)
                preview_url = f"{self.zendbx_api_url}/p/{self.zendbx_project_slug}/storage/buckets/{self.storage_bucket}/preview/{file_id}"
                
                # Format 2: Download URL (forces download)
                download_url = f"{self.zendbx_api_url}/p/{self.zendbx_project_slug}/storage/buckets/{self.storage_bucket}/download/{file_id}"
                
                # Format 3: Object URL with filename
                object_url = f"{self.zendbx_api_url}/p/{self.zendbx_project_slug}/storage/buckets/{self.storage_bucket}/object/{file_id}/{file_name}" if file_name else None
                
                # Use preview URL as primary (for embedding in posts)
                image_url = preview_url

                # Also save locally so Instagram can fetch via PUBLIC_API_BASE_URL/generated-images/
                public_image_url = None
                try:
                    local_dir = Path("generated_images")
                    local_dir.mkdir(exist_ok=True)
                    local_filename = f"{file_id or uuid.uuid4()}.png"
                    local_path = local_dir / local_filename
                    local_path.write_bytes(png_data)

                    # Check for production URL first, then fall back to localhost
                    public_base = os.getenv("RENDER_EXTERNAL_URL")
                    if not public_base:
                        public_base = os.getenv("PUBLIC_API_BASE_URL")
                    if not public_base:
                        public_base = os.getenv("API_BASE_URL")
                    if not public_base:
                        port = os.getenv("PORT", "8001")
                        public_base = f"http://localhost:{port}"
                    
                    public_base = public_base.rstrip("/")
                    public_image_url = f"{public_base}/generated-images/{local_filename}"
                    logger.info(f"✓ Local public image URL: {public_image_url}")
                except Exception as local_error:
                    logger.warning(f"Could not save local copy for Instagram: {local_error}")
                
                logger.info(f"✓ Image Preview URL: {preview_url}")
                logger.info(f"✓ Image Download URL: {download_url}")
                if object_url:
                    logger.info(f"✓ Image Object URL: {object_url}")
                
                # Base64 encode the image bytes for JSON serialization
                # (base64 is already imported at top of file)
                image_bytes_base64 = base64.b64encode(png_data).decode('utf-8')
                
                result = {
                    "status": "completed",
                    "prompt": prompt,
                    "model": self.model,
                    "provider": "stability_ai",
                    "bucket": self.storage_bucket,
                    "storage_path": storage_path,
                    "file_id": file_id,
                    "image_url": public_image_url or preview_url,
                    "zendbx_image_url": preview_url,
                    "public_image_url": public_image_url,
                    "download_url": download_url,  # Also include download URL
                    "image_bytes": png_data,  # Keep raw bytes for internal use
                    "image_bytes_base64": image_bytes_base64,  # Add base64 for API response
                    "image_size": f"{image.size[0]}x{image.size[1]}",
                    "file_size_bytes": len(png_data),
                    "generation_time": f"{generation_time:.2f}s",
                    "upload_time": f"{upload_time:.2f}s",
                    "total_time": f"{time.time() - generation_start:.2f}s"
                }
                
                logger.info("✅ Image generation and storage completed successfully")
                return result
                
            else:
                error_text = upload_response.text
                logger.error(f"❌ Storage upload failed: {upload_response.status_code}")
                logger.error(f"Response: {error_text}")
                
                return {
                    "status": "error",
                    "error": "storage_error",
                    "message": f"Failed to upload to ZendBX Storage (HTTP {upload_response.status_code}): {error_text[:200]}",
                    "prompt": prompt,
                    "model": self.model,
                    "generation_time": f"{generation_time:.2f}s"
                }
        
        except Exception as e:
            logger.error(f"❌ Storage upload failed: {str(e)}")
            logger.exception("Full traceback:")
            
            # FALLBACK: Save locally and continue
            logger.info("🔄 Falling back to local storage...")
            try:
                local_dir = Path("generated_images")
                local_dir.mkdir(exist_ok=True)
                local_filename = f"{uuid.uuid4()}.png"
                local_path = local_dir / local_filename
                local_path.write_bytes(png_data)

                # Check for production URL first, then fall back to localhost
                public_base = os.getenv("RENDER_EXTERNAL_URL")
                if not public_base:
                    public_base = os.getenv("PUBLIC_API_BASE_URL")
                if not public_base:
                    public_base = os.getenv("API_BASE_URL")
                if not public_base:
                    port = os.getenv("PORT", "8001")
                    public_base = f"http://localhost:{port}"
                
                public_base = public_base.rstrip("/")
                public_image_url = f"{public_base}/generated-images/{local_filename}"
                
                logger.info(f"✅ Saved locally: {public_image_url}")
                
                # Base64 encode for JSON
                image_bytes_base64 = base64.b64encode(png_data).decode('utf-8')
                
                return {
                    "status": "completed",
                    "prompt": prompt,
                    "model": self.model,
                    "provider": "stability_ai",
                    "image_url": public_image_url,
                    "public_image_url": public_image_url,
                    "image_bytes": image_bytes_base64,
                    "width": image.width,
                    "height": image.height,
                    "generation_time": f"{generation_time:.2f}s",
                    "storage_warning": f"ZendBX upload failed, using local storage: {str(e)}"
                }
                
            except Exception as local_error:
                logger.error(f"❌ Local storage fallback also failed: {local_error}")
                return {
                    "status": "error",
                    "error": "storage_error",
                    "message": f"Both ZendBX and local storage failed: {str(e)}",
                    "prompt": prompt,
                    "model": self.model,
                    "generation_time": f"{generation_time:.2f}s"
                }
    
    def get_image_url(self, storage_path: str, file_id: Optional[str] = None) -> str:
        """
        Get the public URL for an image stored in ZendBX Storage
        
        Args:
            storage_path: Path in storage bucket (e.g., "generated/test/uuid.png")
            file_id: File ID from upload response (optional, uses storage_path if not provided)
        
        Returns:
            Full public URL to access the image
        """
        identifier = file_id or storage_path
        return f"{self.zendbx_api_url}/p/{self.zendbx_project_slug}/storage/buckets/{self.storage_bucket}/preview/{identifier}"

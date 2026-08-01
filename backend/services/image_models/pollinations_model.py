"""
Pollinations AI Image Model
Free image generation using Pollinations.ai public API
"""
import time
import logging
import uuid
import base64
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import quote
import httpx
from .base_model import BaseImageModel

logger = logging.getLogger(__name__)


class PollinationsModel(BaseImageModel):
    """
    Pollinations AI image generation model
    Uses the free public endpoint: https://image.pollinations.ai/prompt/{encoded_prompt}
    """
    
    @property
    def model_id(self) -> str:
        return "pollinations"
    
    @property
    def model_name(self) -> str:
        return "Pollinations"
    
    @property
    def badge(self) -> str:
        return "Free"
    
    @property
    def enabled(self) -> bool:
        return True
    
    async def generate_image(
        self,
        prompt: str,
        style: Optional[str] = None,
        aspect_ratio: Optional[str] = "1:1",
        quality: Optional[str] = "standard",
        user_id: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Dict:
        """
        Generate image using Pollinations AI free endpoint
        """
        generation_start = time.time()
        
        try:
            logger.info("=" * 60)
            logger.info("🎨 POLLINATIONS AI IMAGE GENERATION")
            logger.info("=" * 60)
            logger.info(f"Prompt: {prompt[:100]}...")
            logger.info(f"Style: {style}")
            logger.info(f"Aspect Ratio: {aspect_ratio}")
            
            # URL encode the prompt
            encoded_prompt = quote(prompt)
            
            # Construct Pollinations URL
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            
            # Add width and height based on aspect ratio
            width, height = self._get_dimensions(aspect_ratio)
            image_url += f"?width={width}&height={height}"
            
            # Add quality parameter
            if quality == "high":
                image_url += "&enhance=true"
            
            # Add style if specified
            if style and style != "realistic":
                # Pollinations supports various styles
                image_url += f"&style={style}"
            
            logger.info(f"📡 Pollinations URL: {image_url[:100]}...")
            
            # Download the image
            logger.info("⏳ Downloading image from Pollinations...")
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                image_bytes = response.content
            
            generation_time = time.time() - generation_start
            logger.info(f"✅ Image downloaded in {generation_time:.2f}s ({len(image_bytes):,} bytes)")
            
            # Save to local storage
            from pathlib import Path
            import os
            
            local_dir = Path("generated_images")
            local_dir.mkdir(exist_ok=True)
            
            filename = f"pollinations-{uuid.uuid4()}.png"
            local_path = local_dir / filename
            local_path.write_bytes(image_bytes)
            
            # Generate public URL
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
            public_image_url = f"{public_base}/generated-images/{filename}"
            
            logger.info(f"✅ Image saved locally: {public_image_url}")
            
            # Base64 encode for JSON response
            image_bytes_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            return {
                "status": "completed",
                "prompt": prompt,
                "model": self.model_id,
                "provider": "pollinations",
                "image_url": public_image_url,
                "public_image_url": public_image_url,
                "image_bytes": image_bytes_base64,
                "width": width,
                "height": height,
                "generation_time": f"{generation_time:.2f}s",
                "style": style or "realistic",
                "aspect_ratio": aspect_ratio,
                "quality": quality
            }
            
        except httpx.TimeoutException:
            logger.error("❌ Request timeout")
            return {
                "status": "error",
                "error": "timeout",
                "message": "Image generation timed out",
                "prompt": prompt,
                "model": self.model_id,
                "provider": "pollinations"
            }
        
        except Exception as e:
            logger.error(f"❌ Pollinations generation failed: {str(e)}")
            logger.exception("Full traceback:")
            return {
                "status": "error",
                "error": "generation_error",
                "message": str(e),
                "prompt": prompt,
                "model": self.model_id,
                "provider": "pollinations"
            }
    
    def _get_dimensions(self, aspect_ratio: str) -> tuple:
        """Convert aspect ratio to width/height"""
        dimensions_map = {
            "1:1": (1024, 1024),
            "16:9": (1024, 576),
            "9:16": (576, 1024),
            "4:3": (1024, 768),
            "3:4": (768, 1024),
            "21:9": (1344, 576),
            "9:21": (576, 1344)
        }
        return dimensions_map.get(aspect_ratio, (1024, 1024))

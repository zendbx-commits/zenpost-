"""
Image Model Registry
Central registry for all AI image generation models
"""
import logging
from typing import Dict, List, Optional
from services.image_models.pollinations_model import PollinationsModel

logger = logging.getLogger(__name__)


class ImageModelRegistry:
    """
    Central registry for managing AI image generation models
    """
    
    def __init__(self):
        self.models = {}
        self._register_models()
    
    def _register_models(self):
        """Register all available image models"""
        # Register Pollinations (Free)
        pollinations = PollinationsModel()
        self.models[pollinations.model_id] = pollinations
        
        # Future models will be registered here
        # Example:
        # flux = FluxModel()
        # self.models[flux.model_id] = flux
        
        logger.info(f"📦 Registered {len(self.models)} image models")
    
    def get_model(self, model_id: str):
        """Get a specific model by ID"""
        model = self.models.get(model_id)
        if not model:
            raise ValueError(f"Image model '{model_id}' not found")
        if not model.enabled:
            raise ValueError(f"Image model '{model_id}' is not enabled")
        return model
    
    def list_models(self) -> List[Dict]:
        """
        List all available models with their info
        Returns list formatted for API response
        """
        models_list = []
        
        # Active models
        for model_id, model in self.models.items():
            models_list.append(model.to_dict())
        
        # Add "Coming Soon" models (hardcoded for now)
        coming_soon_models = [
            {
                "id": "stability",
                "name": "Stability AI",
                "badge": "Free",
                "enabled": True  # Stability is always available as fallback
            },
            {
                "id": "flux",
                "name": "FLUX",
                "badge": "Premium",
                "enabled": False,
                "coming_soon": True
            },
            {
                "id": "dalle",
                "name": "DALL-E 3",
                "badge": "Premium",
                "enabled": False,
                "coming_soon": True
            },
            {
                "id": "midjourney",
                "name": "Midjourney",
                "badge": "Premium",
                "enabled": False,
                "coming_soon": True
            }
        ]
        
        # Append coming soon models
        for model_info in coming_soon_models:
            if model_info["id"] not in self.models:
                models_list.append(model_info)
        
        return models_list
    
    async def generate_image(
        self,
        model_id: str,
        prompt: str,
        style: Optional[str] = None,
        aspect_ratio: Optional[str] = "1:1",
        quality: Optional[str] = "standard",
        user_id: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Dict:
        """
        Generate an image using the specified model
        
        Args:
            model_id: ID of the model to use
            prompt: Image generation prompt (will be enhanced)
            style: Image style
            aspect_ratio: Image aspect ratio
            quality: Image quality
            user_id: User ID for tracking
            campaign_id: Campaign ID for organization
            
        Returns:
            Dict with generation result
        """
        # Enhance the prompt for marketing quality
        enhanced_prompt = self._enhance_prompt(prompt, style)
        
        logger.info(f"🎨 Generating image with model: {model_id}")
        logger.info(f"📝 Original prompt: {prompt[:100]}...")
        logger.info(f"✨ Enhanced prompt: {enhanced_prompt[:100]}...")
        
        # Special handling for Stability AI (existing service)
        if model_id == "stability":
            from services.image_generation_service import ImageGenerationService
            stability_service = ImageGenerationService()
            return await stability_service.generate_image(
                prompt=enhanced_prompt,
                user_id=user_id,
                campaign_id=campaign_id,
                timeout=60.0
            )
        
        # Use the model registry for other models
        model = self.get_model(model_id)
        
        return await model.generate_image(
            prompt=enhanced_prompt,
            style=style,
            aspect_ratio=aspect_ratio,
            quality=quality,
            user_id=user_id,
            campaign_id=campaign_id
        )
    
    def _enhance_prompt(self, prompt: str, style: Optional[str] = None) -> str:
        """
        Enhance user's raw prompt into a professional advertising prompt
        
        Args:
            prompt: User's original prompt
            style: Image style (realistic, artistic, etc.)
            
        Returns:
            Enhanced professional advertising prompt
        """
        # Determine style-specific enhancement
        style_enhancements = {
            "realistic": "Ultra realistic. Professional commercial photography. Studio lighting. Highly detailed.",
            "artistic": "Artistic composition. Creative design. Modern aesthetic. Professional art direction.",
            "minimalist": "Minimalist design. Clean composition. Professional simplicity. Modern branding.",
            "luxury": "Luxury branding. Premium quality. High-end photography. Sophisticated composition.",
            "vintage": "Vintage aesthetic. Retro styling. Nostalgic composition. Classic advertising.",
            "modern": "Modern design. Contemporary aesthetic. Clean lines. Professional composition."
        }
        
        style_text = style_enhancements.get(style, style_enhancements["realistic"])
        
        # Build enhanced prompt
        enhanced = f"""Create a premium Instagram advertisement for {prompt}. 
{style_text}
Award-winning advertising photography.
Professional marketing image.
Square composition optimized for social media.
High quality commercial product photography."""
        
        # Clean up extra whitespace
        enhanced = " ".join(enhanced.split())
        
        return enhanced


# Global registry instance
image_model_registry = ImageModelRegistry()

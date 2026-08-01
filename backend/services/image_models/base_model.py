"""
Base Image Model Interface
All image generation models must implement this interface
"""
from abc import ABC, abstractmethod
from typing import Dict, Optional


class BaseImageModel(ABC):
    """
    Abstract base class for AI image generation models
    """
    
    @property
    @abstractmethod
    def model_id(self) -> str:
        """Unique identifier for the model"""
        pass
    
    @property
    @abstractmethod
    def model_name(self) -> str:
        """Display name for the model"""
        pass
    
    @property
    @abstractmethod
    def badge(self) -> str:
        """Badge text (e.g., 'Free', 'Premium')"""
        pass
    
    @property
    @abstractmethod
    def enabled(self) -> bool:
        """Whether the model is currently enabled"""
        pass
    
    @abstractmethod
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
        Generate an image using this model
        
        Args:
            prompt: The enhanced image prompt
            style: Image style (realistic, artistic, etc.)
            aspect_ratio: Image aspect ratio (1:1, 16:9, etc.)
            quality: Image quality (standard, high, ultra)
            user_id: User ID for tracking
            campaign_id: Campaign ID for organization
            
        Returns:
            Dict containing:
                - status: "completed" or "error"
                - image_url: Public URL to the generated image
                - public_image_url: Alternative public URL
                - image_bytes: Base64 encoded image bytes
                - width: Image width
                - height: Image height
                - generation_time: Time taken in seconds
                - model: Model identifier
                - provider: Provider name
                - error: Error message (if status is "error")
        """
        pass
    
    def to_dict(self) -> Dict:
        """Convert model info to dictionary for API response"""
        return {
            "id": self.model_id,
            "name": self.model_name,
            "badge": self.badge,
            "enabled": self.enabled
        }

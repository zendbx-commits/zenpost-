"""
Token Usage Tracking Service
Tracks AI token usage across all operations
"""
import os
import logging
from typing import Dict, Optional
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class TokenTracker:
    """Service for tracking AI token usage"""
    
    # Admin users with unlimited tokens
    UNLIMITED_USERS = [
        "sridhar@zendbx.in"
    ]
    
    # Default token limits per user tier
    DEFAULT_MONTHLY_LIMIT = 100000  # 100K tokens for free users
    
    def __init__(self):
        self.zendbx_service = None  # Will be injected
        
    def set_zendbx_service(self, zendbx_service):
        """Inject ZenDBX service for database operations"""
        self.zendbx_service = zendbx_service
    
    def is_unlimited_user(self, user_email: str) -> bool:
        """Check if user has unlimited token access"""
        return user_email.lower() in [email.lower() for email in self.UNLIMITED_USERS]
    
    async def get_user_token_limit(self, user_id: str) -> Optional[int]:
        """
        Get token limit for a user
        
        Returns:
            Token limit or None for unlimited users
        """
        try:
            if not self.zendbx_service:
                return self.DEFAULT_MONTHLY_LIMIT
            
            # Get user email from database
            user = await self.zendbx_service.get_user_by_id(user_id)
            if user and self.is_unlimited_user(user.get('email', '')):
                return None  # Unlimited
            
            # Check if user has a custom plan
            plan = await self.zendbx_service.get_user_plan(user_id)
            if plan:
                return plan.get('monthly_token_limit', self.DEFAULT_MONTHLY_LIMIT)
            
            return self.DEFAULT_MONTHLY_LIMIT
            
        except Exception as e:
            logger.error(f"Failed to get user token limit: {str(e)}")
            return self.DEFAULT_MONTHLY_LIMIT
    
    async def check_token_limit(self, user_id: str, tokens_needed: int = 0) -> Dict:
        """
        Check if user has tokens available
        
        Args:
            user_id: User ID
            tokens_needed: Number of tokens needed for operation
        
        Returns:
            {
                "allowed": bool,
                "is_unlimited": bool,
                "tokens_used": int,
                "tokens_limit": int or None,
                "tokens_remaining": int or None,
                "message": str
            }
        """
        try:
            # Get user email
            user = await self.zendbx_service.get_user_by_id(user_id) if self.zendbx_service else None
            user_email = user.get('email', '') if user else ''
            
            # Check if unlimited user
            if self.is_unlimited_user(user_email):
                return {
                    "allowed": True,
                    "is_unlimited": True,
                    "tokens_used": 0,
                    "tokens_limit": None,
                    "tokens_remaining": None,
                    "message": "Unlimited tokens"
                }
            
            # Get token limit
            token_limit = await self.get_user_token_limit(user_id)
            
            # Get current month usage
            from datetime import datetime
            current_month_usage = await self.get_monthly_usage(user_id)
            tokens_used = current_month_usage.get('total_tokens', 0)
            tokens_remaining = token_limit - tokens_used if token_limit else None
            
            # Check if user has enough tokens
            if token_limit and (tokens_used + tokens_needed) > token_limit:
                return {
                    "allowed": False,
                    "is_unlimited": False,
                    "tokens_used": tokens_used,
                    "tokens_limit": token_limit,
                    "tokens_remaining": tokens_remaining,
                    "message": f"Token limit exceeded. Used {tokens_used}/{token_limit} tokens this month."
                }
            
            return {
                "allowed": True,
                "is_unlimited": False,
                "tokens_used": tokens_used,
                "tokens_limit": token_limit,
                "tokens_remaining": tokens_remaining,
                "message": "Tokens available"
            }
            
        except Exception as e:
            logger.error(f"Failed to check token limit: {str(e)}")
            # Allow operation on error (fail open)
            return {
                "allowed": True,
                "is_unlimited": False,
                "tokens_used": 0,
                "tokens_limit": self.DEFAULT_MONTHLY_LIMIT,
                "tokens_remaining": self.DEFAULT_MONTHLY_LIMIT,
                "message": "Token check failed, allowing operation"
            }
    
    async def track_usage(
        self,
        user_id: str,
        operation_type: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
        cost_estimate: float = 0.0,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Track token usage for an AI operation
        
        Args:
            user_id: User who performed the operation
            operation_type: Type of operation (analysis, content_generation, image_generation, etc.)
            model: AI model used
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens
            total_tokens: Total tokens used
            cost_estimate: Estimated cost in USD
            metadata: Additional metadata (website_id, post_id, etc.)
        
        Returns:
            usage_id: UUID of the tracked usage record
        """
        try:
            usage_id = str(uuid.uuid4())
            
            record = {
                "id": usage_id,
                "user_id": user_id,
                "operation_type": operation_type,
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "cost_estimate": cost_estimate,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat()
            }
            
            if self.zendbx_service:
                # Store in database
                await self.zendbx_service.store_token_usage(record)
                logger.info(f"✓ Token usage tracked: {total_tokens} tokens for {operation_type}")
            else:
                logger.warning("ZenDBX service not available, token usage not stored")
            
            return usage_id
            
        except Exception as e:
            logger.error(f"Failed to track token usage: {str(e)}")
            # Don't fail the main operation if tracking fails
            return None
    
    def calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """
        Calculate estimated cost based on model pricing
        
        Groq pricing (as of 2024):
        - llama-3.1-8b-instant: $0.05 / 1M input, $0.08 / 1M output
        - llama-3.3-70b-versatile: $0.59 / 1M input, $0.79 / 1M output
        - mixtral-8x7b-32768: $0.27 / 1M input, $0.27 / 1M output
        
        Stability AI pricing:
        - stable-diffusion-xl: $0.04 per image
        """
        pricing = {
            "llama-3.1-8b-instant": {"input": 0.05 / 1_000_000, "output": 0.08 / 1_000_000},
            "llama-3.3-70b-versatile": {"input": 0.59 / 1_000_000, "output": 0.79 / 1_000_000},
            "mixtral-8x7b-32768": {"input": 0.27 / 1_000_000, "output": 0.27 / 1_000_000},
            "stable-diffusion-xl-1024-v1-0": {"per_image": 0.04}
        }
        
        if model in pricing:
            if "per_image" in pricing[model]:
                # Image generation
                return pricing[model]["per_image"]
            else:
                # Text generation
                input_cost = prompt_tokens * pricing[model]["input"]
                output_cost = completion_tokens * pricing[model]["output"]
                return input_cost + output_cost
        
        # Default fallback cost
        return 0.0
    
    
    async def get_monthly_usage(self, user_id: str) -> Dict:
        """
        Get current month's token usage for a user
        
        Returns:
            {
                "total_tokens": int,
                "total_cost": float,
                "operations": int
            }
        """
        try:
            if not self.zendbx_service:
                return {"total_tokens": 0, "total_cost": 0.0, "operations": 0}
            
            from datetime import datetime
            # Get first day of current month
            now = datetime.utcnow()
            first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Fetch usage records for current month
            usage_records = await self.zendbx_service.get_token_usage_since(user_id, first_day.isoformat())
            
            total_tokens = sum(r.get("total_tokens", 0) for r in usage_records)
            total_cost = sum(r.get("cost_estimate", 0.0) for r in usage_records)
            
            return {
                "total_tokens": total_tokens,
                "total_cost": total_cost,
                "operations": len(usage_records)
            }
            
        except Exception as e:
            logger.error(f"Failed to get monthly usage: {str(e)}")
            return {"total_tokens": 0, "total_cost": 0.0, "operations": 0}
    
    async def get_user_usage_summary(self, user_id: str, days: int = 30) -> Dict:
        """
        Get token usage summary for a user
        
        Args:
            user_id: User ID
            days: Number of days to look back (default 30)
        
        Returns:
            Summary with total tokens, cost, breakdown by operation type
        """
        try:
            if not self.zendbx_service:
                return {
                    "total_tokens": 0,
                    "total_cost": 0.0,
                    "by_operation": {},
                    "by_model": {},
                    "is_unlimited": False,
                    "token_limit": self.DEFAULT_MONTHLY_LIMIT,
                    "error": "Database not available"
                }
            
            # Check if unlimited user
            user = await self.zendbx_service.get_user_by_id(user_id)
            user_email = user.get('email', '') if user else ''
            is_unlimited = self.is_unlimited_user(user_email)
            token_limit = None if is_unlimited else await self.get_user_token_limit(user_id)
            
            # Fetch usage records from database
            usage_records = await self.zendbx_service.get_token_usage(user_id, days)
            
            total_tokens = sum(r.get("total_tokens", 0) for r in usage_records)
            total_cost = sum(r.get("cost_estimate", 0.0) for r in usage_records)
            
            # Group by operation type
            by_operation = {}
            for record in usage_records:
                op_type = record.get("operation_type", "unknown")
                if op_type not in by_operation:
                    by_operation[op_type] = {
                        "count": 0,
                        "tokens": 0,
                        "cost": 0.0
                    }
                by_operation[op_type]["count"] += 1
                by_operation[op_type]["tokens"] += record.get("total_tokens", 0)
                by_operation[op_type]["cost"] += record.get("cost_estimate", 0.0)
            
            # Group by model
            by_model = {}
            for record in usage_records:
                model = record.get("model", "unknown")
                if model not in by_model:
                    by_model[model] = {
                        "count": 0,
                        "tokens": 0,
                        "cost": 0.0
                    }
                by_model[model]["count"] += 1
                by_model[model]["tokens"] += record.get("total_tokens", 0)
                by_model[model]["cost"] += record.get("cost_estimate", 0.0)
            
            return {
                "total_tokens": total_tokens,
                "total_cost": round(total_cost, 4),
                "total_operations": len(usage_records),
                "by_operation": by_operation,
                "by_model": by_model,
                "period_days": days,
                "is_unlimited": is_unlimited,
                "token_limit": token_limit,
                "tokens_remaining": None if is_unlimited else (token_limit - total_tokens if token_limit else 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to get usage summary: {str(e)}")
            return {
                "total_tokens": 0,
                "total_cost": 0.0,
                "by_operation": {},
                "by_model": {},
                "is_unlimited": False,
                "token_limit": self.DEFAULT_MONTHLY_LIMIT,
                "error": str(e)
            }


# Global token tracker instance
token_tracker = TokenTracker()

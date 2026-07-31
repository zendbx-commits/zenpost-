"""
Feature Gate Middleware
Decorator to protect endpoints with subscription limits
"""
from functools import wraps
from fastapi import HTTPException, Request
from typing import Callable
import logging

from services.subscription_service import subscription_service

logger = logging.getLogger(__name__)


def require_feature(feature: str, increment: int = 1, check_only: bool = False):
    """
    Decorator to check feature limits before allowing endpoint access
    
    Args:
        feature: Feature name (e.g., 'website_analysis', 'ai_captions')
        increment: How much to increment usage by (default: 1)
        check_only: If True, only check limit without incrementing
    
    Usage:
        @app.post("/api/analyze")
        @require_feature("website_analysis")
        async def analyze_website(data: dict, request: Request):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs
            request: Request = kwargs.get('request') or next((arg for arg in args if isinstance(arg, Request)), None)
            
            if not request:
                raise HTTPException(status_code=500, detail="Request object not found")
            
            # Get user_id from request (assuming it's passed as query param or in body)
            user_id = None
            
            # Try to get from query params
            user_id = request.query_params.get('user_id')
            
            # Try to get from request body if POST/PUT
            if not user_id and request.method in ['POST', 'PUT', 'PATCH']:
                try:
                    body = await request.json()
                    user_id = body.get('user_id')
                except:
                    pass
            
            if not user_id:
                raise HTTPException(
                    status_code=400,
                    detail="user_id is required"
                )
            
            # Check feature limit
            allowed, info = await subscription_service.check_feature_limit(
                user_id, 
                feature, 
                increment
            )
            
            if not allowed:
                logger.warning(f"Feature limit reached: {feature} for user {user_id}")
                raise HTTPException(
                    status_code=403,
                    detail={
                        "success": False,
                        "code": "PLAN_LIMIT_REACHED",
                        "feature": feature,
                        "message": f"You've reached your {info['plan_name']} plan limit for {feature}. Upgrade to continue.",
                        "upgrade_required": True,
                        "current_usage": info['current_usage'],
                        "limit": info['limit'],
                        "plan_name": info['plan_name']
                    }
                )
            
            # Increment usage if not check_only
            if not check_only:
                await subscription_service.increment_usage(user_id, feature, increment)
            
            # Call the original function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_plan(allowed_plans: list):
    """
    Decorator to restrict endpoint to specific plans
    
    Args:
        allowed_plans: List of plan names (e.g., ['PRO', 'ENTERPRISE'])
    
    Usage:
        @app.post("/api/advanced-analytics")
        @require_plan(['PRO', 'ENTERPRISE'])
        async def advanced_analytics(request: Request):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get('request') or next((arg for arg in args if isinstance(arg, Request)), None)
            
            if not request:
                raise HTTPException(status_code=500, detail="Request object not found")
            
            # Get user_id
            user_id = request.query_params.get('user_id')
            
            if not user_id and request.method in ['POST', 'PUT', 'PATCH']:
                try:
                    body = await request.json()
                    user_id = body.get('user_id')
                except:
                    pass
            
            if not user_id:
                raise HTTPException(status_code=400, detail="user_id is required")
            
            # Check user's plan
            plan = await subscription_service.get_user_plan(user_id)
            plan_name = plan.get('plan_name', 'FREE')
            
            if plan_name not in allowed_plans:
                logger.warning(f"Plan restriction: {plan_name} not in {allowed_plans} for user {user_id}")
                raise HTTPException(
                    status_code=403,
                    detail={
                        "success": False,
                        "code": "PLAN_UPGRADE_REQUIRED",
                        "message": f"This feature requires a {' or '.join(allowed_plans)} plan.",
                        "upgrade_required": True,
                        "current_plan": plan_name,
                        "required_plans": allowed_plans
                    }
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


async def check_feature_access(user_id: str, feature: str) -> dict:
    """
    Helper function to check feature access without decorator
    Returns dict with 'allowed' and 'info'
    """
    allowed, info = await subscription_service.check_feature_limit(user_id, feature, increment=0)
    return {
        'allowed': allowed,
        'info': info
    }

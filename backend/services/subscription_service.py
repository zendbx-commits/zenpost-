"""
Subscription Service
Handles plan limits, feature gating, and usage tracking
"""
import logging
from typing import Dict, Optional, Tuple
from services.zendbx_service import ZenDBXService

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Manages user subscriptions and feature limits"""
    
    def __init__(self):
        self.zendbx = ZenDBXService()
    
    async def get_user_plan(self, user_id: str) -> Dict:
        """Get user's subscription plan with features"""
        try:
            # Get subscription with plan details using httpx
            import httpx
            
            url = f"{self.zendbx.base_url}/user_subscriptions"
            params = {
                'user_id': f'eq.{user_id}',
                'status': 'eq.active',
                'select': '*,subscription_plans!inner(*)'
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.zendbx.headers,
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        sub = data[0]
                        plan = sub.get('subscription_plans', {})
                        
                        # Build features dict from plan columns
                        features = {
                            'website_connections_limit': plan.get('website_connections_limit', 1),
                            'website_analysis_per_month': plan.get('website_analysis_per_month', 1),
                            'competitor_analysis_per_month': plan.get('competitor_analysis_per_month', 1),
                            'competitor_discovery_limit': plan.get('competitor_discovery_limit', 3),
                            'marketing_intelligence_enabled': plan.get('marketing_intelligence_enabled', False),
                            'ai_captions_per_month': plan.get('ai_captions_per_month', 10),
                            'ai_rewrites_per_month': plan.get('ai_rewrites_per_month', 10),
                            'ai_post_ideas_per_month': plan.get('ai_post_ideas_per_month', 10),
                            'ai_hashtags_per_month': plan.get('ai_hashtags_per_month', 10),
                            'content_calendar_per_month': plan.get('content_calendar_per_month', 1),
                            'saved_drafts_limit': plan.get('saved_drafts_limit', 20),
                            'ai_images_per_month': plan.get('ai_images_per_month', 5),
                            'high_res_images': plan.get('high_res_images', False),
                            'social_accounts_limit': plan.get('social_accounts_limit', 3),
                            'scheduled_posts_limit': plan.get('scheduled_posts_limit', 3),
                            'manual_publishing': plan.get('manual_publishing', True),
                            'basic_analytics': plan.get('basic_analytics', True),
                            'advanced_analytics': plan.get('advanced_analytics', False),
                            'best_posting_time': plan.get('best_posting_time', False),
                            'marketing_reports': plan.get('marketing_reports', False),
                            'workspaces_limit': plan.get('workspaces_limit', 1),
                            'team_members_limit': plan.get('team_members_limit', 1),
                            'brand_kit_enabled': plan.get('brand_kit_enabled', False),
                            'storage_limit_mb': plan.get('storage_limit_mb', 500),
                            'priority_support': plan.get('priority_support', False)
                        }
                        
                        return {
                            'plan_name': sub.get('plan_name', 'FREE'),
                            'display_name': plan.get('display_name', 'Free'),
                            'features': features,
                            'price_monthly': plan.get('price_monthly', 0),
                            'status': sub.get('status', 'active'),
                            'started_at': sub.get('started_at'),
                            'expires_at': sub.get('expires_at')
                        }
            
            # Default to FREE plan if no subscription found
            return await self._get_default_free_plan()
            
        except Exception as e:
            logger.error(f"Error getting user plan: {e}")
            return await self._get_default_free_plan()
    
    async def _get_default_free_plan(self) -> Dict:
        """Get default FREE plan"""
        return {
            'plan_name': 'FREE',
            'display_name': 'Free',
            'features': {
                'website_connections_limit': 1,
                'website_analysis_per_month': 1,
                'competitor_analysis_per_month': 1,
                'ai_captions_per_month': 10,
                'ai_images_per_month': 5,
                'content_calendar_per_month': 1,
                'social_accounts_limit': 3,
                'scheduled_posts_limit': 3
            },
            'price_monthly': 0,
            'status': 'active'
        }
    
    async def get_user_usage(self, user_id: str) -> Dict:
        """Get user's current usage"""
        try:
            import httpx
            
            url = f"{self.zendbx.base_url}/user_usage"
            params = {
                'user_id': f'eq.{user_id}'
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.zendbx.headers,
                    params=params,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        return data[0]
            
            # Create usage record if doesn't exist
            await self._initialize_user_usage(user_id)
            return await self.get_user_usage(user_id)
            
        except Exception as e:
            logger.error(f"Error getting user usage: {e}")
            return {}
    
    async def _initialize_user_usage(self, user_id: str):
        """Initialize usage tracking for user"""
        try:
            import httpx
            
            url = f"{self.zendbx.base_url}/user_usage"
            usage_data = {
                'user_id': user_id,
                'website_analysis_used': 0,
                'ai_captions_used': 0,
                'ai_images_used': 0,
                'content_calendar_used': 0,
                'scheduled_posts_active': 0,
                'social_accounts_connected': 0
            }
            
            async with httpx.AsyncClient() as client:
                await client.post(
                    url,
                    headers=self.zendbx.headers,
                    json=usage_data,
                    timeout=10.0
                )
        except Exception as e:
            logger.error(f"Error initializing user usage: {e}")
    
    async def check_feature_limit(
        self, 
        user_id: str, 
        feature: str, 
        increment: int = 1
    ) -> Tuple[bool, Dict]:
        """
        Check if user can use a feature
        
        Returns: (allowed: bool, info: dict)
        """
        try:
            # Get plan and usage
            plan = await self.get_user_plan(user_id)
            usage = await self.get_user_usage(user_id)
            
            plan_name = plan.get('plan_name', 'FREE')
            features = plan.get('features', {})
            
            # Admin/PRO users have unlimited access
            if plan_name in ['PRO', 'ENTERPRISE']:
                return True, {
                    'allowed': True,
                    'plan_name': plan_name,
                    'limit': -1,
                    'current_usage': 0,
                    'remaining': -1
                }
            
            # Get limit and current usage
            limit_key = f"{feature}_limit" if not feature.endswith('_limit') else feature
            usage_key = f"{feature}_used" if not feature.endswith('_used') else feature
            
            # For limits without _limit suffix
            if limit_key not in features:
                limit_key = feature
            
            limit = features.get(limit_key, 0)
            current_usage = usage.get(usage_key, 0)
            
            # -1 means unlimited
            if limit == -1:
                allowed = True
                remaining = -1
            else:
                allowed = (current_usage + increment) <= limit
                remaining = max(0, limit - current_usage)
            
            info = {
                'allowed': allowed,
                'plan_name': plan_name,
                'limit': limit,
                'current_usage': current_usage,
                'remaining': remaining,
                'feature': feature
            }
            
            # Log the check
            await self._log_feature_gate(
                user_id, 
                feature, 
                'allowed' if allowed else 'blocked',
                plan_name,
                limit,
                current_usage
            )
            
            return allowed, info
            
        except Exception as e:
            logger.error(f"Error checking feature limit: {e}")
            # Fail open for errors (allow access)
            return True, {'allowed': True, 'error': str(e)}
    
    async def increment_usage(
        self, 
        user_id: str, 
        feature: str, 
        amount: int = 1
    ) -> bool:
        """Increment usage counter for a feature"""
        try:
            import httpx
            
            usage_key = f"{feature}_used" if not feature.endswith('_used') else feature
            
            # Get current usage
            usage = await self.get_user_usage(user_id)
            current = usage.get(usage_key, 0)
            
            # Update usage
            url = f"{self.zendbx.base_url}/user_usage"
            params = {'user_id': f'eq.{user_id}'}
            update_data = {
                usage_key: current + amount
            }
            
            async with httpx.AsyncClient() as client:
                await client.patch(
                    url,
                    headers=self.zendbx.headers,
                    params=params,
                    json=update_data,
                    timeout=10.0
                )
            
            logger.info(f"Incremented {usage_key} for user {user_id}: {current} -> {current + amount}")
            return True
            
        except Exception as e:
            logger.error(f"Error incrementing usage: {e}")
            return False
    
    async def set_usage_count(
        self, 
        user_id: str, 
        feature: str, 
        count: int
    ) -> bool:
        """Set usage count for a feature (used for active counts like scheduled posts)"""
        try:
            import httpx
            
            usage_key = feature if feature.endswith('_active') or feature.endswith('_connected') else f"{feature}_count"
            
            url = f"{self.zendbx.base_url}/user_usage"
            params = {'user_id': f'eq.{user_id}'}
            update_data = {usage_key: count}
            
            async with httpx.AsyncClient() as client:
                await client.patch(
                    url,
                    headers=self.zendbx.headers,
                    params=params,
                    json=update_data,
                    timeout=10.0
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Error setting usage count: {e}")
            return False
    
    async def _log_feature_gate(
        self,
        user_id: str,
        feature: str,
        action: str,
        plan_name: str,
        limit_value: int,
        current_usage: int
    ):
        """Log feature gate event"""
        try:
            import httpx
            
            url = f"{self.zendbx.base_url}/feature_gate_logs"
            log_data = {
                'user_id': user_id,
                'feature': feature,
                'action': action,
                'plan_name': plan_name,
                'limit_value': limit_value,
                'current_usage': current_usage
            }
            
            async with httpx.AsyncClient() as client:
                await client.post(
                    url,
                    headers=self.zendbx.headers,
                    json=log_data,
                    timeout=10.0
                )
        except Exception as e:
            logger.error(f"Error logging feature gate: {e}")
    
    async def get_usage_summary(self, user_id: str) -> Dict:
        """Get complete usage summary with limits"""
        try:
            plan = await self.get_user_plan(user_id)
            usage = await self.get_user_usage(user_id)
            features = plan.get('features', {})
            
            summary = {
                'plan_name': plan.get('plan_name'),
                'display_name': plan.get('display_name'),
                'price_monthly': plan.get('price_monthly'),
                'usage': []
            }
            
            # Build usage items
            usage_items = [
                ('website_analysis', 'Website Analysis'),
                ('competitor_analysis', 'Competitor Analysis'),
                ('ai_captions', 'AI Captions'),
                ('ai_images', 'AI Images'),
                ('content_calendar', 'Content Calendar'),
                ('scheduled_posts', 'Scheduled Posts'),
                ('social_accounts', 'Social Accounts'),
            ]
            
            for key, label in usage_items:
                # Map feature name to limit field
                if key == 'website_analysis':
                    limit_key = 'website_analysis_per_month'
                elif key == 'competitor_analysis':
                    limit_key = 'competitor_analysis_per_month'
                elif key == 'ai_captions':
                    limit_key = 'ai_captions_per_month'
                elif key == 'ai_images':
                    limit_key = 'ai_images_per_month'
                elif key == 'content_calendar':
                    limit_key = 'content_calendar_per_month'
                elif key == 'scheduled_posts':
                    limit_key = 'scheduled_posts_limit'
                elif key == 'social_accounts':
                    limit_key = 'social_accounts_limit'
                else:
                    limit_key = f"{key}_limit"
                
                # Map feature name to usage field
                if key in ['scheduled_posts', 'social_accounts']:
                    usage_key = f"{key}_active" if key == 'scheduled_posts' else f"{key}_connected"
                else:
                    usage_key = f"{key}_used"
                
                limit = features.get(limit_key, 0)
                used = usage.get(usage_key, 0)
                
                summary['usage'].append({
                    'feature': key,
                    'label': label,
                    'used': used,
                    'limit': limit,
                    'remaining': -1 if limit == -1 else max(0, limit - used),
                    'percentage': 0 if limit == -1 else min(100, int((used / limit) * 100)) if limit > 0 else 0
                })
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting usage summary: {e}")
            return {'plan_name': 'FREE', 'usage': []}
    
    async def is_admin_user(self, user_id: str) -> bool:
        """Check if user is admin with unlimited access"""
        try:
            plan = await self.get_user_plan(user_id)
            return plan.get('plan_name') == 'PRO'  # Admin has PRO plan
        except Exception as e:
            logger.error(f"Error checking admin status: {e}")
            return False


# Singleton instance
subscription_service = SubscriptionService()

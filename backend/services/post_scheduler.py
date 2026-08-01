"""
Post Scheduler Service
Handles scheduling and automatic posting of social media content
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import uuid
import httpx
from .zendbx_service import ZenDBXService

logger = logging.getLogger(__name__)

GENERATED_IMAGES_DIR = Path("generated_images")


def _get_public_api_base() -> str:
    port = os.getenv("PORT", "8001")
    return os.getenv(
        "PUBLIC_API_BASE_URL",
        os.getenv("API_BASE_URL", f"http://localhost:{port}")
    ).rstrip("/")


async def ensure_public_image_url(
    image_url: Optional[str],
    image_bytes: Optional[bytes],
    filename_hint: Optional[str] = None,
) -> Optional[str]:
    """
    Instagram requires a publicly reachable URL that Meta's servers can fetch.
    LinkedIn uploads bytes directly; Instagram cannot — save/re-host images locally.
    """
    GENERATED_IMAGES_DIR.mkdir(exist_ok=True)
    filename = filename_hint or f"{uuid.uuid4()}.png"
    if not filename.endswith(".png"):
        filename = f"{filename}.png"

    if image_bytes:
        filepath = GENERATED_IMAGES_DIR / filename
        filepath.write_bytes(image_bytes)
        public_url = f"{_get_public_api_base()}/generated-images/{filename}"
        logger.info(f"Saved image bytes for Instagram: {public_url}")
        return public_url

    if not image_url:
        return None

    private_hosts = ("zendbx", "localhost", "127.0.0.1")
    needs_rehost = any(host in image_url.lower() for host in private_hosts)

    if needs_rehost:
        headers = {}
        service_key = os.getenv("ZENDBX_SERVICE_KEY")
        if service_key and "zendbx" in image_url.lower():
            headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            response = await client.get(image_url, headers=headers)
            response.raise_for_status()
            downloaded_bytes = response.content

        filepath = GENERATED_IMAGES_DIR / filename
        filepath.write_bytes(downloaded_bytes)
        public_url = f"{_get_public_api_base()}/generated-images/{filename}"
        logger.info(f"Re-hosted private image URL for Instagram: {public_url}")
        return public_url

    return image_url


class PostScheduler:
    """Manages scheduled posts and triggers automatic posting"""
    
    def __init__(self):
        self.scheduled_posts: Dict[str, Dict] = {}
        self.is_running = False
        self.scheduler_task = None
        
        try:
            self.zendbx_service = ZenDBXService()
        except Exception as e:
            logger.warning(f"Could not initialize ZendBX service: {e}")
            self.zendbx_service = None
        
    async def schedule_post(self, user_id: str, post_data: Dict) -> str:
        """Schedule a post for automatic publishing"""
        date_str = post_data.get('date')
        time_str = post_data.get('time', '10:00')
        
        # Remove AM/PM and convert to 24-hour format if present
        if 'AM' in time_str or 'PM' in time_str:
            try:
                # Parse 12-hour format with AM/PM
                scheduled_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
            except ValueError:
                # If that fails, try without space before AM/PM
                scheduled_datetime = datetime.strptime(f"{date_str} {time_str.replace(' ', '')}", "%Y-%m-%d %I:%M%p")
        else:
            # Parse 24-hour format
            scheduled_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        
        # Add UTC timezone if naive
        from datetime import timezone
        if scheduled_datetime.tzinfo is None:
            scheduled_datetime = scheduled_datetime.replace(tzinfo=timezone.utc)
        
        platforms = post_data.get('platforms', ['LinkedIn'])
        content = post_data.get('content', {})
        
        generated_content_id = post_data.get('post_id') or post_data.get('calendar_post_id')
        
        if generated_content_id:
            try:
                uuid.UUID(str(generated_content_id))
            except (ValueError, AttributeError):
                logger.warning(f"Invalid UUID: {generated_content_id}, generating new one")
                generated_content_id = str(uuid.uuid4())
        else:
            generated_content_id = str(uuid.uuid4())
        
        calendar_post_id = generated_content_id
        
        metadata = {
            'user_id': user_id,
            'campaign_id': post_data.get('campaign_id'),
            'calendar_post_id': calendar_post_id,
            'headline': content.get('headline'),
            'hook': content.get('hook'),
            'caption': content.get('caption') or content.get('text'),
            'call_to_action': content.get('call_to_action'),
            'hashtags': content.get('hashtags', []),
            'image_prompt': content.get('image_prompt'),
            'image_url': content.get('image_url')
        }
        
        scheduled_ids = []
        
        content_saved = False
        if self.zendbx_service:
            try:
                import httpx
                
                async with httpx.AsyncClient() as client:
                    check_response = await client.get(
                        f"{self.zendbx_service.base_url}/generated_content?id=eq.{generated_content_id}",
                        headers=self.zendbx_service.headers,
                        timeout=30.0
                    )
                
                if check_response.status_code == 200:
                    existing = check_response.json()
                    if existing and len(existing) > 0:
                        content_saved = True
                    else:
                        content_entry = {
                            'id': generated_content_id,
                            'calendar_post_id': post_data.get('calendar_post_id') or generated_content_id,
                            'platform': platforms[0] if platforms else 'LinkedIn',
                            'content_text': metadata.get('caption') or metadata.get('text') or '',
                            'headline': metadata.get('headline') or metadata.get('hook') or 'Scheduled Post',
                            'caption': metadata.get('caption') or metadata.get('text') or '',
                            'hashtags': metadata.get('hashtags', []),
                            'call_to_action': metadata.get('call_to_action'),
                            'version': 1,
                            'status': 'approved'
                        }
                        
                        async with httpx.AsyncClient() as client:
                            response = await client.post(
                                f"{self.zendbx_service.base_url}/generated_content",
                                headers=self.zendbx_service.headers,
                                json=content_entry,
                                timeout=30.0
                            )
                        
                        if response.status_code in [200, 201]:
                            content_saved = True
                
            except Exception as content_error:
                logger.error(f"Could not create/check generated_content entry: {content_error}")
        
        if not content_saved:
            logger.warning("Content not saved to database - posts will be in memory only")
        
        for platform in platforms:
            try:
                post_id = str(uuid.uuid4())
                
                scheduled_post = {
                    'id': post_id,
                    'generated_content_id': generated_content_id,
                    'social_account_id': None,
                    'user_id': user_id,
                    'platform': platform,
                    'scheduled_at': scheduled_datetime.isoformat(),
                    'timezone': 'UTC',
                    'status': 'scheduled',
                    'retry_count': 0,
                    'metadata': {**metadata, 'user_id': user_id}
                }
                
                self.scheduled_posts[post_id] = {
                    'id': post_id,
                    'user_id': user_id,
                    'generated_content_id': scheduled_post['generated_content_id'],
                    'scheduled_datetime': scheduled_datetime.isoformat(),
                    'platforms': [platform],
                    'content': content,
                    'status': 'scheduled',
                    'posted_at': None,
                    'error': None,
                    'results': {}
                }
                
                if self.zendbx_service and content_saved:
                    try:
                        import httpx
                        
                        async with httpx.AsyncClient() as client:
                            response = await client.post(
                                f"{self.zendbx_service.base_url}/scheduled_posts",
                                headers=self.zendbx_service.headers,
                                json=scheduled_post,
                                timeout=30.0
                            )
                        
                        if response.status_code in [200, 201]:
                            logger.info(f"Scheduled post saved: {post_id} for {platform} at {scheduled_datetime}")
                        else:
                            logger.error(f"Failed to save to database: {response.status_code}")
                            
                    except Exception as e:
                        logger.error(f"Exception saving scheduled post: {e}")
                elif not content_saved:
                    logger.warning(f"Skipping database save - generated_content entry doesn't exist")
                scheduled_ids.append(post_id)
                
            except Exception as e:
                logger.error(f"Failed to schedule post for {platform}: {e}")
        
        return scheduled_ids[0] if len(scheduled_ids) == 1 else scheduled_ids
    
    def get_scheduled_posts(self, user_id: Optional[str] = None) -> List[Dict]:
        """Get all scheduled posts, optionally filtered by user"""
        posts = list(self.scheduled_posts.values())
        
        if user_id:
            posts = [p for p in posts if p.get('user_id') == user_id]
        
        posts.sort(key=lambda x: x.get('scheduled_datetime', ''))
        
        formatted_posts = []
        for post in posts:
            formatted_post = {
                'id': post.get('id'),
                'date': post.get('scheduled_datetime', '').split('T')[0] if 'T' in post.get('scheduled_datetime', '') else post.get('scheduled_datetime', '').split(' ')[0],
                'time': post.get('scheduled_datetime', '').split('T')[1][:5] if 'T' in post.get('scheduled_datetime', '') else post.get('scheduled_datetime', '').split(' ')[1] if ' ' in post.get('scheduled_datetime', '') else '10:00',
                'platform': post.get('platforms', ['LinkedIn'])[0] if post.get('platforms') else 'LinkedIn',
                'platforms': post.get('platforms', ['LinkedIn']),
                'status': post.get('status', 'scheduled'),
                'title': post.get('content', {}).get('headline') or post.get('content', {}).get('hook', 'Scheduled Post'),
                'caption': post.get('content', {}).get('caption') or post.get('content', {}).get('text', ''),
                'hook': post.get('content', {}).get('hook', ''),
                'call_to_action': post.get('content', {}).get('call_to_action', ''),
                'hashtags': post.get('content', {}).get('hashtags', []),
                'image_prompt': post.get('content', {}).get('image_prompt', ''),
                'image_url': post.get('content', {}).get('image_url', ''),
                'type': 'Scheduled',
                'scheduled_datetime': post.get('scheduled_datetime'),
                'posted_at': post.get('posted_at'),
                'results': post.get('results', {})
            }
            formatted_posts.append(formatted_post)
        
        return formatted_posts
    
    def get_post(self, post_id: str) -> Optional[Dict]:
        """Get a specific scheduled post"""
        return self.scheduled_posts.get(post_id)
    
    def cancel_post(self, post_id: str) -> bool:
        """Cancel a scheduled post"""
        if post_id in self.scheduled_posts:
            post = self.scheduled_posts[post_id]
            if post['status'] == 'scheduled':
                del self.scheduled_posts[post_id]
                logger.info(f"✓ Cancelled scheduled post {post_id}")
                return True
        return False
    
    async def check_and_post(self, zendbx_service):
        """Check for posts that need to be published and post them"""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        posts_to_check = []
        
        if zendbx_service:
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{zendbx_service.base_url}/scheduled_posts?status=eq.scheduled&order=scheduled_at.asc&select=*",
                        headers={"Range": "0-999", **zendbx_service.headers},
                        timeout=30.0
                    )
                
                if response.status_code == 200:
                    db_posts = response.json()
                    logger.info(f"Found {len(db_posts)} scheduled posts")
                    
                    for db_post in db_posts:
                        scheduled_at = db_post.get('scheduled_at')
                        
                        if scheduled_at:
                            try:
                                if isinstance(scheduled_at, str):
                                    scheduled_dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                                else:
                                    scheduled_dt = scheduled_at
                                
                                metadata = db_post.get('metadata', {})
                                if isinstance(metadata, str):
                                    import json
                                    metadata = json.loads(metadata)
                                elif not isinstance(metadata, dict):
                                    metadata = {}
                                
                                post_data = {
                                    'id': db_post['id'],
                                    'user_id': db_post.get('user_id') or metadata.get('user_id'),
                                    'generated_content_id': db_post.get('generated_content_id'),
                                    'social_account_id': db_post.get('social_account_id'),
                                    'scheduled_datetime': scheduled_dt,
                                    'platforms': [db_post.get('platform')],
                                    'content': {
                                        'headline': metadata.get('headline'),
                                        'hook': metadata.get('hook'),
                                        'caption': metadata.get('caption') or metadata.get('text'),
                                        'call_to_action': metadata.get('call_to_action'),
                                        'hashtags': metadata.get('hashtags', []),
                                        'image_prompt': metadata.get('image_prompt'),
                                        'image_url': metadata.get('image_url')
                                    },
                                    'status': 'scheduled',
                                    'db_post': db_post
                                }
                                
                                posts_to_check.append(post_data)
                                
                            except Exception as parse_error:
                                logger.error(f"Failed to parse post {db_post['id']}: {parse_error}")
                
                else:
                    logger.error(f"Failed to fetch scheduled posts: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Failed to load scheduled posts: {e}")
        
        posts_published = 0
        posts_waiting = 0
        
        # Log current time for debugging
        logger.info(f"🕐 Current UTC time: {now.isoformat()}")
        logger.info(f"📋 Checking {len(posts_to_check)} scheduled post(s)")
        
        for post in posts_to_check:
            scheduled_dt = post['scheduled_datetime']
            
            # Detailed time comparison logging
            time_diff = (scheduled_dt - now).total_seconds()
            logger.info(f"📌 Post {post['id'][:8]}...")
            logger.info(f"   Scheduled for: {scheduled_dt.isoformat()}")
            logger.info(f"   Time until publish: {time_diff:.0f} seconds ({time_diff/60:.1f} minutes)")
            logger.info(f"   Should publish? {scheduled_dt <= now}")
            
            if scheduled_dt <= now:
                logger.info(f"⏰ Publishing post: {post['id'][:8]}... to {post.get('platforms')}")
                
                posts_published += 1
                
                await self._post_to_platforms(post, zendbx_service)
                
                try:
                    async with httpx.AsyncClient() as client:
                        await client.patch(
                            f"{zendbx_service.base_url}/scheduled_posts?id=eq.{post['id']}",
                            headers=zendbx_service.headers,
                            json={'status': 'completed', 'posted_at': now.isoformat()},
                            timeout=30.0
                        )
                except Exception as update_error:
                    logger.warning(f"Failed to update post status: {update_error}")
                
            else:
                posts_waiting += 1
                if posts_waiting <= 3:
                    time_left = (scheduled_dt - now).total_seconds()
                    hours = int(time_left // 3600)
                    minutes = int((time_left % 3600) // 60)
                    logger.info(f"⏳ Post {post['id'][:8]}... in {hours}h {minutes}m")
        
        logger.info(f"📊 Summary: {posts_published} published, {posts_waiting} waiting")
    
    async def _post_to_platforms(self, post: Dict, zendbx_service):
        """Post content to specified platforms"""
        user_id = post['user_id']
        content = post['content']
        platforms = post['platforms']
        
        results = {}
        has_error = False
        
        # Prepare post text
        text_parts = []
        if content.get('hook'):
            text_parts.append(content['hook'])
        if content.get('caption') or content.get('text'):
            text_parts.append(content.get('caption') or content.get('text'))
        if content.get('call_to_action'):
            text_parts.append(content['call_to_action'])
        if content.get('hashtags'):
            hashtags = content['hashtags'] if isinstance(content['hashtags'], list) else [content['hashtags']]
            text_parts.append(' '.join(hashtags))
        
        post_text = '\n\n'.join(text_parts)
        
        # Generate image if needed
        image_url = content.get('image_url')
        image_bytes = None
        
        if content.get('image_prompt') and not image_url:
            try:
                from services.image_generation_service import ImageGenerationService
                image_service = ImageGenerationService()
                
                result = await image_service.generate_image(
                    prompt=content['image_prompt'],
                    user_id=user_id,
                    campaign_id=post.get('id')
                )
                
                if result.get('status') == 'completed':
                    image_url = result.get('public_image_url') or result.get('image_url')
                    image_bytes = result.get('image_bytes')
                    logger.info(f"✅ Image generated")
                    
            except Exception as img_error:
                logger.error(f"Image generation error: {str(img_error)}")
        
        # Get user's connected accounts
        try:
            accounts = await zendbx_service.get_user_social_accounts(user_id)
            if not accounts:
                raise Exception("No connected social accounts found")
            
        except Exception as e:
            logger.error(f"Failed to fetch accounts: {e}")
            post['status'] = 'failed'
            post['error'] = 'No connected accounts'
            return
        
        # Import services
        from services.linkedin_service import LinkedInService
        from services.twitter_service import TwitterService
        from services.facebook_service import FacebookService
        from services.instagram_service import InstagramService
        
        linkedin_service = LinkedInService()
        twitter_service = TwitterService()
        facebook_service = FacebookService()
        instagram_service = InstagramService()
        
        # Post to each platform
        for platform in platforms:
            platform_lower = platform.lower()
            
            try:
                # Find matching account
                account = None
                for acc in accounts:
                    if acc.get('platform', '').lower() == platform_lower:
                        account = acc
                        break
                
                if not account:
                    results[platform] = {'error': 'No connected account'}
                    continue
                
                access_token = account.get('access_token')
                if not access_token:
                    results[platform] = {'error': 'No access token'}
                    continue
                
                if platform_lower == 'linkedin':
                    account_name = account.get('account_name', '')
                    is_company_page = '(Company)' in account_name or '(Company Page)' in account_name
                    
                    if is_company_page:
                        # account_id now contains the numeric organization ID (no lookup needed!)
                        org_id = account.get('account_id')
                        
                        if not org_id:
                            results[platform] = {'error': 'No organization ID found'}
                            logger.error(f"❌ No organization ID found for company page")
                        else:
                            logger.info(f"📝 Posting to LinkedIn company page with org ID: {org_id}")
                            response = await linkedin_service.post_to_company_page(
                                access_token=access_token,
                                company_id=org_id,  # This is now the numeric ID!
                                content=post_text,
                                image_url=image_url,
                                image_bytes=image_bytes
                            )
                            results[platform] = {'success': True, 'post_id': response.get('id')}
                            logger.info(f"✅ Posted to LinkedIn Company Page")
                    else:
                        response = await linkedin_service.post_to_profile(
                            access_token=access_token,
                            content=post_text,
                            image_url=image_url,
                            image_bytes=image_bytes
                        )
                        results[platform] = {'success': True, 'post_id': response.get('id')}
                        logger.info(f"✅ Posted to LinkedIn")
                
                
                elif platform_lower in ['twitter', 'x']:
                    oauth_token_secret = account.get('oauth_token_secret') or account.get('refresh_token')
                    if oauth_token_secret:
                        tweet_text = post_text[:280]
                        response = await twitter_service.post_tweet(
                            oauth_token=access_token,
                            oauth_token_secret=oauth_token_secret,
                            text=tweet_text
                        )
                        results[platform] = {'success': True, 'post_id': response.get('data', {}).get('id')}
                        logger.info(f"✅ Posted to Twitter")
                    else:
                        results[platform] = {'error': 'Missing oauth_token_secret'}
                
                elif platform_lower == 'facebook':
                    response = await facebook_service.post_to_profile(
                        access_token=access_token,
                        message=post_text
                    )
                    results[platform] = {'success': True, 'post_id': response.get('id')}
                    logger.info(f"✅ Posted to Facebook")
                
                elif platform_lower == 'instagram':
                    instagram_account_id = account.get('account_id')
                    
                    if not instagram_account_id:
                        results[platform] = {'error': 'Instagram requires account_id'}
                        has_error = True
                    elif not image_url and not image_bytes:
                        results[platform] = {'error': 'Instagram requires an image'}
                        has_error = True
                    else:
                        instagram_image_url = await ensure_public_image_url(
                            image_url=image_url,
                            image_bytes=image_bytes,
                            filename_hint=f"ig-{post.get('id', uuid.uuid4())}",
                        )
                        if not instagram_image_url:
                            results[platform] = {'error': 'Could not prepare public image URL'}
                            has_error = True
                        else:
                            response = await instagram_service.post_to_instagram(
                                instagram_account_id=instagram_account_id,
                                access_token=access_token,
                                image_url=instagram_image_url,
                                caption=post_text
                            )
                            results[platform] = {'success': True, 'post_id': response.get('id')}
                            logger.info(f"✅ Posted to Instagram: {response.get('id')}")
                
            except Exception as e:
                logger.error(f"❌ Failed to post to {platform}: {str(e)}")
                results[platform] = {'error': str(e)}
                has_error = True
        
        success_count = len([r for r in results.values() if r.get('success')])
        post['status'] = 'posted' if success_count > 0 else 'failed'
        post['posted_at'] = datetime.now().isoformat()
        post['results'] = results
        
        if has_error:
            post['error'] = 'Some platforms failed'
        
        logger.info(f"✅ Post {post['id'][:8]}... completed - {success_count}/{len(platforms)} succeeded")
        
        # Update database
        try:
            import httpx
            scheduled_post_id = post.get('id')
            
            update_data = {
                'status': 'published' if success_count > 0 else 'failed',
                'published_at': datetime.now().isoformat(),
                'external_post_id': results.get(platforms[0], {}).get('post_id') if results else None,
                'publish_error': post.get('error') if has_error else None,
                'metadata': {
                    **post.get('content', {}),
                    'publish_results': results
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{zendbx_service.base_url}/scheduled_posts?id=eq.{scheduled_post_id}",
                    headers=zendbx_service.headers,
                    json=update_data,
                    timeout=30.0
                )
            
            if response.status_code not in [200, 204]:
                logger.warning(f"Failed to update scheduled_posts: {response.status_code}")
                
        except Exception as db_error:
            logger.warning(f"Failed to update database: {db_error}")
    
    async def start_scheduler(self, zendbx_service, interval_seconds: int = 60):
        """Start the background scheduler"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        self.is_running = True
        logger.info(f"🚀 POST SCHEDULER STARTED - checking every {interval_seconds}s")
        
        while self.is_running:
            try:
                await self.check_and_post(zendbx_service)
            except Exception as e:
                logger.error(f"Scheduler error: {str(e)}")
            
            await asyncio.sleep(interval_seconds)
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        self.is_running = False
        logger.info("🛑 POST SCHEDULER STOPPED")
    
    def get_stats(self) -> Dict:
        """Get scheduler statistics"""
        total = len(self.scheduled_posts)
        scheduled = sum(1 for p in self.scheduled_posts.values() if p['status'] == 'scheduled')
        posted = sum(1 for p in self.scheduled_posts.values() if p['status'] == 'posted')
        failed = sum(1 for p in self.scheduled_posts.values() if p['status'] == 'failed')
        
        return {
            'total_scheduled': total,
            'scheduled': scheduled,
            'posted': posted,
            'failed': failed,
            'is_running': self.is_running
        }

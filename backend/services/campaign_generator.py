"""
Campaign Generator
Generates executable social media campaigns from Marketing Intelligence
"""
import os
from openai import OpenAI
from groq import Groq
from typing import Dict, List
import json
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CampaignGenerator:
    """Generates social media campaigns from marketing intelligence"""
    
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "groq").lower()
        
        if self.provider == "openrouter":
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY not set")
            
            self.client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                default_headers={
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "ZenPost Campaign Generator"
                }
            )
            self.model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
            logger.info(f"✓ Campaign Generator using OpenRouter: {self.model}")
        else:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY not set")
            
            self.client = Groq(api_key=api_key)
            # Use faster 8b model
            self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
            logger.info(f"✓ Campaign Generator using Groq: {self.model}")
        
        # Reduce max_tokens significantly for content generation
        self.max_tokens = 6000  # Reduced from 8000, but keep higher for 30 posts
        logger.info(f"✓ Max tokens set to {self.max_tokens} (optimized)")
    
    async def generate_campaigns_from_intelligence(
        self, 
        marketing_intelligence: Dict,
        website_analysis: Dict,
        duration_days: int = 30
    ) -> Dict:
        """
        Generate complete social media campaigns from marketing intelligence
        
        Args:
            marketing_intelligence: Complete MI object with all 8 modules
            website_analysis: Original website analysis data
            duration_days: Campaign duration (default 30 days)
        
        Returns:
            campaigns: Complete campaign structure with calendar
        """
        try:
            logger.info("=" * 60)
            logger.info("CAMPAIGN GENERATOR STARTED")
            logger.info("=" * 60)
            
            # Extract relevant data
            business_name = marketing_intelligence.get('metadata', {}).get('business_name')
            industry = marketing_intelligence.get('metadata', {}).get('industry')
            
            business_intel = marketing_intelligence.get('business_intelligence', {})
            positioning = marketing_intelligence.get('positioning', {})
            strategy = marketing_intelligence.get('marketing_strategy', {})
            personas = marketing_intelligence.get('audience_personas', [])
            campaign_blueprints = marketing_intelligence.get('campaign_blueprints', [])
            
            # Select top 3 campaign blueprints
            selected_blueprints = campaign_blueprints[:3] if campaign_blueprints else []
            
            # Generate campaigns for each blueprint
            campaigns = []
            for i, blueprint in enumerate(selected_blueprints, 1):
                logger.info(f"Generating Campaign {i}/3: {blueprint.get('campaign_name')}...")
                
                campaign = await self._generate_single_campaign(
                    blueprint=blueprint,
                    business_intel=business_intel,
                    positioning=positioning,
                    strategy=strategy,
                    personas=personas,
                    duration_days=duration_days // 3  # Split duration across campaigns
                )
                
                campaigns.append(campaign)
                logger.info(f"✓ Campaign {i} generated with {len(campaign.get('calendar', []))} posts")
            
            # Generate master calendar
            master_calendar = self._create_master_calendar(campaigns, duration_days)
            
            result = {
                "campaigns": campaigns,
                "master_calendar": master_calendar,
                "summary": {
                    "total_campaigns": len(campaigns),
                    "total_posts": sum(len(c.get('calendar', [])) for c in campaigns),
                    "duration_days": duration_days,
                    "platforms": list(set(
                        platform 
                        for campaign in campaigns 
                        for post in campaign.get('calendar', []) 
                        for platform in post.get('platforms', [])
                    )),
                    "start_date": datetime.now().strftime("%Y-%m-%d"),
                    "end_date": (datetime.now() + timedelta(days=duration_days)).strftime("%Y-%m-%d")
                },
                "metadata": {
                    "business_name": business_name,
                    "industry": industry,
                    "generated_at": datetime.now().isoformat(),
                    "version": "1.0"
                }
            }
            
            logger.info("=" * 60)
            logger.info("✅ CAMPAIGN GENERATION COMPLETE")
            logger.info(f"Generated {len(campaigns)} campaigns with {result['summary']['total_posts']} posts")
            logger.info("=" * 60)
            
            return result
        
        except Exception as e:
            logger.error(f"Campaign generation failed: {str(e)}")
            raise
    
    async def _generate_single_campaign(
        self,
        blueprint: Dict,
        business_intel: Dict,
        positioning: Dict,
        strategy: Dict,
        personas: List[Dict],
        duration_days: int
    ) -> Dict:
        """Generate a single campaign with daily posts"""
        try:
            campaign_name = blueprint.get('campaign_name', 'Campaign')
            goal = blueprint.get('campaign_goal', 'engagement')
            platforms = blueprint.get('platforms', ['LinkedIn'])
            content_types = blueprint.get('recommended_content_types', [])
            key_message = blueprint.get('key_message', '')
            target_audience = blueprint.get('target_audience', '')
            
            # Get brand voice and messaging
            brand_voice = business_intel.get('brand_voice', 'Professional')
            uvp = positioning.get('unique_value_proposition', '')
            taglines = positioning.get('suggested_taglines', [])
            content_pillars = strategy.get('content_pillars', [])
            
            # Select persona for this campaign
            target_persona = personas[0] if personas else {}
            
            prompt = f"""Generate a complete {duration_days}-day social media campaign.

CAMPAIGN BRIEF:
- Campaign Name: {campaign_name}
- Goal: {goal}
- Key Message: {key_message}
- Target Audience: {target_audience}
- Platforms: {', '.join(platforms)}
- Content Types: {', '.join(content_types)}

BRAND GUIDELINES:
- Brand Voice: {brand_voice}
- Value Proposition: {uvp}
- Tagline: {taglines[0] if taglines else 'Not specified'}

TARGET PERSONA:
- Name: {target_persona.get('persona_name', 'Professional')}
- Goals: {', '.join(target_persona.get('goals', [])[:3])}
- Pain Points: {', '.join(target_persona.get('pain_points', [])[:3])}
- Preferred CTA: {target_persona.get('preferred_cta', 'Learn More')}

CONTENT PILLARS:
{', '.join([p.get('pillar', '') for p in content_pillars[:3]])}

Generate {duration_days} daily posts in JSON format:
{{
  "campaign_name": "{campaign_name}",
  "campaign_goal": "{goal}",
  "duration_days": {duration_days},
  "calendar": [
    {{
      "day": 1,
      "date": "2024-01-01",
      "platforms": ["LinkedIn", "Twitter"],
      "post_type": "Educational|Promotional|Engagement|Story|Testimonial",
      "content_pillar": "pillar name",
      "headline": "attention-grabbing headline",
      "caption": "full post caption (150-250 words for LinkedIn, 100-150 for others)",
      "hook": "compelling first line",
      "body": "main content with value",
      "call_to_action": "specific CTA",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "image_prompt": "detailed image generation prompt for DALL-E or Midjourney",
      "best_time": "09:00 AM|12:00 PM|03:00 PM|05:00 PM",
      "engagement_goal": "Likes|Comments|Shares|Clicks",
      "platform_specific": {{
        "LinkedIn": {{"format": "Article|Post|Carousel", "length": "detailed"}},
        "Twitter": {{"format": "Thread|Single", "length": "280 chars"}},
        "Instagram": {{"format": "Feed|Story|Reel", "aspect_ratio": "1:1|9:16"}},
        "Facebook": {{"format": "Post|Story", "length": "medium"}}
      }}
    }}
  ]
}}

REQUIREMENTS:
- Vary post types: 40% educational, 30% engagement, 20% promotional, 10% testimonial
- Mix platforms: Don't post same content everywhere
- Alternate content pillars
- Include specific, actionable CTAs
- Write compelling hooks that stop scrolling
- Create detailed image prompts for each post
- Vary posting times throughout the day
- Keep captions conversational and valuable
- Use emojis sparingly and appropriately
- Include questions to drive engagement

Generate {duration_days} unique, high-quality posts."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert social media campaign strategist. Create engaging, platform-specific content that drives results. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.9,  # Higher creativity for content
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            campaign_data = json.loads(response.choices[0].message.content)
            
            # Add dates to calendar
            start_date = datetime.now()
            for i, post in enumerate(campaign_data.get('calendar', [])):
                post['date'] = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                post['day'] = i + 1
            
            return campaign_data
        
        except Exception as e:
            logger.error(f"Single campaign generation error: {str(e)}")
            return self._get_default_campaign(blueprint, duration_days)
    
    def _create_master_calendar(self, campaigns: List[Dict], duration_days: int) -> List[Dict]:
        """Combine all campaign calendars into one master calendar"""
        master = []
        
        for campaign in campaigns:
            campaign_name = campaign.get('campaign_name', 'Campaign')
            for post in campaign.get('calendar', []):
                master.append({
                    **post,
                    "campaign_name": campaign_name,
                    "campaign_goal": campaign.get('campaign_goal')
                })
        
        # Sort by date
        master.sort(key=lambda x: x.get('date', ''))
        
        return master
    
    def _get_default_campaign(self, blueprint: Dict, duration_days: int) -> Dict:
        """Fallback campaign if AI generation fails"""
        campaign_name = blueprint.get('campaign_name', 'Campaign')
        platforms = blueprint.get('platforms', ['LinkedIn'])
        
        calendar = []
        start_date = datetime.now()
        
        post_templates = [
            {
                "post_type": "Educational",
                "headline": "Industry Insight",
                "caption": "Share valuable insights about your industry and how your solution helps.",
                "hook": "Did you know that...",
                "call_to_action": "Learn more",
                "content_pillar": "Education"
            },
            {
                "post_type": "Engagement",
                "headline": "Question for the community",
                "caption": "Ask your audience a thought-provoking question to drive discussion.",
                "hook": "We're curious...",
                "call_to_action": "Comment below",
                "content_pillar": "Community"
            },
            {
                "post_type": "Promotional",
                "headline": "Feature Highlight",
                "caption": "Showcase a key feature or benefit of your product/service.",
                "hook": "Introducing...",
                "call_to_action": "Try it now",
                "content_pillar": "Product"
            }
        ]
        
        for i in range(duration_days):
            template = post_templates[i % len(post_templates)]
            post_date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            
            calendar.append({
                "day": i + 1,
                "date": post_date,
                "platforms": platforms,
                "post_type": template['post_type'],
                "content_pillar": template['content_pillar'],
                "headline": template['headline'],
                "caption": template['caption'],
                "hook": template['hook'],
                "body": "Provide value to your audience with this post.",
                "call_to_action": template['call_to_action'],
                "hashtags": ["#business", "#growth", "#success"],
                "image_prompt": "Professional business image related to the topic",
                "best_time": "09:00 AM",
                "engagement_goal": "Comments"
            })
        
        return {
            "campaign_name": campaign_name,
            "campaign_goal": blueprint.get('campaign_goal', 'engagement'),
            "duration_days": duration_days,
            "calendar": calendar
        }

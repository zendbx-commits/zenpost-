"""
Steps 5-13: AI-Powered Analysis Using Groq or OpenRouter
- Brand Analysis
- Audience Detection  
- Business Summary
- Competitor Discovery & Analysis
- Marketing Strategy
- Campaign Calendar
- Content Generation
- AI Recommendations
"""
import os
from groq import Groq
from openai import OpenAI
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """AI-powered analysis using Groq, OpenRouter, or Ollama"""
    
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "groq").lower()
        logger.info(f"DEBUG: AI_PROVIDER from env = '{self.provider}'")
        
        if self.provider == "ollama":
            # Ollama local LLM
            logger.info("DEBUG: Using Ollama local LLM")
            self.client = OpenAI(
                base_url="http://localhost:11434/v1",
                api_key="ollama",  # Ollama doesn't need real API key
            )
            self.model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
            logger.info(f"✓ Using Ollama with model: {self.model}")
            logger.info(f"✓ Base URL: http://localhost:11434/v1")
            
        elif self.provider == "openrouter":
            # OpenRouter uses OpenAI-compatible API
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY environment variable not set")
            
            logger.info(f"DEBUG: Creating OpenAI client with base_url=https://openrouter.ai/api/v1")
            self.client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                default_headers={
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "ZenPost AI Analysis"
                }
            )
            self.model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
            logger.info(f"✓ Using OpenRouter with model: {self.model}")
            logger.info(f"✓ Base URL: https://openrouter.ai/api/v1")
        else:
            # Groq - use faster, cheaper model
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY environment variable not set")
            
            logger.info(f"DEBUG: Creating Groq client")
            self.client = Groq(api_key=api_key)
            # Use llama-3.1-8b-instant - MUCH faster and cheaper than 70b
            self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
            logger.info(f"✓ Using Groq with model: {self.model}")
        
        # Reduce max_tokens to save costs
        self.max_tokens = 4000  # Reduced from 8000
        logger.info(f"DEBUG: Client type = {type(self.client).__name__}")
        logger.info(f"DEBUG: Max tokens set to {self.max_tokens} (optimized for cost)")

    
    async def analyze_brand(self, extracted_data: Dict) -> Dict:
        """Step 5: Brand Analysis"""
        try:
            logger.info("Starting brand analysis...")
            
            prompt = self._build_brand_analysis_prompt(extracted_data)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a senior brand strategist and consultant. Analyze the provided website content and extract detailed brand insights. Return ONLY valid JSON, no markdown or additional text."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Brand analysis completed")
            return result
        
        except Exception as e:
            logger.error(f"Brand analysis error: {str(e)}")
            return self._get_default_brand_analysis()
    
    async def detect_audience(self, extracted_data: Dict, brand_data: Dict) -> Dict:
        """Step 6: Audience Detection"""
        try:
            logger.info("Starting audience detection...")
            
            prompt = self._build_audience_detection_prompt(extracted_data, brand_data)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert market researcher and customer psychologist. Analyze the business and determine the ideal target audience. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Audience detection completed")
            return result
        
        except Exception as e:
            logger.error(f"Audience detection error: {str(e)}")
            return self._get_default_audience()
    
    async def detect_company_profile(self, extracted_data: Dict) -> Dict:
        """Detect company size and stage for better competitor matching"""
        try:
            logger.info("Detecting company profile...")
            
            prompt = f"""Analyze this business and determine its size/stage:

Business: {extracted_data.get('business_name')}
Website: {extracted_data.get('website')}
Location: {extracted_data.get('location')}
Geographic Scope: {extracted_data.get('geographic_scope')}
Products/Services Count: {len(extracted_data.get('products', []))} products, {len(extracted_data.get('services', []))} services
Has Blog: {extracted_data.get('has_blog')}
Social Presence: {len(extracted_data.get('contact', {}).get('social_links', {}))} platforms

Description snippet:
{extracted_data.get('description', '')[:500]}

Determine:
{{
  "company_size": "startup|small|medium|large|enterprise",
  "business_stage": "early-stage|growth-stage|established|mature",
  "estimated_employee_range": "1-10|10-50|50-200|200-1000|1000+",
  "market_presence": "emerging|local|regional|national|international",
  "company_maturity_indicators": ["indicator1", "indicator2"],
  "competition_tier": "startup-tier|sme-tier|enterprise-tier"
}}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a business analyst. Assess company size and stage accurately. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.5,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"Company profile: {result.get('company_size')} {result.get('business_stage')}")
            return result
        
        except Exception as e:
            logger.error(f"Company profile detection error: {str(e)}")
            return {
                "company_size": "small",
                "business_stage": "established",
                "estimated_employee_range": "10-50",
                "market_presence": "regional",
                "company_maturity_indicators": [],
                "competition_tier": "sme-tier"
            }
    
    async def generate_business_summary(self, extracted_data: Dict, brand_data: Dict) -> Dict:
        """Step 7: Business Summary"""
        try:
            logger.info("Generating business summary...")
            
            prompt = self._build_business_summary_prompt(extracted_data, brand_data)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a business analyst. Create comprehensive business summaries. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Business summary completed")
            return result
        
        except Exception as e:
            logger.error(f"Business summary error: {str(e)}")
            return self._get_default_business_summary(extracted_data)
    
    async def discover_competitors(self, extracted_data: Dict, brand_data: Dict, company_profile: Dict) -> List[Dict]:
        """Step 8: Competitor Discovery"""
        try:
            logger.info("Discovering competitors...")
            
            prompt = self._build_competitor_discovery_prompt(extracted_data, brand_data, company_profile)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a competitive intelligence analyst. Identify realistic, comparable competitors based on company size and stage. Return ONLY valid JSON with an array of competitors."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            competitors = result.get('competitors', [])[:10]
            
            # If no competitors found, generate generic ones based on industry
            if not competitors or len(competitors) == 0:
                logger.warning("No competitors returned by AI, generating defaults based on industry")
                industry = brand_data.get('industry', 'Technology')
                competitors = self._generate_default_competitors(industry, company_profile)
            
            logger.info(f"Discovered {len(competitors)} competitors")
            return competitors
        
        except Exception as e:
            logger.error(f"Competitor discovery error: {str(e)}")
            # Return industry-based defaults
            industry = brand_data.get('industry', 'Technology')
            return self._generate_default_competitors(industry, company_profile)
    
    async def analyze_competitors(self, competitors: List[Dict], brand_data: Dict) -> List[Dict]:
        """Step 9: Competitor Analysis"""
        try:
            logger.info("Analyzing competitors...")
            
            if not competitors:
                return []
            
            prompt = self._build_competitor_analysis_prompt(competitors, brand_data)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a competitive strategy consultant. Analyze competitors and provide detailed insights. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Competitor analysis completed")
            return result.get('analysis', competitors)
        
        except Exception as e:
            logger.error(f"Competitor analysis error: {str(e)}")
            return competitors
    
    async def generate_marketing_strategy(
        self, 
        extracted_data: Dict, 
        brand_data: Dict, 
        audience_data: Dict,
        competitors: List[Dict]
    ) -> Dict:
        """Step 10: Marketing Strategy"""
        try:
            logger.info("Generating marketing strategy...")
            
            prompt = self._build_marketing_strategy_prompt(
                extracted_data, brand_data, audience_data, competitors
            )
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a senior marketing strategist and growth expert. Create comprehensive marketing strategies. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Marketing strategy completed")
            return result
        
        except Exception as e:
            logger.error(f"Marketing strategy error: {str(e)}")
            return self._get_default_marketing_strategy()
    
    async def generate_campaign_calendar(
        self, 
        brand_data: Dict, 
        audience_data: Dict,
        marketing_strategy: Dict
    ) -> List[Dict]:
        """Step 11: Campaign Calendar (30 days)"""
        try:
            logger.info("Generating 30-day campaign calendar...")
            logger.info(f"Input data types - brand: {type(brand_data)}, audience: {type(audience_data)}, strategy: {type(marketing_strategy)}")
            
            prompt = self._build_campaign_calendar_prompt(
                brand_data, audience_data, marketing_strategy
            )
            
            logger.info(f"Prompt length: {len(prompt)} chars")
            logger.info(f"Prompt preview (first 300 chars): {prompt[:300]}...")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a content strategist. Create 30-day calendar with engaging posts. Return valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=5000,  # Reduced from 8000
                response_format={"type": "json_object"}  # Ensure JSON response
            )
            
            # Get the raw response content
            raw_content = response.choices[0].message.content
            logger.info(f"Raw AI response length: {len(raw_content) if raw_content else 0} chars")
            
            if not raw_content or raw_content.strip() == "":
                logger.error("AI returned empty response")
                return []
            
            # Log first 200 chars of response to debug
            logger.info(f"Response preview: {raw_content[:200]}...")
            
            # Try to parse JSON
            try:
                result = json.loads(raw_content)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error: {e}")
                logger.error(f"Failed content (first 500 chars): {raw_content[:500]}")
                return []
            
            calendar = result.get('calendar', [])[:30]
            
            if not calendar or len(calendar) == 0:
                logger.warning("AI returned empty calendar array")
                logger.warning(f"Full response: {json.dumps(result, indent=2)[:500]}")
                return []
            
            # Log the first post to see the structure
            if calendar and len(calendar) > 0:
                logger.info(f"Sample post structure: {json.dumps(calendar[0], indent=2)}")
            
            logger.info(f"Generated {len(calendar)} days of content")
            return calendar
        
        except Exception as e:
            logger.error(f"Campaign calendar error: {str(e)}")
            logger.exception("Full traceback:")
            return []
    
    async def generate_content_ideas(
        self, 
        brand_data: Dict, 
        audience_data: Dict,
        marketing_strategy: Dict
    ) -> Dict:
        """Step 12: Content Generation Ideas"""
        try:
            logger.info("Generating content ideas...")
            
            prompt = self._build_content_generation_prompt(
                brand_data, audience_data, marketing_strategy
            )
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a content strategist. Generate diverse content ideas across platforms. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.9,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Check if result is empty or has no useful content
            has_content = any([
                result.get('linkedin_posts'),
                result.get('blog_ideas'),
                result.get('twitter_threads'),
                result.get('instagram_captions')
            ])
            
            if not has_content:
                logger.warning("AI returned empty content, using defaults")
                return self._get_default_content_ideas()
            
            logger.info(f"Content ideas generated: {len(result.get('linkedin_posts', []))} LinkedIn, {len(result.get('blog_ideas', []))} blogs")
            return result
        
        except Exception as e:
            logger.error(f"Content generation error: {str(e)}")
            return self._get_default_content_ideas()
    
    async def generate_recommendations(
        self, 
        extracted_data: Dict,
        seo_data: Dict,
        brand_data: Dict,
        competitors: List[Dict]
    ) -> Dict:
        """Step 13: AI Recommendations"""
        try:
            logger.info("Generating AI recommendations...")
            
            prompt = self._build_recommendations_prompt(
                extracted_data, seo_data, brand_data, competitors
            )
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a digital marketing consultant. Provide actionable recommendations for improvement. Return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("Recommendations generated")
            return result
        
        except Exception as e:
            logger.error(f"Recommendations error: {str(e)}")
            return self._get_default_recommendations()
    
    # Prompt builders
    def _build_brand_analysis_prompt(self, data: Dict) -> str:
        return f"""Analyze this website and extract brand insights:

Business: {data.get('business_name')}
Website: {data.get('website')}
Tagline: {data.get('tagline')}
Description: {data.get('description')}
Products: {', '.join(data.get('products', [])[:10])}
Services: {', '.join(data.get('services', [])[:10])}
Features: {', '.join(data.get('features', [])[:10])}

Homepage Content (first 1000 chars):
{data.get('raw_content', {}).get('homepage', '')[:1000]}

About Content (first 1000 chars):
{data.get('raw_content', {}).get('about', '')[:1000]}

Return JSON with:
{{
  "brand_voice": "description of tone and style",
  "tone": ["adjective1", "adjective2", "adjective3"],
  "writing_style": "description",
  "personality": ["trait1", "trait2", "trait3"],
  "unique_selling_proposition": "what makes them unique",
  "value_proposition": "value they provide",
  "core_messaging": ["message1", "message2", "message3"],
  "customer_pain_points": ["pain1", "pain2", "pain3"],
  "customer_benefits": ["benefit1", "benefit2", "benefit3"],
  "brand_positioning": "how they position themselves",
  "industry": "industry classification",
  "category": "business category"
}}"""
    
    def _build_audience_detection_prompt(self, data: Dict, brand: Dict) -> str:
        return f"""Based on this business, determine the ideal target audience:

Business: {data.get('business_name')}
Industry: {brand.get('industry')}
Category: {brand.get('category')}
Products/Services: {', '.join(data.get('products', [])[:5] + data.get('services', [])[:5])}
Value Proposition: {brand.get('value_proposition')}
Pain Points: {', '.join(brand.get('customer_pain_points', []))}

Return JSON with:
{{
  "ideal_customer": "description",
  "industries": ["industry1", "industry2", "industry3"],
  "company_sizes": ["Small (1-50)", "Medium (51-200)", "Enterprise (200+)"],
  "job_titles": ["title1", "title2", "title3"],
  "decision_makers": ["role1", "role2"],
  "geography": ["region1", "region2"],
  "languages": ["language1", "language2"],
  "customer_intent": "what they're looking for",
  "buyer_personas": [
    {{
      "name": "Persona Name",
      "role": "Job Title",
      "goals": ["goal1", "goal2"],
      "challenges": ["challenge1", "challenge2"],
      "buying_motivations": ["motivation1", "motivation2"]
    }}
  ]
}}"""
    
    def _build_business_summary_prompt(self, data: Dict, brand: Dict) -> str:
        return f"""Create comprehensive business summaries for:

Business: {data.get('business_name')}
Industry: {brand.get('industry')}
Website: {data.get('website')}
Description: {data.get('description')[:500]}

Return JSON with:
{{
  "short_summary": "1-2 sentence summary",
  "detailed_summary": "3-4 paragraph detailed description",
  "elevator_pitch": "30-second pitch",
  "company_overview": "comprehensive overview",
  "mission": "company mission",
  "vision": "company vision"
}}"""
    
    def _build_competitor_discovery_prompt(self, data: Dict, brand: Dict, company_profile: Dict) -> str:
        return f"""Discover direct competitors for this business:

Business: {data.get('business_name')}
Industry: {brand.get('industry')}
Category: {brand.get('category')}
Products: {', '.join(data.get('products', [])[:10])}
Services: {', '.join(data.get('services', [])[:10])}
Location: {data.get('location', 'Not specified')}
Geographic Scope: {data.get('geographic_scope', 'Not specified')}

COMPANY PROFILE:
- Size: {company_profile.get('company_size', 'small')}
- Stage: {company_profile.get('business_stage', 'established')}
- Employee Range: {company_profile.get('estimated_employee_range', '10-50')}
- Market Presence: {company_profile.get('market_presence', 'regional')}
- Competition Tier: {company_profile.get('competition_tier', 'sme-tier')}

CRITICAL REQUIREMENTS FOR COMPETITOR SELECTION:
1. Match company SIZE: Find companies in the SAME size category ({company_profile.get('company_size', 'small')})
2. Match STAGE: Similar business maturity ({company_profile.get('business_stage', 'established')})
3. Match GEOGRAPHY: If local/regional, find LOCAL/REGIONAL competitors first
4. Find DIRECT COMPETITORS - companies offering similar products/services to similar customers
5. Prioritize ACTIONABLE competition - businesses they can realistically compete with

AVOID:
❌ Fortune 500 companies unless target IS Fortune 500
❌ Global giants when target is regional
❌ Enterprise corporations when target is SME/startup
❌ Companies 10x+ larger in scale

PREFER:
✅ Similar-sized companies in same market
✅ Local/regional players if target is local/regional  
✅ Companies at similar business stage
✅ Direct product/service overlap
✅ Competing for same customer segments

EXAMPLES OF GOOD MATCHES:
- Local real estate developer → Other local/regional developers in same city/region
- Regional SaaS startup → Other B2B SaaS companies at similar scale
- SME restaurant chain → Other regional restaurant chains
- Startup marketplace → Other marketplace startups in same niche

Return JSON with 5-10 realistic, comparable competitors:
{{
  "competitors": [
    {{
      "name": "Competitor Name",
      "website": "https://example.com",
      "type": "direct|indirect|alternative",
      "description": "what they do and why they're comparable",
      "market_position": "emerging|growing|established",
      "company_size": "startup|small|medium",
      "geographic_scope": "local|regional|national|international",
      "similarity_score": "high|medium",
      "why_comparable": "explanation of why this is a good match"
    }}
  ]
}}

Focus on competitors that provide ACTIONABLE insights and realistic competitive intelligence."""
    
    def _build_competitor_analysis_prompt(self, competitors: List[Dict], brand: Dict) -> str:
        competitor_list = '\n'.join([
            f"- {c.get('name')}: {c.get('website')} ({c.get('company_size', 'unknown')} - {c.get('type', 'unknown')})"
            for c in competitors[:5]
        ])
        
        return f"""Analyze these competitors with actionable insights:

Main Brand Industry: {brand.get('industry')}
Main Brand USP: {brand.get('unique_selling_proposition')}

Competitors (similar size/stage):
{competitor_list}

FOCUS ON:
- What they do WELL that can be learned from
- Their WEAKNESSES that present opportunities
- Their MARKETING TACTICS and positioning strategies
- Their TARGET AUDIENCE overlap and differences
- Content strategies, messaging, design approaches
- Pricing strategies and business models

For each competitor, provide PRACTICAL insights:
{{
  "analysis": [
    {{
      "name": "competitor name",
      "website": "their website",
      "strengths": ["specific strength", "what they do well"],
      "weaknesses": ["specific gap", "area of opportunity"],
      "unique_features": ["feature that stands out", "differentiation"],
      "target_audience": "who they target",
      "marketing_approach": "how they market (channels, tone, tactics)",
      "content_strategy": "their content approach",
      "lessons_to_learn": ["takeaway 1", "takeaway 2"],
      "opportunities_to_exploit": ["gap 1", "gap 2"]
    }}
  ],
  "competitive_advantages": ["our unique strength vs them", "how we can differentiate"],
  "market_gaps": ["unmet need in market", "opportunity area"],
  "strategic_recommendations": ["action 1 based on analysis", "action 2"]
}}

Provide insights that help an SME/startup compete effectively."""
    
    def _build_marketing_strategy_prompt(
        self, data: Dict, brand: Dict, audience: Dict, competitors: List[Dict]
    ) -> str:
        return f"""Create a comprehensive marketing strategy:

Business: {data.get('business_name')}
Industry: {brand.get('industry')}
Brand Voice: {brand.get('brand_voice')}
Target Audience: {audience.get('ideal_customer')}
Competitors: {len(competitors)} identified

Return JSON with:
{{
  "marketing_goals": ["goal1", "goal2", "goal3"],
  "swot_analysis": {{
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"]
  }},
  "unique_positioning": "how to differentiate",
  "content_pillars": ["pillar1", "pillar2", "pillar3"],
  "recommended_platforms": [
    {{
      "platform": "LinkedIn",
      "priority": "high|medium|low",
      "reason": "why this platform",
      "posting_frequency": "3-5 times per week"
    }}
  ],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "content_themes": ["theme1", "theme2", "theme3"],
  "growth_opportunities": ["opportunity1", "opportunity2"],
  "marketing_roadmap": [
    {{
      "phase": "Phase 1: Foundation",
      "duration": "1-2 months",
      "activities": ["activity1", "activity2"]
    }}
  ]
}}"""
    
    def _build_campaign_calendar_prompt(
        self, brand: Dict, audience: Dict, strategy: Dict
    ) -> str:
        # Handle content_pillars - could be list of strings or list of dicts
        content_pillars = strategy.get('content_pillars', [])
        if content_pillars and isinstance(content_pillars[0], dict):
            content_pillars = [p.get('pillar', '') for p in content_pillars][:3]  # Limit to 3
        
        # Handle platforms - extract platform names
        recommended_platforms = strategy.get('recommended_platforms', [])
        if recommended_platforms and isinstance(recommended_platforms[0], dict):
            platforms = [p.get('platform', '') for p in recommended_platforms][:2]  # Limit to 2
        else:
            platforms = recommended_platforms[:2] if recommended_platforms else ['LinkedIn']
        
        # Shortened prompt
        return f"""Generate 30-day content calendar.

Brand: {brand.get('brand_voice', 'Professional')}
Audience: {audience.get('persona_name', 'Business professionals')}
Topics: {', '.join(content_pillars[:3]) if content_pillars else 'Tips, Insights'}
Platforms: {', '.join(platforms) if platforms else 'LinkedIn'}

Return JSON with 30 posts:
{{
  "calendar": [
    {{
      "day": 1,
      "date": "2024-01-01",
      "platform": "LinkedIn",
      "content_type": "Post",
      "title": "Post title",
      "caption": "150-word caption with value",
      "hook": "Opening line",
      "call_to_action": "CTA",
      "hashtags": ["#tag1", "#tag2"],
      "image_prompt": "Image description",
      "publishing_time": "09:00 AM",
      "goal": "engagement"
    }}
  ]
}}

Generate all 30 days with varied content."""
    
    def _build_content_generation_prompt(
        self, brand: Dict, audience: Dict, strategy: Dict
    ) -> str:
        return f"""Generate diverse content ideas:

Brand: {brand.get('brand_voice')}
Audience: {audience.get('ideal_customer')}
Themes: {', '.join(strategy.get('content_themes', []))}

Return JSON with:
{{
  "linkedin_posts": [
    {{
      "topic": "topic",
      "hook": "first line",
      "caption": "full post"
    }}
  ],
  "twitter_threads": [
    {{
      "topic": "topic",
      "tweets": ["tweet1", "tweet2", "tweet3"]
    }}
  ],
  "instagram_captions": ["caption1", "caption2"],
  "facebook_posts": ["post1", "post2"],
  "blog_ideas": [
    {{
      "title": "blog title",
      "outline": ["point1", "point2", "point3"]
    }}
  ],
  "video_scripts": [
    {{
      "title": "video title",
      "script": "video script",
      "duration": "60 seconds"
    }}
  ],
  "email_ideas": ["subject1", "subject2"],
  "carousel_ideas": [
    {{
      "title": "carousel title",
      "slides": ["slide1 text", "slide2 text"]
    }}
  ]
}}

Provide 3-5 ideas per category."""
    
    def _build_recommendations_prompt(
        self, data: Dict, seo: Dict, brand: Dict, competitors: List[Dict]
    ) -> str:
        seo_score = seo.get('score', 0)
        
        return f"""Provide improvement recommendations:

Business: {data.get('business_name')}
SEO Score: {seo_score}/100
Brand Positioning: {brand.get('brand_positioning')}
Competitors: {len(competitors)}

Return JSON with:
{{
  "seo_improvements": ["improvement1", "improvement2"],
  "homepage_improvements": ["improvement1", "improvement2"],
  "cta_improvements": ["improvement1", "improvement2"],
  "content_gaps": ["gap1", "gap2"],
  "blog_ideas": ["idea1", "idea2"],
  "lead_magnet_ideas": ["idea1", "idea2"],
  "keyword_opportunities": ["keyword1", "keyword2"],
  "competitor_opportunities": ["opportunity1", "opportunity2"],
  "conversion_suggestions": ["suggestion1", "suggestion2"],
  "priority_actions": [
    {{
      "action": "specific action",
      "priority": "high|medium|low",
      "impact": "description of impact",
      "effort": "low|medium|high"
    }}
  ]
}}"""
    
    # Default fallbacks
    def _get_default_brand_analysis(self) -> Dict:
        return {
            "brand_voice": "Professional and informative",
            "tone": ["Professional", "Trustworthy", "Helpful"],
            "writing_style": "Clear and concise",
            "personality": ["Reliable", "Knowledgeable", "Approachable"],
            "unique_selling_proposition": "To be determined",
            "value_proposition": "To be determined",
            "core_messaging": [],
            "customer_pain_points": [],
            "customer_benefits": [],
            "brand_positioning": "To be determined",
            "industry": "Technology",
            "category": "Software"
        }
    
    def _get_default_audience(self) -> Dict:
        return {
            "ideal_customer": "Business professionals",
            "industries": ["Technology", "Business Services"],
            "company_sizes": ["Small", "Medium"],
            "job_titles": ["Manager", "Director", "Owner"],
            "decision_makers": ["C-Level", "Department Heads"],
            "geography": ["United States", "Global"],
            "languages": ["English"],
            "customer_intent": "Looking for solutions",
            "buyer_personas": []
        }
    
    def _get_default_business_summary(self, data: Dict) -> Dict:
        name = data.get('business_name', 'This business')
        return {
            "short_summary": f"{name} provides products and services to customers.",
            "detailed_summary": f"{name} is a company focused on delivering value to its customers.",
            "elevator_pitch": f"{name} helps businesses succeed.",
            "company_overview": f"{name} operates in its industry.",
            "mission": "To be determined",
            "vision": "To be determined"
        }
    
    def _get_default_marketing_strategy(self) -> Dict:
        return {
            "marketing_goals": ["Increase brand awareness", "Generate leads", "Engage audience"],
            "swot_analysis": {
                "strengths": [],
                "weaknesses": [],
                "opportunities": [],
                "threats": []
            },
            "unique_positioning": "To be determined",
            "content_pillars": ["Industry Insights", "Product Updates", "Customer Success"],
            "recommended_platforms": [
                {"platform": "LinkedIn", "priority": "high", "reason": "B2B focus", "posting_frequency": "3-5 times/week"}
            ],
            "keywords": [],
            "hashtags": [],
            "content_themes": [],
            "growth_opportunities": [],
            "marketing_roadmap": []
        }
    
    def _get_default_content_ideas(self) -> Dict:
        return {
            "linkedin_posts": [
                {"topic": "Industry Insights", "hook": "Here's what's changing in our industry...", "caption": "Share your expertise and thought leadership with your network. Position yourself as an industry expert."},
                {"topic": "Behind the Scenes", "hook": "Ever wondered how we do it?", "caption": "Give your audience a peek behind the curtain. Show your process, team, or workspace."},
                {"topic": "Customer Success Story", "hook": "Our client just achieved amazing results...", "caption": "Share real results and testimonials. Nothing builds trust like proven success."}
            ],
            "twitter_threads": [
                {"topic": "Quick Tips", "tweets": ["🧵 5 tips for success:", "1. Start with clarity", "2. Stay consistent", "3. Measure results"]}
            ],
            "instagram_captions": [
                "Share your brand story with compelling visuals",
                "Behind-the-scenes content that humanizes your brand"
            ],
            "facebook_posts": [
                "Engage your community with questions and polls",
                "Share valuable content that educates your audience"
            ],
            "blog_ideas": [
                {"title": "Ultimate Guide to [Your Service]", "outline": ["Introduction", "Key Benefits", "Step-by-step Process", "Common Mistakes", "Conclusion"]},
                {"title": "How to Choose the Right [Your Product]", "outline": ["Define Your Needs", "Compare Options", "Budget Considerations", "Making the Decision"]},
                {"title": "Industry Trends for 2024", "outline": ["Current State", "Emerging Trends", "What This Means", "How to Prepare"]}
            ],
            "video_scripts": [
                {"title": "Product Demo", "script": "Show your product in action. Highlight key features and benefits.", "duration": "90 seconds"}
            ],
            "email_ideas": [
                "Welcome Email: Introduce new subscribers to your brand",
                "Value-packed Newsletter: Share tips, insights, and updates"
            ],
            "carousel_ideas": [
                {"title": "5 Quick Tips", "slides": ["Tip 1: Be consistent", "Tip 2: Know your audience", "Tip 3: Track results", "Tip 4: Engage actively", "Tip 5: Stay authentic"]}
            ]
        }
    
    def _generate_default_competitors(self, industry: str, company_profile: Dict) -> List[Dict]:
        """Generate default competitors based on industry"""
        company_size = company_profile.get('company_size', 'small')
        
        # Generic competitors by industry
        competitors_by_industry = {
            "Technology": [
                {"name": "Local Tech Startup A", "website": "", "type": "direct", "description": f"Similar {company_size} tech company", "company_size": company_size, "market_position": "growing"},
                {"name": "Regional Software Company B", "website": "", "type": "direct", "description": f"{company_size.capitalize()} software provider", "company_size": company_size, "market_position": "established"},
                {"name": "Emerging Tech Platform C", "website": "", "type": "indirect", "description": "Alternative technology solution", "company_size": company_size, "market_position": "emerging"},
            ],
            "Real Estate": [
                {"name": "Local Property Developer A", "website": "", "type": "direct", "description": f"Regional property developer", "company_size": company_size, "market_position": "growing"},
                {"name": "Regional Realty Group B", "website": "", "type": "direct", "description": f"Comparable real estate company", "company_size": company_size, "market_position": "established"},
            ],
            "E-commerce": [
                {"name": "Online Retailer A", "website": "", "type": "direct", "description": f"{company_size.capitalize()} e-commerce store", "company_size": company_size, "market_position": "growing"},
                {"name": "Digital Marketplace B", "website": "", "type": "indirect", "description": "Alternative online platform", "company_size": company_size, "market_position": "emerging"},
            ],
        }
        
        # Return industry-specific or generic competitors
        return competitors_by_industry.get(industry, [
            {"name": f"Competitor A in {industry}", "website": "", "type": "direct", "description": f"Similar {company_size} company", "company_size": company_size, "market_position": "growing"},
            {"name": f"Competitor B in {industry}", "website": "", "type": "direct", "description": f"Comparable business", "company_size": company_size, "market_position": "established"},
            {"name": f"Alternative Provider C", "website": "", "type": "indirect", "description": "Alternative solution", "company_size": company_size, "market_position": "emerging"},
        ])
    
    def _get_default_recommendations(self) -> Dict:
        return {
            "seo_improvements": [],
            "homepage_improvements": [],
            "cta_improvements": [],
            "content_gaps": [],
            "blog_ideas": [],
            "lead_magnet_ideas": [],
            "keyword_opportunities": [],
            "competitor_opportunities": [],
            "conversion_suggestions": [],
            "priority_actions": []
        }

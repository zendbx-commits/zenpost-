"""
Marketing Intelligence Engine
Transforms Website Analysis into comprehensive Marketing Intelligence
"""
import os
from openai import OpenAI
from groq import Groq
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)


class MarketingIntelligenceEngine:
    """Generates comprehensive marketing intelligence from website analysis"""
    
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
                    "X-Title": "ZenPost Marketing Intelligence"
                }
            )
            self.model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
            logger.info(f"✓ Marketing Intelligence using OpenRouter: {self.model}")
        else:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY not set")
            
            self.client = Groq(api_key=api_key)
            # Use faster 8b model for marketing intelligence
            self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
            logger.info(f"✓ Marketing Intelligence using Groq: {self.model}")
        
        # Reduced max tokens for efficiency
        self.max_tokens = 3000  # Reduced from 8000
        logger.info(f"✓ Max tokens set to {self.max_tokens} (optimized)")
    
    async def generate_intelligence(self, website_analysis: Dict) -> Dict:
        """
        Generate complete marketing intelligence from website analysis
        
        Args:
            website_analysis: Complete output from website analysis engine
        
        Returns:
            marketing_intelligence: Comprehensive marketing intelligence object
        """
        try:
            logger.info("=" * 60)
            logger.info("MARKETING INTELLIGENCE ENGINE STARTED")
            logger.info("=" * 60)
            
            # Extract input data
            business = website_analysis.get('business', {})
            # Handle case where business might be a string (from database)
            if isinstance(business, str):
                business = {"business_name": business}
            elif not isinstance(business, dict):
                business = {}
                
            brand = website_analysis.get('brand', {})
            if not isinstance(brand, dict):
                brand = {}
                
            audience = website_analysis.get('audience', {})
            if not isinstance(audience, dict):
                audience = {}
                
            seo = website_analysis.get('seo', {})
            if not isinstance(seo, dict):
                seo = {}
                
            competitors = website_analysis.get('competitors', [])
            if not isinstance(competitors, list):
                competitors = []
                
            company_profile = website_analysis.get('company_profile', {})
            if not isinstance(company_profile, dict):
                company_profile = {}
            
            # Module 1: Business Intelligence
            logger.info("Module 1/8: Generating Business Intelligence...")
            business_intelligence = await self._generate_business_intelligence(
                business, brand, company_profile, seo
            )
            
            # Module 2: Competitor Intelligence
            logger.info("Module 2/8: Generating Competitor Intelligence...")
            competitor_intelligence = await self._generate_competitor_intelligence(
                competitors, business, brand
            )
            
            # Module 3: Market Intelligence
            logger.info("Module 3/8: Generating Market Intelligence...")
            market_intelligence = await self._generate_market_intelligence(
                business, brand, seo, competitors
            )
            
            # Module 4: SWOT Analysis
            logger.info("Module 4/8: Generating SWOT Analysis...")
            swot_analysis = await self._generate_swot_analysis(
                business, brand, seo, competitors, company_profile
            )
            
            # Module 5: Audience Intelligence
            logger.info("Module 5/8: Generating Audience Personas...")
            audience_personas = await self._generate_audience_personas(
                audience, business, brand
            )
            
            # Module 6: Positioning Engine
            logger.info("Module 6/8: Generating Positioning Strategy...")
            positioning = await self._generate_positioning(
                business, brand, competitors
            )
            
            # Module 7: Marketing Strategy
            logger.info("Module 7/8: Generating Marketing Strategy...")
            marketing_strategy = await self._generate_marketing_strategy(
                business, brand, audience, seo, competitors, company_profile
            )
            
            # Module 8: Content Calendar (30 days)
            logger.info("Module 8/8: Generating 30-day Content Calendar...")
            content_calendar = await self._generate_content_calendar(
                business, brand, audience, marketing_strategy, positioning
            )
            logger.info(f"✓ Generated {len(content_calendar)} days of content")
            
            # Compile final intelligence
            marketing_intelligence = {
                "business_intelligence": business_intelligence,
                "competitor_intelligence": competitor_intelligence,
                "market_intelligence": market_intelligence,
                "swot_analysis": swot_analysis,
                "audience_personas": audience_personas,
                "positioning": positioning,
                "marketing_strategy": marketing_strategy,
                "content_calendar": content_calendar,
                "metadata": {
                    "generated_at": website_analysis.get('metadata', {}).get('analyzed_at'),
                    "business_name": business.get('business_name'),
                    "industry": business.get('industry'),
                    "version": "1.0"
                }
            }
            
            logger.info("=" * 60)
            logger.info("✅ MARKETING INTELLIGENCE COMPLETE")
            logger.info(f"✓ Content Calendar: {len(content_calendar)} days")
            logger.info("=" * 60)
            
            return marketing_intelligence
        
        except Exception as e:
            logger.error(f"Marketing Intelligence generation failed: {str(e)}")
            raise
    
    async def _generate_business_intelligence(
        self, business: Dict, brand: Dict, company_profile: Dict, seo: Dict
    ) -> Dict:
        """Module 1: Business Intelligence"""
        try:
            prompt = f"""Based on this business data, generate comprehensive business intelligence:

Business Name: {business.get('business_name')}
Industry: {business.get('industry')}
Category: {brand.get('category')}
Company Size: {company_profile.get('company_size')}
Company Stage: {company_profile.get('business_stage')}
Geographic Scope: {business.get('geographic_scope')}
Location: {business.get('location')}
Description: {business.get('description', '')}
Mission: {business.get('mission')}
Vision: {business.get('vision')}
Brand Voice: {brand.get('brand_voice')}
USP: {brand.get('unique_selling_proposition')}
Value Proposition: {brand.get('value_proposition')}
Pain Points: {', '.join(brand.get('customer_pain_points', []))}

Generate a detailed business intelligence report in JSON format with these fields:
{{
  "executive_summary": "comprehensive 2-3 paragraph summary",
  "business_model": "detailed business model description",
  "revenue_model": "how they make money",
  "company_stage": "{company_profile.get('business_stage')}",
  "company_size": "{company_profile.get('company_size')}",
  "industry": "{business.get('industry')}",
  "sub_industry": "specific niche/sub-industry",
  "unique_selling_proposition": "what makes them unique",
  "key_products": ["product1", "product2"],
  "key_services": ["service1", "service2"],
  "brand_voice": "tone and style",
  "brand_personality": ["trait1", "trait2", "trait3"],
  "geographic_market": "{business.get('geographic_scope')}",
  "pricing_position": "premium|mid-market|budget",
  "customer_pain_points": ["pain1", "pain2", "pain3"],
  "customer_goals": ["goal1", "goal2", "goal3"],
  "customer_journey": {{
    "awareness": "how customers discover",
    "consideration": "evaluation process",
    "decision": "buying triggers",
    "retention": "how to keep them"
  }},
  "customer_buying_triggers": ["trigger1", "trigger2"],
  "business_strengths": ["strength1", "strength2"],
  "business_weaknesses": ["weakness1", "weakness2"]
}}

Base everything on the provided data. Be specific and actionable."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a business intelligence analyst. Generate detailed, evidence-based business intelligence. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("✓ Business Intelligence generated")
            return result
        
        except Exception as e:
            logger.error(f"Business Intelligence error: {str(e)}")
            return self._get_default_business_intelligence()
    
    async def _generate_competitor_intelligence(
        self, competitors: List[Dict], business: Dict, brand: Dict
    ) -> Dict:
        """Module 2: Competitor Intelligence"""
        try:
            if not competitors or len(competitors) == 0:
                return self._get_default_competitor_intelligence()
            
            competitor_list = "\n".join([
                f"- {c.get('name')}: {c.get('description', 'N/A')}"
                for c in competitors[:10]
            ])
            
            prompt = f"""Analyze these competitors in detail for {business.get('business_name')}:

Our Business:
- Industry: {brand.get('industry')}
- USP: {brand.get('unique_selling_proposition')}

Competitors:
{competitor_list}

Generate detailed competitor intelligence in JSON format:
{{
  "competitor_profiles": [
    {{
      "name": "Competitor Name",
      "company_overview": "what they do",
      "business_model": "how they operate",
      "market_position": "emerging|growing|established|leader",
      "unique_selling_proposition": "their USP",
      "key_products": ["product1", "product2"],
      "key_services": ["service1", "service2"],
      "brand_voice": "their tone and style",
      "marketing_style": "their marketing approach",
      "content_strategy": "how they do content",
      "seo_strategy": "their SEO approach",
      "target_audience": "who they target",
      "pricing_strategy": "premium|mid-market|budget",
      "social_presence": ["platform1", "platform2"],
      "strengths": ["strength1", "strength2", "strength3"],
      "weaknesses": ["weakness1", "weakness2", "weakness3"],
      "opportunities_to_beat_them": ["opportunity1", "opportunity2"],
      "threat_score": 75
    }}
  ],
  "competitor_comparison": {{
    "our_advantages": ["advantage1", "advantage2"],
    "areas_to_improve": ["area1", "area2"],
    "market_gaps": ["gap1", "gap2"]
  }},
  "direct_competitors": ["competitor1", "competitor2"],
  "indirect_competitors": ["competitor3", "competitor4"],
  "emerging_competitors": ["competitor5", "competitor6"]
}}

Focus on actionable insights."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a competitive intelligence analyst. Provide detailed, evidence-based competitor analysis. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info(f"✓ Competitor Intelligence: {len(result.get('competitor_profiles', []))} profiles")
            return result
        
        except Exception as e:
            logger.error(f"Competitor Intelligence error: {str(e)}")
            return self._get_default_competitor_intelligence()
    
    async def _generate_market_intelligence(
        self, business: Dict, brand: Dict, seo: Dict, competitors: List[Dict]
    ) -> Dict:
        """Module 3: Market Intelligence"""
        try:
            seo_keywords = ', '.join(seo.get('keywords', {}).get('found', [])[:20])
            
            prompt = f"""Generate comprehensive market intelligence for:

Business: {business.get('business_name')}
Industry: {brand.get('industry')}
SEO Score: {seo.get('score')}/100
Top Keywords: {', '.join(seo_keywords)}
Competitor Count: {len(competitors)}

Generate in JSON format:
{{
  "market_trends": {{
    "current_industry_trends": ["trend1", "trend2", "trend3"],
    "growing_topics": ["topic1", "topic2", "topic3"],
    "seasonal_trends": ["seasonal1", "seasonal2"],
    "customer_behavior_shifts": ["behavior1", "behavior2"],
    "ai_opportunities": ["opportunity1", "opportunity2"],
    "content_trends": ["content_trend1", "content_trend2"]
  }},
  "market_opportunities": [
    {{
      "type": "untapped_topic|low_competition|geographic|platform",
      "title": "Opportunity title",
      "description": "detailed description",
      "potential_impact": "high|medium|low",
      "effort_required": "high|medium|low",
      "priority": "immediate|short-term|long-term"
    }}
  ],
  "market_risks": [
    {{
      "type": "competition|seo|brand_awareness|trust|market",
      "title": "Risk title",
      "description": "detailed description",
      "severity": "high|medium|low",
      "mitigation_strategy": "how to address it"
    }}
  ],
  "seo_gap_analysis": {{
    "missing_keywords": ["keyword1", "keyword2"],
    "keyword_opportunities": ["opportunity1", "opportunity2"],
    "high_intent_keywords": ["intent1", "intent2"],
    "long_tail_keywords": ["longtail1", "longtail2"],
    "competitor_keyword_gaps": ["gap1", "gap2"]
  }},
  "content_gap_analysis": {{
    "missing_blogs": ["blog_topic1", "blog_topic2"],
    "missing_videos": ["video_idea1", "video_idea2"],
    "missing_landing_pages": ["page1", "page2"],
    "missing_educational_content": ["guide1", "guide2"],
    "missing_case_studies": true,
    "missing_testimonials": true,
    "missing_social_topics": ["topic1", "topic2"]
  }},
  "social_media_gap_analysis": {{
    "platforms_competitors_dominate": ["platform1"],
    "platforms_competitors_ignore": ["platform2"],
    "recommended_posting_frequency": {{"LinkedIn": "3-5x/week", "Twitter": "daily"}},
    "best_content_formats": ["carousel", "video", "infographic"],
    "engagement_opportunities": ["opportunity1", "opportunity2"]
  }}
}}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a market research analyst. Generate comprehensive, actionable market intelligence. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("✓ Market Intelligence generated")
            return result
        
        except Exception as e:
            logger.error(f"Market Intelligence error: {str(e)}")
            return self._get_default_market_intelligence()
    
    async def _generate_swot_analysis(
        self, business: Dict, brand: Dict, seo: Dict, competitors: List[Dict], company_profile: Dict
    ) -> Dict:
        """Module 4: SWOT Analysis"""
        try:
            prompt = f"""Generate evidence-based SWOT analysis for:

Business: {business.get('business_name')}
Industry: {brand.get('industry')}
SEO Score: {seo.get('score')}/100
Company Size: {company_profile.get('company_size')}
Business Stage: {company_profile.get('business_stage')}
Competitors: {len(competitors)}

For EACH item in SWOT, provide evidence-based analysis in JSON:
{{
  "strengths": [
    {{
      "title": "Strength title",
      "explanation": "detailed explanation",
      "evidence": "specific evidence from analysis",
      "business_impact": "how this helps the business",
      "priority": "high|medium|low"
    }}
  ],
  "weaknesses": [
    {{
      "title": "Weakness title",
      "explanation": "detailed explanation",
      "evidence": "specific evidence",
      "business_impact": "how this hurts the business",
      "priority": "high|medium|low"
    }}
  ],
  "opportunities": [
    {{
      "title": "Opportunity title",
      "explanation": "detailed explanation",
      "evidence": "market data or trend",
      "business_impact": "potential gain",
      "priority": "high|medium|low"
    }}
  ],
  "threats": [
    {{
      "title": "Threat title",
      "explanation": "detailed explanation",
      "evidence": "specific threat indicator",
      "business_impact": "potential loss",
      "priority": "high|medium|low"
    }}
  ]
}}

Base on actual data. Be specific and actionable."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a strategic business analyst. Generate evidence-based SWOT analysis with specific evidence. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("✓ SWOT Analysis generated")
            return result
        
        except Exception as e:
            logger.error(f"SWOT Analysis error: {str(e)}")
            return self._get_default_swot_analysis()
    
    async def _generate_audience_personas(
        self, audience: Dict, business: Dict, brand: Dict
    ) -> List[Dict]:
        """Module 5: Audience Intelligence"""
        try:
            ideal_customer = audience.get('ideal_customer', 'Business professionals')
            
            prompt = f"""Generate 3-5 detailed customer personas for:

Business: {business.get('business_name')}
Industry: {brand.get('industry')}
Ideal Customer: {ideal_customer}
Target Industries: {', '.join(audience.get('industries', [])[:5])}
Job Titles: {', '.join(audience.get('job_titles', [])[:5])}

Generate 3-5 personas in JSON format:
{{
  "personas": [
    {{
      "persona_name": "The [Role/Type]",
      "age_group": "25-35|35-45|45-55|55+",
      "profession": "specific job title",
      "company_type": "startup|SME|enterprise",
      "goals": ["goal1", "goal2", "goal3"],
      "pain_points": ["pain1", "pain2", "pain3"],
      "buying_motivations": ["motivation1", "motivation2"],
      "objections": ["objection1", "objection2"],
      "preferred_platforms": ["LinkedIn", "Twitter", "Email"],
      "preferred_content_types": ["Blog posts", "Videos", "Webinars"],
      "decision_making_factors": ["factor1", "factor2", "factor3"],
      "preferred_cta": "Book a demo|Download guide|Start free trial",
      "recommended_marketing_message": "targeted message for this persona",
      "daily_challenges": ["challenge1", "challenge2"],
      "information_sources": ["source1", "source2"]
    }}
  ]
}}

Make personas realistic and actionable."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a customer research expert. Create detailed, realistic buyer personas. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            personas = result.get('personas', [])
            logger.info(f"✓ Generated {len(personas)} audience personas")
            return personas
        
        except Exception as e:
            logger.error(f"Audience Personas error: {str(e)}")
            return self._get_default_personas()
    
    async def _generate_positioning(
        self, business: Dict, brand: Dict, competitors: List[Dict]
    ) -> Dict:
        """Module 6: Positioning Engine"""
        try:
            prompt = f"""Generate positioning strategy for:

Business: {business.get('business_name')}
Industry: {brand.get('industry')}
Current USP: {brand.get('unique_selling_proposition')}
Current Value Prop: {brand.get('value_proposition')}
Competitors: {len(competitors)}

Generate comprehensive positioning in JSON:
{{
  "current_position": "how they're currently positioned",
  "recommended_position": "improved positioning",
  "brand_promise": "what you promise customers",
  "unique_value_proposition": "refined UVP",
  "messaging_pillars": [
    {{
      "pillar": "Pillar name",
      "message": "core message",
      "proof_points": ["proof1", "proof2"]
    }}
  ],
  "brand_story": "compelling narrative",
  "communication_style": {{
    "tone": "professional|friendly|authoritative",
    "voice": "description",
    "language_guidelines": ["guideline1", "guideline2"]
  }},
  "suggested_taglines": ["tagline1", "tagline2", "tagline3"],
  "brand_differentiators": ["differentiator1", "differentiator2", "differentiator3"],
  "reasons_to_choose_us": [
    {{
      "reason": "Reason title",
      "explanation": "why this matters",
      "proof": "evidence or example"
    }}
  ]
}}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a brand positioning strategist. Create clear, differentiated positioning. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("✓ Positioning Strategy generated")
            return result
        
        except Exception as e:
            logger.error(f"Positioning error: {str(e)}")
            return self._get_default_positioning()
    
    async def _generate_marketing_strategy(
        self, business: Dict, brand: Dict, audience: Dict, seo: Dict, 
        competitors: List[Dict], company_profile: Dict
    ) -> Dict:
        """Module 7: Marketing Strategy"""
        try:
            prompt = f"""Create comprehensive 90-day marketing strategy for:

Business: {business.get('business_name')}
Industry: {brand.get('industry')}
Company Size: {company_profile.get('company_size')}
Target Audience: {audience.get('ideal_customer')}
SEO Score: {seo.get('score')}/100
Competitors: {len(competitors)}

Generate complete marketing strategy in JSON:
{{
  "executive_summary": "2-3 paragraph strategy overview",
  "marketing_objectives": [
    {{
      "objective": "Objective title",
      "description": "what we want to achieve",
      "target_metric": "metric and target",
      "timeframe": "30|60|90 days"
    }}
  ],
  "ninety_day_strategy": {{
    "month_1": {{
      "focus": "Foundation building",
      "activities": ["activity1", "activity2"],
      "deliverables": ["deliverable1", "deliverable2"],
      "success_metrics": ["metric1", "metric2"]
    }},
    "month_2": {{
      "focus": "Growth acceleration",
      "activities": ["activity1", "activity2"],
      "deliverables": ["deliverable1", "deliverable2"],
      "success_metrics": ["metric1", "metric2"]
    }},
    "month_3": {{
      "focus": "Optimization",
      "activities": ["activity1", "activity2"],
      "deliverables": ["deliverable1", "deliverable2"],
      "success_metrics": ["metric1", "metric2"]
    }}
  }},
  "organic_growth_strategy": ["tactic1", "tactic2", "tactic3"],
  "seo_strategy": {{
    "priority_keywords": ["keyword1", "keyword2"],
    "content_gaps": ["gap1", "gap2"],
    "backlink_strategy": "approach",
    "technical_improvements": ["improvement1", "improvement2"]
  }},
  "social_media_strategy": {{
    "primary_platforms": ["LinkedIn", "Twitter"],
    "secondary_platforms": ["Instagram"],
    "content_mix": {{"educational": 40, "promotional": 20, "engagement": 40}},
    "posting_schedule": {{"LinkedIn": "3-5x/week", "Twitter": "daily"}}
  }},
  "email_strategy": {{
    "list_building": ["tactic1", "tactic2"],
    "email_types": ["Newsletter", "Product updates", "Educational"],
    "frequency": "weekly|bi-weekly",
    "automation_sequences": ["Welcome", "Onboarding", "Re-engagement"]
  }},
  "community_strategy": ["tactic1", "tactic2"],
  "lead_generation_strategy": [
    {{
      "tactic": "Lead magnet",
      "description": "how it works",
      "expected_conversion": "5-10%"
    }}
  ],
  "content_pillars": [
    {{
      "pillar": "Pillar name",
      "description": "what it covers",
      "content_types": ["blog", "video", "social"],
      "frequency": "weekly|monthly"
    }}
  ],
  "campaign_themes": ["theme1", "theme2", "theme3"],
  "platform_strategy": [
    {{
      "platform": "LinkedIn",
      "objective": "Thought leadership",
      "content_types": ["Posts", "Articles", "Videos"],
      "posting_frequency": "3-5x per week",
      "engagement_tactics": ["tactic1", "tactic2"]
    }}
  ],
  "call_to_action_strategy": {{
    "primary_cta": "Book a demo",
    "secondary_ctas": ["Download guide", "Subscribe"],
    "placement_strategy": "where to use each CTA"
  }},
  "conversion_strategy": {{
    "funnel_stages": {{
      "awareness": ["tactic1", "tactic2"],
      "consideration": ["tactic1", "tactic2"],
      "decision": ["tactic1", "tactic2"],
      "retention": ["tactic1", "tactic2"]
    }},
    "conversion_tactics": ["tactic1", "tactic2"]
  }},
  "recommended_marketing_funnel": {{
    "top_of_funnel": ["activity1", "activity2"],
    "middle_of_funnel": ["activity1", "activity2"],
    "bottom_of_funnel": ["activity1", "activity2"]
  }},
  "success_kpis": [
    {{
      "kpi": "Website traffic",
      "target": "+50% in 90 days",
      "measurement": "Google Analytics"
    }}
  ],
  "expected_outcomes": ["outcome1", "outcome2", "outcome3"],
  "priority_actions": [
    {{
      "action": "Action title",
      "description": "what to do",
      "timeframe": "immediate|week-1|month-1",
      "effort": "high|medium|low",
      "impact": "high|medium|low"
    }}
  ],
  "budget_recommendations": {{
    "paid_advertising": "optional budget split",
    "tools_software": ["tool1", "tool2"],
    "content_creation": "resources needed"
  }}
}}"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior marketing strategist. Create comprehensive, executable 90-day marketing strategies. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            logger.info("✓ Marketing Strategy (90-day) generated")
            return result
        
        except Exception as e:
            logger.error(f"Marketing Strategy error: {str(e)}")
            return self._get_default_marketing_strategy()
    
    async def _generate_campaign_blueprints(
        self, business: Dict, brand: Dict, audience: Dict, marketing_strategy: Dict
    ) -> List[Dict]:
        """Module 8: Campaign Blueprints"""
        try:
            campaign_themes = marketing_strategy.get('campaign_themes', ['Awareness', 'Engagement', 'Conversion'])
            
            prompt = f"""Generate 5-10 campaign blueprints (NOT actual posts) for:

Business: {business.get('business_name')}
Industry: {brand.get('industry')}
Brand Voice: {brand.get('brand_voice')}
Target Audience: {audience.get('ideal_customer')}
Campaign Themes: {', '.join(campaign_themes)}

Generate campaign PLANS (not posts) in JSON:
{{
  "campaigns": [
    {{
      "campaign_name": "Campaign title",
      "campaign_goal": "awareness|engagement|lead_generation|conversion|retention",
      "target_audience": "specific persona or segment",
      "key_message": "core message to communicate",
      "platforms": ["LinkedIn", "Twitter", "Email"],
      "campaign_duration": "2 weeks|1 month|ongoing",
      "campaign_type": "product_launch|thought_leadership|seasonal|educational",
      "recommended_content_types": ["Blog posts", "Videos", "Infographics", "Webinars"],
      "content_pieces_needed": 10,
      "call_to_action": "specific CTA",
      "suggested_offer": "Free trial|Whitepaper|Webinar registration",
      "success_metrics": [
        {{
          "metric": "Engagement rate",
          "target": "5%",
          "tracking": "Platform analytics"
        }}
      ],
      "campaign_phases": [
        {{
          "phase": "Awareness",
          "duration": "Week 1-2",
          "activities": ["activity1", "activity2"]
        }}
      ],
      "budget_estimate": "low|medium|high (if paid)",
      "resources_required": ["designer", "copywriter"]
    }}
  ]
}}

Generate 5-10 diverse campaign blueprints."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a campaign strategist. Create campaign blueprints and plans, NOT actual content. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            campaigns = result.get('campaigns', [])[:10]
            logger.info(f"✓ Generated {len(campaigns)} campaign blueprints")
            return campaigns
        
        except Exception as e:
            logger.error(f"Campaign Blueprints error: {str(e)}")
            return self._get_default_campaign_blueprints()
    
    async def _generate_content_calendar(
        self, business: Dict, brand: Dict, audience: Dict, 
        marketing_strategy: Dict, positioning: Dict
    ) -> List[Dict]:
        """Module 8: 30-Day Content Calendar Generation"""
        try:
            content_pillars = marketing_strategy.get('content_pillars', [])
            pillars_list = ', '.join([p.get('pillar', '') for p in content_pillars[:5]])
            
            prompt = f"""Generate EXACTLY 30 days of ready-to-post social media content for:

Business: {business.get('business_name')}
Industry: {brand.get('industry')}
Brand Voice: {brand.get('brand_voice')}
Target Audience: {audience.get('ideal_customer')}
Content Pillars: {pillars_list}
Brand Message: {positioning.get('brand_promise')}

IMPORTANT REQUIREMENTS:
- Generate EXACTLY 30 individual posts (Day 1 through Day 30)
- Each post MUST include optimal_post_time in HH:MM format (e.g., "09:00", "14:30")
- Use platform-appropriate posting times:
  * LinkedIn: 09:00, 12:00, 17:00 (weekdays focus)
  * Twitter: 09:00, 12:00, 15:00, 18:00
  * Facebook: 13:00, 15:00, 19:00
  * Instagram: 11:00, 14:00, 19:00
- Content mix: 40% educational, 30% engagement, 20% promotional, 10% storytelling
- Each post must be complete and ready to publish

Generate in JSON format:
{{
  "posts": [
    {{
      "day": 1,
      "platform": "LinkedIn",
      "content_pillar": "Education|Engagement|Promotion|Storytelling",
      "content_type": "Thought leadership|How-to|Case study|Behind the scenes|Product feature|Industry insight|Question|Poll|Story",
      "content_goal": "awareness|engagement|education|lead_generation|community_building",
      "headline": "Attention-grabbing headline",
      "post_text": "Complete post text (2-3 paragraphs for LinkedIn, shorter for Twitter/Instagram)",
      "caption": "Optional caption or summary",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "call_to_action": "Specific CTA",
      "image_prompt": "Detailed visual description for AI image generation",
      "optimal_post_time": "09:00"
    }}
  ]
}}

Generate EXACTLY 30 diverse, engaging posts across different platforms."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a social media content strategist. Generate 30 complete, ready-to-post social media posts with optimal posting times. Return ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            posts = result.get('posts', [])
            
            # Ensure we have exactly 30 posts
            if len(posts) < 30:
                logger.warning(f"Only {len(posts)} posts generated, expected 30. Extending calendar...")
                # Duplicate and modify posts to reach 30
                while len(posts) < 30:
                    posts.append(posts[len(posts) % len(posts)].copy())
            elif len(posts) > 30:
                logger.warning(f"{len(posts)} posts generated, trimming to 30")
                posts = posts[:30]
            
            # Ensure each post has required fields with defaults
            for i, post in enumerate(posts):
                post['day'] = i + 1
                if 'optimal_post_time' not in post or not post['optimal_post_time']:
                    # Assign default times based on platform
                    platform = post.get('platform', 'LinkedIn')
                    if platform == 'LinkedIn':
                        times = ['09:00', '12:00', '17:00']
                    elif platform == 'Twitter':
                        times = ['09:00', '12:00', '15:00', '18:00']
                    elif platform == 'Facebook':
                        times = ['13:00', '15:00', '19:00']
                    elif platform == 'Instagram':
                        times = ['11:00', '14:00', '19:00']
                    else:
                        times = ['10:00', '14:00', '18:00']
                    post['optimal_post_time'] = times[i % len(times)]
                
                # Ensure all required fields exist
                post.setdefault('platform', 'LinkedIn')
                post.setdefault('content_pillar', 'Education')
                post.setdefault('content_type', 'Thought leadership')
                post.setdefault('content_goal', 'awareness')
                post.setdefault('headline', f"Post for Day {i+1}")
                post.setdefault('post_text', '')
                post.setdefault('caption', '')
                post.setdefault('hashtags', [])
                post.setdefault('call_to_action', 'Learn more')
                post.setdefault('image_prompt', 'Professional business visual')
            
            logger.info(f"✓ Generated 30-day content calendar ({len(posts)} posts)")
            return posts
        
        except Exception as e:
            logger.error(f"Content Calendar generation error: {str(e)}")
            return self._get_default_content_calendar()
    
    def _get_default_content_calendar(self) -> List[Dict]:
        """Fallback content calendar with 30 days"""
        posts = []
        platforms = ['LinkedIn', 'Twitter', 'Facebook', 'Instagram']
        times = {
            'LinkedIn': ['09:00', '12:00', '17:00'],
            'Twitter': ['09:00', '12:00', '15:00', '18:00'],
            'Facebook': ['13:00', '15:00', '19:00'],
            'Instagram': ['11:00', '14:00', '19:00']
        }
        content_types = ['Thought leadership', 'How-to', 'Industry insight', 'Question']
        
        for day in range(1, 31):
            platform = platforms[day % len(platforms)]
            platform_times = times[platform]
            
            post = {
                "day": day,
                "platform": platform,
                "content_pillar": "Education" if day % 3 == 0 else "Engagement",
                "content_type": content_types[day % len(content_types)],
                "content_goal": "awareness" if day % 2 == 0 else "engagement",
                "headline": f"Day {day}: Industry Insight",
                "post_text": f"Engaging content for day {day}. Share your thoughts in the comments!",
                "caption": f"Day {day} post",
                "hashtags": ["business", "marketing", "growth"],
                "call_to_action": "Comment below" if day % 2 == 0 else "Share your thoughts",
                "image_prompt": "Professional business visual with modern design",
                "optimal_post_time": platform_times[day % len(platform_times)]
            }
            posts.append(post)
        
        return posts
    
    def _get_default_business_intelligence(self) -> Dict:
        """Fallback business intelligence"""
        return {
            "executive_summary": "Business intelligence data is currently being generated. Please retry the analysis.",
            "business_model": "Information pending AI analysis",
            "revenue_model": "Information pending AI analysis",
            "company_stage": "established",
            "company_size": "small",
            "industry": "General Business",
            "sub_industry": "To be determined",
            "unique_selling_proposition": "To be determined through analysis",
            "key_products": [],
            "key_services": [],
            "brand_voice": "Professional and informative",
            "brand_personality": ["Professional", "Reliable", "Customer-focused"],
            "geographic_market": "Regional",
            "pricing_position": "mid-market",
            "customer_pain_points": ["Efficiency needs", "Cost management", "Quality service"],
            "customer_goals": ["Improve operations", "Reduce costs", "Grow business"],
            "customer_journey": {
                "awareness": "Through search and referrals",
                "consideration": "Comparing options and features",
                "decision": "Based on value and trust",
                "retention": "Quality service and support"
            },
            "customer_buying_triggers": ["Business need", "Competitive pricing"],
            "business_strengths": ["Quality offerings", "Customer service"],
            "business_weaknesses": ["Limited market presence", "Growing competition"]
        }
    
    def _get_default_competitor_intelligence(self) -> Dict:
        """Fallback competitor intelligence"""
        return {
            "competitor_profiles": [],
            "competitor_comparison": {
                "our_advantages": ["Unique positioning", "Customer focus"],
                "areas_to_improve": ["Market visibility", "Content marketing"],
                "market_gaps": ["Underserved segments", "Emerging channels"]
            },
            "direct_competitors": [],
            "indirect_competitors": [],
            "emerging_competitors": []
        }
    
    def _get_default_market_intelligence(self) -> Dict:
        """Fallback market intelligence"""
        return {
            "market_trends": {
                "current_industry_trends": ["Digital transformation", "Customer experience focus"],
                "growing_topics": ["AI adoption", "Sustainability", "Personalization"],
                "seasonal_trends": ["Year-end planning", "Q1 budgets"],
                "customer_behavior_shifts": ["Online research", "Peer reviews"],
                "ai_opportunities": ["Automation", "Personalization", "Analytics"],
                "content_trends": ["Video content", "Interactive content", "Thought leadership"]
            },
            "market_opportunities": [
                {
                    "type": "platform",
                    "title": "Expand social media presence",
                    "description": "Leverage underutilized platforms for brand awareness",
                    "potential_impact": "high",
                    "effort_required": "medium",
                    "priority": "short-term"
                }
            ],
            "market_risks": [
                {
                    "type": "competition",
                    "title": "Increasing market competition",
                    "description": "More players entering the market",
                    "severity": "medium",
                    "mitigation_strategy": "Strengthen unique value proposition and customer relationships"
                }
            ],
            "seo_gap_analysis": {
                "missing_keywords": ["Industry-specific long-tail keywords"],
                "keyword_opportunities": ["Educational content keywords"],
                "high_intent_keywords": ["Solution-oriented searches"],
                "long_tail_keywords": ["Specific problem-solving queries"],
                "competitor_keyword_gaps": ["Underutilized niche terms"]
            },
            "content_gap_analysis": {
                "missing_blogs": ["How-to guides", "Industry insights"],
                "missing_videos": ["Product demos", "Customer testimonials"],
                "missing_landing_pages": ["Solution-specific pages"],
                "missing_educational_content": ["Webinars", "Whitepapers"],
                "missing_case_studies": True,
                "missing_testimonials": True,
                "missing_social_topics": ["Industry trends", "Expert opinions"]
            },
            "social_media_gap_analysis": {
                "platforms_competitors_dominate": ["LinkedIn"],
                "platforms_competitors_ignore": ["TikTok", "Pinterest"],
                "recommended_posting_frequency": {"LinkedIn": "3-5x/week", "Twitter": "daily"},
                "best_content_formats": ["Carousel posts", "Short videos", "Infographics"],
                "engagement_opportunities": ["LinkedIn discussions", "Twitter threads"]
            }
        }
    
    def _get_default_swot_analysis(self) -> Dict:
        """Fallback SWOT analysis"""
        return {
            "strengths": [
                {
                    "title": "Quality Service Delivery",
                    "explanation": "Focus on customer satisfaction",
                    "evidence": "Business operations indicate quality focus",
                    "business_impact": "Customer retention and positive word-of-mouth",
                    "priority": "high"
                }
            ],
            "weaknesses": [
                {
                    "title": "Limited Online Presence",
                    "explanation": "Room for digital marketing improvement",
                    "evidence": "SEO and content gaps identified",
                    "business_impact": "Missing potential customers in digital channels",
                    "priority": "high"
                }
            ],
            "opportunities": [
                {
                    "title": "Content Marketing Expansion",
                    "explanation": "Significant opportunity to create educational content",
                    "evidence": "Content gaps identified across platforms",
                    "business_impact": "Increased organic reach and thought leadership",
                    "priority": "high"
                }
            ],
            "threats": [
                {
                    "title": "Market Competition",
                    "explanation": "Competitors with established digital presence",
                    "evidence": "Competitive landscape analysis",
                    "business_impact": "Potential market share loss if not addressed",
                    "priority": "medium"
                }
            ]
        }
    
    def _get_default_personas(self) -> List[Dict]:
        """Fallback audience personas"""
        return [
            {
                "persona_name": "The Business Decision Maker",
                "age_group": "35-45",
                "profession": "Business Owner / Manager",
                "company_type": "SME",
                "goals": ["Grow business", "Improve efficiency", "Reduce costs"],
                "pain_points": ["Time constraints", "Limited resources", "Market competition"],
                "buying_motivations": ["ROI", "Reliability", "Support"],
                "objections": ["Price concerns", "Implementation time"],
                "preferred_platforms": ["LinkedIn", "Email", "Google Search"],
                "preferred_content_types": ["Case studies", "ROI calculators", "Webinars"],
                "decision_making_factors": ["Proven results", "References", "Value for money"],
                "preferred_cta": "Schedule a consultation",
                "recommended_marketing_message": "Focus on ROI and efficiency gains",
                "daily_challenges": ["Managing operations", "Finding quality solutions"],
                "information_sources": ["Industry publications", "Peer recommendations"]
            },
            {
                "persona_name": "The Research-Driven Professional",
                "age_group": "25-35",
                "profession": "Manager / Specialist",
                "company_type": "Growing company",
                "goals": ["Make informed decisions", "Drive innovation", "Advance career"],
                "pain_points": ["Information overload", "Budget constraints", "Stakeholder buy-in"],
                "buying_motivations": ["Best practices", "Innovation", "Data-driven results"],
                "objections": ["Need more proof", "Comparison with alternatives"],
                "preferred_platforms": ["LinkedIn", "Twitter", "Industry forums"],
                "preferred_content_types": ["Whitepapers", "Comparison guides", "Expert insights"],
                "decision_making_factors": ["Features", "Reviews", "Expert opinions"],
                "preferred_cta": "Download guide",
                "recommended_marketing_message": "Emphasize expertise and thought leadership",
                "daily_challenges": ["Staying updated", "Justifying recommendations"],
                "information_sources": ["Online research", "LinkedIn", "Webinars"]
            }
        ]
    
    def _get_default_positioning(self) -> Dict:
        """Fallback positioning strategy"""
        return {
            "current_position": "Reliable service provider in the industry",
            "recommended_position": "Innovative partner for business growth",
            "brand_promise": "Delivering quality solutions that drive results",
            "unique_value_proposition": "Combining expertise with customer-centric approach",
            "messaging_pillars": [
                {
                    "pillar": "Expertise",
                    "message": "Deep industry knowledge and proven experience",
                    "proof_points": ["Years in business", "Successful projects"]
                },
                {
                    "pillar": "Customer Success",
                    "message": "Committed to your growth and success",
                    "proof_points": ["Customer testimonials", "Long-term partnerships"]
                }
            ],
            "brand_story": "A company built on the foundation of excellence and customer satisfaction",
            "communication_style": {
                "tone": "professional",
                "voice": "Confident yet approachable, expert yet accessible",
                "language_guidelines": ["Clear and concise", "Avoid jargon", "Focus on benefits"]
            },
            "suggested_taglines": [
                "Your Partner in Growth",
                "Excellence in Every Solution",
                "Driving Results Together"
            ],
            "brand_differentiators": ["Customer-first approach", "Proven track record", "Flexible solutions"],
            "reasons_to_choose_us": [
                {
                    "reason": "Proven Expertise",
                    "explanation": "Years of experience delivering results",
                    "proof": "Track record of successful implementations"
                },
                {
                    "reason": "Customer-Centric",
                    "explanation": "Your success is our priority",
                    "proof": "Dedicated support and personalized solutions"
                }
            ]
        }
    
    def _get_default_marketing_strategy(self) -> Dict:
        """Fallback marketing strategy"""
        return {
            "executive_summary": "Comprehensive 90-day marketing strategy focused on digital presence, content marketing, and lead generation.",
            "marketing_objectives": [
                {
                    "objective": "Increase Brand Awareness",
                    "description": "Build online presence and visibility",
                    "target_metric": "50% increase in website traffic",
                    "timeframe": "90 days"
                }
            ],
            "ninety_day_strategy": {
                "month_1": {
                    "focus": "Foundation & Content Creation",
                    "activities": ["Website optimization", "Content calendar creation", "Social media setup"],
                    "deliverables": ["10 blog posts", "Social profiles optimized", "Email templates"],
                    "success_metrics": ["Website traffic baseline", "100 new followers"]
                },
                "month_2": {
                    "focus": "Engagement & Growth",
                    "activities": ["Consistent posting", "Community engagement", "Email campaigns"],
                    "deliverables": ["15 blog posts", "20 social posts/week", "2 email campaigns"],
                    "success_metrics": ["25% traffic increase", "5% engagement rate"]
                },
                "month_3": {
                    "focus": "Optimization & Conversion",
                    "activities": ["A/B testing", "Lead magnet launch", "Retargeting"],
                    "deliverables": ["Optimized funnels", "Lead magnets", "Case studies"],
                    "success_metrics": ["50% traffic increase", "100 qualified leads"]
                }
            },
            "organic_growth_strategy": ["SEO optimization", "Content marketing", "Social media engagement"],
            "seo_strategy": {
                "priority_keywords": ["Industry-specific terms", "Solution keywords"],
                "content_gaps": ["How-to guides", "Comparison articles"],
                "backlink_strategy": "Guest posting and industry partnerships",
                "technical_improvements": ["Page speed", "Mobile optimization", "Schema markup"]
            },
            "social_media_strategy": {
                "primary_platforms": ["LinkedIn", "Twitter"],
                "secondary_platforms": ["Facebook"],
                "content_mix": {"educational": 50, "promotional": 20, "engagement": 30},
                "posting_schedule": {"LinkedIn": "3-5x/week", "Twitter": "5-7x/week"}
            },
            "email_strategy": {
                "list_building": ["Website opt-ins", "Lead magnets", "Event registrations"],
                "email_types": ["Newsletter", "Educational series", "Product updates"],
                "frequency": "weekly",
                "automation_sequences": ["Welcome series", "Nurture sequence", "Re-engagement"]
            },
            "community_strategy": ["Join industry forums", "LinkedIn groups", "Answer questions"],
            "lead_generation_strategy": [
                {
                    "tactic": "Lead Magnet",
                    "description": "Downloadable guide in exchange for email",
                    "expected_conversion": "5-10%"
                }
            ],
            "content_pillars": [
                {
                    "pillar": "Education",
                    "description": "How-to guides and industry insights",
                    "content_types": ["blog", "video", "infographic"],
                    "frequency": "weekly"
                }
            ],
            "campaign_themes": ["Industry insights", "Success stories", "Innovation"],
            "platform_strategy": [
                {
                    "platform": "LinkedIn",
                    "objective": "Thought leadership and B2B networking",
                    "content_types": ["Posts", "Articles", "Videos"],
                    "posting_frequency": "3-5x per week",
                    "engagement_tactics": ["Comment on industry posts", "Share insights"]
                }
            ],
            "call_to_action_strategy": {
                "primary_cta": "Contact us",
                "secondary_ctas": ["Download guide", "Subscribe to newsletter"],
                "placement_strategy": "End of blog posts, homepage, social profiles"
            },
            "conversion_strategy": {
                "funnel_stages": {
                    "awareness": ["Blog content", "Social media"],
                    "consideration": ["Case studies", "Webinars"],
                    "decision": ["Free trial", "Consultation"],
                    "retention": ["Email nurture", "Customer success"]
                },
                "conversion_tactics": ["Clear CTAs", "Lead magnets", "Social proof"]
            },
            "recommended_marketing_funnel": {
                "top_of_funnel": ["Blog posts", "Social media", "SEO"],
                "middle_of_funnel": ["Email nurture", "Webinars", "Case studies"],
                "bottom_of_funnel": ["Demos", "Free trials", "Consultations"]
            },
            "success_kpis": [
                {
                    "kpi": "Website Traffic",
                    "target": "+50% in 90 days",
                    "measurement": "Google Analytics"
                },
                {
                    "kpi": "Lead Generation",
                    "target": "100 qualified leads",
                    "measurement": "CRM"
                }
            ],
            "expected_outcomes": ["Increased visibility", "More qualified leads", "Higher engagement"],
            "priority_actions": [
                {
                    "action": "Website SEO Audit",
                    "description": "Identify and fix SEO issues",
                    "timeframe": "immediate",
                    "effort": "medium",
                    "impact": "high"
                },
                {
                    "action": "Content Calendar Creation",
                    "description": "Plan 90 days of content",
                    "timeframe": "week-1",
                    "effort": "medium",
                    "impact": "high"
                }
            ],
            "budget_recommendations": {
                "paid_advertising": "Optional: $500-1000/month for LinkedIn ads",
                "tools_software": ["SEO tool", "Email platform", "Social scheduler"],
                "content_creation": "In-house or freelance writers for blogs"
            }
        }
    
    def _get_default_campaign_blueprints(self) -> List[Dict]:
        """Fallback campaign blueprints"""
        return [
            {
                "campaign_name": "Brand Awareness Series",
                "campaign_goal": "awareness",
                "target_audience": "Business professionals in target industry",
                "key_message": "Introducing innovative solutions for modern challenges",
                "platforms": ["LinkedIn", "Twitter"],
                "campaign_duration": "1 month",
                "campaign_type": "thought_leadership",
                "recommended_content_types": ["Blog posts", "Social posts", "Infographics"],
                "content_pieces_needed": 15,
                "call_to_action": "Follow us for more insights",
                "suggested_offer": "Free industry guide",
                "success_metrics": [
                    {
                        "metric": "Reach",
                        "target": "10,000 impressions",
                        "tracking": "Platform analytics"
                    },
                    {
                        "metric": "Engagement rate",
                        "target": "3%",
                        "tracking": "Social media analytics"
                    }
                ],
                "campaign_phases": [
                    {
                        "phase": "Introduction",
                        "duration": "Week 1-2",
                        "activities": ["Share company story", "Post industry insights"]
                    },
                    {
                        "phase": "Value demonstration",
                        "duration": "Week 3-4",
                        "activities": ["Share success stories", "Educational content"]
                    }
                ],
                "budget_estimate": "low",
                "resources_required": ["Content writer", "Graphic designer"]
            },
            {
                "campaign_name": "Lead Generation Campaign",
                "campaign_goal": "lead_generation",
                "target_audience": "Decision-makers looking for solutions",
                "key_message": "Solve [problem] with our proven approach",
                "platforms": ["LinkedIn", "Email", "Website"],
                "campaign_duration": "ongoing",
                "campaign_type": "educational",
                "recommended_content_types": ["Whitepaper", "Webinar", "Email series"],
                "content_pieces_needed": 10,
                "call_to_action": "Download free guide",
                "suggested_offer": "Comprehensive industry whitepaper",
                "success_metrics": [
                    {
                        "metric": "Leads generated",
                        "target": "50 qualified leads",
                        "tracking": "CRM"
                    },
                    {
                        "metric": "Conversion rate",
                        "target": "5%",
                        "tracking": "Landing page analytics"
                    }
                ],
                "campaign_phases": [
                    {
                        "phase": "Awareness",
                        "duration": "Week 1-2",
                        "activities": ["Promote lead magnet", "Social posts"]
                    },
                    {
                        "phase": "Nurture",
                        "duration": "Ongoing",
                        "activities": ["Email follow-up", "Provide value"]
                    }
                ],
                "budget_estimate": "medium",
                "resources_required": ["Content writer", "Designer", "Email platform"]
            }
        ]

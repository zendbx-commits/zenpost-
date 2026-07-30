"""
Analysis Orchestrator
Coordinates the entire 14-step analysis pipeline
"""
from typing import Dict, Optional
import logging

from .website_validator import WebsiteValidator
from .website_crawler import WebsiteCrawler
from .content_extractor import ContentExtractor
from .seo_analyzer import SEOAnalyzer
from .ai_analyzer import AIAnalyzer

logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """Orchestrates the complete website analysis pipeline"""
    
    def __init__(self):
        self.validator = WebsiteValidator()
        self.crawler = WebsiteCrawler()
        self.extractor = ContentExtractor()
        self.seo_analyzer = SEOAnalyzer()
        self.ai_analyzer = AIAnalyzer()
    
    async def analyze(
        self,
        url: str,
        user_id: str,
        website_id: Optional[str] = None,
        deep_crawl: bool = True
    ) -> Dict:
        """
        Execute complete 14-step analysis pipeline
        
        Args:
            url: Website URL to analyze
            user_id: User ID performing the analysis
            website_id: Optional website ID in database
            deep_crawl: If True, crawl multiple pages
        
        Returns:
            Complete analysis results as structured JSON
        """
        try:
            logger.info(f"Starting analysis pipeline for: {url}")
            
            # STEP 1: Validate Website
            logger.info("Step 1/14: Validating website...")
            is_valid, validation_data, error = await self.validator.validate(url)
            
            if not is_valid:
                raise Exception(f"Website validation failed: {error}")
            
            logger.info(f"✓ Website validated (HTTPS: {validation_data['is_https']}, "
                       f"Status: {validation_data['status_code']}, "
                       f"Response time: {validation_data['response_time']}s)")
            
            # Use final URL after redirects
            final_url = validation_data['final_url']
            
            # STEP 2: Crawl Website
            logger.info("Step 2/14: Crawling website...")
            crawl_data = await self.crawler.crawl(final_url, deep_crawl)
            logger.info(f"✓ Crawled {crawl_data['pages_crawled']} pages")
            
            # STEP 3: Extract Website Information
            logger.info("Step 3/14: Extracting structured content...")
            extracted_data = self.extractor.extract(crawl_data)
            logger.info(f"✓ Extracted data for: {extracted_data.get('business_name')}")
            
            # STEP 4: SEO Analysis
            logger.info("Step 4/14: Analyzing SEO...")
            seo_data = self.seo_analyzer.analyze(crawl_data, extracted_data)
            logger.info(f"✓ SEO Score: {seo_data['score']}/100 (Grade: {seo_data['grade']})")
            
            # STEP 5: Brand Analysis (AI)
            logger.info("Step 5/14: Analyzing brand with AI...")
            brand_data = await self.ai_analyzer.analyze_brand(extracted_data)
            logger.info(f"✓ Brand analyzed - Industry: {brand_data.get('industry')}, "
                       f"Voice: {brand_data.get('brand_voice')[:50]}...")
            
            # STEP 6: Audience Detection (AI)
            logger.info("Step 6/14: Detecting target audience...")
            audience_data = await self.ai_analyzer.detect_audience(extracted_data, brand_data)
            logger.info(f"✓ Target audience: {audience_data.get('ideal_customer')[:50]}...")
            
            # STEP 6.5: Company Profile Detection (for better competitor matching)
            logger.info("Step 6.5/14: Detecting company profile...")
            company_profile = await self.ai_analyzer.detect_company_profile(extracted_data)
            logger.info(f"✓ Company profile: {company_profile.get('company_size')} {company_profile.get('business_stage')}")
            
            # STEP 7: Business Summary (AI)
            logger.info("Step 7/14: Generating business summary...")
            business_summary = await self.ai_analyzer.generate_business_summary(
                extracted_data, brand_data
            )
            logger.info(f"✓ Business summary generated")
            
            # STEP 8: Competitor Discovery (AI) - Now with company profile
            logger.info("Step 8/14: Discovering comparable competitors...")
            competitors = await self.ai_analyzer.discover_competitors(
                extracted_data, brand_data, company_profile
            )
            logger.info(f"✓ Discovered {len(competitors)} comparable competitors")
            
            # STEP 9: Competitor Analysis (AI)
            logger.info("Step 9/14: Analyzing competitors...")
            competitors_analyzed = await self.ai_analyzer.analyze_competitors(competitors, brand_data)
            logger.info(f"✓ Competitors analyzed")
            
            # STEP 10: Marketing Strategy (AI)
            logger.info("Step 10/14: Generating marketing strategy...")
            marketing_strategy = await self.ai_analyzer.generate_marketing_strategy(
                extracted_data, brand_data, audience_data, competitors_analyzed
            )
            logger.info(f"✓ Marketing strategy created with "
                       f"{len(marketing_strategy.get('recommended_platforms', []))} platforms")
            
            # STEP 11: Content Generation (AI)
            logger.info("Step 11/13: Generating content ideas...")
            content_ideas = await self.ai_analyzer.generate_content_ideas(
                brand_data, audience_data, marketing_strategy
            )
            logger.info(f"✓ Content ideas generated across multiple platforms")
            
            # STEP 12: AI Recommendations (AI)
            logger.info("Step 13/14: Generating recommendations...")
            recommendations = await self.ai_analyzer.generate_recommendations(
                extracted_data, seo_data, brand_data, competitors_analyzed
            )
            logger.info(f"✓ Recommendations generated")
            
            # STEP 14: Compile Complete Analysis
            logger.info("Step 14/14: Compiling final analysis...")
            
            complete_analysis = {
                # Validation & Technical
                "validation": validation_data,
                
                # Business Information
                "business": {
                    "business_name": extracted_data.get('business_name'),
                    "website": final_url,
                    "industry": brand_data.get('industry'),
                    "category": brand_data.get('category'),
                    "tagline": extracted_data.get('tagline'),
                    "description": extracted_data.get('description'),
                    "mission": business_summary.get('mission'),
                    "vision": business_summary.get('vision'),
                    "summary": business_summary.get('short_summary'),
                    "detailed_summary": business_summary.get('detailed_summary'),
                    "elevator_pitch": business_summary.get('elevator_pitch'),
                    "company_overview": business_summary.get('company_overview'),
                    "location": extracted_data.get('location'),
                    "geographic_scope": extracted_data.get('geographic_scope'),
                },
                
                # Company Profile
                "company_profile": company_profile,
                
                # Products & Services
                "products": extracted_data.get('products', []),
                "services": extracted_data.get('services', []),
                "features": extracted_data.get('features', []),
                "pricing": extracted_data.get('pricing', []),
                
                # Brand Analysis
                "brand": {
                    **brand_data,
                    "ctas": extracted_data.get('ctas', []),
                },
                
                # Contact Information
                "contact": extracted_data.get('contact', {}),
                
                # Target Audience
                "audience": audience_data,
                
                # SEO Analysis
                "seo": seo_data,
                
                # Competitors
                "competitors": competitors_analyzed,
                
                # Marketing Strategy
                "marketing_strategy": marketing_strategy,
                
                # Content Ideas
                "content": content_ideas,
                
                # Recommendations
                "recommendations": recommendations,
                
                # Metadata
                "metadata": {
                    "analyzed_at": validation_data.get('response_time'),
                    "pages_analyzed": crawl_data.get('pages_crawled'),
                    "has_blog": extracted_data.get('has_blog'),
                    "blog_categories": extracted_data.get('blog_categories', []),
                }
            }
            
            logger.info("=" * 60)
            logger.info("✅ ANALYSIS COMPLETE!")
            logger.info("=" * 60)
            logger.info(f"Business: {complete_analysis['business']['business_name']}")
            logger.info(f"Industry: {complete_analysis['business']['industry']}")
            logger.info(f"SEO Score: {seo_data['score']}/100")
            logger.info(f"Competitors Found: {len(competitors_analyzed)}")
            logger.info("=" * 60)
            
            return complete_analysis
        
        except Exception as e:
            logger.error(f"Analysis pipeline failed: {str(e)}")
            raise

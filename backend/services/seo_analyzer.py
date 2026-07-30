"""
Step 4: SEO Analyzer Service
Analyzes website SEO elements and provides score
"""
from bs4 import BeautifulSoup
from typing import Dict, List
import re
import logging

logger = logging.getLogger(__name__)


class SEOAnalyzer:
    """Analyzes website SEO and provides recommendations"""
    
    def analyze(self, crawl_data: Dict, extracted_data: Dict) -> Dict:
        """
        Perform comprehensive SEO analysis
        
        Args:
            crawl_data: Raw crawl data
            extracted_data: Extracted structured data
        
        Returns:
            Dict with SEO analysis results
        """
        try:
            pages = crawl_data.get('pages', [])
            homepage = pages[0] if pages else {}
            
            # Analyze different SEO aspects
            title_analysis = self._analyze_title(homepage)
            description_analysis = self._analyze_description(homepage)
            headings_analysis = self._analyze_headings(homepage)
            keywords_analysis = self._analyze_keywords(homepage)
            links_analysis = self._analyze_links(pages)
            technical_seo = self._analyze_technical(crawl_data)
            
            # Calculate overall score
            score = self._calculate_seo_score({
                'title': title_analysis,
                'description': description_analysis,
                'headings': headings_analysis,
                'keywords': keywords_analysis,
                'links': links_analysis,
                'technical': technical_seo
            })
            
            # Generate recommendations
            recommendations = self._generate_recommendations({
                'title': title_analysis,
                'description': description_analysis,
                'headings': headings_analysis,
                'keywords': keywords_analysis,
                'links': links_analysis,
                'technical': technical_seo
            })
            
            seo_data = {
                'score': score,
                'grade': self._get_grade(score),
                'title': title_analysis,
                'description': description_analysis,
                'headings': headings_analysis,
                'keywords': keywords_analysis,
                'links': links_analysis,
                'technical': technical_seo,
                'recommendations': recommendations,
                'issues': {
                    'critical': [r for r in recommendations if r['severity'] == 'critical'],
                    'important': [r for r in recommendations if r['severity'] == 'important'],
                    'minor': [r for r in recommendations if r['severity'] == 'minor'],
                }
            }
            
            logger.info(f"SEO analysis completed. Score: {score}/100")
            return seo_data
        
        except Exception as e:
            logger.error(f"SEO analysis error: {str(e)}")
            raise
    
    def _analyze_title(self, page: Dict) -> Dict:
        """Analyze page title"""
        title = page.get('title', '')
        
        analysis = {
            'title': title,
            'length': len(title),
            'exists': bool(title),
            'optimal_length': 30 <= len(title) <= 60,
            'issues': []
        }
        
        if not title:
            analysis['issues'].append("Missing page title")
        elif len(title) < 30:
            analysis['issues'].append("Title is too short (< 30 characters)")
        elif len(title) > 60:
            analysis['issues'].append("Title is too long (> 60 characters)")
        
        return analysis
    
    def _analyze_description(self, page: Dict) -> Dict:
        """Analyze meta description"""
        description = page.get('description', '')
        
        analysis = {
            'description': description,
            'length': len(description),
            'exists': bool(description),
            'optimal_length': 120 <= len(description) <= 160,
            'issues': []
        }
        
        if not description:
            analysis['issues'].append("Missing meta description")
        elif len(description) < 120:
            analysis['issues'].append("Description is too short (< 120 characters)")
        elif len(description) > 160:
            analysis['issues'].append("Description is too long (> 160 characters)")
        
        return analysis
    
    def _analyze_headings(self, page: Dict) -> Dict:
        """Analyze heading structure"""
        headings = page.get('headings', {})
        h1s = headings.get('h1', [])
        h2s = headings.get('h2', [])
        h3s = headings.get('h3', [])
        
        analysis = {
            'h1_count': len(h1s),
            'h2_count': len(h2s),
            'h3_count': len(h3s),
            'h1s': h1s,
            'has_h1': len(h1s) > 0,
            'has_multiple_h1': len(h1s) > 1,
            'issues': []
        }
        
        if len(h1s) == 0:
            analysis['issues'].append("Missing H1 heading")
        elif len(h1s) > 1:
            analysis['issues'].append("Multiple H1 headings found (should be only one)")
        
        if len(h2s) == 0:
            analysis['issues'].append("No H2 headings found")
        
        return analysis
    
    def _analyze_keywords(self, page: Dict) -> Dict:
        """Analyze keyword usage"""
        content = page.get('content', '').lower()
        title = page.get('title', '').lower()
        
        # Extract potential keywords (simple word frequency)
        words = re.findall(r'\b[a-z]{3,}\b', content)
        
        # Filter common words
        stop_words = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'}
        filtered_words = [w for w in words if w not in stop_words]
        
        # Count frequency
        word_freq = {}
        for word in filtered_words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top keywords
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]
        
        return {
            'top_keywords': [{'word': k, 'count': v} for k, v in top_keywords],
            'keyword_density': len(filtered_words) / max(len(words), 1) if words else 0,
            'issues': []
        }
    
    def _analyze_links(self, pages: List[Dict]) -> Dict:
        """Analyze internal and external links"""
        total_internal = 0
        total_external = 0
        
        for page in pages:
            links = page.get('links', {})
            total_internal += len(links.get('internal', []))
            total_external += len(links.get('external', []))
        
        analysis = {
            'internal_links': total_internal,
            'external_links': total_external,
            'ratio': round(total_internal / max(total_external, 1), 2),
            'has_internal_links': total_internal > 0,
            'issues': []
        }
        
        if total_internal == 0:
            analysis['issues'].append("No internal links found")
        elif total_internal < 5:
            analysis['issues'].append("Very few internal links (< 5)")
        
        return analysis
    
    def _analyze_technical(self, crawl_data: Dict) -> Dict:
        """Analyze technical SEO aspects"""
        base_url = crawl_data.get('base_url', '')
        sitemap_urls = crawl_data.get('sitemap_urls', [])
        
        is_https = base_url.startswith('https://')
        has_sitemap = len(sitemap_urls) > 0
        
        analysis = {
            'is_https': is_https,
            'has_sitemap': has_sitemap,
            'sitemap_urls_count': len(sitemap_urls),
            'mobile_friendly': None,  # Would need actual testing
            'page_speed': None,  # Would need actual testing
            'issues': []
        }
        
        if not is_https:
            analysis['issues'].append("Website is not using HTTPS")
        
        if not has_sitemap:
            analysis['issues'].append("No sitemap.xml found")
        
        return analysis
    
    def _calculate_seo_score(self, analyses: Dict) -> int:
        """Calculate overall SEO score out of 100"""
        score = 100
        
        # Title (10 points)
        if not analyses['title']['exists']:
            score -= 10
        elif not analyses['title']['optimal_length']:
            score -= 5
        
        # Description (10 points)
        if not analyses['description']['exists']:
            score -= 10
        elif not analyses['description']['optimal_length']:
            score -= 5
        
        # Headings (15 points)
        if not analyses['headings']['has_h1']:
            score -= 10
        elif analyses['headings']['has_multiple_h1']:
            score -= 5
        
        if analyses['headings']['h2_count'] == 0:
            score -= 5
        
        # Links (15 points)
        if not analyses['links']['has_internal_links']:
            score -= 15
        elif analyses['links']['internal_links'] < 5:
            score -= 7
        
        # Technical (20 points)
        if not analyses['technical']['is_https']:
            score -= 10
        
        if not analyses['technical']['has_sitemap']:
            score -= 10
        
        # Keywords (10 points) - basic check
        if len(analyses['keywords']['top_keywords']) < 5:
            score -= 10
        
        return max(0, score)
    
    def _get_grade(self, score: int) -> str:
        """Convert score to letter grade"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _generate_recommendations(self, analyses: Dict) -> List[Dict]:
        """Generate actionable SEO recommendations"""
        recommendations = []
        
        # Title recommendations
        for issue in analyses['title']['issues']:
            recommendations.append({
                'category': 'Title Tag',
                'severity': 'critical' if 'Missing' in issue else 'important',
                'issue': issue,
                'recommendation': self._get_title_recommendation(issue)
            })
        
        # Description recommendations
        for issue in analyses['description']['issues']:
            recommendations.append({
                'category': 'Meta Description',
                'severity': 'important',
                'issue': issue,
                'recommendation': self._get_description_recommendation(issue)
            })
        
        # Heading recommendations
        for issue in analyses['headings']['issues']:
            recommendations.append({
                'category': 'Headings',
                'severity': 'important',
                'issue': issue,
                'recommendation': self._get_heading_recommendation(issue)
            })
        
        # Link recommendations
        for issue in analyses['links']['issues']:
            recommendations.append({
                'category': 'Internal Linking',
                'severity': 'minor',
                'issue': issue,
                'recommendation': "Add more internal links to improve site navigation and SEO"
            })
        
        # Technical recommendations
        for issue in analyses['technical']['issues']:
            recommendations.append({
                'category': 'Technical SEO',
                'severity': 'critical' if 'HTTPS' in issue else 'important',
                'issue': issue,
                'recommendation': self._get_technical_recommendation(issue)
            })
        
        return recommendations
    
    def _get_title_recommendation(self, issue: str) -> str:
        if 'Missing' in issue:
            return "Add a descriptive title tag (30-60 characters) that includes your main keyword"
        elif 'short' in issue:
            return "Expand your title to 30-60 characters to better describe your page"
        else:
            return "Shorten your title to 30-60 characters to avoid truncation in search results"
    
    def _get_description_recommendation(self, issue: str) -> str:
        if 'Missing' in issue:
            return "Add a compelling meta description (120-160 characters) that summarizes your page"
        elif 'short' in issue:
            return "Expand your meta description to 120-160 characters for better click-through rates"
        else:
            return "Shorten your meta description to 120-160 characters to avoid truncation"
    
    def _get_heading_recommendation(self, issue: str) -> str:
        if 'Missing H1' in issue:
            return "Add a single H1 heading that clearly describes the page content and includes your main keyword"
        elif 'Multiple H1' in issue:
            return "Use only one H1 heading per page and use H2-H6 for subheadings"
        else:
            return "Add H2 headings to structure your content and improve readability"
    
    def _get_technical_recommendation(self, issue: str) -> str:
        if 'HTTPS' in issue:
            return "Migrate to HTTPS immediately for security and SEO benefits"
        else:
            return "Create and submit a sitemap.xml file to help search engines discover your pages"

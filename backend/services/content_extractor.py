"""
Step 3: Content Extractor Service
Extracts structured information from crawled pages
"""
from bs4 import BeautifulSoup
from typing import Dict, List
import re
import logging

logger = logging.getLogger(__name__)


class ContentExtractor:
    """Extracts structured data from website content"""
    
    def extract(self, crawl_data: Dict) -> Dict:
        """
        Extract structured information from crawled data
        
        Args:
            crawl_data: Data from website crawler
        
        Returns:
            Dict with extracted structured data
        """
        try:
            pages = crawl_data.get('pages', [])
            
            if not pages:
                raise ValueError("No pages to extract from")
            
            # Get homepage data
            homepage = pages[0] if pages else {}
            
            # Extract business information
            extracted_data = {
                'business_name': self._extract_business_name(pages),
                'website': crawl_data.get('base_url', ''),
                'tagline': self._extract_tagline(homepage),
                'description': self._extract_description(pages),
                'industry': '',  # Will be determined by AI
                'category': '',  # Will be determined by AI
                
                # Products & Services
                'products': self._extract_products(pages),
                'services': self._extract_services(pages),
                'features': self._extract_features(pages),
                'pricing': self._extract_pricing_info(pages),
                
                # Contact Information
                'contact': {
                    'emails': self._extract_emails(pages),
                    'phones': self._extract_phones(pages),
                    'addresses': self._extract_addresses(pages),
                    'social_links': self._extract_social_links(pages),
                },
                
                # Location Information
                'location': self._extract_location(pages),
                'geographic_scope': self._extract_geographic_scope(pages),
                
                # Blog & Content
                'blog_categories': self._extract_blog_categories(pages),
                'has_blog': self._has_blog(pages),
                
                # Visual Elements
                'images': self._extract_images(pages),
                'brand_colors': [],  # Would need CSS parsing
                
                # Metadata
                'metadata': {
                    'title': homepage.get('title', ''),
                    'description': homepage.get('description', ''),
                    'open_graph': {},
                    'schema_org': {},
                },
                
                # CTAs
                'ctas': self._extract_ctas(pages),
                
                # Raw page content for AI analysis
                'raw_content': {
                    'homepage': homepage.get('content', ''),
                    'about': self._get_page_content(pages, 'about'),
                    'features': self._get_page_content(pages, 'features'),
                    'pricing': self._get_page_content(pages, 'pricing'),
                    'blog': self._get_page_content(pages, 'blog'),
                }
            }
            
            logger.info("Content extraction completed")
            return extracted_data
        
        except Exception as e:
            logger.error(f"Content extraction error: {str(e)}")
            raise
    
    def _extract_business_name(self, pages: List[Dict]) -> str:
        """Extract business name from homepage title"""
        if not pages:
            return ""
        
        title = pages[0].get('title', '')
        
        # Clean up common patterns
        name = re.split(r'[\|\-–—]', title)[0].strip()
        
        # Remove common suffixes
        name = re.sub(r'\s+(home|homepage|official site|website)$', '', name, flags=re.IGNORECASE)
        
        return name
    
    def _extract_tagline(self, homepage: Dict) -> str:
        """Extract tagline/slogan"""
        description = homepage.get('description', '')
        
        # Tagline is usually in meta description or first H1
        h1s = homepage.get('headings', {}).get('h1', [])
        
        if h1s and len(h1s) > 0:
            return h1s[0]
        
        return description[:200] if description else ""
    
    def _extract_description(self, pages: List[Dict]) -> str:
        """Extract business description"""
        # Try about page first
        about_page = next((p for p in pages if 'about' in p['url'].lower()), None)
        
        if about_page:
            content = about_page.get('content', '')
            # Get first few paragraphs
            paragraphs = content.split('\n\n')
            return '\n\n'.join(paragraphs[:3]) if paragraphs else ""
        
        # Fallback to homepage
        if pages:
            return pages[0].get('description', '')
        
        return ""
    
    def _extract_products(self, pages: List[Dict]) -> List[str]:
        """Extract product names"""
        products = []
        
        for page in pages:
            if any(keyword in page['url'].lower() for keyword in ['product', 'shop', 'store']):
                h2s = page.get('headings', {}).get('h2', [])
                h3s = page.get('headings', {}).get('h3', [])
                products.extend(h2s + h3s)
        
        # Deduplicate and limit
        return list(set(products))[:20]
    
    def _extract_services(self, pages: List[Dict]) -> List[str]:
        """Extract service names"""
        services = []
        
        for page in pages:
            if 'service' in page['url'].lower():
                h2s = page.get('headings', {}).get('h2', [])
                h3s = page.get('headings', {}).get('h3', [])
                services.extend(h2s + h3s)
        
        return list(set(services))[:20]
    
    def _extract_features(self, pages: List[Dict]) -> List[str]:
        """Extract feature list"""
        features = []
        
        for page in pages:
            if 'feature' in page['url'].lower() or 'product' in page['url'].lower():
                h3s = page.get('headings', {}).get('h3', [])
                features.extend(h3s)
        
        return list(set(features))[:30]
    
    def _extract_pricing_info(self, pages: List[Dict]) -> List[Dict]:
        """Extract pricing information"""
        pricing = []
        
        for page in pages:
            if 'pricing' in page['url'].lower() or 'price' in page['url'].lower():
                h2s = page.get('headings', {}).get('h2', [])
                h3s = page.get('headings', {}).get('h3', [])
                
                for heading in h2s + h3s:
                    # Check if contains price indicators
                    if any(indicator in heading.lower() for indicator in ['$', '€', '£', 'free', 'pro', 'premium', 'enterprise']):
                        pricing.append({
                            'plan': heading,
                            'page': page['url']
                        })
        
        return pricing[:10]
    
    def _extract_emails(self, pages: List[Dict]) -> List[str]:
        """Extract email addresses"""
        emails = set()
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        
        for page in pages:
            content = page.get('content', '')
            found = re.findall(email_pattern, content)
            emails.update(found)
        
        # Filter out common junk emails
        filtered = [e for e in emails if not any(
            junk in e.lower() for junk in ['example.com', 'test@', 'noreply']
        )]
        
        return filtered[:5]
    
    def _extract_phones(self, pages: List[Dict]) -> List[str]:
        """Extract phone numbers"""
        phones = set()
        phone_pattern = r'\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
        
        for page in pages:
            content = page.get('content', '')
            found = re.findall(phone_pattern, content)
            phones.update(found)
        
        return list(phones)[:3]
    
    def _extract_addresses(self, pages: List[Dict]) -> List[str]:
        """Extract physical addresses"""
        addresses = []
        
        for page in pages:
            if 'contact' in page['url'].lower() or 'about' in page['url'].lower():
                content = page.get('content', '')
                # Simple pattern for addresses (would need improvement)
                lines = content.split('\n')
                for line in lines:
                    if any(indicator in line.lower() for indicator in ['street', 'avenue', 'road', 'suite', 'floor']):
                        addresses.append(line.strip())
        
        return addresses[:3]
    
    def _extract_location(self, pages: List[Dict]) -> str:
        """Extract primary business location"""
        locations = []
        
        # Common location indicators
        location_keywords = [
            'city', 'state', 'country', 'located in', 'based in', 
            'headquarters', 'serving', 'area'
        ]
        
        for page in pages[:5]:  # Check first few pages
            if any(keyword in page['url'].lower() for keyword in ['about', 'contact', 'location']):
                content = page.get('content', '')
                lines = content.split('\n')
                
                for line in lines:
                    line_lower = line.lower()
                    if any(keyword in line_lower for keyword in location_keywords):
                        # Extract location from line
                        locations.append(line.strip())
        
        # Also check addresses for city/state
        addresses = self._extract_addresses(pages)
        for address in addresses:
            # Try to extract city/state from address
            parts = address.split(',')
            if len(parts) >= 2:
                locations.append(f"{parts[-2].strip()}, {parts[-1].strip()}")
        
        # Return most common or first found
        return locations[0][:100] if locations else "Not specified"
    
    def _extract_geographic_scope(self, pages: List[Dict]) -> str:
        """Determine geographic scope (local/regional/national/international)"""
        content_combined = ' '.join([p.get('content', '')[:1000] for p in pages[:3]]).lower()
        
        # Check for scope indicators
        if any(word in content_combined for word in ['worldwide', 'global', 'international', 'countries']):
            return "international"
        elif any(word in content_combined for word in ['nationwide', 'national', 'across the country']):
            return "national"
        elif any(word in content_combined for word in ['regional', 'state', 'province']):
            return "regional"
        else:
            return "local"
    
    def _extract_social_links(self, pages: List[Dict]) -> Dict[str, str]:
        """Extract social media links"""
        social_links = {}
        social_platforms = {
            'linkedin': 'linkedin.com',
            'twitter': 'twitter.com',
            'x': 'x.com',
            'facebook': 'facebook.com',
            'instagram': 'instagram.com',
            'youtube': 'youtube.com',
            'github': 'github.com',
            'tiktok': 'tiktok.com',
            'pinterest': 'pinterest.com',
        }
        
        for page in pages:
            external_links = page.get('links', {}).get('external', [])
            
            for link in external_links:
                for platform, domain in social_platforms.items():
                    if domain in link.lower() and platform not in social_links:
                        social_links[platform] = link
        
        return social_links
    
    def _extract_blog_categories(self, pages: List[Dict]) -> List[str]:
        """Extract blog categories"""
        categories = set()
        
        for page in pages:
            if 'blog' in page['url'].lower():
                # Look for category indicators in URL
                parts = page['url'].split('/')
                for part in parts:
                    if part and part not in ['blog', 'post', 'article']:
                        categories.add(part.replace('-', ' ').title())
        
        return list(categories)[:20]
    
    def _has_blog(self, pages: List[Dict]) -> bool:
        """Check if website has a blog"""
        return any('blog' in page['url'].lower() for page in pages)
    
    def _extract_images(self, pages: List[Dict]) -> List[str]:
        """Extract image URLs (placeholder - would need full HTML parsing)"""
        return []
    
    def _extract_ctas(self, pages: List[Dict]) -> List[str]:
        """Extract Call-to-Action phrases"""
        ctas = set()
        cta_patterns = [
            r'\b(get started|sign up|try free|book demo|contact us|learn more|buy now|shop now|subscribe|download)\b'
        ]
        
        for page in pages[:3]:  # Check first few pages
            content = page.get('content', '').lower()
            for pattern in cta_patterns:
                found = re.findall(pattern, content, re.IGNORECASE)
                ctas.update([match.title() for match in found])
        
        return list(ctas)[:10]
    
    def _get_page_content(self, pages: List[Dict], keyword: str) -> str:
        """Get content from specific page type"""
        page = next((p for p in pages if keyword in p['url'].lower()), None)
        return page.get('content', '')[:2000] if page else ""

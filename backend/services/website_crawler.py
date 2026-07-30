"""
Step 2: Website Crawler Service
Crawls website pages and extracts content
"""
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Set
import trafilatura
import logging

logger = logging.getLogger(__name__)


class WebsiteCrawler:
    """Crawls website and extracts content from multiple pages"""
    
    def __init__(self):
        self.timeout = 30.0
        self.max_pages = 50  # Limit for safety
        self.max_depth = 3
        # Use realistic browser user agent
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        self.headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "max-age=0"
        }
        
        # Priority pages to crawl
        self.priority_paths = [
            '/',
            '/about',
            '/about-us',
            '/features',
            '/products',
            '/services',
            '/pricing',
            '/blog',
            '/documentation',
            '/docs',
            '/faq',
            '/contact',
            '/terms',
            '/privacy',
            '/careers',
            '/resources',
            '/support',
        ]
        
        # Paths to ignore
        self.ignore_patterns = [
            '/login',
            '/signin',
            '/signup',
            '/register',
            '/account',
            '/dashboard',
            '/admin',
            '/wp-admin',
            '/cart',
            '/checkout',
            '.pdf',
            '.zip',
            '.jpg',
            '.png',
            '.gif',
        ]
    
    async def crawl(self, base_url: str, deep_crawl: bool = True) -> Dict:
        """
        Crawl website and extract content
        
        Args:
            base_url: Website base URL
            deep_crawl: If True, crawl multiple pages. If False, only homepage
        
        Returns:
            Dict with crawled pages and content
        """
        try:
            parsed_base = urlparse(base_url)
            base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
            
            crawled_pages = []
            visited_urls: Set[str] = set()
            to_visit: List[tuple] = [(base_url, 0)]  # (url, depth)
            
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers=self.headers
            ) as client:
                
                while to_visit and len(crawled_pages) < self.max_pages:
                    url, depth = to_visit.pop(0)
                    
                    # Skip if already visited
                    if url in visited_urls:
                        continue
                    
                    # Skip if depth exceeded
                    if depth > self.max_depth:
                        continue
                    
                    # Skip ignored patterns
                    if any(pattern in url.lower() for pattern in self.ignore_patterns):
                        continue
                    
                    try:
                        visited_urls.add(url)
                        logger.info(f"Crawling: {url} (depth: {depth})")
                        
                        response = await client.get(url)
                        
                        # Handle 403 - skip this page but continue
                        if response.status_code == 403:
                            logger.warning(f"403 Forbidden for {url}, skipping this page")
                            continue
                        
                        if response.status_code != 200:
                            continue
                        
                        # Check if HTML content
                        content_type = response.headers.get("content-type", "")
                        if "text/html" not in content_type:
                            continue
                        
                        html = response.text
                        
                        # Extract clean text using trafilatura
                        extracted_text = trafilatura.extract(
                            html,
                            include_comments=False,
                            include_tables=True
                        ) or ""
                        
                        # Parse with BeautifulSoup for metadata
                        soup = BeautifulSoup(html, 'lxml')
                        
                        # Extract page data
                        page_data = {
                            'url': url,
                            'title': self._get_title(soup),
                            'description': self._get_meta_description(soup),
                            'content': extracted_text,
                            'headings': self._extract_headings(soup),
                            'links': self._extract_links(soup, base_domain),
                            'depth': depth
                        }
                        
                        crawled_pages.append(page_data)
                        
                        # If deep crawl, add internal links to visit
                        if deep_crawl and depth < self.max_depth:
                            internal_links = page_data['links']['internal']
                            for link in internal_links[:20]:  # Limit links per page
                                if link not in visited_urls:
                                    to_visit.append((link, depth + 1))
                    
                    except Exception as e:
                        logger.warning(f"Failed to crawl {url}: {str(e)}")
                        continue
            
            # Also try to get sitemap
            sitemap_urls = await self._try_get_sitemap(base_domain, client)
            
            logger.info(f"Crawled {len(crawled_pages)} pages from {base_url}")
            
            return {
                'base_url': base_url,
                'pages_crawled': len(crawled_pages),
                'pages': crawled_pages,
                'sitemap_urls': sitemap_urls
            }
        
        except Exception as e:
            logger.error(f"Crawl error: {str(e)}")
            raise
    
    def _get_title(self, soup: BeautifulSoup) -> str:
        """Extract page title"""
        title_tag = soup.find('title')
        return title_tag.text.strip() if title_tag else ""
    
    def _get_meta_description(self, soup: BeautifulSoup) -> str:
        """Extract meta description"""
        meta = soup.find('meta', attrs={'name': 'description'})
        if not meta:
            meta = soup.find('meta', attrs={'property': 'og:description'})
        return meta.get('content', '').strip() if meta else ""
    
    def _extract_headings(self, soup: BeautifulSoup) -> Dict:
        """Extract all headings"""
        return {
            'h1': [h.text.strip() for h in soup.find_all('h1')],
            'h2': [h.text.strip() for h in soup.find_all('h2')],
            'h3': [h.text.strip() for h in soup.find_all('h3')],
        }
    
    def _extract_links(self, soup: BeautifulSoup, base_domain: str) -> Dict:
        """Extract internal and external links"""
        internal = []
        external = []
        
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            
            # Skip empty, anchors, and javascript
            if not href or href.startswith('#') or href.startswith('javascript:'):
                continue
            
            # Make absolute URL
            absolute_url = urljoin(base_domain, href)
            parsed = urlparse(absolute_url)
            
            # Check if internal or external
            if parsed.netloc == urlparse(base_domain).netloc:
                if absolute_url not in internal:
                    internal.append(absolute_url)
            else:
                if parsed.netloc and absolute_url not in external:
                    external.append(absolute_url)
        
        return {
            'internal': internal[:100],  # Limit
            'external': external[:50]
        }
    
    async def _try_get_sitemap(self, base_domain: str, client: httpx.AsyncClient) -> List[str]:
        """Try to fetch sitemap.xml"""
        sitemap_urls = []
        
        try:
            sitemap_url = f"{base_domain}/sitemap.xml"
            response = await client.get(sitemap_url)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'xml')
                locs = soup.find_all('loc')
                sitemap_urls = [loc.text.strip() for loc in locs[:100]]
                logger.info(f"Found {len(sitemap_urls)} URLs in sitemap")
        
        except Exception as e:
            logger.debug(f"No sitemap found: {str(e)}")
        
        return sitemap_urls

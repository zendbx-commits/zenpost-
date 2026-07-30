"""
Step 1: Website Validation Service
Validates URL, checks reachability, HTTPS, response time
"""
import httpx
import validators
import time
from typing import Dict, Tuple
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)


class WebsiteValidator:
    """Validates website URLs and checks accessibility"""
    
    def __init__(self):
        self.timeout = 30.0
        # Use a realistic browser user agent to avoid blocking
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
    
    async def validate(self, url: str) -> Tuple[bool, Dict, str]:
        """
        Validate website URL and accessibility
        
        Returns:
            Tuple[bool, Dict, str]: (is_valid, validation_data, error_message)
        """
        try:
            # Step 1: Validate URL format
            if not validators.url(url):
                return False, {}, "Invalid URL format"
            
            # Parse URL
            parsed = urlparse(url)
            
            # Step 2: Check HTTPS (warn if HTTP)
            is_https = parsed.scheme == "https"
            
            # Step 3: Check website reachability
            start_time = time.time()
            
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers=self.headers
            ) as client:
                try:
                    response = await client.get(url)
                    response_time = time.time() - start_time
                    
                    # Step 4: Check status code
                    # For 403, try to continue anyway (some sites block crawlers but we can still analyze)
                    if response.status_code == 403:
                        logger.warning(f"Website returned 403 Forbidden. Will attempt limited analysis.")
                        # Return as valid but with warning
                        validation_data = {
                            "original_url": url,
                            "final_url": url,
                            "is_https": is_https,
                            "status_code": response.status_code,
                            "response_time": round(response_time, 2),
                            "content_type": response.headers.get("content-type", ""),
                            "server": response.headers.get("server", ""),
                            "is_reachable": True,
                            "redirected": False,
                            "warning": "Website has bot protection (403). Analysis may be limited."
                        }
                        return True, validation_data, ""
                    
                    if response.status_code >= 400:
                        return False, {}, f"Website returned error status: {response.status_code}"
                    
                    # Get final URL after redirects
                    final_url = str(response.url)
                    
                    # Build validation data
                    validation_data = {
                        "original_url": url,
                        "final_url": final_url,
                        "is_https": is_https,
                        "status_code": response.status_code,
                        "response_time": round(response_time, 2),
                        "content_type": response.headers.get("content-type", ""),
                        "server": response.headers.get("server", ""),
                        "is_reachable": True,
                        "redirected": url != final_url
                    }
                    
                    logger.info(f"Website validated successfully: {url}")
                    return True, validation_data, ""
                    
                except httpx.TimeoutException:
                    return False, {}, f"Website timeout (>{self.timeout}s)"
                    
                except httpx.ConnectError:
                    return False, {}, "Cannot connect to website"
                    
                except Exception as e:
                    return False, {}, f"Connection error: {str(e)}"
        
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return False, {}, f"Validation error: {str(e)}"

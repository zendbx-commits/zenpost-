/**
 * Calendar Test Data Utility
 * Use this to add sample posts for testing the Content Calendar
 */

export function generateSamplePosts(count = 15) {
  const today = new Date();
  const samplePosts = [];
  
  const platforms = ['LinkedIn', 'Instagram', 'Facebook', 'Twitter'];
  const types = ['Image', 'Video', 'Carousel', 'Story'];
  const statuses = ['scheduled', 'draft'];
  
  const sampleContent = [
    {
      title: "5 Marketing Strategies That Actually Work",
      hook: "Stop wasting money on marketing that doesn't convert!",
      caption: "After testing hundreds of campaigns, we've identified the 5 strategies that consistently deliver ROI. Here's what you need to know...",
      cta: "Download our free guide",
      hashtags: ['#marketing', '#business', '#strategy', '#growth']
    },
    {
      title: "Behind the Scenes: Our Product Launch",
      hook: "What happens when you launch a product with zero budget?",
      caption: "We launched our latest product with $0 in advertising. Here's the complete story of how we did it and what we learned.",
      cta: "Read the full case study",
      hashtags: ['#startup', '#product', '#launch', '#entrepreneur']
    },
    {
      title: "Customer Success Story: 10x Growth",
      hook: "From struggling to scaling: A real transformation story",
      caption: "Meet Sarah, who grew her business by 10x in just 6 months using our platform. Here's her journey and the key lessons learned.",
      cta: "See more success stories",
      hashtags: ['#success', '#growth', '#business', '#testimonial']
    },
    {
      title: "Industry Trends You Can't Ignore in 2026",
      hook: "The future of our industry is here. Are you ready?",
      caption: "We analyzed data from 1,000+ companies to identify the trends that will shape 2026. Here are the top 5 you need to know.",
      cta: "Get the full report",
      hashtags: ['#trends', '#future', '#industry', '#innovation']
    },
    {
      title: "How We Increased Productivity by 50%",
      hook: "The one tool that changed everything for our team",
      caption: "Remote work was killing our productivity. Then we discovered this simple solution that boosted our output by 50%. Here's what we did...",
      cta: "Try it for your team",
      hashtags: ['#productivity', '#remote', '#tools', '#efficiency']
    }
  ];
  
  for (let i = 0; i < count; i++) {
    const postDate = new Date(today);
    postDate.setDate(today.getDate() + Math.floor(Math.random() * 30));
    
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const content = sampleContent[i % sampleContent.length];
    
    const hour = Math.floor(Math.random() * 12) + 8; // 8 AM to 7 PM
    const minute = ['00', '15', '30', '45'][Math.floor(Math.random() * 4)];
    const time = `${hour.toString().padStart(2, '0')}:${minute}`;
    
    samplePosts.push({
      id: `sample-post-${Date.now()}-${i}`,
      date: postDate.toISOString().split('T')[0],
      time: time,
      platform: platform,
      platforms: [platform],
      type: type,
      status: status,
      title: content.title,
      hook: content.hook,
      caption: content.caption,
      call_to_action: content.cta,
      hashtags: content.hashtags,
      image_prompt: `Professional marketing image for: ${content.title}`,
      image_url: null,
      campaign_id: null,
      engagement_goal: 'awareness'
    });
  }
  
  return samplePosts.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function addSamplePostsToLocalStorage(userId, count = 15) {
  const posts = generateSamplePosts(count);
  
  // Get existing posts
  const existingPostsStr = localStorage.getItem(`zenpost_scheduled_posts_${userId}`);
  let existingPosts = [];
  
  if (existingPostsStr) {
    try {
      existingPosts = JSON.parse(existingPostsStr);
    } catch (e) {
      console.error('Failed to parse existing posts:', e);
    }
  }
  
  // Merge and save
  const allPosts = [...existingPosts, ...posts];
  localStorage.setItem(`zenpost_scheduled_posts_${userId}`, JSON.stringify(allPosts));
  
  console.log(`Added ${posts.length} sample posts to localStorage`);
  console.log(`Total posts: ${allPosts.length}`);
  
  return allPosts;
}

export function clearAllPosts(userId) {
  localStorage.removeItem(`zenpost_scheduled_posts_${userId}`);
  console.log('Cleared all posts from localStorage');
}

// Export for console access
if (typeof window !== 'undefined') {
  window.calendarTestData = {
    generateSamplePosts,
    addSamplePostsToLocalStorage,
    clearAllPosts
  };
}

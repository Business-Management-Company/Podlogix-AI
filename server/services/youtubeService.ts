const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export function isYouTubeConfigured(): boolean {
  return !!YOUTUBE_API_KEY;
}

export interface YouTubeChannel {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  country: string | null;
  customUrl: string | null;
  publishedAt: string;
}

export interface YouTubeSearchResult {
  channels: YouTubeChannel[];
  total: number;
  nextPageToken: string | null;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

export async function searchYouTubeChannels(
  query: string,
  options: {
    maxResults?: number;
    pageToken?: string;
    order?: 'relevance' | 'viewCount' | 'rating' | 'date';
  } = {}
): Promise<YouTubeSearchResult> {
  if (!isYouTubeConfigured()) {
    console.log('YouTube API not configured, returning mock data');
    return getMockYouTubeResults(query);
  }

  const { maxResults = 10, pageToken, order = 'relevance' } = options;

  try {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      q: query,
      maxResults: maxResults.toString(),
      order,
      key: YOUTUBE_API_KEY!,
    });

    if (pageToken) {
      searchParams.set('pageToken', pageToken);
    }

    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?${searchParams}`
    );

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error('YouTube Search API error:', error);
      return getMockYouTubeResults(query);
    }

    const searchData = await searchResponse.json();
    const channelIds = searchData.items
      ?.map((item: any) => item.snippet?.channelId || item.id?.channelId)
      .filter(Boolean)
      .join(',');

    if (!channelIds) {
      return { channels: [], total: 0, nextPageToken: null };
    }

    const channelParams = new URLSearchParams({
      part: 'snippet,statistics,brandingSettings',
      id: channelIds,
      key: YOUTUBE_API_KEY!,
    });

    const channelResponse = await fetch(
      `${YOUTUBE_API_BASE}/channels?${channelParams}`
    );

    if (!channelResponse.ok) {
      const error = await channelResponse.text();
      console.error('YouTube Channels API error:', error);
      return getMockYouTubeResults(query);
    }

    const channelData = await channelResponse.json();

    const channels: YouTubeChannel[] = channelData.items?.map((channel: any) => ({
      channelId: channel.id,
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      thumbnailUrl: channel.snippet?.thumbnails?.medium?.url || 
                    channel.snippet?.thumbnails?.default?.url || '',
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
      viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
      country: channel.snippet?.country || channel.brandingSettings?.channel?.country || null,
      customUrl: channel.snippet?.customUrl || null,
      publishedAt: channel.snippet?.publishedAt || '',
    })) || [];

    return {
      channels,
      total: searchData.pageInfo?.totalResults || channels.length,
      nextPageToken: searchData.nextPageToken || null,
    };
  } catch (error) {
    console.error('YouTube API error:', error);
    return getMockYouTubeResults(query);
  }
}

export async function getChannelDetails(channelId: string): Promise<YouTubeChannel | null> {
  if (!isYouTubeConfigured()) {
    return getMockChannelDetails(channelId);
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet,statistics,brandingSettings',
      id: channelId,
      key: YOUTUBE_API_KEY!,
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/channels?${params}`);

    if (!response.ok) {
      console.error('YouTube Channel API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const channel = data.items?.[0];

    if (!channel) return null;

    return {
      channelId: channel.id,
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      thumbnailUrl: channel.snippet?.thumbnails?.medium?.url || 
                    channel.snippet?.thumbnails?.default?.url || '',
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10),
      viewCount: parseInt(channel.statistics?.viewCount || '0', 10),
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10),
      country: channel.snippet?.country || channel.brandingSettings?.channel?.country || null,
      customUrl: channel.snippet?.customUrl || null,
      publishedAt: channel.snippet?.publishedAt || '',
    };
  } catch (error) {
    console.error('YouTube API error:', error);
    return null;
  }
}

export async function getChannelVideos(
  channelId: string,
  maxResults: number = 10
): Promise<YouTubeVideo[]> {
  if (!isYouTubeConfigured()) {
    return getMockVideos();
  }

  try {
    const searchParams = new URLSearchParams({
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'date',
      maxResults: maxResults.toString(),
      key: YOUTUBE_API_KEY!,
    });

    const searchResponse = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);

    if (!searchResponse.ok) {
      console.error('YouTube Search API error:', await searchResponse.text());
      return [];
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items
      ?.map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) return [];

    const videoParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
      key: YOUTUBE_API_KEY!,
    });

    const videoResponse = await fetch(`${YOUTUBE_API_BASE}/videos?${videoParams}`);

    if (!videoResponse.ok) {
      console.error('YouTube Videos API error:', await videoResponse.text());
      return [];
    }

    const videoData = await videoResponse.json();

    return videoData.items?.map((video: any) => ({
      videoId: video.id,
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url || 
                    video.snippet?.thumbnails?.default?.url || '',
      publishedAt: video.snippet?.publishedAt || '',
      viewCount: parseInt(video.statistics?.viewCount || '0', 10),
      likeCount: parseInt(video.statistics?.likeCount || '0', 10),
      commentCount: parseInt(video.statistics?.commentCount || '0', 10),
      duration: video.contentDetails?.duration || '',
    })) || [];
  } catch (error) {
    console.error('YouTube API error:', error);
    return [];
  }
}

export function calculateEngagementRate(
  subscriberCount: number,
  avgViews: number,
  avgLikes: number,
  avgComments: number
): number {
  // Guard against zero denominators
  if (subscriberCount === 0 || avgViews === 0) return 0;
  const totalEngagement = avgLikes + avgComments;
  // Engagement rate = (likes + comments) / views * 100
  const rate = (totalEngagement / avgViews) * 100;
  // Ensure valid number and cap at reasonable maximum
  if (!isFinite(rate) || isNaN(rate)) return 0;
  return Math.min(rate, 100);
}

function getMockYouTubeResults(query: string): YouTubeSearchResult {
  const mockChannels: YouTubeChannel[] = [
    {
      channelId: 'UC_demo_1',
      title: 'Tech Reviews Daily',
      description: 'Your daily source for the latest tech reviews, unboxings, and tutorials. We cover smartphones, laptops, gaming gear, and everything tech!',
      thumbnailUrl: 'https://images.unsplash.com/photo-1535303311164-664fc9ec6532?w=200',
      subscriberCount: 1250000,
      viewCount: 450000000,
      videoCount: 892,
      country: 'US',
      customUrl: '@techreviewsdaily',
      publishedAt: '2018-03-15T00:00:00Z',
    },
    {
      channelId: 'UC_demo_2',
      title: 'Fitness with Emma',
      description: 'Certified personal trainer sharing workout routines, nutrition tips, and motivation to help you reach your fitness goals.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200',
      subscriberCount: 680000,
      viewCount: 125000000,
      videoCount: 456,
      country: 'US',
      customUrl: '@fitnesswithemma',
      publishedAt: '2019-06-20T00:00:00Z',
    },
    {
      channelId: 'UC_demo_3',
      title: 'Cooking Adventures',
      description: 'Easy-to-follow recipes from around the world. From quick weeknight dinners to impressive dinner party dishes.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
      subscriberCount: 2100000,
      viewCount: 890000000,
      videoCount: 1234,
      country: 'UK',
      customUrl: '@cookingadventures',
      publishedAt: '2016-09-10T00:00:00Z',
    },
    {
      channelId: 'UC_demo_4',
      title: 'Gaming Pro Tips',
      description: 'Pro gamer sharing strategies, walkthroughs, and tips for the latest games. Level up your gameplay!',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200',
      subscriberCount: 890000,
      viewCount: 320000000,
      videoCount: 678,
      country: 'CA',
      customUrl: '@gamingprotips',
      publishedAt: '2017-11-25T00:00:00Z',
    },
    {
      channelId: 'UC_demo_5',
      title: 'Travel Vlogs by Alex',
      description: 'Exploring hidden gems and popular destinations around the globe. Budget travel tips and cultural experiences.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200',
      subscriberCount: 450000,
      viewCount: 95000000,
      videoCount: 234,
      country: 'AU',
      customUrl: '@travelvlogsalex',
      publishedAt: '2020-02-14T00:00:00Z',
    },
  ];

  const filtered = query
    ? mockChannels.filter(c =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : mockChannels;

  return {
    channels: filtered.length > 0 ? filtered : mockChannels,
    total: filtered.length > 0 ? filtered.length : mockChannels.length,
    nextPageToken: null,
  };
}

function getMockChannelDetails(channelId: string): YouTubeChannel | null {
  const mockChannels: Record<string, YouTubeChannel> = {
    'UC_demo_1': {
      channelId: 'UC_demo_1',
      title: 'Tech Reviews Daily',
      description: 'Your daily source for the latest tech reviews.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1535303311164-664fc9ec6532?w=200',
      subscriberCount: 1250000,
      viewCount: 450000000,
      videoCount: 892,
      country: 'US',
      customUrl: '@techreviewsdaily',
      publishedAt: '2018-03-15T00:00:00Z',
    },
  };

  return mockChannels[channelId] || null;
}

function getMockVideos(): YouTubeVideo[] {
  return [
    {
      videoId: 'demo_vid_1',
      title: 'iPhone 16 Pro Max - Full Review After 30 Days',
      description: 'My comprehensive review after using the iPhone 16 Pro Max as my daily driver.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=320',
      publishedAt: '2025-01-15T10:00:00Z',
      viewCount: 2500000,
      likeCount: 125000,
      commentCount: 8500,
      duration: 'PT18M32S',
    },
    {
      videoId: 'demo_vid_2',
      title: 'Best Budget Laptops 2025 - Top 5 Picks',
      description: 'Looking for an affordable laptop? Here are my top 5 recommendations.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=320',
      publishedAt: '2025-01-10T14:30:00Z',
      viewCount: 890000,
      likeCount: 45000,
      commentCount: 3200,
      duration: 'PT12M15S',
    },
  ];
}

const MODASH_API_KEY = process.env.MODASH_API_KEY;
const MODASH_BASE_URL = 'https://api.modash.io/v1';

export function isModashConfigured(): boolean {
  return !!MODASH_API_KEY;
}

export interface InfluencerSearchFilters {
  platform: 'instagram' | 'tiktok' | 'youtube';
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  maxEngagement?: number;
  location?: string;
  keywords?: string[];
  hashtags?: string[];
}

export interface InfluencerResult {
  userId: string;
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  location: string | null;
  categories: string[];
  platform: string;
}

export interface SearchResult {
  influencers: InfluencerResult[];
  total: number;
  page: number;
  hasMore: boolean;
}

async function getModashHeaders(): Promise<HeadersInit> {
  return {
    'Authorization': `Bearer ${MODASH_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function searchInfluencers(
  filters: InfluencerSearchFilters,
  page: number = 1
): Promise<SearchResult> {
  if (!isModashConfigured()) {
    console.log('Modash not configured, returning mock data');
    return getMockSearchResults(filters, page);
  }

  try {
    const headers = await getModashHeaders();
    
    const body: any = {
      page,
      per_page: 20,
      sort: { field: 'followers', order: 'desc' },
      filter: {
        influencer: {},
        audience: {},
      },
    };

    if (filters.minFollowers || filters.maxFollowers) {
      body.filter.influencer.followers = {};
      if (filters.minFollowers) body.filter.influencer.followers.min = filters.minFollowers;
      if (filters.maxFollowers) body.filter.influencer.followers.max = filters.maxFollowers;
    }

    if (filters.minEngagement || filters.maxEngagement) {
      body.filter.influencer.engagement_rate = {};
      if (filters.minEngagement) body.filter.influencer.engagement_rate.min = filters.minEngagement / 100;
      if (filters.maxEngagement) body.filter.influencer.engagement_rate.max = filters.maxEngagement / 100;
    }

    if (filters.location) {
      body.filter.influencer.geo = { countries: [filters.location] };
    }

    if (filters.keywords && filters.keywords.length > 0) {
      body.filter.influencer.keywords = filters.keywords;
    }

    if (filters.hashtags && filters.hashtags.length > 0) {
      body.filter.influencer.hashtags = filters.hashtags;
    }

    const response = await fetch(`${MODASH_BASE_URL}/${filters.platform}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Modash API error:', error);
      return getMockSearchResults(filters, page);
    }

    const data = await response.json();
    
    return {
      influencers: data.data?.map((profile: any) => ({
        userId: profile.user_id || profile.id,
        username: profile.username,
        fullName: profile.fullname || profile.full_name,
        profilePicUrl: profile.picture || profile.profile_pic_url,
        bio: profile.bio,
        followerCount: profile.followers || profile.follower_count,
        followingCount: profile.following || profile.following_count || 0,
        engagementRate: (profile.engagement_rate || 0) * 100,
        avgLikes: profile.avg_likes || 0,
        avgComments: profile.avg_comments || 0,
        location: profile.geo?.country || profile.location || null,
        categories: profile.interests || profile.categories || [],
        platform: filters.platform,
      })) || [],
      total: data.total || 0,
      page,
      hasMore: data.has_more || false,
    };
  } catch (error) {
    console.error('Modash API error:', error);
    return getMockSearchResults(filters, page);
  }
}

export async function getInfluencerProfile(
  platform: string,
  username: string
): Promise<InfluencerResult | null> {
  if (!isModashConfigured()) {
    return getMockProfile(platform, username);
  }

  try {
    const headers = await getModashHeaders();
    const response = await fetch(
      `${MODASH_BASE_URL}/${platform}/profile/@${username}`,
      { method: 'GET', headers }
    );

    if (!response.ok) {
      console.error('Modash profile error:', await response.text());
      return getMockProfile(platform, username);
    }

    const data = await response.json();
    const profile = data.profile;

    return {
      userId: profile.user_id || profile.id,
      username: profile.username,
      fullName: profile.fullname || profile.full_name,
      profilePicUrl: profile.picture || profile.profile_pic_url,
      bio: profile.bio,
      followerCount: profile.followers || profile.follower_count,
      followingCount: profile.following || profile.following_count || 0,
      engagementRate: (profile.engagement_rate || 0) * 100,
      avgLikes: profile.avg_likes || 0,
      avgComments: profile.avg_comments || 0,
      location: profile.geo?.country || profile.location || null,
      categories: profile.interests || profile.categories || [],
      platform,
    };
  } catch (error) {
    console.error('Modash API error:', error);
    return getMockProfile(platform, username);
  }
}

function getMockSearchResults(filters: InfluencerSearchFilters, page: number): SearchResult {
  const mockInfluencers: InfluencerResult[] = [
    {
      userId: 'demo-1',
      username: 'lifestyle_sarah',
      fullName: 'Sarah Johnson',
      profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Lifestyle blogger & travel enthusiast. Sharing daily adventures and style tips.',
      followerCount: 125000,
      followingCount: 890,
      engagementRate: 4.2,
      avgLikes: 5250,
      avgComments: 180,
      location: 'Los Angeles, CA',
      categories: ['Lifestyle', 'Travel', 'Fashion'],
      platform: filters.platform,
    },
    {
      userId: 'demo-2',
      username: 'tech_alex',
      fullName: 'Alex Chen',
      profilePicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Tech reviewer & gadget enthusiast. Making technology accessible for everyone.',
      followerCount: 450000,
      followingCount: 234,
      engagementRate: 6.8,
      avgLikes: 30600,
      avgComments: 980,
      location: 'San Francisco, CA',
      categories: ['Technology', 'Reviews', 'Tutorials'],
      platform: filters.platform,
    },
    {
      userId: 'demo-3',
      username: 'fitness_maya',
      fullName: 'Maya Rodriguez',
      profilePicUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      bio: 'Certified fitness trainer. Transform your body & mind with evidence-based workouts.',
      followerCount: 89000,
      followingCount: 456,
      engagementRate: 5.5,
      avgLikes: 4895,
      avgComments: 210,
      location: 'Miami, FL',
      categories: ['Fitness', 'Health', 'Wellness'],
      platform: filters.platform,
    },
    {
      userId: 'demo-4',
      username: 'foodie_james',
      fullName: 'James Wilson',
      profilePicUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      bio: 'Food blogger & home chef. Recipes that bring families together around the table.',
      followerCount: 234000,
      followingCount: 567,
      engagementRate: 3.8,
      avgLikes: 8892,
      avgComments: 320,
      location: 'New York, NY',
      categories: ['Food', 'Cooking', 'Recipes'],
      platform: filters.platform,
    },
    {
      userId: 'demo-5',
      username: 'beauty_emma',
      fullName: 'Emma Thompson',
      profilePicUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      bio: 'Beauty & skincare enthusiast. Honest reviews & tutorials for all skin types.',
      followerCount: 178000,
      followingCount: 345,
      engagementRate: 4.9,
      avgLikes: 8722,
      avgComments: 290,
      location: 'Chicago, IL',
      categories: ['Beauty', 'Skincare', 'Makeup'],
      platform: filters.platform,
    },
  ];

  let filtered = mockInfluencers;
  
  if (filters.minFollowers) {
    filtered = filtered.filter(i => i.followerCount >= filters.minFollowers!);
  }
  if (filters.maxFollowers) {
    filtered = filtered.filter(i => i.followerCount <= filters.maxFollowers!);
  }
  if (filters.minEngagement) {
    filtered = filtered.filter(i => i.engagementRate >= filters.minEngagement!);
  }
  if (filters.keywords && filters.keywords.length > 0) {
    filtered = filtered.filter(i => 
      filters.keywords!.some(k => 
        i.bio?.toLowerCase().includes(k.toLowerCase()) ||
        i.categories.some(c => c.toLowerCase().includes(k.toLowerCase()))
      )
    );
  }

  return {
    influencers: filtered,
    total: filtered.length,
    page,
    hasMore: false,
  };
}

function getMockProfile(platform: string, username: string): InfluencerResult | null {
  const mockProfiles: Record<string, InfluencerResult> = {
    'lifestyle_sarah': {
      userId: 'demo-1',
      username: 'lifestyle_sarah',
      fullName: 'Sarah Johnson',
      profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Lifestyle blogger & travel enthusiast. Sharing daily adventures and style tips.',
      followerCount: 125000,
      followingCount: 890,
      engagementRate: 4.2,
      avgLikes: 5250,
      avgComments: 180,
      location: 'Los Angeles, CA',
      categories: ['Lifestyle', 'Travel', 'Fashion'],
      platform,
    },
    'tech_alex': {
      userId: 'demo-2',
      username: 'tech_alex',
      fullName: 'Alex Chen',
      profilePicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Tech reviewer & gadget enthusiast. Making technology accessible for everyone.',
      followerCount: 450000,
      followingCount: 234,
      engagementRate: 6.8,
      avgLikes: 30600,
      avgComments: 980,
      location: 'San Francisco, CA',
      categories: ['Technology', 'Reviews', 'Tutorials'],
      platform,
    },
  };

  return mockProfiles[username] || null;
}

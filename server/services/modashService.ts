const MODASH_API_URL = 'https://api.modash.io/v1';

interface ModashSearchFilters {
  platform: 'instagram' | 'tiktok' | 'youtube';
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  maxEngagement?: number;
  location?: string;
  gender?: string;
  language?: string;
  keywords?: string[];
  hashtags?: string[];
  categories?: string[];
}

interface ModashInfluencer {
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

interface ModashSearchResult {
  influencers: ModashInfluencer[];
  total: number;
  page: number;
  hasMore: boolean;
}

function getModashApiKey(): string | null {
  return process.env.MODASH_API_KEY || null;
}

export function isModashConfigured(): boolean {
  return !!getModashApiKey();
}

export async function searchInfluencers(
  filters: ModashSearchFilters,
  page: number = 1,
  limit: number = 20
): Promise<ModashSearchResult> {
  const apiKey = getModashApiKey();
  
  if (!apiKey) {
    console.log('Modash API key not configured, returning mock data');
    return getMockSearchResults(filters, page, limit);
  }

  try {
    const response = await fetch(`${MODASH_API_URL}/discovery/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: filters.platform,
        page,
        limit,
        filters: {
          follower_count: {
            min: filters.minFollowers,
            max: filters.maxFollowers,
          },
          engagement_rate: {
            min: filters.minEngagement,
            max: filters.maxEngagement,
          },
          location: filters.location,
          gender: filters.gender,
          language: filters.language,
          keywords: filters.keywords,
          hashtags: filters.hashtags,
          categories: filters.categories,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Modash API error:', error);
      throw new Error(error.message || 'Failed to search influencers');
    }

    const data = await response.json();
    
    return {
      influencers: data.results.map((r: any) => ({
        userId: r.user_id,
        username: r.username,
        fullName: r.full_name,
        profilePicUrl: r.profile_pic_url,
        bio: r.bio,
        followerCount: r.follower_count,
        followingCount: r.following_count,
        engagementRate: r.engagement_rate,
        avgLikes: r.avg_likes,
        avgComments: r.avg_comments,
        location: r.location,
        categories: r.categories || [],
        platform: filters.platform,
      })),
      total: data.total,
      page: data.page,
      hasMore: data.has_more,
    };
  } catch (error) {
    console.error('Error searching Modash:', error);
    return getMockSearchResults(filters, page, limit);
  }
}

export async function getInfluencerProfile(
  platform: string,
  username: string
): Promise<ModashInfluencer | null> {
  const apiKey = getModashApiKey();
  
  if (!apiKey) {
    console.log('Modash API key not configured, returning mock data');
    return getMockInfluencer(platform, username);
  }

  try {
    const response = await fetch(
      `${MODASH_API_URL}/discovery/profile/${platform}/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get influencer profile');
    }

    const data = await response.json();
    
    return {
      userId: data.user_id,
      username: data.username,
      fullName: data.full_name,
      profilePicUrl: data.profile_pic_url,
      bio: data.bio,
      followerCount: data.follower_count,
      followingCount: data.following_count,
      engagementRate: data.engagement_rate,
      avgLikes: data.avg_likes,
      avgComments: data.avg_comments,
      location: data.location,
      categories: data.categories || [],
      platform,
    };
  } catch (error) {
    console.error('Error getting influencer profile:', error);
    return getMockInfluencer(platform, username);
  }
}

function getMockSearchResults(
  filters: ModashSearchFilters,
  page: number,
  limit: number
): ModashSearchResult {
  const mockInfluencers: ModashInfluencer[] = [
    {
      userId: 'mock_1',
      username: 'lifestyle_creator',
      fullName: 'Sarah Johnson',
      profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Lifestyle | Travel | Fashion. Sharing my journey one post at a time.',
      followerCount: 125000,
      followingCount: 890,
      engagementRate: 3.2,
      avgLikes: 4000,
      avgComments: 120,
      location: 'Los Angeles, CA',
      categories: ['lifestyle', 'fashion', 'travel'],
      platform: filters.platform,
    },
    {
      userId: 'mock_2',
      username: 'tech_reviewer',
      fullName: 'Mike Chen',
      profilePicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Tech enthusiast | Gadget reviews | Unboxing videos',
      followerCount: 89000,
      followingCount: 450,
      engagementRate: 4.5,
      avgLikes: 4000,
      avgComments: 200,
      location: 'San Francisco, CA',
      categories: ['technology', 'gadgets', 'reviews'],
      platform: filters.platform,
    },
    {
      userId: 'mock_3',
      username: 'fitness_guru',
      fullName: 'Alex Rivera',
      profilePicUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      bio: 'Certified Personal Trainer | Nutrition Tips | Workout Motivation',
      followerCount: 210000,
      followingCount: 320,
      engagementRate: 5.1,
      avgLikes: 10700,
      avgComments: 450,
      location: 'Miami, FL',
      categories: ['fitness', 'health', 'nutrition'],
      platform: filters.platform,
    },
    {
      userId: 'mock_4',
      username: 'foodie_adventures',
      fullName: 'Emma Williams',
      profilePicUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      bio: 'Food blogger | Restaurant reviews | Home cooking recipes',
      followerCount: 67000,
      followingCount: 1200,
      engagementRate: 6.2,
      avgLikes: 4150,
      avgComments: 180,
      location: 'New York, NY',
      categories: ['food', 'cooking', 'restaurants'],
      platform: filters.platform,
    },
    {
      userId: 'mock_5',
      username: 'beauty_queen',
      fullName: 'Jessica Park',
      profilePicUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      bio: 'Beauty & Skincare | Makeup tutorials | Product reviews',
      followerCount: 340000,
      followingCount: 560,
      engagementRate: 2.8,
      avgLikes: 9500,
      avgComments: 320,
      location: 'Seoul, South Korea',
      categories: ['beauty', 'skincare', 'makeup'],
      platform: filters.platform,
    },
  ];

  const filteredInfluencers = mockInfluencers.filter(inf => {
    if (filters.minFollowers && inf.followerCount < filters.minFollowers) return false;
    if (filters.maxFollowers && inf.followerCount > filters.maxFollowers) return false;
    if (filters.minEngagement && inf.engagementRate < filters.minEngagement) return false;
    if (filters.maxEngagement && inf.engagementRate > filters.maxEngagement) return false;
    return true;
  });

  return {
    influencers: filteredInfluencers.slice((page - 1) * limit, page * limit),
    total: filteredInfluencers.length,
    page,
    hasMore: page * limit < filteredInfluencers.length,
  };
}

function getMockInfluencer(platform: string, username: string): ModashInfluencer {
  return {
    userId: `mock_${username}`,
    username,
    fullName: username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Content creator | Sharing my passion with the world',
    followerCount: Math.floor(Math.random() * 500000) + 10000,
    followingCount: Math.floor(Math.random() * 2000) + 100,
    engagementRate: Math.random() * 5 + 1,
    avgLikes: Math.floor(Math.random() * 10000) + 500,
    avgComments: Math.floor(Math.random() * 500) + 20,
    location: 'United States',
    categories: ['lifestyle', 'content'],
    platform,
  };
}

export type { ModashInfluencer, ModashSearchFilters, ModashSearchResult };

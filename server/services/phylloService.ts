const PHYLLO_CLIENT_ID = process.env.PHYLLO_CLIENT_ID;
const PHYLLO_SECRET = process.env.PHYLLO_SECRET;
const PHYLLO_BASE_URL = process.env.PHYLLO_ENVIRONMENT === 'production' 
  ? 'https://api.getphyllo.com' 
  : 'https://api.sandbox.getphyllo.com';

export function isPhylloConfigured(): boolean {
  return !!(PHYLLO_CLIENT_ID && PHYLLO_SECRET);
}

async function getPhylloHeaders(): Promise<HeadersInit> {
  const credentials = Buffer.from(`${PHYLLO_CLIENT_ID}:${PHYLLO_SECRET}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
}

export interface PhylloUser {
  id: string;
  name: string;
  external_id: string;
  created_at: string;
}

export interface PhylloAccount {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  profile_url: string | null;
  profile_pic_url: string | null;
  platform_username: string;
  status: string;
  created_at: string;
}

export interface PhylloProfile {
  id: string;
  account_id: string;
  platform: string;
  username: string;
  full_name: string | null;
  profile_pic_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  url: string | null;
  is_verified: boolean;
  platform_profile_name: string | null;
}

export interface PhylloContent {
  id: string;
  account_id: string;
  platform: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  thumbnail_url: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  published_at: string;
}

export interface PhylloEngagementMetrics {
  account_id: string;
  platform: string;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
  avg_views: number;
  total_content_count: number;
}

export async function createPhylloUser(externalId: string, name: string): Promise<PhylloUser | null> {
  if (!isPhylloConfigured()) {
    console.log('Phyllo not configured, returning mock user');
    return {
      id: `mock-user-${externalId}`,
      name,
      external_id: externalId,
      created_at: new Date().toISOString(),
    };
  }

  try {
    const headers = await getPhylloHeaders();
    const response = await fetch(`${PHYLLO_BASE_URL}/v1/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        external_id: externalId,
        name,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error creating Phyllo user:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Phyllo API error:', error);
    return null;
  }
}

export async function getPhylloUser(userId: string): Promise<PhylloUser | null> {
  if (!isPhylloConfigured()) return null;

  try {
    const headers = await getPhylloHeaders();
    const response = await fetch(`${PHYLLO_BASE_URL}/v1/users/${userId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Phyllo API error:', error);
    return null;
  }
}

export async function createSDKToken(userId: string): Promise<{ sdk_token: string; expires_at: string } | null> {
  if (!isPhylloConfigured()) {
    console.log('Phyllo not configured, returning mock token');
    return {
      sdk_token: 'mock-sdk-token-for-demo',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  try {
    const headers = await getPhylloHeaders();
    const response = await fetch(`${PHYLLO_BASE_URL}/v1/sdk-tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        products: ['IDENTITY', 'ENGAGEMENT'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error creating SDK token:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Phyllo API error:', error);
    return null;
  }
}

export async function getAccounts(userId: string): Promise<PhylloAccount[]> {
  if (!isPhylloConfigured()) {
    return getMockAccounts();
  }

  try {
    const headers = await getPhylloHeaders();
    const response = await fetch(`${PHYLLO_BASE_URL}/v1/accounts?user_id=${userId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Error fetching accounts:', await response.text());
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Phyllo API error:', error);
    return [];
  }
}

export async function getProfile(accountId: string): Promise<PhylloProfile | null> {
  if (!isPhylloConfigured()) {
    return getMockProfile(accountId);
  }

  try {
    const headers = await getPhylloHeaders();
    const response = await fetch(`${PHYLLO_BASE_URL}/v1/social/profiles?account_id=${accountId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Phyllo API error:', error);
    return null;
  }
}

export async function getContent(accountId: string, limit = 20): Promise<PhylloContent[]> {
  if (!isPhylloConfigured()) {
    return getMockContent(accountId);
  }

  try {
    const headers = await getPhylloHeaders();
    const response = await fetch(
      `${PHYLLO_BASE_URL}/v1/social/contents?account_id=${accountId}&limit=${limit}`,
      { method: 'GET', headers }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Phyllo API error:', error);
    return [];
  }
}

export async function getEngagementMetrics(accountId: string): Promise<PhylloEngagementMetrics | null> {
  if (!isPhylloConfigured()) {
    return getMockEngagementMetrics(accountId);
  }

  const content = await getContent(accountId, 50);
  if (content.length === 0) return null;

  const profile = await getProfile(accountId);
  if (!profile) return null;

  const totalLikes = content.reduce((sum, c) => sum + c.like_count, 0);
  const totalComments = content.reduce((sum, c) => sum + c.comment_count, 0);
  const totalShares = content.reduce((sum, c) => sum + c.share_count, 0);
  const totalViews = content.reduce((sum, c) => sum + c.view_count, 0);

  const avgLikes = totalLikes / content.length;
  const avgComments = totalComments / content.length;
  const avgShares = totalShares / content.length;
  const avgViews = totalViews / content.length;

  const engagementRate = profile.follower_count > 0 
    ? ((avgLikes + avgComments) / profile.follower_count) * 100 
    : 0;

  return {
    account_id: accountId,
    platform: profile.platform,
    engagement_rate: Math.round(engagementRate * 100) / 100,
    avg_likes: Math.round(avgLikes),
    avg_comments: Math.round(avgComments),
    avg_shares: Math.round(avgShares),
    avg_views: Math.round(avgViews),
    total_content_count: content.length,
  };
}

function getMockAccounts(): PhylloAccount[] {
  return [
    {
      id: 'mock-account-1',
      user_id: 'mock-user-1',
      platform: 'INSTAGRAM',
      username: 'lifestyle_creator',
      profile_url: 'https://instagram.com/lifestyle_creator',
      profile_pic_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      platform_username: 'lifestyle_creator',
      status: 'CONNECTED',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-account-2',
      user_id: 'mock-user-1',
      platform: 'TIKTOK',
      username: 'tech_reviewer',
      profile_url: 'https://tiktok.com/@tech_reviewer',
      profile_pic_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      platform_username: 'tech_reviewer',
      status: 'CONNECTED',
      created_at: new Date().toISOString(),
    },
  ];
}

function getMockProfile(accountId: string): PhylloProfile {
  const profiles: Record<string, PhylloProfile> = {
    'mock-account-1': {
      id: 'profile-1',
      account_id: 'mock-account-1',
      platform: 'INSTAGRAM',
      username: 'lifestyle_creator',
      full_name: 'Sarah Johnson',
      profile_pic_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Lifestyle blogger, travel enthusiast, coffee lover. Sharing my daily adventures and style tips.',
      follower_count: 125000,
      following_count: 890,
      url: 'https://instagram.com/lifestyle_creator',
      is_verified: true,
      platform_profile_name: 'lifestyle_creator',
    },
    'mock-account-2': {
      id: 'profile-2',
      account_id: 'mock-account-2',
      platform: 'TIKTOK',
      username: 'tech_reviewer',
      full_name: 'Alex Chen',
      profile_pic_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Tech reviews, gadgets, and tutorials. Making technology accessible for everyone.',
      follower_count: 450000,
      following_count: 234,
      url: 'https://tiktok.com/@tech_reviewer',
      is_verified: false,
      platform_profile_name: 'tech_reviewer',
    },
  };
  
  return profiles[accountId] || profiles['mock-account-1'];
}

function getMockContent(accountId: string): PhylloContent[] {
  return [
    {
      id: 'content-1',
      account_id: accountId,
      platform: 'INSTAGRAM',
      type: 'IMAGE',
      title: null,
      description: 'Morning coffee with a view. Starting the week right!',
      url: 'https://instagram.com/p/example1',
      thumbnail_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
      like_count: 8500,
      comment_count: 234,
      share_count: 45,
      view_count: 0,
      published_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'content-2',
      account_id: accountId,
      platform: 'INSTAGRAM',
      type: 'VIDEO',
      title: null,
      description: 'Weekend getaway vibes. This place is absolutely magical!',
      url: 'https://instagram.com/p/example2',
      thumbnail_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
      like_count: 12300,
      comment_count: 456,
      share_count: 89,
      view_count: 45000,
      published_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}

function getMockEngagementMetrics(accountId: string): PhylloEngagementMetrics {
  const mockMetrics: Record<string, PhylloEngagementMetrics> = {
    'mock-account-1': {
      account_id: 'mock-account-1',
      platform: 'INSTAGRAM',
      engagement_rate: 4.2,
      avg_likes: 8500,
      avg_comments: 234,
      avg_shares: 45,
      avg_views: 25000,
      total_content_count: 342,
    },
    'mock-account-2': {
      account_id: 'mock-account-2',
      platform: 'TIKTOK',
      engagement_rate: 6.8,
      avg_likes: 28000,
      avg_comments: 890,
      avg_shares: 1200,
      avg_views: 185000,
      total_content_count: 156,
    },
  };
  
  return mockMetrics[accountId] || mockMetrics['mock-account-1'];
}

export interface InfluencerSearchResult {
  userId: string;
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  followerCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  platform: string;
  location: string | null;
  categories: string[];
}

export function getMockInfluencerResults(): InfluencerSearchResult[] {
  return [
    {
      userId: 'demo-1',
      username: 'lifestyle_sarah',
      fullName: 'Sarah Johnson',
      profilePicUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Lifestyle blogger & travel enthusiast. Sharing daily adventures.',
      followerCount: 125000,
      engagementRate: 4.2,
      avgLikes: 5250,
      avgComments: 180,
      platform: 'instagram',
      location: 'Los Angeles, CA',
      categories: ['Lifestyle', 'Travel', 'Fashion'],
    },
    {
      userId: 'demo-2',
      username: 'tech_alex',
      fullName: 'Alex Chen',
      profilePicUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      bio: 'Tech reviewer & gadget enthusiast. Making technology accessible.',
      followerCount: 450000,
      engagementRate: 6.8,
      avgLikes: 30600,
      avgComments: 980,
      platform: 'tiktok',
      location: 'San Francisco, CA',
      categories: ['Technology', 'Reviews', 'Tutorials'],
    },
    {
      userId: 'demo-3',
      username: 'fitness_maya',
      fullName: 'Maya Rodriguez',
      profilePicUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      bio: 'Certified fitness trainer. Transform your body & mind.',
      followerCount: 89000,
      engagementRate: 5.5,
      avgLikes: 4895,
      avgComments: 210,
      platform: 'instagram',
      location: 'Miami, FL',
      categories: ['Fitness', 'Health', 'Wellness'],
    },
    {
      userId: 'demo-4',
      username: 'foodie_james',
      fullName: 'James Wilson',
      profilePicUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      bio: 'Food blogger & home chef. Recipes that bring families together.',
      followerCount: 234000,
      engagementRate: 3.8,
      avgLikes: 8892,
      avgComments: 320,
      platform: 'youtube',
      location: 'New York, NY',
      categories: ['Food', 'Cooking', 'Recipes'],
    },
    {
      userId: 'demo-5',
      username: 'beauty_emma',
      fullName: 'Emma Thompson',
      profilePicUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      bio: 'Beauty & skincare enthusiast. Honest reviews & tutorials.',
      followerCount: 178000,
      engagementRate: 4.9,
      avgLikes: 8722,
      avgComments: 290,
      platform: 'instagram',
      location: 'Chicago, IL',
      categories: ['Beauty', 'Skincare', 'Makeup'],
    },
  ];
}

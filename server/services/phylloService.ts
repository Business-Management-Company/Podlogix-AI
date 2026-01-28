const PHYLLO_CLIENT_ID = process.env.PHYLLO_CLIENT_ID;
const PHYLLO_SECRET = process.env.PHYLLO_SECRET;
const PHYLLO_ENVIRONMENT = process.env.PHYLLO_ENVIRONMENT || 'sandbox';
const PHYLLO_BASE_URL = PHYLLO_ENVIRONMENT === 'production' 
  ? 'https://api.getphyllo.com/v1' 
  : 'https://api.sandbox.getphyllo.com/v1';

export interface PhylloUser {
  id: string;
  name: string;
  external_id: string;
  created_at: string;
}

export interface PhylloAccount {
  id: string;
  user_id: string;
  work_platform_id: string;
  platform_username?: string;
  profile_url?: string;
  status: string;
  created_at: string;
}

export interface PhylloProfile {
  id: string;
  account_id: string;
  platform_username: string;
  full_name?: string;
  profile_url: string;
  profile_picture_url?: string;
  bio?: string;
  follower_count?: number;
  following_count?: number;
  is_verified?: boolean;
  platform: string;
}

export interface PhylloSDKToken {
  sdk_token: string;
  expires_at: string;
}

export interface SocialAccount {
  id: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin' | 'facebook';
  username: string;
  profileUrl?: string;
  profilePictureUrl?: string;
  followerCount?: number;
  isVerified?: boolean;
  status: 'connected' | 'syncing' | 'disconnected' | 'error';
  lastSyncedAt?: Date;
}

export interface MonitoringAlert {
  id: string;
  platform: string;
  type: 'impersonation' | 'brand_safety' | 'mention' | 'content_flag';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  contentUrl?: string;
  detectedAt: Date;
}

const PLATFORM_IDS: Record<string, string> = {
  instagram: '9bb8913b-ddd9-430b-a66a-d74d846e6c66',
  tiktok: '14d9ddf5-51c6-415e-bde6-f8ed36ad7054',
  youtube: 'e8fa4cd5-77f8-4a58-bb87-e77ca0b7a7d7',
  twitter: '7645460a-96e3-45d6-a0cf-7e807f88a9a0',
  linkedin: 'bd74d47f-e76c-4d7e-9bf4-7cfe81291ea8',
  facebook: '51c27f5f-5aeb-48c2-a55f-6ebc8b2a3cb9',
};

const PLATFORM_NAMES: Record<string, string> = {
  '9bb8913b-ddd9-430b-a66a-d74d846e6c66': 'instagram',
  '14d9ddf5-51c6-415e-bde6-f8ed36ad7054': 'tiktok',
  'e8fa4cd5-77f8-4a58-bb87-e77ca0b7a7d7': 'youtube',
  '7645460a-96e3-45d6-a0cf-7e807f88a9a0': 'twitter',
  'bd74d47f-e76c-4d7e-9bf4-7cfe81291ea8': 'linkedin',
  '51c27f5f-5aeb-48c2-a55f-6ebc8b2a3cb9': 'facebook',
};

export function isPhylloConfigured(): boolean {
  return !!(PHYLLO_CLIENT_ID && PHYLLO_SECRET);
}

async function getAuthHeader(): Promise<string> {
  if (!isPhylloConfigured()) {
    throw new Error('Phyllo API not configured');
  }
  const credentials = Buffer.from(`${PHYLLO_CLIENT_ID}:${PHYLLO_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

export async function createPhylloUser(externalId: string, name: string): Promise<PhylloUser | null> {
  if (!isPhylloConfigured()) {
    console.log('Phyllo not configured - missing CLIENT_ID or SECRET');
    return null;
  }

  try {
    console.log(`Creating Phyllo user with external_id: ${externalId}, using ${PHYLLO_ENVIRONMENT} environment`);
    const response = await fetch(`${PHYLLO_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getAuthHeader(),
      },
      body: JSON.stringify({
        external_id: externalId,
        name: name,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Phyllo create user error:', response.status, error);
      return null;
    }

    const user = await response.json();
    console.log('Phyllo user created successfully:', user.id);
    return user;
  } catch (error) {
    console.error('Error creating Phyllo user:', error);
    return null;
  }
}

export async function getPhylloUser(externalId: string): Promise<PhylloUser | null> {
  if (!isPhylloConfigured()) {
    return null;
  }

  try {
    const response = await fetch(`${PHYLLO_BASE_URL}/users?external_id=${encodeURIComponent(externalId)}`, {
      headers: {
        'Authorization': await getAuthHeader(),
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Error getting Phyllo user:', error);
    return null;
  }
}

export async function getOrCreatePhylloUser(externalId: string, name: string): Promise<PhylloUser | null> {
  let user = await getPhylloUser(externalId);
  if (!user) {
    user = await createPhylloUser(externalId, name);
  }
  return user;
}

export async function createSDKToken(userId: string, products: string[] = ['IDENTITY', 'ENGAGEMENT']): Promise<PhylloSDKToken | null> {
  if (!isPhylloConfigured()) {
    return null;
  }

  try {
    const response = await fetch(`${PHYLLO_BASE_URL}/sdk-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getAuthHeader(),
      },
      body: JSON.stringify({
        user_id: userId,
        products: products,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Phyllo SDK token error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Phyllo SDK token:', error);
    return null;
  }
}

export async function getUserAccounts(userId: string): Promise<PhylloAccount[]> {
  if (!isPhylloConfigured()) {
    return [];
  }

  try {
    const response = await fetch(`${PHYLLO_BASE_URL}/accounts?user_id=${userId}`, {
      headers: {
        'Authorization': await getAuthHeader(),
      },
    });

    if (!response.ok) {
      console.error('Phyllo get accounts error:', await response.json());
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error getting Phyllo accounts:', error);
    return [];
  }
}

export async function getAccountProfile(accountId: string): Promise<PhylloProfile | null> {
  if (!isPhylloConfigured()) {
    return null;
  }

  try {
    const response = await fetch(`${PHYLLO_BASE_URL}/social/profiles?account_id=${accountId}`, {
      headers: {
        'Authorization': await getAuthHeader(),
      },
    });

    if (!response.ok) {
      console.error('Phyllo get profile error:', await response.json());
      return null;
    }

    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Error getting Phyllo profile:', error);
    return null;
  }
}

export async function disconnectAccount(accountId: string): Promise<boolean> {
  if (!isPhylloConfigured()) {
    return false;
  }

  try {
    const response = await fetch(`${PHYLLO_BASE_URL}/accounts/${accountId}/disconnect`, {
      method: 'POST',
      headers: {
        'Authorization': await getAuthHeader(),
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error disconnecting Phyllo account:', error);
    return false;
  }
}

export async function getConnectedSocialAccounts(phylloUserId: string): Promise<SocialAccount[]> {
  const accounts = await getUserAccounts(phylloUserId);
  const socialAccounts: SocialAccount[] = [];

  for (const account of accounts) {
    const profile = await getAccountProfile(account.id);
    const platformName = PLATFORM_NAMES[account.work_platform_id] || 'unknown';
    
    socialAccounts.push({
      id: account.id,
      platform: platformName as SocialAccount['platform'],
      username: profile?.platform_username || account.platform_username || 'Unknown',
      profileUrl: profile?.profile_url || account.profile_url,
      profilePictureUrl: profile?.profile_picture_url,
      followerCount: profile?.follower_count,
      isVerified: profile?.is_verified,
      status: account.status === 'CONNECTED' ? 'connected' : 
              account.status === 'NOT_CONNECTED' ? 'disconnected' : 
              account.status === 'IN_PROGRESS' ? 'syncing' : 'error',
      lastSyncedAt: new Date(account.created_at),
    });
  }

  return socialAccounts;
}

export function getPlatformId(platform: string): string | undefined {
  return PLATFORM_IDS[platform.toLowerCase()];
}

export function getSupportedPlatforms(): { id: string; name: string; displayName: string }[] {
  return [
    { id: PLATFORM_IDS.instagram, name: 'instagram', displayName: 'Instagram' },
    { id: PLATFORM_IDS.tiktok, name: 'tiktok', displayName: 'TikTok' },
    { id: PLATFORM_IDS.youtube, name: 'youtube', displayName: 'YouTube' },
    { id: PLATFORM_IDS.twitter, name: 'twitter', displayName: 'X (Twitter)' },
    { id: PLATFORM_IDS.linkedin, name: 'linkedin', displayName: 'LinkedIn' },
    { id: PLATFORM_IDS.facebook, name: 'facebook', displayName: 'Facebook' },
  ];
}

export async function getPhylloStatus(): Promise<{
  configured: boolean;
  supportedPlatforms: { id: string; name: string; displayName: string }[];
}> {
  return {
    configured: isPhylloConfigured(),
    supportedPlatforms: getSupportedPlatforms(),
  };
}

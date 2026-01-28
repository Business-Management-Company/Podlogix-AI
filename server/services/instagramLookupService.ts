const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export interface InstagramInfluencerProfile {
  userId: string;
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  platform: 'instagram';
}

export interface InstagramLookupError {
  type: 'not_configured' | 'no_ig_account' | 'profile_not_found' | 'api_error';
  message: string;
}

export function isInstagramLookupConfigured(): boolean {
  return !!(META_ACCESS_TOKEN && META_APP_ID && META_APP_SECRET);
}

export async function lookupInstagramProfile(
  username: string
): Promise<{ profile: InstagramInfluencerProfile | null; error?: InstagramLookupError }> {
  if (!isInstagramLookupConfigured()) {
    return { 
      profile: null, 
      error: { type: 'not_configured', message: 'Instagram lookup not configured' }
    };
  }

  const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
  
  if (!cleanUsername) {
    return { 
      profile: null, 
      error: { type: 'profile_not_found', message: 'Invalid username provided' }
    };
  }

  try {
    const result = await fetchBusinessDiscovery(cleanUsername);
    return result;
  } catch (error) {
    console.error('Error looking up Instagram profile:', error);
    return { 
      profile: null, 
      error: { type: 'api_error', message: 'Failed to lookup Instagram profile' }
    };
  }
}

async function fetchBusinessDiscovery(
  username: string
): Promise<{ profile: InstagramInfluencerProfile | null; error?: InstagramLookupError }> {
  if (!META_ACCESS_TOKEN) {
    return { 
      profile: null, 
      error: { type: 'not_configured', message: 'META_ACCESS_TOKEN not configured' }
    };
  }

  try {
    const pagesResponse = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${META_ACCESS_TOKEN}`
    );

    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      console.error('Failed to fetch pages:', errorText);
      return { 
        profile: null, 
        error: { type: 'api_error', message: 'Failed to fetch Facebook pages' }
      };
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      console.log('No Facebook pages found for this access token');
      return { 
        profile: null, 
        error: { type: 'no_ig_account', message: 'No Facebook pages connected to this account' }
      };
    }

    for (const page of pages) {
      const pageAccessToken = page.access_token;
      const igAccount = page.instagram_business_account;

      if (!igAccount?.id || !pageAccessToken) {
        continue;
      }

      const igAccountId = igAccount.id;

      const discoveryUrl = `${GRAPH_API_BASE}/${igAccountId}?fields=business_discovery.username(${username}){id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,ig_id}&access_token=${pageAccessToken}`;
      
      const discoveryResponse = await fetch(discoveryUrl);

      if (!discoveryResponse.ok) {
        const errorData = await discoveryResponse.json();
        console.log('Business discovery failed:', errorData.error?.message);
        
        if (errorData.error?.code === 100) {
          continue;
        }
        continue;
      }

      const discoveryData = await discoveryResponse.json();
      const profile = discoveryData.business_discovery;

      if (profile) {
        return {
          profile: {
            userId: profile.ig_id || profile.id,
            username: profile.username,
            fullName: profile.name || null,
            profilePicUrl: profile.profile_picture_url || null,
            bio: profile.biography || null,
            followerCount: profile.followers_count || 0,
            followingCount: profile.follows_count || 0,
            mediaCount: profile.media_count || 0,
            isVerified: false,
            isBusinessAccount: true,
            platform: 'instagram',
          }
        };
      }
    }

    return { 
      profile: null, 
      error: { type: 'profile_not_found', message: 'Could not find Instagram profile. Only public business/creator accounts can be looked up.' }
    };
  } catch (error) {
    console.error('Error in business discovery:', error);
    return { 
      profile: null, 
      error: { type: 'api_error', message: 'Failed to perform business discovery' }
    };
  }
}

export async function searchInstagramInfluencers(
  query: string
): Promise<InstagramInfluencerProfile[]> {
  const result = await lookupInstagramProfile(query);
  
  if (result.profile) {
    return [result.profile];
  }
  
  return [];
}

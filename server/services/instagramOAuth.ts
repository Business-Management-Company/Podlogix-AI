const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  biography?: string;
}

export interface InstagramTokens {
  accessToken: string;
  expiresAt?: Date;
  instagramAccountId?: string;
}

export function isInstagramOAuthConfigured(): boolean {
  return !!(META_APP_ID && META_APP_SECRET);
}

export function getInstagramAuthUrl(redirectUri: string, state?: string): string {
  if (!isInstagramOAuthConfigured()) {
    throw new Error('Instagram OAuth not configured');
  }

  const params = new URLSearchParams({
    client_id: META_APP_ID!,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,pages_show_list',
    response_type: 'code',
    ...(state && { state }),
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<InstagramTokens | null> {
  if (!isInstagramOAuthConfigured()) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: META_APP_ID!,
      client_secret: META_APP_SECRET!,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Instagram token exchange error:', error);
      return null;
    }

    const data = await response.json();
    
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error('Error exchanging Instagram code for token:', error);
    return null;
  }
}

export async function getLongLivedToken(shortLivedToken: string): Promise<InstagramTokens | null> {
  if (!isInstagramOAuthConfigured()) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID!,
      client_secret: META_APP_SECRET!,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Long-lived token exchange error:', error);
      return null;
    }

    const data = await response.json();
    
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error('Error getting long-lived token:', error);
    return null;
  }
}

export async function getInstagramBusinessAccount(
  accessToken: string
): Promise<InstagramProfile | null> {
  try {
    const pagesResponse = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography}&access_token=${accessToken}`
    );

    if (!pagesResponse.ok) {
      const error = await pagesResponse.json();
      console.error('Error fetching pages:', error);
      return null;
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    for (const page of pages) {
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        return {
          id: ig.id,
          username: ig.username,
          name: ig.name,
          profilePictureUrl: ig.profile_picture_url,
          followersCount: ig.followers_count,
          followingCount: ig.follows_count,
          mediaCount: ig.media_count,
          biography: ig.biography,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching Instagram business account:', error);
    return null;
  }
}

export async function refreshInstagramAnalytics(
  accessToken: string,
  instagramAccountId: string
): Promise<Partial<InstagramProfile> | null> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${instagramAccountId}?fields=followers_count,follows_count,media_count&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Error refreshing Instagram analytics:', error);
      return null;
    }

    const data = await response.json();
    return {
      followersCount: data.followers_count,
      followingCount: data.follows_count,
      mediaCount: data.media_count,
    };
  } catch (error) {
    console.error('Error refreshing Instagram analytics:', error);
    return null;
  }
}

export async function validateAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.data?.is_valid === true;
  } catch (error) {
    console.error('Error validating access token:', error);
    return false;
  }
}

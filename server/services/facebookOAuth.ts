const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

function getMetaAppId(): string | undefined {
  return process.env.META_APP_ID;
}

function getMetaAppSecret(): string | undefined {
  return process.env.META_APP_SECRET;
}

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  category?: string;
  fansCount?: number;
  pictureUrl?: string;
}

export interface FacebookTokens {
  accessToken: string;
  expiresAt?: Date;
}

export function isFacebookOAuthConfigured(): boolean {
  return !!(getMetaAppId() && getMetaAppSecret());
}

export function getFacebookAuthUrl(redirectUri: string, state?: string): string {
  const appId = getMetaAppId();
  
  if (!appId) {
    throw new Error('Facebook OAuth not configured');
  }

  console.log('[Facebook OAuth] Using META_APP_ID:', appId);

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'pages_show_list,pages_read_engagement,public_profile',
    response_type: 'code',
    ...(state && { state }),
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<FacebookTokens | null> {
  if (!isFacebookOAuthConfigured()) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: getMetaAppId()!,
      client_secret: getMetaAppSecret()!,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Facebook token exchange error:', error);
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
    console.error('Error exchanging Facebook code for token:', error);
    return null;
  }
}

export async function getLongLivedToken(shortLivedToken: string): Promise<FacebookTokens | null> {
  if (!isFacebookOAuthConfigured()) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: getMetaAppId()!,
      client_secret: getMetaAppSecret()!,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Facebook long-lived token exchange error:', error);
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
    console.error('Error getting Facebook long-lived token:', error);
    return null;
  }
}

export async function getUserPages(accessToken: string): Promise<FacebookPage[]> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,fan_count,picture&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching Facebook pages:', error);
      return [];
    }

    const data = await response.json();
    
    return (data.data || []).map((page: any) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      category: page.category,
      fansCount: page.fan_count,
      pictureUrl: page.picture?.data?.url,
    }));
  } catch (error) {
    console.error('Error fetching Facebook pages:', error);
    return [];
  }
}

export async function getPageDetails(pageId: string, accessToken: string): Promise<FacebookPage | null> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=id,name,fan_count,category,picture&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching Facebook page details:', error);
      return null;
    }

    const data = await response.json();
    
    return {
      id: data.id,
      name: data.name,
      accessToken,
      category: data.category,
      fansCount: data.fan_count,
      pictureUrl: data.picture?.data?.url,
    };
  } catch (error) {
    console.error('Error fetching Facebook page details:', error);
    return null;
  }
}

export async function refreshPageStats(pageId: string, accessToken: string): Promise<{ fansCount?: number } | null> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=fan_count&access_token=${accessToken}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return { fansCount: data.fan_count };
  } catch (error) {
    console.error('Error refreshing Facebook page stats:', error);
    return null;
  }
}

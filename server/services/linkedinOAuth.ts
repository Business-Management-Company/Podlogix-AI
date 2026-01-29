const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profileUrl?: string;
  profilePictureUrl?: string;
  headline?: string;
  vanityName?: string;
  followersCount?: number;
  connectionsCount?: number;
}

export interface LinkedInTokens {
  accessToken: string;
  expiresAt?: Date;
  refreshToken?: string;
}

export function isLinkedInOAuthConfigured(): boolean {
  return !!(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET);
}

export function getLinkedInAuthUrl(redirectUri: string, state?: string): string {
  if (!isLinkedInOAuthConfigured()) {
    throw new Error('LinkedIn OAuth not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINKEDIN_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    ...(state && { state }),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<LinkedInTokens | null> {
  if (!isLinkedInOAuthConfigured()) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: LINKEDIN_CLIENT_ID!,
      client_secret: LINKEDIN_CLIENT_SECRET!,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LinkedIn token exchange error:', error);
      return null;
    }

    const data = await response.json();
    
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      expiresAt,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    console.error('Error exchanging LinkedIn code for token:', error);
    return null;
  }
}

export async function getLinkedInProfile(
  accessToken: string
): Promise<LinkedInProfile | null> {
  try {
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const error = await userInfoResponse.text();
      console.error('Error fetching LinkedIn userinfo:', error);
      return null;
    }

    const userInfo = await userInfoResponse.json();

    const meResponse = await fetch(`${LINKEDIN_API_BASE}/me?projection=(id,localizedFirstName,localizedLastName,vanityName,localizedHeadline)`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let meData: any = {};
    if (meResponse.ok) {
      meData = await meResponse.json();
    }

    return {
      id: userInfo.sub || meData.id,
      firstName: userInfo.given_name || meData.localizedFirstName || '',
      lastName: userInfo.family_name || meData.localizedLastName || '',
      profilePictureUrl: userInfo.picture,
      headline: meData.localizedHeadline,
      vanityName: meData.vanityName,
      profileUrl: meData.vanityName ? `https://linkedin.com/in/${meData.vanityName}` : undefined,
    };
  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error);
    return null;
  }
}

export async function refreshLinkedInToken(
  refreshToken: string
): Promise<LinkedInTokens | null> {
  if (!isLinkedInOAuthConfigured()) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: LINKEDIN_CLIENT_ID!,
      client_secret: LINKEDIN_CLIENT_SECRET!,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LinkedIn token refresh error:', error);
      return null;
    }

    const data = await response.json();
    
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      expiresAt,
      refreshToken: data.refresh_token || refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing LinkedIn token:', error);
    return null;
  }
}

export async function validateAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating LinkedIn access token:', error);
    return false;
  }
}

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

export interface MetaProfile {
  id: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  mediaCount?: number;
}

export interface MetaMedia {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  timestamp: string;
  permalink?: string;
}

export interface ImpersonationAlert {
  id: string;
  platform: 'instagram' | 'facebook';
  suspiciousAccountId: string;
  suspiciousAccountName: string;
  suspiciousAccountUrl?: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  detectedAt: Date;
  mediaUrl?: string;
}

export function isMetaConfigured(): boolean {
  return !!(META_ACCESS_TOKEN && META_APP_ID);
}

export async function getInstagramBusinessAccount(): Promise<MetaProfile | null> {
  if (!isMetaConfigured()) {
    console.log('Meta API not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}&access_token=${META_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Meta API error:', error);
      return null;
    }

    const data = await response.json();
    const pages = data.data || [];
    
    for (const page of pages) {
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        return {
          id: ig.id,
          username: ig.username,
          name: ig.name,
          profilePictureUrl: ig.profile_picture_url,
          followersCount: ig.followers_count,
          mediaCount: ig.media_count,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching Instagram business account:', error);
    return null;
  }
}

export async function getInstagramMedia(accountId: string, limit = 25): Promise<MetaMedia[]> {
  if (!isMetaConfigured()) {
    return [];
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${accountId}/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp,permalink&limit=${limit}&access_token=${META_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Meta API error:', error);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map((item: any) => ({
      id: item.id,
      mediaType: item.media_type,
      mediaUrl: item.media_url,
      thumbnailUrl: item.thumbnail_url,
      caption: item.caption,
      timestamp: item.timestamp,
      permalink: item.permalink,
    }));
  } catch (error) {
    console.error('Error fetching Instagram media:', error);
    return [];
  }
}

export async function searchInstagramHashtag(hashtag: string): Promise<MetaMedia[]> {
  if (!isMetaConfigured()) {
    return [];
  }

  try {
    const hashtagResponse = await fetch(
      `${GRAPH_API_BASE}/ig_hashtag_search?user_id=me&q=${encodeURIComponent(hashtag)}&access_token=${META_ACCESS_TOKEN}`
    );

    if (!hashtagResponse.ok) {
      return [];
    }

    const hashtagData = await hashtagResponse.json();
    const hashtagId = hashtagData.data?.[0]?.id;

    if (!hashtagId) {
      return [];
    }

    const mediaResponse = await fetch(
      `${GRAPH_API_BASE}/${hashtagId}/recent_media?user_id=me&fields=id,media_type,caption,timestamp,permalink&access_token=${META_ACCESS_TOKEN}`
    );

    if (!mediaResponse.ok) {
      return [];
    }

    const mediaData = await mediaResponse.json();
    return (mediaData.data || []).map((item: any) => ({
      id: item.id,
      mediaType: item.media_type,
      caption: item.caption,
      timestamp: item.timestamp,
      permalink: item.permalink,
    }));
  } catch (error) {
    console.error('Error searching Instagram hashtag:', error);
    return [];
  }
}

export async function getFacebookPages(): Promise<MetaProfile[]> {
  if (!isMetaConfigured()) {
    return [];
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=id,name,picture{url},fan_count&access_token=${META_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.data || []).map((page: any) => ({
      id: page.id,
      name: page.name,
      profilePictureUrl: page.picture?.data?.url,
      followersCount: page.fan_count,
    }));
  } catch (error) {
    console.error('Error fetching Facebook pages:', error);
    return [];
  }
}

export async function checkForPotentialImpersonators(
  userName: string,
  userBio?: string
): Promise<ImpersonationAlert[]> {
  const alerts: ImpersonationAlert[] = [];
  
  if (!isMetaConfigured()) {
    return alerts;
  }

  try {
    const searchTerms = userName.toLowerCase().split(' ');
    const mentionSearches = await Promise.all(
      searchTerms.map(term => searchInstagramHashtag(term))
    );

    const allMedia = mentionSearches.flat();
    
    for (const media of allMedia) {
      if (!media.caption) continue;
      
      const caption = media.caption.toLowerCase();
      const nameMatch = searchTerms.some(term => caption.includes(term));
      const aiKeywords = ['ai generated', 'deepfake', 'ai voice', 'clone', 'synthetic'];
      const hasAiKeyword = aiKeywords.some(keyword => caption.includes(keyword));
      
      if (nameMatch && hasAiKeyword) {
        alerts.push({
          id: `alert-${media.id}`,
          platform: 'instagram',
          suspiciousAccountId: media.id,
          suspiciousAccountName: 'Unknown',
          suspiciousAccountUrl: media.permalink,
          reason: 'Content mentions your name with AI-related keywords',
          confidence: 'medium',
          detectedAt: new Date(),
          mediaUrl: media.permalink,
        });
      }
    }
  } catch (error) {
    console.error('Error checking for impersonators:', error);
  }

  return alerts;
}

export async function getMetaApiStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  instagramAccount: MetaProfile | null;
  facebookPages: MetaProfile[];
}> {
  const configured = isMetaConfigured();
  
  if (!configured) {
    return {
      configured: false,
      connected: false,
      instagramAccount: null,
      facebookPages: [],
    };
  }

  const [instagramAccount, facebookPages] = await Promise.all([
    getInstagramBusinessAccount(),
    getFacebookPages(),
  ]);

  return {
    configured: true,
    connected: !!(instagramAccount || facebookPages.length > 0),
    instagramAccount,
    facebookPages,
  };
}

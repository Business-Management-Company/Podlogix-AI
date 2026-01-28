import fetch from 'node-fetch';

interface MediaItem {
  id: string;
  caption?: string;
  media_type: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

interface HashtagMedia {
  data: MediaItem[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

interface DiscoveredPost {
  postId: string;
  caption?: string;
  mediaType: string;
  likeCount: number;
  commentsCount: number;
  engagement: number;
  timestamp: string;
  permalink?: string;
}

interface HashtagDiscoveryResult {
  hashtag: string;
  hashtagId?: string;
  posts: DiscoveredPost[];
  total: number;
  error?: {
    type: 'not_configured' | 'no_ig_account' | 'rate_limit' | 'api_error' | 'hashtag_not_found';
    message: string;
  };
}

async function getInstagramBusinessAccountId(accessToken: string): Promise<string | null> {
  try {
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json() as any;

    if (!pagesData.data || pagesData.data.length === 0) {
      return null;
    }

    for (const page of pagesData.data) {
      if (page.instagram_business_account?.id) {
        return page.instagram_business_account.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting Instagram business account ID:', error);
    return null;
  }
}

async function getPageAccessToken(userAccessToken: string): Promise<string | null> {
  try {
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
    );
    const pagesData = await pagesResponse.json() as any;

    if (!pagesData.data || pagesData.data.length === 0) {
      return null;
    }

    for (const page of pagesData.data) {
      if (page.instagram_business_account?.id && page.access_token) {
        return page.access_token;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting page access token:', error);
    return null;
  }
}

export async function discoverInfluencersByHashtag(hashtag: string): Promise<HashtagDiscoveryResult> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  
  if (!accessToken) {
    return {
      hashtag,
      posts: [],
      total: 0,
      error: {
        type: 'not_configured',
        message: 'META_ACCESS_TOKEN is not configured'
      }
    };
  }

  const cleanHashtag = hashtag.replace(/^#/, '').toLowerCase().trim();

  try {
    const igUserId = await getInstagramBusinessAccountId(accessToken);
    
    if (!igUserId) {
      return {
        hashtag: cleanHashtag,
        posts: [],
        total: 0,
        error: {
          type: 'no_ig_account',
          message: 'No Instagram Business account linked to your Facebook pages'
        }
      };
    }

    const pageAccessToken = await getPageAccessToken(accessToken);
    const tokenToUse = pageAccessToken || accessToken;

    const hashtagSearchUrl = `https://graph.facebook.com/v19.0/ig_hashtag_search?user_id=${igUserId}&q=${encodeURIComponent(cleanHashtag)}&access_token=${tokenToUse}`;
    const hashtagResponse = await fetch(hashtagSearchUrl);
    const hashtagData = await hashtagResponse.json() as any;

    if (hashtagData.error) {
      if (hashtagData.error.code === 4) {
        return {
          hashtag: cleanHashtag,
          posts: [],
          total: 0,
          error: {
            type: 'rate_limit',
            message: 'Rate limit reached (30 hashtags per 7 days). Please try again later.'
          }
        };
      }
      console.error('Hashtag search error:', hashtagData.error);
      return {
        hashtag: cleanHashtag,
        posts: [],
        total: 0,
        error: {
          type: 'api_error',
          message: hashtagData.error.message || 'Failed to search hashtag'
        }
      };
    }

    if (!hashtagData.data || hashtagData.data.length === 0) {
      return {
        hashtag: cleanHashtag,
        posts: [],
        total: 0,
        error: {
          type: 'hashtag_not_found',
          message: `No results found for #${cleanHashtag}`
        }
      };
    }

    const hashtagId = hashtagData.data[0].id;

    const recentMediaUrl = `https://graph.facebook.com/v19.0/${hashtagId}/recent_media?user_id=${igUserId}&fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&access_token=${tokenToUse}&limit=25`;
    const mediaResponse = await fetch(recentMediaUrl);
    const mediaData = await mediaResponse.json() as HashtagMedia;

    if (!mediaData.data || mediaData.data.length === 0) {
      return {
        hashtag: cleanHashtag,
        hashtagId,
        posts: [],
        total: 0,
        error: {
          type: 'hashtag_not_found',
          message: `No recent posts found for #${cleanHashtag}`
        }
      };
    }

    const posts: DiscoveredPost[] = mediaData.data.map(post => ({
      postId: post.id,
      caption: post.caption?.substring(0, 300),
      mediaType: post.media_type,
      likeCount: post.like_count || 0,
      commentsCount: post.comments_count || 0,
      engagement: (post.like_count || 0) + (post.comments_count || 0),
      timestamp: post.timestamp,
      permalink: post.permalink
    }));

    posts.sort((a, b) => b.engagement - a.engagement);

    return {
      hashtag: cleanHashtag,
      hashtagId,
      posts: posts.slice(0, 15),
      total: posts.length
    };

  } catch (error) {
    console.error('Error discovering posts by hashtag:', error);
    return {
      hashtag: cleanHashtag,
      posts: [],
      total: 0,
      error: {
        type: 'api_error',
        message: error instanceof Error ? error.message : 'Failed to discover posts'
      }
    };
  }
}

export async function checkHashtagServiceStatus(): Promise<{
  configured: boolean;
  hasInstagramAccount: boolean;
  message: string;
}> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  
  if (!accessToken) {
    return {
      configured: false,
      hasInstagramAccount: false,
      message: 'META_ACCESS_TOKEN is not configured'
    };
  }

  try {
    const igUserId = await getInstagramBusinessAccountId(accessToken);
    
    if (!igUserId) {
      return {
        configured: true,
        hasInstagramAccount: false,
        message: 'No Instagram Business account linked to your Facebook pages. Hashtag search requires a linked Instagram Business account.'
      };
    }

    return {
      configured: true,
      hasInstagramAccount: true,
      message: 'Instagram hashtag search is ready. Note: Limited to 30 unique hashtags per 7 days.'
    };
  } catch (error) {
    return {
      configured: true,
      hasInstagramAccount: false,
      message: error instanceof Error ? error.message : 'Failed to check Instagram account status'
    };
  }
}

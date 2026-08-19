import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['itunes:duration', 'duration'],
      ['enclosure', 'enclosure'],
    ],
  },
});

export interface RssPodcast {
  title: string;
  description: string;
  author: string;
  imageUrl: string | null;
  feedUrl: string;
}

export interface RssEpisode {
  title: string;
  description: string;
  audioUrl: string | null;
  mediaUrl: string | null;
  mimeType: string | null;
  mediaKind: 'audio' | 'video' | null;
  duration: number | null;
  publishedAt: Date | null;
  guid: string;
  imageUrl: string | null;
}

export async function parseFeed(feedUrl: string): Promise<RssPodcast & { episodes: RssEpisode[] }> {
  try {
    const url = new URL(feedUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('RSS feed URL must use http or https');
    }
    const response = await fetch(url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`RSS feed returned HTTP ${response.status}`);
    const xml = await response.text();
    if (xml.length > 12_000_000) throw new Error('RSS feed is too large');
    const feed = await parser.parseString(xml);
    
    const episodes: RssEpisode[] = (feed.items || []).map((item: any) => {
      const mediaUrl = stringOrNull(item.enclosure?.url);
      const mimeType = stringOrNull(item.enclosure?.type);
      return {
        title: item.title || 'Untitled Episode',
        description: item.contentSnippet || item.content || '',
        audioUrl: mediaUrl,
        mediaUrl,
        mimeType,
        mediaKind: getMediaKind(mediaUrl, mimeType),
        duration: parseDuration(item.duration),
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
        guid: item.guid || item.link || item.title || '',
        imageUrl: item.itunes?.image || null,
      };
    });

    return {
      title: feed.title || 'Unknown Podcast',
      description: feed.description || '',
      author: feed.creator || feed.author || '',
      imageUrl: feed.image?.url || feed.itunes?.image || null,
      feedUrl,
      episodes,
    };
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    throw new Error('Failed to parse RSS feed');
  }
}

function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;
  
  if (!isNaN(Number(duration))) {
    return Number(duration);
  }
  
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  
  return null;
}

export async function validateFeed(feedUrl: string): Promise<boolean> {
  try {
    await parseFeed(feedUrl);
    return true;
  } catch {
    return false;
  }
}

export function getMediaKind(mediaUrl: string | null, mimeType: string | null): 'audio' | 'video' | null {
  const normalizedType = mimeType?.toLowerCase() ?? '';
  if (normalizedType.startsWith('video/')) return 'video';
  if (normalizedType.startsWith('audio/')) return 'audio';
  if (!mediaUrl) return null;
  const pathname = new URL(mediaUrl, 'https://podlogix.invalid').pathname.toLowerCase();
  if (/\.(mp4|m4v|mov|webm|ogv)$/.test(pathname)) return 'video';
  return 'audio';
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function searchRssFeedByName(podcastName: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(podcastName);
    const response = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=podcast&entity=podcast&limit=5`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const match = data.results.find((result: any) => 
        result.collectionName?.toLowerCase().includes(podcastName.toLowerCase()) ||
        podcastName.toLowerCase().includes(result.collectionName?.toLowerCase())
      );
      
      const podcast = match || data.results[0];
      
      if (podcast.feedUrl) {
        const isValid = await validateFeed(podcast.feedUrl);
        if (isValid) {
          return podcast.feedUrl;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for RSS feed:', error);
    return null;
  }
}

export async function getLatestEpisodes(feedUrl: string, limit = 10): Promise<RssEpisode[]> {
  try {
    const { episodes } = await parseFeed(feedUrl);
    return episodes.slice(0, limit);
  } catch {
    return [];
  }
}

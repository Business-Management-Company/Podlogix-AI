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
  duration: number | null;
  publishedAt: Date | null;
  guid: string;
}

export async function parseFeed(feedUrl: string): Promise<RssPodcast & { episodes: RssEpisode[] }> {
  try {
    const feed = await parser.parseURL(feedUrl);
    
    const episodes: RssEpisode[] = (feed.items || []).map((item: any) => ({
      title: item.title || 'Untitled Episode',
      description: item.contentSnippet || item.content || '',
      audioUrl: item.enclosure?.url || null,
      duration: parseDuration(item.duration),
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      guid: item.guid || item.link || item.title || '',
    }));

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
    await parser.parseURL(feedUrl);
    return true;
  } catch {
    return false;
  }
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

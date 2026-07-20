import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-not-configured",
});

interface ProfileSuggestionParams {
  podcastName?: string;
  podcastTopic?: string;
  hostName?: string;
  existingBio?: string;
}

interface LinkAnalysis {
  platform: string;
  suggestedTitle: string;
  icon: string;
  category: 'social' | 'podcast' | 'website' | 'other';
}

interface BioSuggestion {
  bio: string;
  headlines: string[];
}

const platformPatterns: Record<string, { name: string; icon: string; category: 'social' | 'podcast' | 'website' | 'other' }> = {
  'spotify.com': { name: 'Spotify', icon: 'spotify', category: 'podcast' },
  'open.spotify.com': { name: 'Spotify', icon: 'spotify', category: 'podcast' },
  'apple.com/podcast': { name: 'Apple Podcasts', icon: 'apple', category: 'podcast' },
  'podcasts.apple.com': { name: 'Apple Podcasts', icon: 'apple', category: 'podcast' },
  'youtube.com': { name: 'YouTube', icon: 'youtube', category: 'social' },
  'youtu.be': { name: 'YouTube', icon: 'youtube', category: 'social' },
  'instagram.com': { name: 'Instagram', icon: 'instagram', category: 'social' },
  'twitter.com': { name: 'X (Twitter)', icon: 'twitter', category: 'social' },
  'x.com': { name: 'X (Twitter)', icon: 'twitter', category: 'social' },
  'tiktok.com': { name: 'TikTok', icon: 'tiktok', category: 'social' },
  'linkedin.com': { name: 'LinkedIn', icon: 'linkedin', category: 'social' },
  'facebook.com': { name: 'Facebook', icon: 'facebook', category: 'social' },
  'threads.net': { name: 'Threads', icon: 'threads', category: 'social' },
  'patreon.com': { name: 'Patreon', icon: 'patreon', category: 'other' },
  'ko-fi.com': { name: 'Ko-fi', icon: 'kofi', category: 'other' },
  'buymeacoffee.com': { name: 'Buy Me a Coffee', icon: 'coffee', category: 'other' },
  'anchor.fm': { name: 'Anchor', icon: 'anchor', category: 'podcast' },
  'soundcloud.com': { name: 'SoundCloud', icon: 'soundcloud', category: 'podcast' },
  'overcast.fm': { name: 'Overcast', icon: 'overcast', category: 'podcast' },
  'pocketcasts.com': { name: 'Pocket Casts', icon: 'pocketcasts', category: 'podcast' },
  'castbox.fm': { name: 'Castbox', icon: 'castbox', category: 'podcast' },
  'stitcher.com': { name: 'Stitcher', icon: 'stitcher', category: 'podcast' },
  'substack.com': { name: 'Substack', icon: 'substack', category: 'other' },
  'medium.com': { name: 'Medium', icon: 'medium', category: 'other' },
  'discord.gg': { name: 'Discord', icon: 'discord', category: 'social' },
  'discord.com': { name: 'Discord', icon: 'discord', category: 'social' },
  'twitch.tv': { name: 'Twitch', icon: 'twitch', category: 'social' },
  'github.com': { name: 'GitHub', icon: 'github', category: 'other' },
  'calendly.com': { name: 'Book a Call', icon: 'calendar', category: 'other' },
  'cal.com': { name: 'Book a Call', icon: 'calendar', category: 'other' },
};

export function analyzeLink(url: string): LinkAnalysis {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    for (const [pattern, info] of Object.entries(platformPatterns)) {
      if (hostname.includes(pattern) || url.includes(pattern)) {
        return {
          platform: info.name,
          suggestedTitle: info.name,
          icon: info.icon,
          category: info.category,
        };
      }
    }
    
    const siteName = hostname.split('.')[0];
    const capitalizedName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
    
    return {
      platform: capitalizedName,
      suggestedTitle: capitalizedName,
      icon: 'link',
      category: 'website',
    };
  } catch {
    return {
      platform: 'Link',
      suggestedTitle: 'My Link',
      icon: 'link',
      category: 'other',
    };
  }
}

export async function generateBioAndHeadlines(params: ProfileSuggestionParams): Promise<BioSuggestion> {
  const { podcastName, podcastTopic, hostName, existingBio } = params;
  
  const prompt = `You are helping a podcast host create their bio and headlines for their link page (like Linktree).

${hostName ? `Host name: ${hostName}` : ''}
${podcastName ? `Podcast name: ${podcastName}` : ''}
${podcastTopic ? `Podcast topic/genre: ${podcastTopic}` : ''}
${existingBio ? `Current bio (improve this): ${existingBio}` : ''}

Generate:
1. A compelling, concise bio (2-3 sentences, under 150 characters)
2. Three catchy headline options (under 50 characters each)

The bio should be personal, engaging, and make people want to follow/listen.
Headlines should be memorable and capture the essence of the podcast.

Respond in JSON format:
{
  "bio": "The compelling bio",
  "headlines": ["Headline 1", "Headline 2", "Headline 3"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content in response');
    
    return JSON.parse(content) as BioSuggestion;
  } catch (error) {
    console.error('Error generating bio:', error);
    return {
      bio: '',
      headlines: [],
    };
  }
}

export async function suggestLinksForPodcast(podcastName: string, podcastTopic?: string): Promise<Array<{ platform: string; reason: string }>> {
  const prompt = `You are a podcast marketing expert. For a podcast called "${podcastName}"${podcastTopic ? ` about ${podcastTopic}` : ''}, suggest the most important links they should have on their link page.

Consider:
- Essential podcast platforms (Spotify, Apple, YouTube)
- Social media platforms most relevant to their topic
- Community/engagement platforms
- Monetization options

Respond in JSON format with an array of suggestions:
{
  "suggestions": [
    { "platform": "Spotify", "reason": "Primary podcast platform for discoverability" },
    { "platform": "YouTube", "reason": "Visual content and clips expand reach" }
  ]
}

Limit to 6-8 most important suggestions.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content in response');
    
    const result = JSON.parse(content);
    return result.suggestions || [];
  } catch (error) {
    console.error('Error suggesting links:', error);
    return [];
  }
}

export async function improveBio(currentBio: string, hostName?: string): Promise<string> {
  const prompt = `Improve this podcast host bio to be more engaging and memorable. Keep it concise (2-3 sentences, under 150 characters).

Current bio: "${currentBio}"
${hostName ? `Host name: ${hostName}` : ''}

Make it:
- Personal and authentic
- Action-oriented (what they do, not just who they are)
- Include a touch of personality

Respond with just the improved bio, no quotes or explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    });

    return response.choices[0].message.content?.trim() || currentBio;
  } catch (error) {
    console.error('Error improving bio:', error);
    return currentBio;
  }
}

export const quickLinkTemplates = [
  { platform: 'Spotify', icon: 'spotify', placeholder: 'https://open.spotify.com/show/...' },
  { platform: 'Apple Podcasts', icon: 'apple', placeholder: 'https://podcasts.apple.com/...' },
  { platform: 'YouTube', icon: 'youtube', placeholder: 'https://youtube.com/@...' },
  { platform: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/...' },
  { platform: 'TikTok', icon: 'tiktok', placeholder: 'https://tiktok.com/@...' },
  { platform: 'X (Twitter)', icon: 'twitter', placeholder: 'https://x.com/...' },
  { platform: 'LinkedIn', icon: 'linkedin', placeholder: 'https://linkedin.com/in/...' },
  { platform: 'Patreon', icon: 'patreon', placeholder: 'https://patreon.com/...' },
  { platform: 'Discord', icon: 'discord', placeholder: 'https://discord.gg/...' },
  { platform: 'Newsletter', icon: 'mail', placeholder: 'https://...' },
];

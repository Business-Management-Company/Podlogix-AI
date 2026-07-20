import OpenAI from 'openai';
import { storage } from '../storage';
import type { SubscriptionEpisode, UserInterest, InsertEpisodeBriefing } from '@shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-not-configured",
});

interface BriefingContent {
  summary: string;
  keyTakeaways: string[];
  relevantQuotes: string[];
  personalInsights: string[];
  matchedInterests: string[];
  relevanceScore: number;
}

export async function generateBriefing(
  episode: SubscriptionEpisode,
  userInterests: UserInterest[],
  transcript: string
): Promise<BriefingContent> {
  const interestTopics = userInterests
    .filter(i => i.isActive)
    .map(i => ({
      topic: i.topic,
      keywords: i.keywords || [],
      priority: i.priority,
    }));

  const prompt = `You are an expert podcast analyst. Analyze this podcast episode transcript and create a personalized briefing for the user.

USER'S INTERESTS (topics they want to track):
${interestTopics.map(i => `- ${i.topic} (${i.priority} priority): Keywords: ${i.keywords.join(', ')}`).join('\n')}

EPISODE: "${episode.title}"
TRANSCRIPT:
${transcript.slice(0, 15000)} ${transcript.length > 15000 ? '...[truncated]' : ''}

Create a briefing with:
1. SUMMARY: A concise 2-3 paragraph summary of the episode's main points
2. KEY_TAKEAWAYS: 5-7 bullet points of the most important insights (no timestamps)
3. RELEVANT_QUOTES: 3-5 notable direct quotes from the speakers that are insightful or memorable
4. PERSONAL_INSIGHTS: 3-5 insights specifically relevant to the user's interests listed above
5. MATCHED_INTERESTS: List which of the user's interest topics were discussed in this episode
6. RELEVANCE_SCORE: A score from 0-100 indicating how relevant this episode is to the user's interests

Respond in this exact JSON format:
{
  "summary": "...",
  "keyTakeaways": ["...", "..."],
  "relevantQuotes": ["...", "..."],
  "personalInsights": ["...", "..."],
  "matchedInterests": ["...", "..."],
  "relevanceScore": 85
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as BriefingContent;
    return parsed;
  } catch (error) {
    console.error('Error generating briefing:', error);
    throw error;
  }
}

export async function processEpisodeBriefing(episodeId: string, userId: string): Promise<void> {
  try {
    const episode = await storage.getSubscriptionEpisode(episodeId);
    if (!episode || episode.userId !== userId) {
      throw new Error('Episode not found');
    }

    if (!episode.transcript) {
      throw new Error('Episode has no transcript');
    }

    // Update status to processing
    await storage.updateSubscriptionEpisode(episodeId, { briefingStatus: 'processing' });

    // Get user interests
    const userInterests = await storage.getUserInterests(userId);

    // Generate briefing
    const briefingContent = await generateBriefing(episode, userInterests, episode.transcript);

    // Save briefing
    await storage.createEpisodeBriefing({
      episodeId,
      userId,
      summary: briefingContent.summary,
      keyTakeaways: briefingContent.keyTakeaways,
      relevantQuotes: briefingContent.relevantQuotes,
      personalInsights: briefingContent.personalInsights,
      matchedInterests: briefingContent.matchedInterests,
      relevanceScore: briefingContent.relevanceScore,
      isBookmarked: false,
    });

    // Update episode status
    await storage.updateSubscriptionEpisode(episodeId, { briefingStatus: 'completed' });

    // Create notification
    await storage.createNotification({
      userId,
      type: 'briefing_ready',
      title: 'New Briefing Ready',
      message: `Your briefing for "${episode.title}" is ready to view.`,
      resourceType: 'episode',
      resourceId: episodeId,
      isRead: false,
      emailSent: false,
    });

  } catch (error) {
    console.error('Error processing episode briefing:', error);
    await storage.updateSubscriptionEpisode(episodeId, { briefingStatus: 'failed' });
    throw error;
  }
}

export async function transcribeEpisode(episodeId: string, userId: string): Promise<string> {
  try {
    // Check OpenAI API key first
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      await storage.updateSubscriptionEpisode(episodeId, { transcriptStatus: 'failed' });
      throw new Error('OpenAI API key not configured');
    }

    const episode = await storage.getSubscriptionEpisode(episodeId);
    if (!episode || episode.userId !== userId) {
      throw new Error('Episode not found');
    }

    if (!episode.audioUrl) {
      throw new Error('Episode has no audio URL');
    }

    // Update status to processing
    await storage.updateSubscriptionEpisode(episodeId, { transcriptStatus: 'processing' });

    // Download audio file
    console.log(`Downloading audio from: ${episode.audioUrl}`);
    const audioResponse = await fetch(episode.audioUrl);
    if (!audioResponse.ok) {
      console.error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
      throw new Error('Failed to download audio');
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log(`Audio downloaded, size: ${audioBuffer.byteLength} bytes`);
    
    // Check file size - Whisper has a 25MB limit
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioBuffer.byteLength > maxSize) {
      console.error(`Audio file too large: ${audioBuffer.byteLength} bytes (max: ${maxSize})`);
      throw new Error('Audio file too large for transcription (max 25MB)');
    }

    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

    // Transcribe using OpenAI Whisper
    console.log('Starting OpenAI Whisper transcription...');
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'text',
    });
    console.log('Transcription completed successfully');

    // Save transcript
    await storage.updateSubscriptionEpisode(episodeId, {
      transcript: transcription,
      transcriptStatus: 'completed',
    });

    // Create notification
    await storage.createNotification({
      userId,
      type: 'new_episode',
      title: 'Transcript Ready',
      message: `Transcript for "${episode.title}" is ready. Generate a briefing now!`,
      resourceType: 'episode',
      resourceId: episodeId,
      isRead: false,
      emailSent: false,
    });

    return transcription;
  } catch (error: any) {
    console.error('Error transcribing episode:', error);
    
    // Log specific OpenAI error details
    if (error?.status === 429) {
      console.error('OpenAI API quota exceeded or rate limited');
    } else if (error?.status === 401) {
      console.error('OpenAI API key is invalid');
    }
    
    await storage.updateSubscriptionEpisode(episodeId, { transcriptStatus: 'failed' });
    throw error;
  }
}

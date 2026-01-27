import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { storage } from "../storage";
import type { SpotifyConnection } from "@shared/schema";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

export function getSpotifyAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state: state,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Spotify token exchange error:', error);
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Spotify token refresh error:', error);
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getSpotifyUserProfile(accessToken: string): Promise<{
  id: string;
  displayName: string | null;
  email: string;
}> {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Spotify user profile');
  }

  const data = await response.json();
  return {
    id: data.id,
    displayName: data.display_name || null,
    email: data.email,
  };
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const connection = await storage.getSpotifyConnection(userId);
  if (!connection) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(connection.expiresAt);

  if (expiresAt > now) {
    return connection.accessToken;
  }

  try {
    const { accessToken, expiresIn } = await refreshAccessToken(connection.refreshToken);
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await storage.upsertSpotifyConnection({
      userId: connection.userId,
      spotifyUserId: connection.spotifyUserId,
      displayName: connection.displayName,
      accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: newExpiresAt,
      scope: connection.scope,
    });

    return accessToken;
  } catch (error) {
    console.error('Failed to refresh Spotify token:', error);
    return null;
  }
}

export async function isSpotifyConnectedForUser(userId: string): Promise<boolean> {
  const connection = await storage.getSpotifyConnection(userId);
  return !!connection;
}

export async function getSpotifyClientForUser(userId: string): Promise<SpotifyApi | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return null;
  }

  return SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: '',
  });
}

export interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  description: string;
  imageUrl: string | null;
  externalUrl: string;
  totalEpisodes: number;
}

export async function getUserSavedShowsForUser(userId: string): Promise<SpotifyShow[]> {
  try {
    const spotify = await getSpotifyClientForUser(userId);
    if (!spotify) return [];

    const response = await spotify.currentUser.shows.savedShows(50);

    return response.items.map((item: any) => ({
      id: item.show.id,
      name: item.show.name,
      publisher: item.show.publisher,
      description: item.show.description,
      imageUrl: item.show.images?.[0]?.url || null,
      externalUrl: item.show.external_urls?.spotify,
      totalEpisodes: item.show.total_episodes,
    }));
  } catch (error) {
    console.error('Error fetching Spotify shows:', error);
    return [];
  }
}

export async function searchPodcastsForUser(userId: string, query: string): Promise<SpotifyShow[]> {
  try {
    const spotify = await getSpotifyClientForUser(userId);
    if (!spotify) return [];

    const response = await spotify.search(query, ['show'], undefined, 20);

    return (response.shows?.items || []).map((show: any) => ({
      id: show.id,
      name: show.name,
      publisher: show.publisher,
      description: show.description,
      imageUrl: show.images?.[0]?.url || null,
      externalUrl: show.external_urls?.spotify,
      totalEpisodes: show.total_episodes,
    }));
  } catch (error) {
    console.error('Error searching Spotify podcasts:', error);
    return [];
  }
}

export async function getShowDetailsForUser(userId: string, showId: string): Promise<SpotifyShow | null> {
  try {
    const spotify = await getSpotifyClientForUser(userId);
    if (!spotify) return null;

    const show = await spotify.shows.get(showId, 'US');

    return {
      id: show.id,
      name: show.name,
      publisher: show.publisher,
      description: show.description,
      imageUrl: show.images?.[0]?.url || null,
      externalUrl: show.external_urls?.spotify,
      totalEpisodes: show.total_episodes,
    };
  } catch (error) {
    console.error('Error fetching show details:', error);
    return null;
  }
}

export async function getRssFeedFromSpotify(showId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://open.spotify.com/show/${showId}`);
    const html = await response.text();

    const rssMatch = html.match(/"rss":"([^"]+)"/);
    if (rssMatch) {
      return rssMatch[1];
    }

    const podcastIndexResponse = await fetch(
      `https://api.podcastindex.org/api/1.0/podcasts/byitunesid?id=${showId}`,
      {
        headers: {
          'User-Agent': 'Podlogix/1.0'
        }
      }
    );

    if (podcastIndexResponse.ok) {
      const data = await podcastIndexResponse.json();
      if (data.feed?.url) {
        return data.feed.url;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting RSS feed from Spotify:', error);
    return null;
  }
}

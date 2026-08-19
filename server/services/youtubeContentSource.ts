import { storage } from "../storage";

const API = "https://www.googleapis.com/youtube/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured");
  return { clientId, clientSecret };
}

export function getYouTubeAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = credentials();
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId, response_type: "code", redirect_uri: redirectUri,
    scope: SCOPES, state, access_type: "offline", prompt: "consent",
    include_granted_scopes: "true",
  })}`;
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = credentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || "YouTube authorization failed");
  return data as { access_token: string; refresh_token?: string; expires_in: number; scope: string };
}

async function validToken(userId: string): Promise<string> {
  const connection = await storage.getYouTubeConnection(userId);
  if (!connection) throw new Error("YouTube is not connected");
  if (new Date(connection.expiresAt).getTime() > Date.now() + 60_000) return connection.accessToken;
  const { clientId, clientSecret } = credentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: connection.refreshToken, grant_type: "refresh_token" }),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("YouTube connection needs to be renewed");
  await storage.upsertYouTubeConnection({
    ...connection,
    accessToken: data.access_token,
    // Google occasionally rotates the refresh token on refresh — losing the
    // new one would strand the connection at the next expiry.
    refreshToken: data.refresh_token || connection.refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  });
  return data.access_token;
}

async function youtubeFetch(userId: string, path: string, params: Record<string, string>) {
  const token = await validToken(userId);
  const response = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` } });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "YouTube request failed");
  return data;
}

export async function getOwnedChannel(accessToken: string) {
  const response = await fetch(`${API}/channels?part=id,snippet,contentDetails&mine=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Could not read your YouTube channel");
  const channel = data.items?.[0];
  if (!channel) throw new Error("This Google account does not own a YouTube channel");
  return {
    id: channel.id as string,
    title: channel.snippet?.title as string,
    thumbnailUrl: channel.snippet?.thumbnails?.medium?.url || channel.snippet?.thumbnails?.default?.url || null,
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads as string,
  };
}

/**
 * Ownership check for a single video: fetched by id, then the uploader's
 * channelId must equal the connected channel. Unlike scanning the uploads
 * list, this can't miss older videos beyond the first page and costs one
 * quota unit instead of three calls.
 */
export async function getOwnedVideo(userId: string, videoId: string) {
  const connection = await storage.getYouTubeConnection(userId);
  if (!connection) throw new Error("YouTube is not connected");
  const data = await youtubeFetch(userId, "videos", { part: "snippet,contentDetails,status", id: videoId });
  const video = data.items?.[0];
  if (!video || video.snippet?.channelId !== connection.channelId) return null;
  return {
    id: video.id as string,
    title: (video.snippet?.title as string) || "Untitled video",
    description: (video.snippet?.description as string) || "",
    thumbnailUrl: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || null,
    publishedAt: (video.snippet?.publishedAt as string) || null,
    duration: (video.contentDetails?.duration as string) || null,
    privacyStatus: (video.status?.privacyStatus as string) || "unknown",
    url: `https://www.youtube.com/watch?v=${video.id}`,
  };
}

export async function listOwnedVideos(userId: string, pageToken?: string) {
  const connection = await storage.getYouTubeConnection(userId);
  if (!connection) throw new Error("YouTube is not connected");
  const channel = await youtubeFetch(userId, "channels", { part: "contentDetails", mine: "true" });
  const playlistId = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const page = await youtubeFetch(userId, "playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: "24", ...(pageToken ? { pageToken } : {}) });
  const ids = (page.items || []).map((x: any) => x.contentDetails?.videoId).filter(Boolean);
  const details = ids.length ? await youtubeFetch(userId, "videos", { part: "snippet,contentDetails,status", id: ids.join(",") }) : { items: [] };
  return {
    items: (details.items || []).map((video: any) => ({
      id: video.id, title: video.snippet?.title || "Untitled video", description: video.snippet?.description || "",
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || null,
      publishedAt: video.snippet?.publishedAt || null, duration: video.contentDetails?.duration || null,
      privacyStatus: video.status?.privacyStatus || "unknown", url: `https://www.youtube.com/watch?v=${video.id}`,
    })),
    nextPageToken: page.nextPageToken || null,
  };
}

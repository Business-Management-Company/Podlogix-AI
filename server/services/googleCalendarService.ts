import { storage } from "../storage";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export function getGoogleCalendarAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: GOOGLE_SCOPES,
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Google token exchange error:', error);
    throw new Error(`Failed to exchange code for tokens: ${error}`);
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
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Google token refresh error:', error);
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getGoogleUserInfo(accessToken: string): Promise<{ id: string; email: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const data = await response.json();
  return { id: data.id, email: data.email };
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const connection = await storage.getGoogleCalendarConnection(userId);
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

    await storage.upsertGoogleCalendarConnection({
      userId: connection.userId,
      googleUserId: connection.googleUserId,
      email: connection.email,
      accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: newExpiresAt,
      scope: connection.scope,
    });

    return accessToken;
  } catch (error) {
    console.error('Failed to refresh Google Calendar token:', error);
    return null;
  }
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  htmlLink: string | null;
  meetingLink: string | null;
}

export async function listUpcomingEvents(userId: string, maxResults = 5): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return [];

  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar events fetch error:', error);
    return [];
  }

  const data = await response.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.summary || '(No title)',
    start: item.start?.dateTime || item.start?.date || null,
    end: item.end?.dateTime || item.end?.date || null,
    allDay: !item.start?.dateTime,
    htmlLink: item.htmlLink || null,
    meetingLink: item.hangoutLink || item.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || null,
  }));
}

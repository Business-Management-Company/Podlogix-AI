import { AccessToken } from "livekit-server-sdk";

/**
 * LiveKit guest rooms for the Live Studio.
 *
 * Required env (all three, or the feature reports itself unconfigured):
 *   LIVEKIT_URL         wss://<project>.livekit.cloud
 *   LIVEKIT_API_KEY     from LiveKit Cloud -> project -> API keys
 *   LIVEKIT_API_SECRET  shown once at key creation
 *
 * Tokens are minted server-side only; the secret never reaches the browser.
 * Rooms are named live-<sessionId> so one show maps to one room.
 */

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET,
  );
}

export function liveKitUrl(): string {
  return process.env.LIVEKIT_URL!;
}

export function roomNameForSession(sessionId: string): string {
  return `live-${sessionId}`;
}

export async function mintRoomToken(
  room: string,
  identity: string,
  displayName: string,
): Promise<string> {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
    identity,
    name: displayName,
    ttl: "6h",
  });
  token.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
  return token.toJwt();
}

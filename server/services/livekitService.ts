import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  S3Upload,
} from "livekit-server-sdk";

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

export function roomNameForStudio(studioId: string): string {
  return `studio-${studioId}`;
}

/**
 * The room participants actually join. The Studio flow joins studio-<studioId>
 * (studios/:id/host-token & guest-link); only pre-studio sessions use
 * live-<sessionId>. Egress MUST target this same room or it records nothing.
 */
export function roomNameForRecording(session: { id: string; studioId: string | null }): string {
  return session.studioId ? roomNameForStudio(session.studioId) : roomNameForSession(session.id);
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

// ── Server-side cloud recording (LiveKit Egress → Supabase S3) ───────────────
//
// Egress records the room composite in the cloud at full resolution, so the VOD
// no longer depends on the host's browser (720p canvas) — this is the "Zoom
// quality" path. Requires Egress enabled on the LiveKit plan plus S3 creds:
//   EGRESS_S3_ACCESS_KEY / EGRESS_S3_SECRET  (Supabase dashboard → S3 keys)
//   EGRESS_S3_BUCKET / EGRESS_S3_REGION / EGRESS_S3_ENDPOINT
// Recordings land at recordings/<sessionId>/<startedAt>.mp4 in the bucket.

export function isEgressConfigured(): boolean {
  return (
    isLiveKitConfigured() &&
    Boolean(
      process.env.EGRESS_S3_ACCESS_KEY &&
        process.env.EGRESS_S3_SECRET &&
        process.env.EGRESS_S3_BUCKET &&
        process.env.EGRESS_S3_ENDPOINT,
    )
  );
}

/** Egress API uses the https host, not the wss realtime URL. */
function egressHttpUrl(): string {
  return liveKitUrl().replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

function s3Output(filepath: string): EncodedFileOutput {
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: process.env.EGRESS_S3_ACCESS_KEY!,
        secret: process.env.EGRESS_S3_SECRET!,
        bucket: process.env.EGRESS_S3_BUCKET!,
        region: process.env.EGRESS_S3_REGION || "us-east-1",
        endpoint: process.env.EGRESS_S3_ENDPOINT!,
        // Supabase's S3 gateway (and most non-AWS stores) need path-style URLs.
        forcePathStyle: (process.env.EGRESS_S3_FORCE_PATH_STYLE ?? "true") !== "false",
      }),
    },
  });
}

export function recordingFilepath(sessionId: string, startedAtMs: number): string {
  return `recordings/${sessionId}/${startedAtMs}.mp4`;
}

/**
 * Start recording a room composite at 1080p. Returns the egress id + filepath.
 * When templateBaseUrl is given, LiveKit's egress renderer loads that page
 * (our /studio/egress-view, which reproduces the studio composition) instead
 * of a built-in grid — so the recording matches the studio look. Without it,
 * falls back to the built-in grid layout.
 */
export async function startSessionRecording(
  roomName: string,
  filepath: string,
  templateBaseUrl?: string,
): Promise<{ egressId: string; filepath: string }> {
  const client = new EgressClient(egressHttpUrl(), process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
  const info = await client.startRoomCompositeEgress(roomName, s3Output(filepath), {
    layout: templateBaseUrl ? "studio" : "grid",
    encodingOptions: EncodingOptionsPreset.H264_1080P_30,
    ...(templateBaseUrl ? { customBaseUrl: templateBaseUrl } : {}),
  });
  return { egressId: info.egressId, filepath };
}

export async function stopSessionRecording(egressId: string): Promise<void> {
  const client = new EgressClient(egressHttpUrl(), process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
  await client.stopEgress(egressId);
}

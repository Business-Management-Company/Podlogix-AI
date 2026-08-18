import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * Supabase Storage service for episode audio, artwork, and other media.
 *
 * Required env:
 *   SUPABASE_URL               e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  Project Settings -> API keys -> service_role (server-only!)
 * Optional env:
 *   SUPABASE_STORAGE_BUCKET    defaults to "media" (must be a PUBLIC bucket)
 *
 * Upload flow (mirrors the old object-storage contract):
 *   1. Client POSTs /api/uploads/request-url with { name, size, contentType }
 *   2. Server returns { uploadURL, objectPath }
 *      - uploadURL: a signed Supabase upload URL the client PUTs the file to
 *      - objectPath: the final PUBLIC URL of the object (store this in the DB)
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";

let client: SupabaseClient | null = null;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getClient(): SupabaseClient {
  if (!client) {
    if (!isSupabaseStorageConfigured()) {
      throw new Error(
        "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

function safeExtension(fileName: string): string {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(fileName || "");
  return match ? `.${match[1].toLowerCase()}` : "";
}

export async function createUploadUrl(
  fileName: string,
): Promise<{ uploadURL: string; objectPath: string }> {
  const supabase = getClient();
  const objectKey = `uploads/${randomUUID()}${safeExtension(fileName)}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(objectKey);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? "unknown error"}`);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);

  return {
    uploadURL: data.signedUrl,
    objectPath: pub.publicUrl,
  };
}

/** Public URL for a legacy /objects/<key> path (compatibility redirect target). */
export function publicUrlForKey(objectKey: string): string {
  const supabase = getClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
  return data.publicUrl;
}

/**
 * External-CDN hosts we're willing to mirror media from. Social platforms hand
 * out signed URLs that expire in hours-to-days, so anything we want to keep
 * must be copied into our own bucket — and only from hosts we recognize.
 */
const MIRROR_HOST_ALLOWLIST = [
  "fbcdn.net", "licdn.com", "cdninstagram.com", "googleusercontent.com",
  "ggpht.com", "twimg.com", "tiktokcdn.com", "pinimg.com", "bsky.app", "redd.it",
  "redditmedia.com", "scontent.com", "threads.net",
];

const MIRROR_MAX_BYTES = 25 * 1024 * 1024; // media posts can be video thumbs/photos

function isAllowedMirrorHost(url: string): boolean {
  try {
    const { protocol, host } = new URL(url);
    if (protocol !== "https:") return false;
    return MIRROR_HOST_ALLOWLIST.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

/** Stores a video buffer (e.g. a cut clip) and returns our public URL, or null. */
export async function storeVideoBuffer(
  buffer: Buffer,
  prefix: string,
  contentType = "video/mp4",
): Promise<string | null> {
  try {
    if (!isSupabaseStorageConfigured() || buffer.length === 0) return null;
    const objectKey = `${prefix}/${randomUUID()}.mp4`;
    const supabase = getClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, buffer, { contentType, upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/** Stores an audio buffer (e.g. a refined episode) and returns our public URL, or null. */
export async function storeAudioBuffer(
  buffer: Buffer,
  prefix: string,
  contentType = "audio/mpeg",
): Promise<string | null> {
  try {
    if (!isSupabaseStorageConfigured() || buffer.length === 0) return null;
    const ext = contentType.includes("wav") ? ".wav" : contentType.includes("mp4") || contentType.includes("m4a") ? ".m4a" : ".mp3";
    const objectKey = `${prefix}/${randomUUID()}${ext}`;
    const supabase = getClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, buffer, { contentType, upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/** Stores a raw image buffer (e.g. AI-generated) and returns our public URL, or null. */
export async function storeImageBuffer(
  buffer: Buffer,
  prefix: string,
  contentType = "image/png",
): Promise<string | null> {
  try {
    if (!isSupabaseStorageConfigured() || buffer.length === 0) return null;
    const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
    const objectKey = `${prefix}/${randomUUID()}${ext}`;
    const supabase = getClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, buffer, { contentType, upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * Copies an external CDN asset into our bucket and returns OUR public URL.
 * Returns null on any failure — callers must store null, never the expiring
 * source URL.
 */
export async function mirrorExternalMedia(
  sourceUrl: string,
  prefix: string,
): Promise<string | null> {
  try {
    if (!isSupabaseStorageConfigured() || !isAllowedMirrorHost(sourceUrl)) return null;

    // Instagram's CDN refuses plain datacenter fetches (Facebook's allows them) —
    // browser-shaped headers get through; persistent 403s would need an edge-worker
    // fallback.
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MIRROR_MAX_BYTES) return null;

    const ext = contentType.startsWith("video/")
      ? ".mp4"
      : contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
    const objectKey = `${prefix}/${randomUUID()}${ext}`;

    const supabase = getClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, buffer, { contentType, upsert: false });
    if (error) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
    return data.publicUrl;
  } catch {
    return null;
  }
}

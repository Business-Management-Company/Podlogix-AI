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

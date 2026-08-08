import type { ID, BaseCanonicalModel, WorkspaceScoped } from "./common";

export type GuestStatus = "invited" | "confirmed" | "recorded" | "released" | "declined";

/**
 * A person booked on (or considered for) one or more episodes — the
 * "Business & Sponsors" side of running a show, not a listener. See
 * `Audience` for listener-side data.
 */
export interface Guest extends BaseCanonicalModel, WorkspaceScoped {
  name: string;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  company: string | null;
  title: string | null;
  /** Platform name -> profile URL, e.g. { linkedin: "...", twitter: "..." }. */
  socialLinks: Record<string, string>;
  status: GuestStatus;
  /** Episodes this guest has appeared on or is booked for. */
  episodeIds: ID[];
  /** Whether a signed appearance release/consent form is on file. */
  releaseSigned: boolean;
  notes: string | null;
}

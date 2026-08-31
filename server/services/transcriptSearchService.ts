import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Cross-transcript keyword search — "which shows have talked about this?".
 *
 * Searches the episodes the user has transcripts for and returns, per match, a
 * snippet showing the moment the term comes up ("this show mentioned this").
 * The keyword pass is phase one; an LLM reading the matched transcripts and
 * answering conversationally is the planned phase two.
 *
 * SAFETY: this tool is meant for veterans searching mental-health / VA-claim
 * topics, so a query that signals self-harm must surface crisis help FIRST —
 * never just a list of podcast episodes. detectCrisis() is a deliberately broad
 * heuristic (false positives are fine here); the LLM phase will refine it.
 */

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+my\s?self\b/i,
  /\bend(ing)?\s+(my\s+life|it\s+all|my\s+own\s+life)\b/i,
  /\bvulnerable\s+to\s+ending\s+my\s+life\b/i,
  /\b(want|wanting|going|need|ready)\s+to\s+die\b/i,
  /\bsuicid/i,
  /\bharm(ing)?\s+my\s?self\b/i,
  /\bself[-\s]?harm\b/i,
  /\bno\s+(reason|point)\s+to\s+(live|living|go\s+on|keep\s+going)\b/i,
  /\bcan'?t\s+(go\s+on|take\s+it|do\s+this)\s+(any\s?more)?\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\b/i,
];

export function detectCrisis(query: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(query));
}

/** Confidential, 24/7 crisis resources, veteran-first. */
export const CRISIS_RESOURCES = {
  heading: "If you're in crisis, help is available right now — free, confidential, and 24/7. You don't have to be enrolled in VA benefits.",
  resources: [
    {
      name: "Veterans Crisis Line",
      action: "Dial 988, then press 1",
      detail: "Text 838255 · chat at VeteransCrisisLine.net",
    },
    {
      name: "988 Suicide & Crisis Lifeline",
      action: "Call or text 988",
      detail: "For anyone in the U.S., any kind of crisis",
    },
  ],
};

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "your", "with", "that", "this", "have", "has",
  "was", "were", "from", "they", "them", "their", "what", "when", "who", "how", "why", "can", "could",
  "would", "should", "about", "into", "some", "any", "all", "our", "out", "off", "get", "got", "just",
  "like", "need", "want", "feel", "feeling", "really", "very", "much", "more", "been", "being", "there",
  "here", "then", "than", "also", "because", "which", "while", "these", "those", "over", "under", "i'm",
  "i've", "i'll", "don't", "doesn't", "can't", "won't", "it's",
]);

/** Pull meaningful search terms out of a natural-language query. */
export function extractTerms(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return Array.from(new Set(words)).slice(0, 10);
}

export interface TranscriptMatch {
  episodeId: string;
  episodeTitle: string;
  showTitle: string;
  showArtwork: string | null;
  audioUrl: string | null;
  publishedAt: string | null;
  snippet: string;
  matchedTerms: string[];
  matchCount: number;
}

function buildSnippet(transcript: string, terms: string[]): { snippet: string; matchedTerms: string[]; matchCount: number } {
  const lower = transcript.toLowerCase();
  let earliest = -1;
  const matched = new Set<string>();
  let count = 0;
  for (const term of terms) {
    let idx = lower.indexOf(term);
    if (idx !== -1) {
      matched.add(term);
      if (earliest === -1 || idx < earliest) earliest = idx;
    }
    while (idx !== -1) {
      count += 1;
      idx = lower.indexOf(term, idx + term.length);
    }
  }
  if (earliest === -1) {
    return { snippet: transcript.slice(0, 200).trim(), matchedTerms: [], matchCount: 0 };
  }
  const start = Math.max(0, earliest - 100);
  const end = Math.min(transcript.length, earliest + 180);
  let snippet = transcript.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < transcript.length) snippet = `${snippet}…`;
  return { snippet, matchedTerms: Array.from(matched), matchCount: count };
}

/**
 * Search the user's transcribed episodes for the query terms. Scoped to the
 * user's own episodes (that's where the transcripts live today); a shared
 * corpus is a later data-model change.
 */
export async function searchTranscripts(
  userId: string,
  query: string,
): Promise<{ terms: string[]; matches: TranscriptMatch[] }> {
  const terms = extractTerms(query);
  if (terms.length === 0) return { terms: [], matches: [] };

  const likeConds = sql.join(
    terms.map((t) => sql`e.transcript ILIKE ${`%${t}%`}`),
    sql` OR `,
  );
  const result: any = await db.execute(sql`
    SELECT e.id, e.title, e.audio_url, e.published_at, e.transcript,
           s.title AS show_title, s.artwork_url
    FROM subscription_episodes e
    JOIN podcast_subscriptions s ON e.subscription_id = s.id
    WHERE e.user_id = ${userId}
      AND e.transcript IS NOT NULL
      AND (${likeConds})
    LIMIT 200
  `);
  const rows: any[] = result?.rows ?? result ?? [];

  const matches: TranscriptMatch[] = rows.map((r) => {
    const { snippet, matchedTerms, matchCount } = buildSnippet(String(r.transcript || ""), terms);
    return {
      episodeId: r.id,
      episodeTitle: r.title,
      showTitle: r.show_title,
      showArtwork: r.artwork_url ?? null,
      audioUrl: r.audio_url ?? null,
      publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
      snippet,
      matchedTerms,
      matchCount,
    };
  });

  // Rank: most distinct query terms matched, then most total mentions.
  matches.sort((a, b) => b.matchedTerms.length - a.matchedTerms.length || b.matchCount - a.matchCount);
  return { terms, matches: matches.slice(0, 25) };
}

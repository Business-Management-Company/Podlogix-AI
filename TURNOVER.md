# Podlogix Turnover — Cowork → Claude Code

**Date:** 2026-08-14
**Repo:** `~/projects/Podlogix/Podlogix-AI` (Vercel-deployed, Supabase Postgres backend)
**Handoff reason:** Prior work was done through a cloud sandbox with a device bridge to this Mac. That bridge could not delete files in the mounted git repo, so `.git/index.lock`/`.git/HEAD.lock` had to be cleared manually before nearly every commit. Claude Code runs natively in this terminal with direct filesystem/git access, so that friction goes away — this doc is what you need to pick the work back up with full context.

## What this project is

Podlogix is a SaaS product for podcast businesses (hosting/distribution, social/audience analytics, AI content tools). Stack: React + Vite + TypeScript frontend (wouter routing, TanStack Query v5, Tailwind + shadcn/ui), Express backend, Drizzle ORM, Supabase (Postgres + Storage), deployed on Vercel (serverless functions, 60s timeout).

`veteran-podcast-network` (VPN) is a separate, unrelated project that was previously living at `~/projects/Podlogix/veteran-podcast-network` out of chat convenience — it has now been moved to its own top-level folder at `~/projects/VPN` (see `~/projects/VPN/TURNOVER.md` for its own handoff doc). Branding work was done there recently (robot mascot logo replaced with a clean SVG "VPN" badge, chat widget avatar, favicon) and is believed complete and deployed; it is not part of this project's active thread.

## Read these first

1. `ARCHITECTURE.md` in repo root — pre-existing architecture doc.
2. The three project docs saved in the Claude "podlogix" project (accessible via the Projects tool if using Claude, or ask the user to paste them if not):
   - `podlogix-product-architecture-v2.md` — full A–S strategic architecture doc (repositions Podlogix as "The Operating System for Podcast Businesses" with a Workspace/Show/Episode context model). This is the spec being implemented.
   - `podlogix-v2-implementation-map.md` — Step-1 audit: current→new route/component mapping, reusable systems, missing schema objects, implementation sequence.
   - `podlogix-connector-audit-2026-08.md` — connector/integration audit + bug-fix log (Buzzsprout, YouTube, Influencers.club).

## Current state of the v2 rewrite (10 phases total)

**Done (Phases 1–3):**
- Phase 1–2: `client/src/components/AppLayout.tsx` rewritten around a `navMode: "workspace" | "show"` model (regex on `/shows/:id` route). Workspace rail: Today / Shows / Episodes / Audience + Settings group (Link Page / Connected apps / Identity Protection / Workspace Settings). Show context: back-link header with artwork/name, panel items Overview / Episodes / Promotion / Distribution / Audience / Show Settings.
- `client/src/App.tsx` updated with new routes (`/today`, `/shows`, `/episodes`, `/shows/:id/*`) plus backward-compat redirects from old paths (`/activity`→`/today`, `/dashboard`→`/today`, `/podcasts`→`/shows`, etc).
- New pages: `client/src/pages/Shows.tsx`, `ShowSettings.tsx`, `EpisodeDetail.tsx` (tabbed: Content/Publish/Promote/Results, read-only preview pass).
- `client/src/pages/Episodes.tsx` rows now link to `/episodes/:id`.
- Along the way: fixed a TanStack Query v5 typing bug in `client/src/components/settings/BuzzsproutConnect.tsx`.

**Not started (Phases 4–10):**
- Phase 4: Rebuild `Today` (`client/src/pages/Activity.tsx`) around a real "Needs Attention" feed (distribution errors, incomplete scheduled episodes, unreturned guest forms, sponsor deliverables, integration failures) + "This Week" / "Show Pulse" / "Revenue" sections + a max-2-sentence AI Briefing. Retire onboarding/setup checklist cards post-onboarding.
- Phase 5: Move AI Studio capabilities into episode-page context (Content/Promote tabs), keep the global AI slide-out.
- Phase 6: Reframe Distribution as a per-show destination grid (Live/Pending/Not submitted/Error); move RSS/hosting internals under Show Settings → "Your podcast host" (advanced).
- Phase 7: Guests MVP — **needs new DB schema** (pipeline Prospect→Invited→Booked→Recorded→Published→Follow-up→Alumni; contact info; episode links; AI prep brief via existing Influencers.club integration).
- Phase 8: Sponsors MVP — **needs new DB schema** (Sponsor→Campaign→Placement; pipeline Prospect→Conversation→Proposed→Active→Delivered→Paid→Renewal; tied to episodes).
- Phase 9: Reframe Audience/Social Analytics PRO — break apart the existing 7-tab suite (profile lookup → Guest research, brand/account research → Sponsor research, "My Accounts" → Audience).
- Phase 10: Move Identity Hub functionality into Settings → "Identity Protection", surface a certification badge on show/host profiles.

**Explicit constraints from the original brief (still binding):**
- This is IA/workflow restructuring, NOT a visual redesign — preserve existing design system, typography, cards, colors, dark rail pattern.
- Do not rebuild working functionality — inspect and reuse before creating new.
- Nav describes work, not software features; hide infra (RSS, feed IDs, connector internals) in Settings.
- No fake/stub functionality exposed in nav with nothing behind it. No duplicate systems. Don't break Buzzsprout/RSS sync.
- Guests/Sponsors need schema migrations — run `npm run db:push` locally when you get there (this needs to happen from a real terminal with DB credentials, which Claude Code now has).

## Bug fixes already shipped this session (verify these are live)

1. **Buzzsprout sync stuck on "Syncing…" forever** — `server/services/buzzsproutSyncService.ts`: batched the per-episode upserts (was hitting Vercel's 60s timeout on larger catalogs) and added a self-heal that resets any connection stuck in `syncing` for >3 minutes.
2. **YouTube "already connected" / false "not connected" state** — `server/routes.ts`, 4 routes under `/api/creator/social-profiles*`: unified userId resolution across routes, and changed the duplicate-profile 400 error into an upsert.
3. **Influencers.club API calls all failing** (Discovery, Profile Search, Posts) — `server/routes.ts`: the whole integration was built against invented endpoint paths. Rewrote against the real API contract (extracted from `github.com/Influencers-Club/n8n-nodes-influencersclub` source), fixed request body shapes, added a `normalizeSocialHandle()` helper so pasted profile URLs get converted to bare handles, and surfaced real upstream error text for debugging.
4. Added `GET /api/admin/integration-status` + `client/src/pages/IntegrationStatus.tsx` — an admin page listing all 14 integrations with computed configured/missing status (reads env var presence only, never key values) plus a manual checklist persisted to localStorage.

## Known open items / gotchas

- **Env vars live in two different places** — Vercel project env vars (used by the deployed app) vs Supabase Edge Function secrets (a separate vault, only relevant if any Supabase Edge Functions are in use). Don't assume a key set in one is visible in the other.
- A connector/feature audit spreadsheet was produced (`podlogix-connector-feature-audit.xlsx`, delivered to the user, not in the repo) mapping every connector/feature to working/broken/needs-key status — useful reference if picking up integration work, ask the user for it if needed.
- All Phase 1–3 changes were prepared and committed/pushed at the end of the last session (commit message: "v2 architecture: workspace nav, show context, Episode detail pages + IC API fixes") — run `git log --oneline -5` first thing to confirm what's actually landed vs still local/uncommitted.
- The user has explicitly and repeatedly disliked: heavy orange CTA buttons, orange active-nav-item highlighting, oversized empty-state cards, and dark-panel nav variants. The Design tokens were normalized to neutral grays and the active nav state to `bg-muted text-foreground` — do not reintroduce the orange styling without checking with the user first.

## Suggested first moves in Claude Code

1. `git log --oneline -10` and `git status` — confirm what's actually committed vs pending.
2. Read `client/src/components/AppLayout.tsx` and `client/src/App.tsx` to see the current nav/route structure firsthand.
3. Confirm with the user whether to start Phase 4 (Today/Needs Attention rebuild) next, per the sequence above.

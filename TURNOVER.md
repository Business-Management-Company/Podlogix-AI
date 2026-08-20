# Podlogix Turnover

**Date:** 2026-08-20
**Repo:** `~/projects/Podlogix/Podlogix-AI` (Vercel-deployed, Supabase Postgres backend)

> The previous version of this file (dated 2026-08-14, "Cowork → Claude Code") described a workspace/show nav rewrite ("Today / Shows / Episodes / Audience") that does **not** match the current codebase — check `git log` if you need that history, but don't trust its "current state" section. This version reflects what's actually deployed as of today.

## What this project is

Podlogix is a SaaS product for podcast businesses (hosting/distribution, guest research/CRM, social/audience analytics, AI content tools). Stack: React + Vite + TypeScript frontend (wouter routing, TanStack Query v5, Tailwind + shadcn/ui), Express backend, Drizzle ORM, Supabase (Postgres + Storage), deployed on Vercel (serverless functions).

## Current nav structure (verify in `client/src/components/AppLayout.tsx` if unsure)

Top-level groups: Dashboard (`/today`) · Podcast (Shows/Episodes/Listen) · **Guests** (Discover `/social/discover`, Starred `/social/directory`, Guest Pipeline `/guests`) · **Contacts** (`/contacts`) · **Email** (`/email`) · Social Hub · Studio (Live Studio, Refiner, Media Storage, Media Lab) · Connectors · Settings.

## Recently shipped (this week, verified live on production)

All of the following are merged to `main` and confirmed deployed to `podlogix.io` (deployment IDs checked against GitHub commit statuses, not just "PR merged"):

- **Google Sign-In** (PR #102) — reuses existing `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in Vercel. Google account still in "Testing" mode (branding verification not done — home page doesn't explain the app, logo issue). Fine for now; only blocks going fully public.
- **Help Center v2** (PR #98) — dark hero, live search, mockup screenshots, deep-link CTAs.
- **Influencers.club cost-safety overhaul** (PRs #105, #107) — every route that can spend an IC credit now requires `ENABLE_IC_ENRICHMENT=1` (currently **off** in prod) on a cache miss. New `server/services/icEnrichment.ts`: a global `creator_enrichment_cache` table (platform+handle) shared across all users — a creator is enriched once, ever. Deleted a dead, unguarded route that was the actual cause of the Aug 19 credit leak. Added a daily cron (`/api/cron/enrich-creators`, `CRON_SECRET`-protected) that backfills missing pictures/bios from cache only — doesn't spend unless the flag is on.
- **Podchaser guest discovery** (many PRs, #70–#107 in Codex's earlier session, see git log) — Discover page searches people + podcast shows via Podchaser (not IC). Guest lifecycle: Discover → **Add to Pipeline** (show+stage) or **Add to Contacts** (no show needed) → optional **Reveal Email** (1 IC credit, deduped). IC is now *only* spent on that explicit reveal action.
- **Star workflow + Contacts filters** (PR #108) — replaced the old standalone "Shortlist" button with a star toggle that works everywhere (Discover, Guest Pipeline, Contacts) regardless of status. "Shortlist" nav item renamed "Starred", now filters to starred-only. Contacts page got All/Starred/by-stage filter chips. New: `client/src/components/guest/StarButton.tsx`, `client/src/hooks/use-toggle-prospect-star.ts`, `guest_prospects.starred` column.
- **Creator-detail bug fix** (PR #109) — `getPodchaserCreator()` wasn't unwrapping Podchaser's `{data: {...}}` envelope, so anyone opened via a podcast's "Hosts and guests" list (no pre-existing Twitter link) showed as "Unknown creator" with a blank id — which then failed guest-prospect creation outright. Fixed to match the envelope-unwrap pattern already used elsewhere in `podchaserGuestService.ts`. Also added a blue/white onboarding toast for the star button (auto-shows once, ever, via localStorage).

## ⚠️ Database migration drift — verify before trusting "already applied" claims

**Found and fixed today:** `migrations/20260820_master_guest_contacts.sql` (adds `email_contacts.guest_prospect_id`) had been reported as successfully applied in an earlier session, but the column did not actually exist on the real production database — causing a live 500 on "Add to Contacts" for any newly-discovered guest. Re-ran the migration (it's idempotent) and confirmed the column now exists.

**Lesson:** don't trust a prior session's "migration applied" claim at face value — verify directly against the DB (`psql "$DATABASE_URL" -c "\d table_name"`) before building on top of an assumed-present column. I spot-checked the other tables/columns mentioned in recent session history (`youtube_connections`, `guest_prospects`, `guest_pipeline_entries.guest_prospect_id`/`contact_id`) and those are all genuinely present — this appears to have been an isolated miss, not a systemic problem, but worth a quick `\d` check if something inexplicably 500s with a "column does not exist" error.

## In progress / next up

- **Figma-driven redesign** — user wants to adopt the layout/nav/component patterns from a Figma template ("FlowMail — Automation SaaS Application") across the app, page by page. Link: `https://www.figma.com/design/GmBpQXfYSYqcyCbsrGW4uO/FlowMail--Automation-SaaS-Application`. The sandboxed Claude Code browser couldn't render the Figma canvas (stayed blank gray through zoom-to-fit/clicks — likely a WebGL limitation in that sandbox). Try "Claude in Chrome" instead (drives the user's real logged-in Chrome), or ask the user to export/screenshot key frames directly. No design work has started yet — this is a fresh scope.
- **Feature idea, not yet built:** let a whole podcast *show* (not just an individual person) be saved to a list from Discover — user suggested this while looking at the podcast-show drawer, which currently has no save/list action (by design, since only people get pipeline/contact actions — but a "follow this show" list is a reasonable separate feature).
- **Google branding verification** — still needed before the Google Sign-In app can leave "Testing" mode: home page needs to explain the app, logo needs to be uploaded in Google Cloud Branding settings. Not urgent (test users work fine up to 100).

## Gotchas

- Local git checkouts in this environment can silently drift behind `origin/main` (happened once this session — a stale branch was checked out for a while without noticing). Run `git fetch origin main -q && git log --oneline -3 origin/main` if something seems out of sync with what's described here.
- `gh pr merge` can report a confusing local error (e.g. "not a git repository") while the merge itself still succeeds server-side via the GitHub API — if that happens, verify with `gh pr view <n> --json mergedAt,mergeCommit` rather than assuming the local error means nothing happened.
- Bash tool's working directory has reset to the parent (`~/projects/Podlogix` instead of `~/projects/Podlogix/Podlogix-AI`) between calls at least once this session for unclear reasons — always `cd` explicitly before git/npm commands rather than assuming cwd persisted.

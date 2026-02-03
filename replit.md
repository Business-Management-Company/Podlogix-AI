# Podlogix

## Overview
Podlogix is an AI-powered podcast automation platform designed to help creators scale their shows and protect their voice identity. It offers smart transcription, automated show notes, viral clip generation, content repurposing, and audio enhancement. A core feature is Voice Identity Protection, utilizing the Polygon blockchain to certify user voices against AI impersonation. The platform caters to both podcasters (creators) and podcast listeners, providing tools for content creation, consumption, social media integration, and brand/influencer management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, Vite, Wouter for routing, TanStack React Query for state.
- **UI/Styling**: shadcn/ui (Radix UI), Tailwind CSS with custom theming (dark mode default), Framer Motion for animations.
- **Forms**: React Hook Form with Zod validation.

### Backend
- **Runtime**: Node.js with Express.js, TypeScript with ESM modules.
- **API**: REST endpoints (shared/routes.ts) with Zod schemas for validation and typing.
- **Database**: Drizzle ORM with PostgreSQL.
- **Session Management**: PostgreSQL-backed sessions using `connect-pg-simple`.

### Shared Code
- **Schemas**: Drizzle schemas (shared/schema.ts) define database tables and generate Zod validation.
- **API Contracts**: Typed API route definitions (shared/routes.ts) ensure type-safe client-server communication.

### Build System
- **Development**: Vite dev server with HMR proxied through Express.
- **Production**: Vite builds frontend, esbuild bundles server.
- **Database Migrations**: Drizzle Kit (`db:push`).

### Key Design Patterns
- **Type-Safe API Layer**: Zod schemas for API validation on client and server.
- **Storage Abstraction**: `IStorage` interface for database flexibility.
- **Component Composition**: Radix primitives with Tailwind CSS via `class-variance-authority`.

### Feature Specifications

#### Podcast Listener Features
- **Subscriptions**: Via RSS or Spotify import.
- **AI Briefings**: Personalized summaries, quotes, and insights based on user interests (OpenAI Whisper for transcription, GPT-4o for briefing).
- **Automation**: `episodeSyncService` for RSS polling, `schedulerService` for background sync.
- **Spotify Integration**: Create and manage "Podlogix Recommendations" playlists.

#### Brand Dashboard Features
- **Influencer Discovery**: Search YouTube channels (YouTube Data API v3), Instagram hashtags (Instagram Graph API).
- **Influencer Management**: Save and track influencers with notes and status.
- **Hashtag Monitoring**: Across Instagram, TikTok, YouTube.

#### Creator Social Profiles
- **Multi-Platform Support**: YouTube, Instagram, TikTok, X, LinkedIn.
- **Analytics**: Auto-fetches YouTube stats (subscribers, views) and Instagram stats (followers, posts) via free APIs.
- **OAuth**: Secure Instagram OAuth flow.

#### Social Hub (Upload-Post Integration)
- **Multi-Platform Posting**: Instagram, TikTok, YouTube, Facebook, LinkedIn.
- **Account Connection**: White-label OAuth via Upload-Post.
- **Post Management**: Post history, scheduled posts.

#### Admin Dashboard
- **Access Control**: Admin and Superadmin roles.
- **User Management**: View, manage roles, status.
- **Creator Management**: Track influencers with rate sheets, status, analytics.
- **Discovery**: Influencers.club (340M+ creators), YouTube, Instagram, LinkedIn influencer search.

#### Client Portal (for Brands/Agencies)
- **Creator Discovery**: AI-powered search of 340M+ influencers and podcasters via Influencers.club.
- **Media Kit Viewer**: View creator profiles, stats, and estimated rate cards.
- **Rate Calculator**: Industry-standard algorithm using followers, engagement rate, and avg views (min $25/post).
- **Saved Creators**: Track creators with status (saved, interested, contacted, negotiating, partnered, declined).
- **Connection Management**: Add notes, tags, and organize creators into lists.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: For database interactions.

### Third-Party Integrations
- **GitHub API**: (via Replit Connectors) for repository operations.
- **Polygon Blockchain**: For Voice Identity Protection NFT minting.
- **Spotify API**: (via Replit Connectors) for podcast imports.
- **Meta API**: Instagram/Facebook monitoring for impersonation detection.
- **Resend**: (via Replit Connectors) Email notification service.
- **OpenAI**: Whisper for transcription, GPT-4o for briefing generation.
- **Modash**: Influencer discovery and analytics (optional, requires API key).
- **Phyllo**: Social media monitoring for voice identity protection (Instagram, TikTok, YouTube, X, LinkedIn, Facebook).
- **Upload-Post**: For multi-platform social media posting.
- **YouTube Data API v3**: For YouTube channel discovery and analytics.
- **Instagram Graph API**: For Instagram hashtag discovery and creator social profile analytics.
- **Influencers.club PRO API**: 340M+ creator database with full PRO tier features:
  - **AI Discovery**: Natural language search with 60+ filters (location, niche, engagement, followers, verified emails)
  - **Profile Enrichment**: Full analytics including fake follower detection, estimated monthly income
  - **Lookalikes**: Find similar creators to any handle
  - **Email Enrichment**: Convert emails to social profiles (basic/advanced modes)
  - **Posts API**: Get recent posts with engagement metrics
  - **Batch Processing**: Bulk enrichment for large creator lists
  - **Credits Monitoring**: Track API usage and remaining credits
- **Meta App (Seeksy Social Graph)**: App ID 1358972209298823, for Instagram/Facebook Graph API access.
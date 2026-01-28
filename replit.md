# Podlogix

## Overview

Podlogix is a podcast automation platform that uses AI to help creators scale their shows. The application provides smart transcription, automated show notes, viral clip generation, content repurposing, and audio enhancement. A key differentiating feature is Voice Identity Protection, which allows users to certify their voice on the Polygon blockchain to protect against AI impersonation and deepfakes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (dark mode by default)
- **Animations**: Framer Motion for smooth UI animations
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: REST endpoints defined in shared/routes.ts with Zod schemas for input validation and response typing
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions

### Shared Code Structure
- **Schema Definition**: Drizzle schemas in shared/schema.ts define database tables and generate Zod validation schemas via drizzle-zod
- **API Contracts**: shared/routes.ts contains typed API route definitions with input/output schemas, enabling type-safe API calls from the frontend

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: Vite builds frontend to dist/public, esbuild bundles server to dist/index.cjs
- **Database Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Key Design Patterns
- **Type-Safe API Layer**: API routes defined with Zod schemas in shared/routes.ts, validated on both client and server
- **Storage Abstraction**: IStorage interface in server/storage.ts allows swapping database implementations
- **Component Composition**: UI components use Radix primitives with Tailwind styling via class-variance-authority

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connected via DATABASE_URL environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Third-Party Integrations
- **GitHub API**: Connected via Replit Connectors using @octokit/rest for repository operations
- **Polygon Blockchain**: Referenced for NFT minting of voice identity certificates (certTxHash, certTokenId fields in schema)
- **Spotify API**: Connected via Replit Connectors for importing followed podcasts
- **Meta API**: Instagram/Facebook monitoring for voice impersonation detection
- **Resend**: Email notification service for briefing alerts. Connected via Replit Connectors for sending transactional emails (new episode alerts, briefing ready notifications).

### Key NPM Packages
- **@tanstack/react-query**: Server state management and caching
- **framer-motion**: Animation library for UI transitions
- **lucide-react**: Icon library
- **zod**: Schema validation for API inputs/outputs
- **date-fns**: Date formatting utilities
- **wouter**: Lightweight client-side routing
- **rss-parser**: Parse RSS/Atom feeds for podcast subscriptions
- **@spotify/web-api-ts-sdk**: Spotify API SDK for podcast imports
- **openai**: OpenAI SDK for Whisper transcription and GPT-4o briefing generation

## Podcast Listener Features

The platform includes dual functionality for both podcasters (creators) and podcast listeners.

### Listener Dashboard (/listener)
- **Podcast Subscriptions**: Subscribe via RSS feed or import from Spotify
- **Episode Management**: View and manage episodes from subscribed podcasts
- **User Interests**: Define topics/keywords for AI to track across podcasts
- **AI Briefings**: Personalized summaries with quotes, takeaways, and insights (no timestamps)
- **Notifications**: Dashboard and email alerts for new episodes and briefings
- **Sync Episodes**: Manual button to fetch new episodes from all RSS feeds
- **Auto Briefings**: Automatically transcribe and generate briefings for new episodes (max 3 at a time)
- **Spotify Playlist**: Create "Podlogix Recommendations" playlist and add high-relevance episodes

### AI Processing Pipeline
1. **Transcription**: OpenAI Whisper converts audio to text
2. **Briefing Generation**: GPT-4o creates personalized summaries based on user interests
3. **Relevance Scoring**: 0-100 score indicating how relevant episode is to user's interests

### Automation Services
- **episodeSyncService**: Handles RSS polling and orchestrates auto-briefing generation
- **syncAllSubscriptionsForUser**: Fetches latest episodes from all user subscriptions
- **processAutoBriefingsForUser**: Transcribes and generates briefings for pending episodes

### Database Tables for Listener Features
- `podcast_subscriptions`: User's followed podcasts (RSS or Spotify)
- `subscription_episodes`: Episodes from subscribed podcasts
- `user_interests`: Topics and keywords user wants to track
- `episode_briefings`: AI-generated personalized briefings
- `notifications`: Dashboard and email notification queue

## Brand Dashboard Features

The platform includes a Brand Dashboard (/brand) for influencer discovery and hashtag monitoring.

### Brand Dashboard (/brand)
- **YouTube Discovery**: Search YouTube channels with real subscriber counts, views, and video stats using YouTube Data API v3 (free)
- **Instagram Lookup**: Look up Instagram business/creator accounts by username using Facebook Graph API Business Discovery (free)
- **Saved Influencers**: Manage a list of saved influencers with notes and status tracking
- **Hashtag Monitoring**: Track hashtags across Instagram, TikTok, and YouTube

### Instagram Lookup Integration
Uses Facebook Graph API Business Discovery to look up public Instagram business/creator accounts. Features:
- **Username Lookup**: Enter any Instagram username to fetch follower count, post count, and bio
- **Business Discovery**: Uses page access token to query public business account data
- **Free API**: No Modash or paid service required

Required environment variables:
- `META_APP_ID`: Your Facebook app ID
- `META_APP_SECRET`: Your Facebook app secret
- `META_ACCESS_TOKEN`: User access token with pages_show_list and instagram_basic permissions

Note: Only Instagram Business or Creator accounts linked to a Facebook Page can be looked up.

### Phyllo Integration (Social Monitoring)
Phyllo provides social media monitoring for voice identity protection. Key features:
- **Multi-Platform Support**: Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook
- **SDK Integration**: Phyllo Connect SDK for secure account connections
- **Impersonation Detection**: Monitor connected accounts for potential impersonation alerts
- **Brand Safety**: Real-time screening for content flags and mentions

Required environment variables:
- `PHYLLO_CLIENT_ID`: Your Phyllo client ID
- `PHYLLO_SECRET`: Your Phyllo API secret

### Database Tables for Social Monitoring
- `connected_social_accounts`: User's connected social accounts via Phyllo
- `social_monitoring_alerts`: Impersonation and brand safety alerts

### Modash Integration
Modash provides influencer discovery and analytics from public social media data. Key features:
- **Public Data**: No creator consent required - aggregates public profile data
- **Search API**: Find influencers by followers, engagement, location, keywords
- **Multi-Platform**: Instagram, TikTok, YouTube support
- **Demo Mode**: Shows sample influencer data when API key not configured

Required environment variables:
- `MODASH_API_KEY`: Your Modash API key from https://modash.io

### Database Tables for Brand Features
- `saved_influencers`: User's saved influencer profiles with notes and status
- `hashtag_monitors`: Tracked hashtags per platform
- `influencer_searches`: Saved search queries

## Creator Social Profiles

Creators can connect their social media profiles to showcase on their public profile pages. This uses free APIs (YouTube Data API v3, Facebook Graph API for Instagram) instead of paid services.

### Features
- **Multi-Platform Support**: YouTube, Instagram, TikTok, X, LinkedIn
- **YouTube Analytics**: Automatically fetches subscriber count, video count, and total views using YouTube Data API v3
- **Instagram OAuth**: Secure OAuth flow to connect Instagram Business/Creator accounts with follower and post counts
- **Flexible URL Resolution**: Accepts YouTube channel URLs, handles (@username), or full URLs
- **Public Display**: Connected profiles appear on creator's public profile page with analytics badges

### API Endpoints
- `GET /api/creator/social-profiles`: List current user's social profiles
- `POST /api/creator/social-profiles`: Add a new social profile (auto-fetches YouTube stats)
- `POST /api/creator/social-profiles/:id/sync`: Refresh YouTube/Instagram analytics
- `DELETE /api/creator/social-profiles/:id`: Remove a social profile
- `GET /api/creator/instagram/status`: Check if Instagram OAuth is configured
- `GET /api/creator/instagram/auth`: Get Instagram OAuth authorization URL (authenticated)
- `GET /api/creator/instagram/callback`: Handle OAuth callback from Facebook

### Database Table
- `creator_social_profiles`: Stores connected social profiles with analytics fields
  - YouTube: subscriberCount, videoCount, viewCount
  - Instagram: followersCount, followingCount, mediaCount, instagramAccountId, instagramAccessToken, instagramTokenExpiresAt

### YouTube API Integration
- Uses `YOUTUBE_API_KEY` environment variable
- Resolves channel handles (@username) and URLs to channel IDs
- Fetches channel statistics via YouTube Data API v3 (free tier: 10,000 units/day)

### Instagram OAuth Integration
- Uses Facebook Graph API with Instagram Business Account API
- Requires `META_APP_ID`, `META_APP_SECRET`, `META_ACCESS_TOKEN` environment variables
- OAuth flow with HMAC-signed state parameter for CSRF protection (10-minute expiry)
- Exchanges short-lived tokens for 60-day long-lived tokens
- Requires Instagram account to be Business or Creator account linked to a Facebook Page
- Fetches follower count, post count, and profile info
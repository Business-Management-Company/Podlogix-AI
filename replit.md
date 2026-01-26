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

### Key NPM Packages
- **@tanstack/react-query**: Server state management and caching
- **framer-motion**: Animation library for UI transitions
- **lucide-react**: Icon library
- **zod**: Schema validation for API inputs/outputs
- **date-fns**: Date formatting utilities
- **wouter**: Lightweight client-side routing
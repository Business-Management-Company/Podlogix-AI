import { Switch, Route, useLocation, useParams, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/kit";
import {
  Megaphone,
  Briefcase,
  Library,
  Users2,
  PlayCircle,
  Globe,
  DollarSign,
} from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AuthPage from "@/pages/AuthPage";
import Certificate from "@/pages/Certificate";
import VoiceCertification from "@/pages/VoiceCertification";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import PublicProfile from "@/pages/PublicProfile";
import StudioGuest from "@/pages/StudioGuest";
import Facet from "@/pages/Facet";

// ─── New architecture pages ───────────────────────────────────────────────────
import Activity from "@/pages/Activity";
import Shows from "@/pages/Shows";
import CreateShowChoice from "@/pages/CreateShowChoice";
import CreateShowScratch from "@/pages/CreateShowScratch";
import ShowSettings from "@/pages/ShowSettings";
import AccountSettings from "@/pages/AccountSettings";
import AdminDashboard from "@/pages/AdminDashboard";
import SaaSAdminPortal from "@/pages/SaaSAdminPortal";
import IntegrationStatus from "@/pages/IntegrationStatus";
import KnowledgeBase from "@/pages/KnowledgeBase";

// ─── Legacy pages (kept for backward compat during migration) ─────────────────
import ProfileEditor from "@/pages/ProfileEditor";
import RssManagement from "@/pages/RssManagement";
import Episodes from "@/pages/Episodes";
import EpisodeDetail from "@/pages/EpisodeDetail";
import Distribution from "@/pages/Distribution";
import EmailHub from "@/pages/EmailHub";
import AiAssistant from "@/pages/AiAssistant";
import VideoAnalysis from "@/pages/VideoAnalysis";
import SocialHub from "@/pages/SocialHub";
import ShowOverview from "@/pages/ShowOverview";
import ShowStudio from "@/pages/ShowStudio";
import ShowStats from "@/pages/ShowStats";
import ShowDirectories from "@/pages/ShowDirectories";
import ShowRssMigration from "@/pages/ShowRssMigration";
import SocialAnalytics from "@/pages/SocialAnalytics";
import SocialDiscover from "@/pages/SocialDiscover";
import SocialPosts from "@/pages/SocialPosts";
import Engagement from "@/pages/Engagement";
import LiveStudio from "@/pages/LiveStudio";
import MediaLibrary from "@/pages/MediaLibrary";
import MediaLab from "@/pages/MediaLab";
import Guests from "@/pages/Guests";
import MyGuestProfile from "@/pages/MyGuestProfile";
import DashboardCertify from "@/pages/DashboardCertify";
import DashboardCertifyLikeness from "@/pages/DashboardCertifyLikeness";
import ListenerDashboard from "@/pages/ListenerDashboard";
import ListenerAnalytics from "@/pages/ListenerAnalytics";
import BrandDashboard from "@/pages/BrandDashboard";
import Connectors from "@/pages/Connectors";
import IdentityHub from "@/pages/IdentityHub";
import ClientPortal from "@/pages/ClientPortal";
import YouTubeImport from "@/pages/YouTubeImport";

// ─── Placeholder pages ────────────────────────────────────────────────────────
// Real destinations in the information architecture that don't have a built
// experience yet. PlaceholderPage keeps them feeling intentional, not broken.

function ShowPlayersPage() {
  return (
    <PlaceholderPage
      icon={PlayCircle}
      title="Players"
      description="Embeddable audio players for this show — drop them into your website or blog posts."
    />
  );
}

function ShowWebsitePage() {
  return (
    <PlaceholderPage
      icon={Globe}
      title="Website"
      description="A hosted website for this show, built from your episodes and artwork automatically."
    />
  );
}

function ShowMonetizationPage() {
  return (
    <PlaceholderPage
      icon={DollarSign}
      title="Monetization"
      description="Sponsorships, dynamic ad insertion, and listener support for this show."
    />
  );
}

// Unlinked placeholders — kept routable for later phases, not in the nav.
function CampaignsPage() {
  return (
    <PlaceholderPage
      icon={Megaphone}
      title="Campaigns"
      description="Workspace-level campaigns spanning multiple shows — social content, email, clips, sponsorship activations, and launch campaigns."
    />
  );
}

function BusinessPage() {
  return (
    <PlaceholderPage
      icon={Briefcase}
      title="Business"
      description="Guests, sponsors, and revenue relationships across your entire podcast operation."
    />
  );
}

function LibraryPage() {
  return (
    <PlaceholderPage
      icon={Library}
      title="Library"
      description="Assets and documents — artwork, audio files, templates, SOPs, show notes, contracts, and briefs."
    />
  );
}

function TeamPage() {
  return (
    <PlaceholderPage
      icon={Users2}
      title="Team"
      description="Workspace members, roles, and permissions. Invite producers, editors, and collaborators."
    />
  );
}

function ContactsPage() {
  return <EmailHub mode="contacts" />;
}

function EmailPage() {
  return <EmailHub mode="email" />;
}

function LegacyEmailHubPage() {
  return <EmailHub mode="all" />;
}

// ─── Redirect helpers ─────────────────────────────────────────────────────────

/** Redirects an old /podcasts/:id[/subpath] URL to its /shows/:id equivalent. */
function PodcastRedirect({ suffix = "" }: { suffix?: string }) {
  const params = useParams<{ id: string }>();
  return <Redirect to={`/shows/${params.id}${suffix}`} replace />;
}

/** Redirects a removed show-scoped tab to another tab on the same show. */
function ShowTabRedirect({ to = "" }: { to?: string }) {
  const params = useParams<{ id: string }>();
  return <Redirect to={`/shows/${params.id}${to}`} replace />;
}

// ─── Authenticated routes ─────────────────────────────────────────────────────

function AuthenticatedRoutes() {
  return (
    <AppLayout>
      <Switch>
        {/* ── Workspace ── */}
        <Route path="/today" component={Activity} />
        <Route path="/shows" component={Shows} />
        {/* Must precede /shows/:id so "new" isn't captured as a show id */}
        <Route path="/shows/new" component={CreateShowChoice} />
        <Route path="/shows/new/create" component={CreateShowScratch} />
        <Route path="/contacts" component={ContactsPage} />
        <Route path="/email" component={EmailPage} />
        {/* TODO: filter Episodes by show — currently lists all native episodes */}
        <Route path="/episodes" component={Episodes} />
        <Route path="/episodes/:episodeId" component={EpisodeDetail} />
        {/* TODO Phase 9: split SocialAnalytics into a real Audience experience */}
        <Route path="/audience" component={SocialAnalytics} />
        <Route path="/guests" component={Guests} />
        <Route path="/guests/my-profile" component={MyGuestProfile} />

        {/* ── Show context ── */}
        <Route path="/shows/:id" component={ShowOverview} />
        {/* TODO: filter Episodes by show — currently lists all native episodes */}
        <Route path="/shows/:id/episodes" component={Episodes} />
        <Route path="/shows/:showId/episodes/:episodeId" component={EpisodeDetail} />
        <Route path="/shows/:id/studio" component={ShowStudio} />
        <Route path="/shows/:id/players" component={ShowPlayersPage} />
        <Route path="/shows/:id/website" component={ShowWebsitePage} />
        <Route path="/shows/:id/monetization" component={ShowMonetizationPage} />
        <Route path="/shows/:id/stats" component={ShowStats} />
        <Route path="/shows/:id/directories" component={ShowDirectories} />
        <Route path="/shows/:id/rss-migration" component={ShowRssMigration} />
        <Route path="/shows/:id/settings" component={ShowSettings} />

        {/* ── Redirects: removed show tabs → Overview or replacement ── */}
        <Route path="/shows/:id/promotion">
          <ShowTabRedirect />
        </Route>
        <Route path="/shows/:id/distribution">
          <ShowTabRedirect to="/directories" />
        </Route>
        <Route path="/shows/:id/hosting">
          <ShowTabRedirect />
        </Route>
        <Route path="/shows/:id/audience">
          <ShowTabRedirect />
        </Route>

        {/* ── Unlinked placeholders (later phases) ── */}
        <Route path="/campaigns" component={CampaignsPage} />
        <Route path="/business" component={BusinessPage} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/team" component={TeamPage} />

        {/* ── Settings cluster ── */}
        <Route path="/settings" component={AccountSettings} />
        <Route path="/connectors" component={Connectors} />
        <Route path="/youtube-import" component={YouTubeImport} />
        <Route path="/identity" component={IdentityHub} />
        <Route path="/help" component={KnowledgeBase} />

        {/* ── Admin ── */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/integrations" component={IntegrationStatus} />
        <Route path="/saas-admin" component={SaaSAdminPortal} />
        <Route path="/client" component={ClientPortal} />
        <Route path="/brand" component={BrandDashboard} />

        {/* ── Redirects: old URLs → new ── */}
        <Route path="/activity">
          <Redirect to="/today" replace />
        </Route>
        <Route path="/dashboard">
          <Redirect to="/today" replace />
        </Route>
        <Route path="/dashboard/episodes">
          <Redirect to="/episodes" replace />
        </Route>
        <Route path="/podcasts">
          <Redirect to="/shows" replace />
        </Route>
        {/* Starred is a filter on Contacts/Guest Pipeline now, not its own page. */}
        <Route path="/social/directory">
          <Redirect to="/social/discover" replace />
        </Route>
        <Route path="/podcasts/:id">
          <PodcastRedirect />
        </Route>
        {/* Refiner was renamed to Facet (trademark reasons) — same page. */}
        <Route path="/studio/refine">
          <Redirect to="/studio/facet" replace />
        </Route>
        <Route path="/podcasts/:id/episodes">
          <PodcastRedirect suffix="/episodes" />
        </Route>
        <Route path="/podcasts/:id/campaigns">
          <PodcastRedirect />
        </Route>
        <Route path="/podcasts/:id/audience">
          <PodcastRedirect />
        </Route>
        <Route path="/podcasts/:id/business">
          <PodcastRedirect />
        </Route>
        <Route path="/podcasts/:id/identity">
          <PodcastRedirect />
        </Route>
        <Route path="/podcasts/:id/settings">
          <PodcastRedirect suffix="/settings" />
        </Route>

        {/* ── Legacy routes (backward compat — reachable from show context and settings) ── */}
        <Route path="/dashboard/profile" component={ProfileEditor} />
        <Route path="/dashboard/podcast" component={ProfileEditor} />
        <Route path="/dashboard/rss" component={RssManagement} />
        <Route path="/dashboard/distribution" component={Distribution} />
        <Route path="/dashboard/email" component={LegacyEmailHubPage} />
        <Route path="/dashboard/ai" component={AiAssistant} />
        <Route path="/dashboard/video-analysis" component={VideoAnalysis} />
        <Route path="/dashboard/social-hub" component={SocialHub} />
        <Route path="/social/posts" component={SocialPosts} />
        <Route path="/social/engagement" component={Engagement} />
        <Route path="/studio/live" component={LiveStudio} />
        <Route path="/studio/guest" component={StudioGuest} />
        <Route path="/studio/facet" component={Facet} />
        <Route path="/media-library" component={MediaLibrary} />
        <Route path="/social/discover" component={SocialDiscover} />
        <Route path="/media-lab" component={MediaLab} />
        <Route path="/dashboard/social-analytics" component={SocialAnalytics} />
        <Route path="/dashboard/certify" component={DashboardCertify} />
        <Route path="/dashboard/certify-likeness" component={DashboardCertifyLikeness} />
        <Route path="/listener" component={ListenerDashboard} />
        <Route path="/listener/analytics" component={ListenerAnalytics} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

// ─── Public routes ────────────────────────────────────────────────────────────

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/login" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/p/:slug" component={PublicProfile} />
      <Route path="/studio/guest" component={StudioGuest} />
      <Route path="/voice-certification" component={VoiceCertification} />
      <Route path="/certificate/:id" component={Certificate} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  const publicPaths = [
    "/",
    "/features",
    "/pricing",
    "/about",
    "/login",
    "/signup",
    "/voice-certification",
    "/privacy",
    "/terms",
    "/studio/guest",
  ];

  const isPublicPath =
    publicPaths.includes(location) ||
    location.startsWith("/p/") ||
    location.startsWith("/certificate/");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (location === "/login" || location === "/signup") {
      return <Redirect to="/today" />;
    }
    if (isPublicPath) {
      return <PublicRoutes />;
    }
    return <AuthenticatedRoutes />;
  }

  if (isPublicPath) {
    return <PublicRoutes />;
  }

  return <Redirect to="/login" />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

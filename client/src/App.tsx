import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/AppLayout";
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
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// ─── New architecture pages ───────────────────────────────────────────────────
import Activity from "@/pages/Activity";
import AccountSettings from "@/pages/AccountSettings";
import AdminDashboard from "@/pages/AdminDashboard";
import SaaSAdminPortal from "@/pages/SaaSAdminPortal";
import KnowledgeBase from "@/pages/KnowledgeBase";

// ─── Legacy pages (kept for backward compat during migration) ─────────────────
import Dashboard from "@/pages/Dashboard";
import ProfileEditor from "@/pages/ProfileEditor";
import RssManagement from "@/pages/RssManagement";
import Episodes from "@/pages/Episodes";
import Distribution from "@/pages/Distribution";
import EmailHub from "@/pages/EmailHub";
import AiAssistant from "@/pages/AiAssistant";
import VideoAnalysis from "@/pages/VideoAnalysis";
import SocialHub from "@/pages/SocialHub";
import SocialAnalytics from "@/pages/SocialAnalytics";
import DashboardCertify from "@/pages/DashboardCertify";
import DashboardCertifyLikeness from "@/pages/DashboardCertifyLikeness";
import ListenerDashboard from "@/pages/ListenerDashboard";
import ListenerAnalytics from "@/pages/ListenerAnalytics";
import BrandDashboard from "@/pages/BrandDashboard";
import Connectors from "@/pages/Connectors";
import IdentityHub from "@/pages/IdentityHub";
import ClientPortal from "@/pages/ClientPortal";

// ─── Stub pages for new nav sections ─────────────────────────────────────────

function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        maxWidth: 520,
        margin: "80px auto",
        padding: "0 32px",
        textAlign: "center",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <span style={{ fontSize: 22 }}>🚧</span>
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#09090b",
          letterSpacing: "-0.03em",
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 14, color: "#71717a", lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function PodcastsPage() {
  return (
    <StubPage
      title="Podcasts"
      description="Your shows will live here. Each podcast is a first-class object with its own episodes, audience, and business relationships."
    />
  );
}

function ShowOverviewPage() {
  return (
    <StubPage
      title="Show Overview"
      description="Performance at a glance — recent episode metrics, distribution status, audience growth, and active campaigns for this show."
    />
  );
}

function ShowEpisodesPage() {
  return (
    <StubPage
      title="Episodes"
      description="All episodes for this show in list, pipeline, and calendar views. Full lifecycle management from idea to published."
    />
  );
}

function ShowCampaignsPage() {
  return (
    <StubPage
      title="Campaigns"
      description="Promotional campaigns scoped to this show — social posts, newsletters, clips, and cross-promotions."
    />
  );
}

function ShowAudiencePage() {
  return (
    <StubPage
      title="Audience"
      description="This show's listeners, download trends, subscriber growth, and audience segments."
    />
  );
}

function ShowBusinessPage() {
  return (
    <StubPage
      title="Business"
      description="Guests booked and appeared on this show, sponsors running on this show, and revenue attributed to it."
    />
  );
}

function ShowIdentityPage() {
  return (
    <StubPage
      title="Identity"
      description="Voice certification and likeness protection for this show's hosts."
    />
  );
}

function ShowSettingsPage() {
  return (
    <StubPage
      title="Show Settings"
      description="Show name, description, categories, artwork, and your podcast host connection."
    />
  );
}

function CampaignsPage() {
  return (
    <StubPage
      title="Campaigns"
      description="Workspace-level campaigns spanning multiple shows — social content, email, clips, sponsorship activations, and launch campaigns."
    />
  );
}

function AudiencePage() {
  return (
    <StubPage
      title="Audience"
      description="Your total audience across all shows. Downloads, platform breakdown, subscriber data, segments, and engagement analytics."
    />
  );
}

function BusinessPage() {
  return (
    <StubPage
      title="Business"
      description="Guests, sponsors, and revenue relationships across your entire podcast operation."
    />
  );
}

function LibraryPage() {
  return (
    <StubPage
      title="Library"
      description="Assets and documents — artwork, audio files, templates, SOPs, show notes, contracts, and briefs."
    />
  );
}

function TeamPage() {
  return (
    <StubPage
      title="Team"
      description="Workspace members, roles, and permissions. Invite producers, editors, and collaborators."
    />
  );
}

// ─── Authenticated routes ─────────────────────────────────────────────────────

function AuthenticatedRoutes() {
  return (
    <AppLayout>
      <Switch>
        {/* ── New architecture routes ── */}
        <Route path="/activity" component={Activity} />

        {/* Podcasts + show context */}
        <Route path="/podcasts" component={PodcastsPage} />
        <Route path="/podcasts/:id" component={ShowOverviewPage} />
        <Route path="/podcasts/:id/episodes" component={ShowEpisodesPage} />
        <Route path="/podcasts/:id/campaigns" component={ShowCampaignsPage} />
        <Route path="/podcasts/:id/audience" component={ShowAudiencePage} />
        <Route path="/podcasts/:id/business" component={ShowBusinessPage} />
        <Route path="/podcasts/:id/identity" component={ShowIdentityPage} />
        <Route path="/podcasts/:id/settings" component={ShowSettingsPage} />

        {/* Workspace sections */}
        <Route path="/campaigns" component={CampaignsPage} />
        <Route path="/audience" component={AudiencePage} />
        <Route path="/business" component={BusinessPage} />
        <Route path="/library" component={LibraryPage} />
        <Route path="/team" component={TeamPage} />
        <Route path="/settings" component={AccountSettings} />
        <Route path="/help" component={KnowledgeBase} />

        {/* Admin */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/saas-admin" component={SaaSAdminPortal} />
        <Route path="/client" component={ClientPortal} />
        <Route path="/brand" component={BrandDashboard} />

        {/* ── Legacy routes (backward compat) ── */}
        <Route path="/dashboard">
          <Redirect to="/activity" />
        </Route>
        <Route path="/dashboard/profile" component={ProfileEditor} />
        <Route path="/dashboard/podcast" component={ProfileEditor} />
        <Route path="/dashboard/rss" component={RssManagement} />
        <Route path="/dashboard/episodes" component={Episodes} />
        <Route path="/dashboard/distribution" component={Distribution} />
        <Route path="/dashboard/email" component={EmailHub} />
        <Route path="/dashboard/ai" component={AiAssistant} />
        <Route path="/dashboard/video-analysis" component={VideoAnalysis} />
        <Route path="/dashboard/social-hub" component={SocialHub} />
        <Route path="/dashboard/social-analytics" component={SocialAnalytics} />
        <Route path="/dashboard/certify" component={DashboardCertify} />
        <Route path="/dashboard/certify-likeness" component={DashboardCertifyLikeness} />
        <Route path="/listener" component={ListenerDashboard} />
        <Route path="/listener/analytics" component={ListenerAnalytics} />
        <Route path="/connectors" component={Connectors} />
        <Route path="/identity" component={IdentityHub} />

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
      <Route path="/voice-certification" component={VoiceCertification} />
      <Route path="/certificate/:id" component={Certificate} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
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
    "/forgot-password",
    "/reset-password",
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
      return <Redirect to="/activity" />;
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

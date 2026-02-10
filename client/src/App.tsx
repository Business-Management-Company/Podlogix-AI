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
import IdentityHub from "@/pages/IdentityHub";
import VoiceCertification from "@/pages/VoiceCertification";
import Certificate from "@/pages/Certificate";
import Dashboard from "@/pages/Dashboard";
import ProfileEditor from "@/pages/ProfileEditor";
import PublicProfile from "@/pages/PublicProfile";
import RssManagement from "@/pages/RssManagement";
import Distribution from "@/pages/Distribution";
import AiAssistant from "@/pages/AiAssistant";
import DashboardCertify from "@/pages/DashboardCertify";
import DashboardCertifyLikeness from "@/pages/DashboardCertifyLikeness";
import ListenerDashboard from "@/pages/ListenerDashboard";
import ListenerAnalytics from "@/pages/ListenerAnalytics";
import KnowledgeBase from "@/pages/KnowledgeBase";
import BrandDashboard from "@/pages/BrandDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import SaaSAdminPortal from "@/pages/SaaSAdminPortal";
import Connectors from "@/pages/Connectors";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import EmailHub from "@/pages/EmailHub";
import VideoAnalysis from "@/pages/VideoAnalysis";
import SocialHub from "@/pages/SocialHub";
import SocialAnalytics from "@/pages/SocialAnalytics";
import ClientPortal from "@/pages/ClientPortal";

function AuthenticatedRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/profile" component={ProfileEditor} />
        <Route path="/dashboard/podcast" component={ProfileEditor} />
        <Route path="/dashboard/rss" component={RssManagement} />
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
        <Route path="/brand" component={BrandDashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/saas-admin" component={SaaSAdminPortal} />
        <Route path="/client" component={ClientPortal} />
        <Route path="/connectors" component={Connectors} />
        <Route path="/identity" component={IdentityHub} />
        <Route path="/help" component={KnowledgeBase} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/p/:slug" component={PublicProfile} />
      <Route path="/voice-certification" component={VoiceCertification} />
      <Route path="/certificate/:id" component={Certificate} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  const publicPaths = ["/", "/login", "/signup", "/p/", "/voice-certification", "/certificate/", "/privacy", "/terms"];
  const isPublicPath = publicPaths.some(path =>
    location === path || location.startsWith("/p/") || location.startsWith("/certificate/")
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (location === "/login" || location === "/signup") {
      return <Redirect to="/dashboard" />;
    }
    if (location === "/" || isPublicPath) {
      return <PublicRoutes />;
    }
    return <AuthenticatedRoutes />;
  }

  if (isPublicPath) {
    return <PublicRoutes />;
  }

  return <Redirect to="/login" />;
}

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

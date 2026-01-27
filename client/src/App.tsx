import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/profile" component={ProfileEditor} />
      <Route path="/dashboard/podcast" component={ProfileEditor} />
      <Route path="/dashboard/rss" component={RssManagement} />
      <Route path="/dashboard/distribution" component={Distribution} />
      <Route path="/dashboard/ai" component={AiAssistant} />
      <Route path="/dashboard/certify" component={DashboardCertify} />
      <Route path="/dashboard/certify-likeness" component={DashboardCertifyLikeness} />
      <Route path="/listener" component={ListenerDashboard} />
      <Route path="/p/:slug" component={PublicProfile} />
      <Route path="/identity" component={IdentityHub} />
      <Route path="/voice-certification" component={VoiceCertification} />
      <Route path="/certificate/:id" component={Certificate} />
      <Route component={NotFound} />
    </Switch>
  );
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

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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

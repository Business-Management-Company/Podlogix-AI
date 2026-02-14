import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoImg from "@assets/Seeksy_logo_1771103113779.png";
import {
  Mic,
  LayoutDashboard,
  Headphones,
  Shield,
  ShieldCheck,
  Link2,
  Rss,
  Share2,
  Sparkles,
  User,
  HelpCircle,
  LogOut,
  Radio,
  Users,
  Mail,
  Plug,
  Youtube,
  Building2,
  BarChart3,
  Briefcase,
  ChevronRight,
  UserPlus,
} from "lucide-react";

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

const creatorMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Link Page", url: "/dashboard/profile", icon: Link2 },
  { title: "Social Hub", url: "/dashboard/social-hub", icon: Share2 },
  { title: "Social Analytics", url: "/dashboard/social-analytics", icon: BarChart3 },
  { title: "Email Hub", url: "/dashboard/email", icon: Mail },
  { title: "AI Assistant", url: "/dashboard/ai", icon: Sparkles },
  { title: "Video Analysis", url: "/dashboard/video-analysis", icon: Youtube },
];

const podcastMenuItems = [
  { title: "RSS Feeds", url: "/dashboard/rss", icon: Rss },
  { title: "Distribution", url: "/dashboard/distribution", icon: Share2 },
];

const voiceProtectionItems = [
  { title: "My Certificates", url: "/identity", icon: Shield },
  { title: "Certify Voice", url: "/dashboard/certify", icon: Mic },
  { title: "Certify Likeness", url: "/dashboard/certify-likeness", icon: User },
];

const listenerMenuItems = [
  { title: "My Podcasts", url: "/listener", icon: Headphones },
  { title: "Analytics", url: "/listener/analytics", icon: Radio },
];

const brandMenuItems = [
  { title: "Influencer Discovery", url: "/brand", icon: Users },
  { title: "Client Portal", url: "/client", icon: Briefcase },
];

const adminMenuItems = [
  { title: "Admin Panel", url: "/admin", icon: ShieldCheck },
];

const saasAdminMenuItems = [
  { title: "SaaS Owner Portal", url: "/saas-admin", icon: Building2 },
];

const settingsMenuItems = [
  { title: "Connectors", url: "/connectors", icon: Plug },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testId?: string;
}

function CollapsibleSection({ label, defaultOpen = true, children, testId }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer select-none" data-testid={testId}>
            <span>{label}</span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            {children}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const { data: adminCheck } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/admin/check", { credentials: "include" });
      if (!res.ok) return { isAdmin: false, isSuperAdmin: false, role: "user" };
      return res.json();
    },
    retry: 1,
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isActive = (url: string) => {
    if (url === "/dashboard" && location === "/dashboard") return true;
    if (url !== "/dashboard" && location.startsWith(url)) return true;
    return false;
  };

  const renderMenuItems = (items: { title: string; url: string; icon: any }[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer">
              <img src={logoImg} alt="Podlogix" className="w-8 h-8 rounded-lg shadow-lg" />
              <span className="font-bold text-lg">Podlogix</span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="overflow-y-auto">
            <CollapsibleSection label="Creator" testId="section-creator">
              {renderMenuItems(creatorMenuItems)}
            </CollapsibleSection>

            <CollapsibleSection label="Podcast" testId="section-podcast">
              {renderMenuItems(podcastMenuItems)}
            </CollapsibleSection>

            <CollapsibleSection label="Voice Protection" testId="section-voice-protection">
              {renderMenuItems(voiceProtectionItems)}
            </CollapsibleSection>

            <CollapsibleSection label="Listener" testId="section-listener">
              {renderMenuItems(listenerMenuItems)}
            </CollapsibleSection>

            <CollapsibleSection label="Brand" testId="section-brand">
              {renderMenuItems(brandMenuItems)}
            </CollapsibleSection>

            <CollapsibleSection label="Settings" testId="section-settings">
              {renderMenuItems(settingsMenuItems)}
            </CollapsibleSection>

            {adminCheck?.isAdmin && (
              <CollapsibleSection label="Administration" testId="section-administration">
                <SidebarMenu>
                  {adminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {adminCheck.isSuperAdmin && saasAdminMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">Owner</Badge>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleSection>
            )}

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/help")}>
                      <Link href="/help" data-testid="nav-help">
                        <HelpCircle className="h-4 w-4" />
                        <span>Help Center</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center h-14 px-4 border-b bg-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

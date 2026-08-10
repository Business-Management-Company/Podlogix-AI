import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoImg from "@assets/Seeksy_logo_1771103113779.png";
import {
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
  Search,
  Bell,
  Mic,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  X,
} from "lucide-react";

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

// ─── Mode definitions ────────────────────────────────────────────────────────

const MODES = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    color: "text-slate-400",
    activeColor: "text-white",
    urlPrefixes: ["/dashboard", "/activity"],
    items: [
      { title: "Dashboard", url: "/activity", icon: LayoutDashboard },
      { title: "Link Page", url: "/dashboard/profile", icon: Link2 },
      { title: "My Shows", url: "/podcasts", icon: Mic },
      { title: "AI Studio", url: "/dashboard/ai", icon: Sparkles },
      { title: "RSS Feeds", url: "/dashboard/rss", icon: Rss },
      { title: "Distribution", url: "/dashboard/distribution", icon: Share2 },
    ],
  },
  {
    id: "studio",
    label: "Studio",
    icon: Mic,
    color: "text-slate-400",
    activeColor: "text-orange-400",
    urlPrefixes: ["/dashboard/rss", "/dashboard/distribution", "/dashboard/episodes", "/dashboard/podcast"],
    items: [
      { title: "RSS Feeds", url: "/dashboard/rss", icon: Rss },
      { title: "Distribution", url: "/dashboard/distribution", icon: Share2 },
    ],
  },
  {
    id: "listen",
    label: "Listen",
    icon: Headphones,
    color: "text-slate-400",
    activeColor: "text-sky-400",
    urlPrefixes: ["/listener"],
    items: [
      { title: "My Podcasts", url: "/listener", icon: Headphones },
      { title: "Analytics", url: "/listener/analytics", icon: Radio },
    ],
  },
  {
    id: "audience",
    label: "Audience",
    icon: Users,
    color: "text-slate-400",
    activeColor: "text-violet-400",
    urlPrefixes: ["/dashboard/social-hub", "/dashboard/social-analytics", "/dashboard/email", "/dashboard/video-analysis"],
    items: [
      { title: "Social Hub", url: "/dashboard/social-hub", icon: Share2 },
      { title: "Social Analytics", url: "/dashboard/social-analytics", icon: BarChart3 },
      { title: "Email Hub", url: "/dashboard/email", icon: Mail },
      { title: "Video Analysis", url: "/dashboard/video-analysis", icon: Youtube },
    ],
  },
  {
    id: "identity",
    label: "Identity",
    icon: Shield,
    color: "text-slate-400",
    activeColor: "text-emerald-400",
    urlPrefixes: ["/identity", "/dashboard/certify"],
    items: [
      { title: "My Certificates", url: "/identity", icon: Shield },
      { title: "Certify Voice", url: "/dashboard/certify", icon: Mic },
      { title: "Certify Likeness", url: "/dashboard/certify-likeness", icon: User },
    ],
  },
] as const;

const BOTTOM_MODES = [
  {
    id: "connectors",
    label: "Connectors",
    icon: Plug,
    url: "/connectors",
    urlPrefixes: ["/connectors"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    url: "/settings",
    urlPrefixes: ["/settings"],
  },
] as const;

interface AppLayoutProps {
  children: React.ReactNode;
}

function getModeFromPath(path: string): string {
  let bestId = "home";
  let bestLen = -1;
  for (const mode of MODES) {
    for (const prefix of mode.urlPrefixes) {
      if (path.startsWith(prefix) && prefix.length > bestLen) {
        bestId = mode.id;
        bestLen = prefix.length;
      }
    }
  }
  return bestId;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [panelOpen, setPanelOpen] = useState(true);
  const [railExpanded, setRailExpanded] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(() => getModeFromPath(location));

  // Auto-switch mode when URL changes — but preserve mode when viewing Help
  useEffect(() => {
    if (location === "/help") return;
    const detected = getModeFromPath(location);
    setActiveMode(detected);
  }, [location]);

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

  const currentMode = MODES.find((m) => m.id === activeMode) ?? MODES[0];

  const isItemActive = (url: string) => {
    if (url === "/activity" && (location === "/activity" || location === "/dashboard")) return true;
    if (url !== "/dashboard" && url !== "/activity" && location.startsWith(url)) return true;
    return false;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">

      {/* ── Mode Rail ─────────────────────────────────────────────────────── */}
      <nav className={`flex flex-col shrink-0 bg-[#0D1B2A] border-r border-white/[0.06] z-20 transition-all duration-200 overflow-hidden ${railExpanded ? "w-44" : "w-14"}`}>

        {/* Logo row — collapse button appears here when expanded */}
        <div className={`flex items-center h-14 border-b border-white/[0.06] shrink-0 ${railExpanded ? "px-3 justify-between" : "justify-center"}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img src={logoImg} alt="Podlogix" className="w-7 h-7 rounded-lg shrink-0" />
            {railExpanded && (
              <span className="text-white text-sm font-semibold truncate">Podlogix</span>
            )}
          </Link>
          {railExpanded && (
            <button
              onClick={() => setRailExpanded(false)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors shrink-0 ml-1"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mode icons */}
        <div className={`flex flex-col gap-1 py-3 flex-1 ${railExpanded ? "px-2" : "items-center"}`}>

          {/* Expand button — only shown when collapsed */}
          {!railExpanded && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setRailExpanded(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150 mb-1"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-[18px] w-[18px] text-slate-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Expand</TooltipContent>
            </Tooltip>
          )}

          {MODES.map((mode) => {
            const isActive = activeMode === mode.id;
            const Icon = mode.icon;
            const btn = (
              <button
                onClick={() => {
                  navigate(mode.items[0].url);
                  if (!panelOpen) setPanelOpen(true);
                }}
                className={`
                  relative flex items-center h-10 rounded-xl transition-all duration-150
                  ${railExpanded ? "gap-2.5 px-3 w-full" : "justify-center w-10"}
                  ${isActive ? "bg-white/10 shadow-sm" : "hover:bg-white/[0.06]"}
                `}
                aria-label={mode.label}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                )}
                <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? mode.activeColor : "text-slate-500"}`} />
                {railExpanded && (
                  <span className={`text-sm truncate ${isActive ? "text-white font-medium" : "text-slate-400"}`}>
                    {mode.label}
                  </span>
                )}
              </button>
            );
            return railExpanded ? (
              <div key={mode.id}>{btn}</div>
            ) : (
              <Tooltip key={mode.id} delayDuration={300}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">{mode.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Bottom icons */}
        <div className={`flex flex-col gap-1 py-3 border-t border-white/[0.06] ${railExpanded ? "px-2" : "items-center"}`}>

          {BOTTOM_MODES.map((item) => {
            const isActive = location.startsWith(item.urlPrefixes[0]);
            const Icon = item.icon;
            const btn = (
              <Link href={item.url}>
                <button
                  className={`
                    flex items-center h-10 rounded-xl transition-all duration-150
                    ${railExpanded ? "gap-2.5 px-3 w-full" : "justify-center w-10"}
                    ${isActive ? "bg-white/10" : "hover:bg-white/[0.06]"}
                  `}
                  aria-label={item.label}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-slate-200" : "text-slate-500"}`} />
                  {railExpanded && (
                    <span className={`text-sm truncate ${isActive ? "text-slate-200" : "text-slate-400"}`}>{item.label}</span>
                  )}
                </button>
              </Link>
            );
            return railExpanded ? (
              <div key={item.id}>{btn}</div>
            ) : (
              <Tooltip key={item.id} delayDuration={300}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}

          {/* Admin — only visible to admins */}
          {adminCheck?.isAdmin && (
            railExpanded ? (
              <Link href="/admin">
                <button className="flex items-center gap-2.5 px-3 w-full h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150" aria-label="Admin">
                  <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-slate-500" />
                  <span className="text-sm text-slate-400">Admin</span>
                </button>
              </Link>
            ) : (
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Link href="/admin">
                    <button className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150" aria-label="Admin">
                      <ShieldCheck className="h-[18px] w-[18px] text-slate-500" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">Admin</TooltipContent>
              </Tooltip>
            )
          )}

          {/* User avatar */}
          <div className="mt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center h-10 rounded-xl hover:bg-white/[0.06] transition-all duration-150 ${railExpanded ? "gap-2.5 px-2 w-full" : "justify-center w-10"}`}>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary text-white font-semibold">
                      {user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {railExpanded && (
                    <span className="text-sm text-slate-300 truncate">{user?.firstName || "Account"}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <Link2 className="h-4 w-4 mr-2" />
                    Edit Link Page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* ── Mode Panel ────────────────────────────────────────────────────── */}
      {panelOpen && (
        <aside className="w-52 shrink-0 bg-background border-r flex flex-col z-10">
          {/* Mode header */}
          <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
            <div className="flex items-center gap-2">
              <currentMode.icon className={`h-4 w-4 ${currentMode.activeColor}`} />
              <span className="text-sm font-semibold tracking-tight">{currentMode.label}</span>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Collapse panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col">
            <div className="flex-1">
              {currentMode.items.map((item) => {
                const isActive = isItemActive(item.url);
                const Icon = item.icon;
                return (
                  <Link key={item.url} href={item.url}>
                    <div
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors cursor-pointer
                        ${isActive
                          ? "bg-[#ff6031]/[0.12] text-[#ff8056] font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Help — always at bottom, always shown */}
            <div className="pt-4 pb-1">
              <Link href="/help">
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors cursor-pointer ${location.startsWith("/help") ? "bg-[#ff6031]/[0.12] text-[#ff8056] font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>Help Center</span>
                </div>
              </Link>

              {/* Admin-only items — below Help */}
              {adminCheck?.isSuperAdmin && activeMode === "home" && (
                <>
                  <div className="px-3 pt-4 pb-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Admin</p>
                  </div>
                  <Link href="/admin">
                    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors cursor-pointer ${location.startsWith("/admin") ? "bg-[#ff6031]/[0.12] text-[#ff8056] font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Admin Panel</span>
                    </div>
                  </Link>
                  <Link href="/saas-admin">
                    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors cursor-pointer ${location.startsWith("/saas-admin") ? "bg-[#ff6031]/[0.12] text-[#ff8056] font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>SaaS Portal</span>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </aside>
      )}

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Global top bar */}
        <header className="flex items-center h-14 px-4 border-b bg-background shrink-0 gap-3">
          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Open panel"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search anything..."
                className="pl-8 h-8 text-sm bg-muted/40 border-0 focus-visible:ring-1 focus-visible:bg-background rounded-lg"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* AI Assistant */}
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAiOpen(!aiOpen)}
                  className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${aiOpen ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>AI Assistant</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/help">
                  <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Help Center</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Bell className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center rounded-full ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7 cursor-pointer">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary text-white font-semibold">
                      {user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <Link2 className="h-4 w-4 mr-2" />
                    Edit Link Page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* ── AI Assistant Slide-out Panel ──────────────────────────────────── */}

      {/* Backdrop — click to close */}
      {aiOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={() => setAiOpen(false)}
        />
      )}

      {/* Full-height right slide-out */}
      <div
        className={`fixed inset-y-0 right-0 w-[380px] bg-background border-l shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${aiOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">AI Assistant</span>
          </div>
          <button
            onClick={() => setAiOpen(false)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close AI Assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {/* Welcome / empty state */}
          <div className="flex flex-col items-center justify-center flex-1 text-center py-12 gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Assistant</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
                Ask me anything about your podcast — analytics, content ideas, distribution tips, and more.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[260px] mt-2">
              {["Summarize my top episodes", "Write show notes for my last recording", "How do I grow my audience?"].map((suggestion) => (
                <button
                  key={suggestion}
                  className="text-xs text-left px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t shrink-0">
          <div className="relative">
            <Input
              placeholder="Ask AI anything..."
              className="pr-10 h-10 text-sm bg-muted/40 border-0 focus-visible:ring-1 rounded-xl"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2">AI may make mistakes — verify important information.</p>
        </div>
      </div>

    </div>
  );
}

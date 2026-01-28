import { Link } from "wouter";
import { Mic, LogIn, User, Headphones, Shield, Fingerprint, ShieldCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  
  const { data: adminCheck } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
      scrolled ? "bg-background/80 backdrop-blur-md border-white/5 py-3" : "bg-transparent py-5"
    )}>
      <div className="container mx-auto px-4 md:px-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
            <Mic className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Podlogix</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</button>
          <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it Works</button>
          <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
          ) : isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild data-testid="nav-listener">
                  <Link href="/listener">
                    <Headphones className="h-4 w-4 mr-1" />
                    Listener
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild data-testid="nav-identity">
                  <Link href="/identity">
                    <Fingerprint className="h-4 w-4 mr-1" />
                    Identity
                  </Link>
                </Button>
                {adminCheck?.isAdmin && (
                  <Button variant="ghost" size="sm" asChild data-testid="nav-admin">
                    <Link href="/admin">
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Admin
                    </Link>
                  </Button>
                )}
              </div>
              <Button variant="outline" size="sm" asChild data-testid="button-dashboard">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user?.profileImageUrl || undefined} />
                      <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/listener" className="flex items-center gap-2 cursor-pointer">
                      <Headphones className="h-4 w-4" />
                      Listener Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/identity" className="flex items-center gap-2 cursor-pointer">
                      <Fingerprint className="h-4 w-4" />
                      Identity Hub
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/brand" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4" />
                      Brand Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {adminCheck?.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                          <ShieldCheck className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={login}
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={login}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import logoImg from "@assets/Seeksy_logo_1771103113779.png";


/** Rotating auth backdrops — one world per visit, one voice per world. */
const AUTH_SCENES = [
  {
    img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1600&q=70",
    alt: "On-air microphone in a broadcast studio",
    quote: "Do what you can't.",
    who: "Casey Neistat",
    role: "Filmmaker & YouTuber",
    fallback: "linear-gradient(160deg,#3e1a1a,#0b0b0d)",
  },
  {
    img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=70",
    alt: "Live event stage under concert lighting",
    quote: "People do not buy goods and services. They buy relations, stories and magic.",
    who: "Seth Godin",
    role: "Author & marketer",
    fallback: "linear-gradient(160deg,#2a1a3e,#0b0b0d)",
  },
  {
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=70",
    alt: "Conference audience facing the main stage",
    quote: "Nobody counts the number of ads you run; they just remember the impression you make.",
    who: "Bill Bernbach",
    role: "Advertising pioneer",
    fallback: "linear-gradient(160deg,#0f2740,#0b0b0d)",
  },
  {
    img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=70",
    alt: "Crowd celebrating at a live event",
    quote: "Content is fire; social media is gasoline.",
    who: "Jay Baer",
    role: "Marketing author",
    fallback: "linear-gradient(160deg,#1a3e2e,#0b0b0d)",
  },
  {
    img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1600&q=70",
    alt: "Podcast microphone ready to record",
    quote: "Do what you do so well that they will want to see it again.",
    who: "Walt Disney",
    role: "Storyteller",
    fallback: "linear-gradient(160deg,#402a0f,#0b0b0d)",
  },
];

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", firstName: "", lastName: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (values: SignupValues) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Signup failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    },
  });

  const isLoading = loginMutation.isPending || signupMutation.isPending;

  // Show toast for Google OAuth errors from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "google_denied") {
      toast({ title: "Sign-in cancelled", description: "Google sign-in was cancelled.", variant: "destructive" });
    } else if (err === "google_failed") {
      toast({ title: "Sign-in failed", description: "Something went wrong with Google. Please try again.", variant: "destructive" });
    }
    if (err) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // A different scene every visit: livestreams, conferences, events, podcasts —
  // each with a voice from the media and creator world. Images are Unsplash
  // (free license); if one fails to load, the gradient beneath carries the panel.
  const [scene] = useState(() => AUTH_SCENES[Math.floor(Math.random() * AUTH_SCENES.length)]);

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="Podlogix" className="w-10 h-10 rounded-lg shadow-lg" />
            <span className="font-bold text-2xl">Podlogix</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle data-testid="text-auth-title">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Sign in to your Podlogix account"
                  : "Get started with Podlogix today"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Google Sign-In */}
              <a
                href="/auth/google"
                className="flex items-center justify-center gap-3 w-full border border-border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors mb-4"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </a>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {mode === "login" ? (
                <Form {...loginForm} key="login">
                  <form onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showLoginPw ? "text" : "password"}
                                placeholder="Your password"
                                data-testid="input-password"
                                className="pr-10"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowLoginPw((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                                aria-label={showLoginPw ? "Hide password" : "Show password"}
                              >
                                {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end -mt-1">
                      <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-auth-submit"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...signupForm} key="signup">
                  <form onSubmit={signupForm.handleSubmit((values) => signupMutation.mutate(values))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Andrew"
                                data-testid="input-first-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Appleton"
                                data-testid="input-last-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showSignupPw ? "text" : "password"}
                                placeholder="At least 6 characters"
                                data-testid="input-password"
                                className="pr-10"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowSignupPw((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                                aria-label={showSignupPw ? "Hide password" : "Show password"}
                              >
                                {showSignupPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-auth-submit"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("signup"); loginForm.reset(); }}
                      className="text-primary underline-offset-4 hover:underline font-medium"
                      data-testid="button-switch-signup"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("login"); signupForm.reset(); }}
                      className="text-primary underline-offset-4 hover:underline font-medium"
                      data-testid="button-switch-login"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Scene panel — a different world every visit */}
      <div className="relative hidden flex-1 overflow-hidden lg:block" style={{ background: scene.fallback }}>
        <img
          src={scene.img}
          alt={scene.alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
        <motion.figure
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="absolute inset-x-0 bottom-0 p-12"
        >
          <span className="font-display text-5xl leading-none text-primary">“</span>
          <blockquote className="mt-1 max-w-md font-display text-2xl font-semibold italic leading-snug text-white xl:text-3xl">
            {scene.quote}
          </blockquote>
          <figcaption className="mt-4">
            <p className="text-sm font-bold text-primary">{scene.who}</p>
            <p className="text-xs text-white/60">{scene.role}</p>
          </figcaption>
        </motion.figure>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, ArrowLeft, MailCheck } from "lucide-react";
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

const RESEND_COOLDOWN_S = 30;

export default function AuthPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Countdown for the resend link
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn > 0]);

  const requestCodeMutation = useMutation({
    mutationFn: async (emailValue: string) => {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Couldn't send the code");
      }
      return res.json() as Promise<{ isNewUser: boolean }>;
    },
    onSuccess: (data) => {
      setIsNewUser(data.isNewUser);
      setStep("code");
      setCode("");
      setResendIn(RESEND_COOLDOWN_S);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't send code", description: error.message, variant: "destructive" });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          code,
          ...(isNewUser && firstName.trim() ? { firstName: firstName.trim() } : {}),
          ...(isNewUser && lastName.trim() ? { lastName: lastName.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Verification failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      navigate("/today");
    },
    onError: (error: Error) => {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
    },
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const namesOk = !isNewUser || (firstName.trim().length > 0 && lastName.trim().length > 0);
  const canVerify = /^\d{6}$/.test(code) && namesOk && !verifyCodeMutation.isPending;

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
            {step === "email" ? (
              <>
                <CardHeader>
                  <CardTitle data-testid="text-auth-title">Sign in or create your account</CardTitle>
                  <CardDescription>
                    No password needed — we'll email you a one-time code.
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

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (emailValid) requestCodeMutation.mutate(email.trim());
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="input-email"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!emailValid || requestCodeMutation.isPending}
                      data-testid="button-auth-submit"
                    >
                      {requestCodeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Email me a code
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MailCheck className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle data-testid="text-auth-title">
                    {isNewUser ? "Create your account" : "Check your email"}
                  </CardTitle>
                  <CardDescription>
                    We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (canVerify) verifyCodeMutation.mutate();
                    }}
                    className="space-y-4"
                  >
                    {isNewUser && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium">First Name</label>
                          <Input
                            placeholder="Andrew"
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            data-testid="input-first-name"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium">Last Name</label>
                          <Input
                            placeholder="Appleton"
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            data-testid="input-last-name"
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">6-digit code</label>
                      <Input
                        ref={codeInputRef}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={6}
                        className="text-center text-xl tracking-[0.5em] font-semibold"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        data-testid="input-code"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!canVerify}
                      data-testid="button-auth-submit"
                    >
                      {verifyCodeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {isNewUser ? "Create Account" : "Sign In"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setStep("email"); setCode(""); }}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Different email
                    </button>
                    <button
                      type="button"
                      disabled={resendIn > 0 || requestCodeMutation.isPending}
                      onClick={() => requestCodeMutation.mutate(email.trim())}
                      className="text-primary disabled:text-muted-foreground underline-offset-4 hover:underline disabled:no-underline font-medium"
                      data-testid="button-resend-code"
                    >
                      {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                    </button>
                  </div>
                </CardContent>
              </>
            )}
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

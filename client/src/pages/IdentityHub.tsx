import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { 
  Mic, 
  Shield, 
  ExternalLink, 
  ShieldCheck, 
  XCircle,
  ArrowLeft,
  Loader2,
  Link as LinkIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SocialMonitoring from "@/components/SocialMonitoring";

const emailLookupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function IdentityHub() {
  const [, navigate] = useLocation();
  const [lookupEmail, setLookupEmail] = useState("");

  const form = useForm<z.infer<typeof emailLookupSchema>>({
    resolver: zodResolver(emailLookupSchema),
    defaultValues: { email: "" },
  });

  const { data: assets, isLoading } = useQuery<any[]>({
    queryKey: ['/api/identity/email', lookupEmail],
    enabled: !!lookupEmail,
  });

  const voiceAsset = assets?.find((a: any) => a.type === "voice_identity");
  const voiceVerified = voiceAsset?.certStatus === "minted";

  const handleLookup = (values: z.infer<typeof emailLookupSchema>) => {
    setLookupEmail(values.email);
  };

  return (
    <div className="min-h-full bg-background">
      <main className="mx-auto w-full max-w-6xl px-6 py-8 space-y-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            Protect Your <span className="text-primary">Voice Identity</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Register your authentic voice on the Polygon blockchain. Create an immutable certificate 
            that proves ownership and protects against AI impersonation.
          </p>
        </motion.div>

        {/* Email Lookup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Check Your Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLookup)} className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email to check status"
                          data-testid="input-email-lookup"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" data-testid="button-lookup">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look Up"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Voice Identity Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Mic className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-xl">Voice Identity</h3>
                  <Badge 
                    variant="outline" 
                    className={voiceVerified 
                      ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950" 
                      : "border-muted-foreground"
                    }
                  >
                    {voiceVerified ? (
                      <>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Verified on Blockchain
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Not verified
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <p className="text-muted-foreground">
                {voiceVerified 
                  ? "Your voice is verified and secured on the Polygon blockchain. AI impersonators can be identified." 
                  : "Record a voice sample to create your blockchain certificate and protect your identity."
                }
              </p>

              <div className="space-y-2">
                {voiceVerified && voiceAsset ? (
                  <>
                    <Button 
                      onClick={() => navigate(`/certificate/${voiceAsset.id}`)}
                      className="w-full"
                      data-testid="button-view-certificate"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      View Certificate
                    </Button>
                    {voiceAsset.certExplorerUrl && (
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(voiceAsset.certExplorerUrl, '_blank')}
                        data-testid="button-view-polygon"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Polygon
                      </Button>
                    )}
                  </>
                ) : (
                  <Button 
                    onClick={() => navigate("/voice-certification")}
                    className="w-full"
                    data-testid="button-start-verification"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Start Voice Verification
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Social Media Monitoring */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SocialMonitoring />
        </motion.div>

        {/* Identity Promise */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Podlogix Identity Promise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-semibold">Your voice is yours.</p>
            <p className="text-muted-foreground">
              Podlogix will never sell, license, or use your voice or identity without your explicit permission.
            </p>
            <p className="text-muted-foreground">
              Every use of your identity is recorded on-chain for transparency and security. 
              Your blockchain certificate proves authenticity that AI deepfakes cannot replicate.
            </p>
          </CardContent>
        </Card>

        {/* Blockchain Explainer */}
        <Card className="bg-primary/5 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Why Blockchain?</h3>
              <p className="text-muted-foreground">
                Think of blockchain like a permanent, public notebook that nobody can erase or change.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Permanent Ownership Proof</p>
                  <p className="text-xs text-muted-foreground">
                    Your NFT certificate proves YOU own this voice forever
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Can't Be Faked</p>
                  <p className="text-xs text-muted-foreground">
                    Even AI deepfakes can't copy your blockchain certificate
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-card rounded-lg">
                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Publicly Verifiable</p>
                  <p className="text-xs text-muted-foreground">
                    Anyone can verify your certificate on Polygonscan
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

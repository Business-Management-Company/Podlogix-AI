import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Mic, 
  MicOff, 
  Shield, 
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Youtube,
  Twitter,
  Instagram,
  Linkedin
} from "lucide-react";
import { SiTiktok, SiSpotify } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

const certificationSchema = z.object({
  voiceName: z.string().min(2, "Name must be at least 2 characters"),
  youtube: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  linkedin: z.string().optional(),
  spotify: z.string().optional(),
  monitorChannels: z.boolean().default(true),
});

const STEPS = [
  { label: "Identity Info", description: "Name & social channels" },
  { label: "Record Voice", description: "Read the script aloud" },
  { label: "Confirm", description: "Review and mint" },
  { label: "Complete", description: "Certificate created" },
];

const SAMPLE_SCRIPT = `Hello, my name is [YOUR NAME]. I am a podcaster and content creator. 
This is my authentic voice, recorded on this day for verification purposes. 
I authorize Podlogix to create a blockchain certificate of my voice identity 
to protect against AI impersonation and deepfakes.`;

export default function DashboardCertify() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<z.infer<typeof certificationSchema>>({
    resolver: zodResolver(certificationSchema),
    defaultValues: { 
      voiceName: "",
      youtube: "",
      twitter: "",
      instagram: "",
      tiktok: "",
      linkedin: "",
      spotify: "",
      monitorChannels: true,
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const createAssetMutation = useMutation({
    mutationFn: async (data: z.infer<typeof certificationSchema>) => {
      const res = await apiRequest('POST', '/api/identity', {
        name: data.voiceName,
        email: user?.email || "",
        type: 'voice_identity',
        socialChannels: {
          youtube: data.youtube,
          twitter: data.twitter,
          instagram: data.instagram,
          tiktok: data.tiktok,
          linkedin: data.linkedin,
          spotify: data.spotify,
        },
        monitorChannels: data.monitorChannels,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAssetId(data.id);
      setVoiceName(form.getValues('voiceName'));
      setCurrentStep(2);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create identity asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const mintMutation = useMutation({
    mutationFn: async () => {
      if (!assetId || !audioBlob) throw new Error("Missing data");
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const voiceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const res = await apiRequest('POST', `/api/identity/${assetId}/mint`, {
        voiceHash,
      });
      return res.json();
    },
    onSuccess: () => {
      setCurrentStep(4);
      toast({
        title: "Success!",
        description: "Your voice has been certified on the blockchain.",
      });
    },
    onError: () => {
      toast({
        title: "Minting Failed",
        description: "There was an error creating your certificate. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your voice.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleStep1Submit = (values: z.infer<typeof certificationSchema>) => {
    createAssetMutation.mutate(values);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-full bg-background py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Voice Certification</h1>
        <div className="mb-12">
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Step {currentStep} of {STEPS.length}
            </p>
            <h2 className="text-lg font-semibold">
              {STEPS[currentStep - 1].label}
            </h2>
          </div>

          <div className="relative">
            <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
            <div className="flex justify-between mt-2">
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center ${
                    i + 1 <= currentStep ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i + 1 < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : i + 1 === currentStep
                        ? 'border-2 border-primary bg-background'
                        : 'border-2 border-muted bg-background'
                    }`}
                  >
                    {i + 1 < currentStep ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className="text-xs mt-1 hidden md:block">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Identity Information</CardTitle>
                  <CardDescription>
                    Logged in as {user?.email}. Connect your social channels for impersonation monitoring.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleStep1Submit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="voiceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name Associated with Voice</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Your public name or stage name"
                                data-testid="input-voice-name"
                              />
                            </FormControl>
                            <FormDescription>
                              This is the name that will appear on your voice certificate
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Connect Social Channels (Optional)</h4>
                        <p className="text-xs text-muted-foreground">
                          We'll monitor these channels to detect AI impersonators using your voice or likeness.
                        </p>
                        
                        <div className="grid gap-3">
                          <FormField
                            control={form.control}
                            name="youtube"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  <Youtube className="h-4 w-4 text-red-500" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="YouTube channel URL"
                                      data-testid="input-youtube"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="twitter"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  <Twitter className="h-4 w-4 text-sky-500" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Twitter/X handle (e.g., @username)"
                                      data-testid="input-twitter"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="instagram"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  <Instagram className="h-4 w-4 text-pink-500" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Instagram handle"
                                      data-testid="input-instagram"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="tiktok"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  <SiTiktok className="h-4 w-4" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="TikTok handle"
                                      data-testid="input-tiktok"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="linkedin"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  <Linkedin className="h-4 w-4 text-blue-600" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="LinkedIn profile URL"
                                      data-testid="input-linkedin"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="spotify"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2">
                                  <SiSpotify className="h-4 w-4 text-green-500" />
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Spotify podcast URL"
                                      data-testid="input-spotify"
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="monitorChannels"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-monitor"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable Impersonation Monitoring</FormLabel>
                              <FormDescription>
                                We'll scan the internet for AI-generated content using your voice and alert you to potential impersonators.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={createAssetMutation.isPending}
                        data-testid="button-continue"
                      >
                        {createAssetMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Continue to Voice Recording
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Record Your Voice</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Read this script aloud:</p>
                    <p className="text-sm text-muted-foreground italic">
                      {SAMPLE_SCRIPT.replace('[YOUR NAME]', voiceName || '[YOUR NAME]')}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div 
                      className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                        isRecording 
                          ? 'bg-red-500/20 animate-pulse' 
                          : audioBlob 
                          ? 'bg-green-500/20' 
                          : 'bg-green-600/10'
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="h-12 w-12 text-red-500" />
                      ) : (
                        <Mic className={`h-12 w-12 ${audioBlob ? 'text-green-500' : 'text-green-600'}`} />
                      )}
                    </div>

                    {isRecording && (
                      <p className="text-2xl font-mono font-bold text-red-500">
                        {formatTime(recordingTime)}
                      </p>
                    )}

                    {audioBlob && !isRecording && (
                      <p className="text-sm text-green-500 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Recording saved ({formatTime(recordingTime)})
                      </p>
                    )}

                    <div className="flex gap-2">
                      {!isRecording ? (
                        <Button 
                          onClick={startRecording}
                          size="lg"
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-start-recording"
                        >
                          <Mic className="h-4 w-4 mr-2" />
                          {audioBlob ? 'Re-record' : 'Start Recording'}
                        </Button>
                      ) : (
                        <Button 
                          onClick={stopRecording}
                          size="lg"
                          variant="destructive"
                          data-testid="button-stop-recording"
                        >
                          <MicOff className="h-4 w-4 mr-2" />
                          Stop Recording
                        </Button>
                      )}
                    </div>
                  </div>

                  {audioBlob && (
                    <Button 
                      onClick={() => setCurrentStep(3)}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-continue-step2"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Continue to Confirmation
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Confirm & Mint Certificate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Voice Name:</span>
                      <span className="font-medium" data-testid="text-confirm-name">{voiceName}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Account Email:</span>
                      <span className="font-medium" data-testid="text-confirm-email">{user?.email}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Recording Duration:</span>
                      <span className="font-medium" data-testid="text-confirm-duration">{formatTime(recordingTime)}</span>
                    </div>
                  </div>

                  <div className="bg-green-500/5 p-4 rounded-lg border border-green-500/20">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">What happens next?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your voice recording will be hashed and minted as an NFT on the Polygon blockchain.
                          This creates a permanent, verifiable proof of your voice identity.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={() => mintMutation.mutate()}
                      disabled={mintMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      data-testid="button-mint"
                    >
                      {mintMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Minting on Blockchain...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Mint Certificate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="pt-6 text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="h-10 w-10 text-green-500" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
                    <p className="text-muted-foreground">
                      Your voice identity has been certified on the Polygon blockchain.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => navigate(`/certificate/${assetId}`)}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-view-certificate"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      View Your Certificate
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

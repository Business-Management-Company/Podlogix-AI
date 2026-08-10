import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Mic, 
  MicOff, 
  Shield, 
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertIdentityAssetSchema } from "@shared/schema";

const userInfoSchema = insertIdentityAssetSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
});

const STEPS = [
  { label: "Your Info", description: "Enter your details" },
  { label: "Record Voice", description: "Read the script aloud" },
  { label: "Confirm", description: "Review and mint" },
  { label: "Complete", description: "Certificate created" },
];

const SAMPLE_SCRIPT = `Hello, my name is [YOUR NAME]. I am a podcaster and content creator. 
This is my authentic voice, recorded on this day for verification purposes. 
I authorize Podlogix to create a blockchain certificate of my voice identity 
to protect against AI impersonation and deepfakes.`;

export default function VoiceCertification() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<z.infer<typeof userInfoSchema>>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: { name: "", email: "" },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userInfoSchema>) => {
      const res = await apiRequest('POST', '/api/identity', {
        name: data.name,
        email: data.email,
        type: 'voice_identity',
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAssetId(data.id);
      setUserName(form.getValues('name'));
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
      
      // Create a hash of the audio (in production, this would be a proper audio fingerprint)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const voiceHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const res = await apiRequest('POST', `/api/identity/${assetId}/mint`, {
        voiceHash,
      });
      return res.json();
    },
    onSuccess: (data) => {
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

  const handleStep1Submit = (values: z.infer<typeof userInfoSchema>) => {
    createAssetMutation.mutate(values);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-full bg-background">
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Voice Certification</h1>
        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Step {currentStep} of {STEPS.length}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold">
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
          {/* Step 1: Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Enter Your Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleStep1Submit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Your full name"
                                data-testid="input-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="your@email.com"
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createAssetMutation.isPending}
                        data-testid="button-continue"
                      >
                        {createAssetMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Continue
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Record */}
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
                      {SAMPLE_SCRIPT.replace('[YOUR NAME]', userName || '[YOUR NAME]')}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div 
                      className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                        isRecording 
                          ? 'bg-red-500/20 animate-pulse' 
                          : audioBlob 
                          ? 'bg-green-500/20' 
                          : 'bg-primary/10'
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="h-12 w-12 text-red-500" />
                      ) : (
                        <Mic className={`h-12 w-12 ${audioBlob ? 'text-green-500' : 'text-primary'}`} />
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
                      className="w-full"
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

          {/* Step 3: Confirm */}
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
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium" data-testid="text-confirm-name">{userName}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium" data-testid="text-confirm-email">{form.getValues('email')}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Recording Duration:</span>
                      <span className="font-medium" data-testid="text-confirm-duration">{formatTime(recordingTime)}</span>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
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
                      className="flex-1"
                      data-testid="button-mint"
                    >
                      {mintMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Minting...
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

          {/* Step 4: Complete */}
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
                      data-testid="button-view-certificate"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      View Your Certificate
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate("/identity")}
                    >
                      Back to Identity Hub
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

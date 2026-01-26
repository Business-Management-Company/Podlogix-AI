import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
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
  Camera, 
  Shield, 
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Youtube,
  Twitter,
  Instagram,
  Linkedin,
  Upload,
  X,
  Image as ImageIcon
} from "lucide-react";
import { SiTiktok, SiSpotify } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const certificationSchema = z.object({
  likenessName: z.string().min(2, "Name must be at least 2 characters"),
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
  { label: "Upload Photos", description: "3-5 photos of yourself" },
  { label: "Confirm", description: "Review and mint" },
  { label: "Complete", description: "Certificate created" },
];

export default function DashboardCertifyLikeness() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [likenessName, setLikenessName] = useState("");

  const form = useForm<z.infer<typeof certificationSchema>>({
    resolver: zodResolver(certificationSchema),
    defaultValues: { 
      likenessName: "",
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
        name: data.likenessName,
        email: user?.email || "",
        type: 'likeness_identity',
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
      setLikenessName(form.getValues('likenessName'));
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
      if (!assetId || uploadedImages.length < 3) throw new Error("Missing data");
      
      const combinedHash = await generateCombinedHash(uploadedImages);

      await apiRequest('PATCH', `/api/identity/${assetId}`, {
        likenessImages: uploadedImages,
      });

      const res = await apiRequest('POST', `/api/identity/${assetId}/mint-likeness`, {
        likenessHash: combinedHash,
      });
      return res.json();
    },
    onSuccess: () => {
      setCurrentStep(4);
      toast({
        title: "Success!",
        description: "Your likeness has been certified on the blockchain.",
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

  const generateCombinedHash = async (imagePaths: string[]): Promise<string> => {
    const combined = imagePaths.sort().join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleStep1Submit = (values: z.infer<typeof certificationSchema>) => {
    createAssetMutation.mutate(values);
  };

  const handleUploadComplete = useCallback((result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const successfulFiles = result.successful || [];
    const newPaths = successfulFiles
      .map(file => {
        const uploadUrl = file.response?.uploadURL || file.uploadURL;
        if (typeof uploadUrl === 'string') {
          const url = new URL(uploadUrl);
          return url.pathname;
        }
        return null;
      })
      .filter((p): p is string => p !== null);
    
    setUploadedImages(prev => [...prev, ...newPaths].slice(0, 5));
    
    if (newPaths.length > 0) {
      toast({
        title: "Image Uploaded",
        description: `${newPaths.length} image(s) added successfully.`,
      });
    }
  }, [toast]);

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getUploadParameters = useCallback(async (file: { name: string; size: number; type: string }) => {
    const response = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        size: file.size,
        contentType: file.type || "image/jpeg",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get upload URL");
    }

    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      headers: { "Content-Type": file.type || "image/jpeg" },
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-purple-600" />
            <span className="font-display font-bold text-xl">Likeness Certification</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
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
                    i + 1 <= currentStep ? 'text-purple-600' : 'text-muted-foreground'
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i + 1 < currentStep 
                        ? 'bg-purple-600 text-white' 
                        : i + 1 === currentStep
                        ? 'border-2 border-purple-600 bg-background'
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
                        name="likenessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name Associated with Likeness</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Your public name or stage name"
                                data-testid="input-likeness-name"
                              />
                            </FormControl>
                            <FormDescription>
                              This is the name that will appear on your likeness certificate
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Connect Social Channels (Optional)</h4>
                        <p className="text-xs text-muted-foreground">
                          We'll monitor these channels to detect AI impersonators using your likeness and alert you.
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
                                      data-testid="input-youtube-likeness"
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
                                      data-testid="input-twitter-likeness"
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
                                      data-testid="input-instagram-likeness"
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
                                      data-testid="input-tiktok-likeness"
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
                                      data-testid="input-linkedin-likeness"
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
                                      data-testid="input-spotify-likeness"
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
                                data-testid="checkbox-monitor-likeness"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Enable Impersonation Monitoring</FormLabel>
                              <FormDescription>
                                We'll scan the internet for AI-generated content using your likeness and alert you to potential impersonators.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        disabled={createAssetMutation.isPending}
                        data-testid="button-continue-step1"
                      >
                        {createAssetMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Continue to Photo Upload
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
                  <CardTitle>Upload Your Photos</CardTitle>
                  <CardDescription>
                    Upload 3-5 clear photos of yourself. These will be used to create a unique likeness hash for your certificate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Photo Guidelines:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>- Clear, well-lit photos of your face</li>
                      <li>- Different angles (front, side, 3/4 view)</li>
                      <li>- Natural expressions</li>
                      <li>- No heavy filters or editing</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((path, index) => (
                      <div 
                        key={index} 
                        className="relative aspect-square rounded-lg border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/20 overflow-hidden group"
                      >
                        <img 
                          src={path} 
                          alt={`Uploaded ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                          Photo {index + 1}
                        </div>
                      </div>
                    ))}
                    
                    {uploadedImages.length < 5 && (
                      <div className="aspect-square rounded-lg border-2 border-dashed border-purple-300 bg-purple-50/50 dark:bg-purple-950/10 flex flex-col items-center justify-center">
                        <ObjectUploader
                          maxNumberOfFiles={5 - uploadedImages.length}
                          maxFileSize={10485760}
                          onGetUploadParameters={getUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonClassName="bg-purple-600 hover:bg-purple-700"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Add Photo
                        </ObjectUploader>
                        <p className="text-xs text-muted-foreground mt-2">
                          {uploadedImages.length}/5 photos
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <ImageIcon className={`h-4 w-4 ${uploadedImages.length >= 3 ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={uploadedImages.length >= 3 ? 'text-green-600' : 'text-muted-foreground'}>
                      {uploadedImages.length >= 3 ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Minimum photos reached ({uploadedImages.length}/5)
                        </span>
                      ) : (
                        `Upload at least 3 photos (${uploadedImages.length}/5)`
                      )}
                    </span>
                  </div>

                  {uploadedImages.length >= 3 && (
                    <Button 
                      onClick={() => setCurrentStep(3)}
                      className="w-full bg-purple-600 hover:bg-purple-700"
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
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{likenessName}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Account Email:</span>
                      <span className="font-medium">{user?.email}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Photos Uploaded:</span>
                      <span className="font-medium">{uploadedImages.length} images</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Network:</span>
                      <span className="font-medium">Polygon Mainnet</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Estimated Gas:</span>
                      <span className="font-medium">~0.01 MATIC</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {uploadedImages.map((path, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                        <img 
                          src={path} 
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      By minting this certificate, you confirm that the photos are of yourself and you authorize Podlogix to create a blockchain-verified likeness certificate for protection against AI impersonation.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      className="flex-1"
                      data-testid="button-back-step3"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      onClick={() => mintMutation.mutate()}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      disabled={mintMutation.isPending}
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

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="text-center">
                <CardContent className="pt-12 pb-8 space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Check className="h-10 w-10 text-purple-600" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Likeness Certified!</h2>
                    <p className="text-muted-foreground">
                      Your likeness has been permanently recorded on the Polygon blockchain. You can now detect and report AI impersonators using your face.
                    </p>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg inline-block">
                    <p className="text-sm text-muted-foreground mb-1">Certificate ID</p>
                    <p className="font-mono text-sm">{assetId}</p>
                  </div>

                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <Button 
                      onClick={() => navigate("/dashboard")}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-view-dashboard"
                    >
                      View Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/dashboard/certify")}
                      data-testid="button-certify-voice"
                    >
                      Also Certify Your Voice
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

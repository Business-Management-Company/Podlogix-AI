import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  ExternalLink, 
  ArrowLeft, 
  Mic,
  Loader2,
  Copy,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Certificate() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['/api/identity', id],
    queryFn: async () => {
      const res = await fetch(`/api/identity/${id}`);
      if (!res.ok) throw new Error('Certificate not found');
      return res.json();
    },
    enabled: !!id,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Transaction hash copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Certificate not found</p>
              <Button onClick={() => navigate("/identity")}>
                Return to Identity Hub
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/identity")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Identity Hub
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
        {/* Certificate Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2 border-primary/20 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Mic className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Podlogix Identity Certificate</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Officially Verified on Polygon Blockchain
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-500/10 text-green-600 border-green-200 text-sm px-3 py-1">
                  <Check className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Certificate Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Certificate Type</p>
                  <p className="text-lg font-semibold">Voice Identity</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Owner Name</p>
                  <p className="text-lg font-semibold">{asset.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Owner Email</p>
                  <p className="text-lg font-semibold">{asset.email}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Certificate ID</p>
                  <p className="text-sm font-mono break-all">{asset.id}</p>
                </div>

                {asset.mintedAt && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Minted Date</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(asset.mintedAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                {asset.certTokenId && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">NFT Token ID</p>
                    <p className="text-lg font-semibold font-mono">{asset.certTokenId}</p>
                  </div>
                )}
              </div>

              {/* Blockchain Details */}
              {asset.certTxHash && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Blockchain Transaction</p>
                  <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between gap-2">
                    <code className="text-xs break-all flex-1">{asset.certTxHash}</code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(asset.certTxHash)}
                      data-testid="button-copy-hash"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open(asset.certExplorerUrl || `https://amoy.polygonscan.com/tx/${asset.certTxHash}`, "_blank")}
                    data-testid="button-view-polygonscan"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Polygonscan
                  </Button>
                </div>
              )}

              {/* Voice Hash */}
              {asset.voiceHash && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Voice Fingerprint Hash</p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <code className="text-xs break-all">{asset.voiceHash}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This cryptographic hash uniquely identifies your voice recording and is stored on-chain.
                  </p>
                </div>
              )}

              {/* Verification Badge */}
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">Officially Verified by Podlogix</p>
                    <p className="text-sm text-muted-foreground">
                      This certificate proves authenticity and ownership on the blockchain.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Identity Promise */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Podlogix Identity Promise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-semibold">Your voice is yours.</p>
            <p className="text-sm text-muted-foreground">
              Podlogix will never sell, license, or use your voice or identity without your explicit permission.
            </p>
            <p className="text-sm text-muted-foreground">
              Every use of your identity requires your consent, recorded on-chain for transparency and security.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

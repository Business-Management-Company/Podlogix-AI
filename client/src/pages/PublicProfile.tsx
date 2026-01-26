import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Mic } from "lucide-react";
import { motion } from "framer-motion";
import type { Profile, ProfileLink } from "@shared/schema";

interface ProfileData {
  profile: Profile;
  links: ProfileLink[];
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<ProfileData>({
    queryKey: ['/api/p', slug],
    queryFn: async () => {
      const res = await fetch(`/api/p/${slug}`);
      if (!res.ok) throw new Error('Profile not found');
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Profile Not Found</h1>
            <p className="text-muted-foreground">
              This profile doesn't exist or hasn't been published yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, links } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary/20">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10">
              {profile.displayName?.[0] || 'P'}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mb-1" data-testid="text-profile-name">
            {profile.displayName}
          </h1>
          {profile.headline && (
            <p className="text-muted-foreground mb-2" data-testid="text-profile-headline">
              {profile.headline}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-muted-foreground max-w-xs mx-auto" data-testid="text-profile-bio">
              {profile.bio}
            </p>
          )}
        </motion.div>

        <div className="space-y-3">
          {links.filter(link => link.isActive).map((link, index) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full h-auto py-4 px-6 justify-between hover-elevate"
                onClick={() => window.open(link.url, '_blank')}
                data-testid={`button-link-${link.id}`}
              >
                <span className="font-medium">{link.title}</span>
                <ExternalLink className="h-4 w-4 opacity-50" />
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Powered by Podlogix */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white">
              <Mic className="w-3 h-3" />
            </div>
            Powered by Podlogix
          </a>
        </motion.div>
      </div>
    </div>
  );
}

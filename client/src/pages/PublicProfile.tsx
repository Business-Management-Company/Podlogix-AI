import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Mic, Users, Eye, Video, Instagram, Youtube, Linkedin, CheckCircle } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { motion } from "framer-motion";
import type { Profile, ProfileLink } from "@shared/schema";

interface SocialProfile {
  id: string;
  platform: string;
  profileUrl: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  verified: boolean;
}

interface ProfileData {
  profile: Profile;
  links: ProfileLink[];
  socialProfiles?: SocialProfile[];
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5 text-pink-500" />,
  tiktok: <SiTiktok className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5 text-red-500" />,
  twitter: <span className="font-bold">𝕏</span>,
  linkedin: <Linkedin className="h-5 w-5 text-blue-600" />,
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X",
  linkedin: "LinkedIn",
};

function formatNumber(num: number | undefined): string {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
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

  const { profile, links, socialProfiles = [] } = data;

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

        {socialProfiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="grid gap-3">
              {socialProfiles.map((sp, index) => (
                <motion.div
                  key={sp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card 
                    className="overflow-hidden cursor-pointer hover-elevate"
                    onClick={() => window.open(sp.profileUrl, '_blank')}
                    data-testid={`social-${sp.platform}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {sp.profilePictureUrl ? (
                          <img
                            src={sp.profilePictureUrl}
                            alt={sp.displayName || sp.username || "Profile"}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {platformIcons[sp.platform]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {platformIcons[sp.platform]}
                            <span className="font-medium truncate">
                              {sp.displayName || sp.username || platformNames[sp.platform]}
                            </span>
                            {sp.verified && (
                              <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                                <CheckCircle className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          
                          {sp.platform === "youtube" && sp.subscriberCount !== undefined ? (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {formatNumber(sp.subscriberCount)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                {formatNumber(sp.videoCount)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(sp.viewCount)}
                              </span>
                            </div>
                          ) : sp.platform === "instagram" && sp.followersCount !== undefined ? (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {formatNumber(sp.followersCount)} followers
                              </span>
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                {formatNumber(sp.mediaCount)} posts
                              </span>
                            </div>
                          ) : sp.username ? (
                            <p className="text-xs text-muted-foreground mt-1">@{sp.username}</p>
                          ) : null}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          {links.filter(link => link.isActive).map((link, index) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (socialProfiles.length * 0.05) + 0.2 + index * 0.1 }}
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
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white">
              <Mic className="w-3 h-3" />
            </div>
            Powered by Podlogix
          </a>
        </motion.div>
      </div>
    </div>
  );
}

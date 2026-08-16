import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic } from "lucide-react";
import { ProfilePageRenderer } from "@/components/ProfilePageRenderer";
import { DEFAULT_PROFILE_DESIGN_SETTINGS } from "@shared/schema";
import type { Profile, ProfileLink, ProfileSection, ProfileDesignSettings } from "@shared/schema";

interface ProfileData {
  profile: Profile;
  links: ProfileLink[];
  sections: ProfileSection[];
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<ProfileData>({
    queryKey: ["/api/p", slug],
    queryFn: async () => {
      const res = await fetch(`/api/p/${slug}`);
      if (!res.ok) throw new Error("Profile not found");
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

  const { profile, sections } = data;
  const design: ProfileDesignSettings = { ...DEFAULT_PROFILE_DESIGN_SETTINGS, ...((profile.designSettings as Partial<ProfileDesignSettings>) ?? {}) };

  return (
    <div className="min-h-screen">
      <ProfilePageRenderer
        displayName={profile.displayName}
        username={design.showUsername ? profile.slug : undefined}
        headline={profile.headline}
        bio={profile.bio}
        avatarUrl={profile.avatarUrl}
        heroImageUrl={profile.heroImageUrl}
        heroImageFormat={profile.heroImageFormat || "portrait"}
        socialIcons={(profile.socialIcons as { platform: string; url: string }[]) ?? []}
        youtubeVideoUrl={profile.youtubeVideoUrl}
        sections={sections}
        design={design}
        interactive
      />
    </div>
  );
}

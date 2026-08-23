import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, Mic, Sparkles, UploadCloud, PlayCircle } from "lucide-react";
import { Card, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { Podcast } from "@shared/schema";

/**
 * /shows/:id/studio — write an episode script (optionally AI-assisted) and
 * record or upload the audio for it. Recording/AI-generation are wired up
 * as real actions once the underlying endpoints exist; today this is the
 * authoring surface so scripts can be drafted ahead of recording.
 */
export default function ShowStudio() {
  const { id } = useParams<{ id: string }>();
  const [intro, setIntro] = useState("");
  const [main, setMain] = useState("");

  const { data: podcast, isLoading } = useQuery<Podcast>({
    queryKey: ["/api/podcasts", id],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  return (
    <div className="w-full max-w-[1600px] px-6 py-8">
      <Card padding="lg" className="mb-6 flex items-start gap-4">
        {isLoading ? (
          <Skeleton className="h-16 w-16 rounded-xl" />
        ) : podcast?.artworkUrl ? (
          <img src={podcast.artworkUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-zinc-200 object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100">
            <Mic size={22} className="text-zinc-400" strokeWidth={1.75} />
          </div>
        )}
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
            <AudioLines size={11} /> Podcast Audio Studio
          </span>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-950">
            {podcast?.title || "Studio"}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">Write, edit, and record new episodes.</p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Script Editor" />
          <p className="mb-3 text-sm text-zinc-500">Write or generate your episode script with AI.</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-950">Intro</label>
              <Textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Episode introduction..."
                className="min-h-[96px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-950">Main Content</label>
              <Textarea
                value={main}
                onChange={(e) => setMain(e.target.value)}
                placeholder="Main episode segments..."
                className="min-h-[140px]"
              />
            </div>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Sparkles size={13} /> Generate with AI
            </Button>
          </div>
        </section>

        <section>
          <SectionHeader title="Recording" />
          <p className="mb-3 text-sm text-zinc-500">Record audio or upload pre-recorded files.</p>
          <Card padding="lg" tone="dashed" className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <Mic size={26} className="text-zinc-500" strokeWidth={1.5} />
            </div>
            <Button
              className="w-full max-w-xs"
              disabled
              variant="default"
            >
              <PlayCircle size={15} className="mr-1.5" />
              Start Recording
            </Button>
            <div className="flex w-full max-w-xs items-center gap-2 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-zinc-200" />
              OR UPLOAD
              <div className="h-px flex-1 bg-zinc-200" />
            </div>
            <Button variant="outline" className="w-full max-w-xs gap-1.5" disabled>
              <UploadCloud size={14} /> Upload audio file
            </Button>
            <p className="text-xs text-zinc-400">Recording and upload coming soon.</p>
          </Card>
        </section>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  AudioLines, Mic, Sparkles, UploadCloud, BookOpen,
  Scissors, Wind, AlignJustify, Gauge, Wand2, SlidersHorizontal,
  Clock, Tag, Plus,
} from "lucide-react";
import { Card, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Podcast } from "@shared/schema";

export default function ShowStudio() {
  const { id } = useParams<{ id: string }>();
  const [intro, setIntro] = useState("");
  const [main, setMain] = useState("");
  const [sponsorRead, setSponsorRead] = useState("");
  const [outro, setOutro] = useState("");
  const [markerTimestamp, setMarkerTimestamp] = useState("");

  const wordCount = useMemo(() => {
    const combined = [intro, main, sponsorRead, outro].join(" ").trim();
    return combined ? combined.split(/\s+/).length : 0;
  }, [intro, main, sponsorRead, outro]);

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
      {/* ── Header ── */}
      <Card padding="lg" className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
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
            <p className="mt-0.5 text-sm text-zinc-500">Record, edit, and publish new episodes with AI-powered tools.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled className="shrink-0 gap-1.5">
          <BookOpen size={13} /> View Tutorials
        </Button>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Script Editor ── */}
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
                className="min-h-[80px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-950">Main Content</label>
              <Textarea
                value={main}
                onChange={(e) => setMain(e.target.value)}
                placeholder="Main episode segments..."
                className="min-h-[120px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-950">Sponsor Read</label>
              <Textarea
                value={sponsorRead}
                onChange={(e) => setSponsorRead(e.target.value)}
                placeholder="Sponsor message..."
                className="min-h-[72px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-950">Outro</label>
              <Textarea
                value={outro}
                onChange={(e) => setOutro(e.target.value)}
                placeholder="Closing remarks, call to action..."
                className="min-h-[72px]"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">{wordCount} word{wordCount !== 1 ? "s" : ""} total</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled className="gap-1.5">
                  <Sparkles size={13} /> Generate with AI
                </Button>
                <Button size="sm" disabled className="gap-1.5">
                  Save Script
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Recording ── */}
        <section>
          <SectionHeader title="Recording" />
          <p className="mb-3 text-sm text-zinc-500">Record audio or upload pre-recorded files.</p>
          <Card padding="lg" tone="dashed" className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <Mic size={26} className="text-zinc-500" strokeWidth={1.5} />
            </div>
            <Button className="w-full max-w-xs" disabled>
              <Mic size={14} className="mr-1.5" /> Start Recording
            </Button>
            <div className="flex w-full max-w-xs items-center gap-2 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-zinc-200" />
              OR UPLOAD
              <div className="h-px flex-1 bg-zinc-200" />
            </div>
            <div className="flex w-full max-w-xs cursor-not-allowed flex-col items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center opacity-60">
              <UploadCloud size={22} className="text-zinc-400" strokeWidth={1.5} />
              <p className="mt-1 text-xs font-medium text-zinc-600">Click to upload audio</p>
              <p className="text-[10px] text-zinc-400">MP3, WAV, M4A up to 500 MB</p>
            </div>
            <p className="text-xs text-zinc-400">Recording and upload coming soon.</p>
          </Card>
        </section>
      </div>

      {/* ── AI Editing ── */}
      <section className="mt-6">
        <SectionHeader title="AI Editing" />
        <p className="mb-3 text-sm text-zinc-500">Enhance your audio with AI-powered tools.</p>
        <Card padding="lg">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AiEditTool icon={Scissors} title="Remove Filler Words" description='Remove "um", "uh", "like"' />
            <AiEditTool icon={Wind} title="Noise Reduction" description="Clean background noise" />
            <AiEditTool icon={AlignJustify} title="Trim Silence" description="Remove long pauses" />
            <AiEditTool icon={Gauge} title="Auto-Leveling" description="Normalize audio levels" />
            <AiEditTool icon={Wand2} title="Enhance Voice (AI)" description="AI voice enhancement" />
            <AiEditTool icon={SlidersHorizontal} title="Auto-Mix Levels" description="Automatic mixing" />
          </div>
          <Button className="mt-4 w-full" disabled>
            Send to AI Cleanup
          </Button>
          <p className="mt-2 text-center text-xs text-zinc-400">AI editing available once audio is uploaded.</p>
        </Card>
      </section>

      {/* ── Markers ── */}
      <section className="mt-6">
        <SectionHeader title="Markers" />
        <p className="mb-3 text-sm text-zinc-500">Add clip highlights and ad markers to your episode.</p>
        <Card padding="lg">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-zinc-950">Timestamp (seconds)</label>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-400" />
                <Input
                  type="number"
                  min={0}
                  value={markerTimestamp}
                  onChange={(e) => setMarkerTimestamp(e.target.value)}
                  placeholder="e.g. 120"
                  className="max-w-[140px]"
                  disabled
                />
              </div>
            </div>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Tag size={13} /> Add Clip
            </Button>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Plus size={13} /> Add Ad
            </Button>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center">
            <p className="text-sm text-zinc-400">No markers added yet</p>
            <p className="mt-0.5 text-xs text-zinc-300">Markers are available once audio is uploaded.</p>
          </div>
        </Card>
      </section>
    </div>
  );
}

function AiEditTool({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Scissors;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 opacity-60">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
        <Icon size={14} className="text-zinc-500" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-950">{title}</p>
        <p className="text-xs text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

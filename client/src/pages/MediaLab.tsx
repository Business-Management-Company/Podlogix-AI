import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, SectionHeader, EmptyState, PlaceholderPage } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  FlaskConical, Upload, Loader2, Download, CheckCircle2, XCircle, Clock, Sparkles,
} from "lucide-react";

interface Consumption {
  used_minutes: number;
  remaining_minutes: number;
  quota_minutes: number;
  usage_percentage: number;
  plan: string;
}

// Response shape (per Upload-Post support): youtube -> {title, description};
// instagram/tiktok/facebook -> {caption}. Hashtags come baked into the text.
const SHORTS_PLATFORMS = [
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
];

interface FfmpegJob {
  job_id: string;
  status: "PENDING" | "PROCESSING" | "FINISHED" | "ERROR";
  output_extension?: string;
}

const PRESETS = [
  {
    id: "mp4",
    label: "Convert to MP4 (H.264)",
    description: "Universal, widely compatible format.",
    outputExtension: "mp4",
    command: "ffmpeg -y -i {input} -c:v libx264 -crf 23 -c:a aac {output}",
  },
  {
    id: "audio",
    label: "Extract Audio (MP3)",
    description: "Pull the audio track out on its own.",
    outputExtension: "mp3",
    command: "ffmpeg -y -i {input} -vn -acodec libmp3lame -q:a 2 {output}",
  },
  {
    id: "compress",
    label: "Compress for Web",
    description: "Smaller file size, still solid quality.",
    outputExtension: "mp4",
    command: "ffmpeg -y -i {input} -c:v libx264 -crf 30 -preset fast -c:a aac -b:a 96k {output}",
  },
];

function StatusBadge({ status }: { status: FfmpegJob["status"] }) {
  const map = {
    PENDING: { icon: Clock, cls: "text-amber-600 bg-amber-50 border-amber-200", label: "Pending" },
    PROCESSING: { icon: Loader2, cls: "text-sky-600 bg-sky-50 border-sky-200", label: "Processing" },
    FINISHED: { icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Finished" },
    ERROR: { icon: XCircle, cls: "text-red-600 bg-red-50 border-red-200", label: "Error" },
  } as const;
  const { icon: Icon, cls, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      <Icon size={12} className={status === "PROCESSING" ? "animate-spin" : ""} />
      {label}
    </span>
  );
}

export default function MediaLab() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [customCommand, setCustomCommand] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [shortsPlatforms, setShortsPlatforms] = useState<string[]>(["youtube", "instagram", "tiktok"]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAllowed = user?.email === "andrew@podlogix.co";

  const { data: consumption } = useQuery<{ consumption: Consumption }>({
    queryKey: ["/api/media-lab/ffmpeg/consumption"],
    enabled: isAllowed,
  });

  const { data: job } = useQuery<FfmpegJob>({
    queryKey: ["/api/media-lab/ffmpeg/jobs", activeJobId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/media-lab/ffmpeg/jobs/${activeJobId}`);
      return res.json();
    },
    enabled: isAllowed && !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "FINISHED" || status === "ERROR" ? false : 2500;
    },
  });

  useEffect(() => {
    if (job?.status === "FINISHED") {
      toast({ title: "Job finished — ready to download" });
      queryClient.invalidateQueries({ queryKey: ["/api/media-lab/ffmpeg/consumption"] });
    } else if (job?.status === "ERROR") {
      toast({ title: "Job failed", variant: "destructive" });
    }
  }, [job?.status]);

  const preset = PRESETS.find((p) => p.id === selectedPreset)!;
  const commandToRun = customCommand.trim() || preset.command;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/media-lab/ffmpeg/jobs", {
        files: [videoUrl],
        full_command: commandToRun.replace("{input}", "{input}"),
        output_extension: preset.outputExtension,
      });
      return res.json();
    },
    onSuccess: (data: FfmpegJob) => {
      setActiveJobId(data.job_id);
      toast({ title: "Job submitted", description: `Job ${data.job_id.slice(0, 8)}… is processing.` });
    },
    onError: () => toast({ title: "Failed to submit job", variant: "destructive" }),
  });

  const getUploadParams = async (file: File) => {
    const res = await apiRequest("POST", "/api/uploads/request-url", { name: file.name, size: file.size, contentType: file.type });
    const data = await res.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const analyzeShortsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/media-lab/analyze-shorts", {
        videoUrl,
        platforms: shortsPlatforms,
      });
      return res.json();
    },
    onSuccess: (data: { remaining_analyses?: number }) =>
      toast({
        title: "Analysis complete",
        description:
          typeof data?.remaining_analyses === "number"
            ? `${data.remaining_analyses} of 300 analyses left this month`
            : undefined,
      }),
    onError: (err: Error) =>
      toast({
        title: "Analysis failed",
        description: err.message.includes("429") ? "Monthly quota exhausted." : undefined,
        variant: "destructive",
      }),
  });
  const shortsResult = analyzeShortsMutation.data as Record<string, unknown> | undefined;

  const toggleShortsPlatform = (id: string) =>
    setShortsPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  if (authLoading) return null;

  if (!isAllowed) {
    return (
      <PlaceholderPage
        icon={FlaskConical}
        eyebrow="Beta"
        title="Media Lab"
        description="This is an early-access feature being tested on one account before wider rollout. It's not enabled for yours yet."
      />
    );
  }

  return (
    <div className="w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
            <FlaskConical className="h-5 w-5 text-zinc-400" />
            Media Lab
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Beta — video editing via Upload-Post's FFmpeg Editor API. Only visible to your account.
          </p>
        </div>
        {consumption?.consumption && (
          <div className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-right">
            <p className="text-xs font-medium text-zinc-900">
              {consumption.consumption.remaining_minutes.toFixed(0)} / {consumption.consumption.quota_minutes} min left
            </p>
            <p className="text-[11px] text-zinc-400 capitalize">{consumption.consumption.plan} plan</p>
          </div>
        )}
      </div>

      <section className="mb-6">
        <SectionHeader title="1. Upload a video" />
        <Card padding="lg">
          {videoUrl ? (
            <div className="flex items-center gap-3">
              <video src={videoUrl} controls className="h-32 w-full max-w-[220px] rounded-lg bg-black object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-zinc-500">{videoUrl}</p>
                <button onClick={() => setVideoUrl(null)} className="mt-1 text-xs font-medium text-red-500">Remove</button>
              </div>
            </div>
          ) : (
            <ObjectUploader
              maxFileSize={100 * 1024 * 1024}
              onGetUploadParameters={getUploadParams}
              onComplete={(r) => r.successful[0] && setVideoUrl(r.successful[0].uploadURL)}
              buttonClassName="!h-auto !w-full !flex-col !gap-1.5 !border !border-dashed !border-zinc-300 !bg-white !py-10 !text-zinc-500 hover:!bg-zinc-50"
            >
              <Upload className="h-5 w-5" />
              <span className="text-xs font-medium">Upload video</span>
              <span className="text-[11px] text-zinc-400">Up to 100MB</span>
            </ObjectUploader>
          )}
        </Card>
      </section>

      <section className="mb-6">
        <SectionHeader title="2. Choose an operation" />
        <Card padding="lg" className="space-y-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelectedPreset(p.id); setCustomCommand(""); }}
              className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                selectedPreset === p.id ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{p.label}</p>
                <p className="text-xs text-zinc-500">{p.description}</p>
              </div>
              {selectedPreset === p.id && <CheckCircle2 size={16} className="shrink-0 text-zinc-950" />}
            </button>
          ))}
          <div className="pt-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Advanced: custom FFmpeg command (optional — overrides the preset above)
            </label>
            <Textarea
              rows={2}
              placeholder={preset.command}
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </Card>
      </section>

      <Button
        className="w-full"
        disabled={!videoUrl || submitMutation.isPending}
        onClick={() => submitMutation.mutate()}
      >
        {submitMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
        Run Job
      </Button>

      {activeJobId && (
        <section className="mt-6">
          <SectionHeader title="Job status" />
          <Card padding="lg">
            {!job ? (
              <p className="text-xs text-zinc-500">Loading…</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-zinc-500">{job.job_id}</p>
                  <div className="mt-1.5"><StatusBadge status={job.status} /></div>
                </div>
                {job.status === "FINISHED" && (
                  <a href={`/api/media-lab/ffmpeg/jobs/${job.job_id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm"><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button>
                  </a>
                )}
              </div>
            )}
          </Card>
        </section>
      )}

      {!activeJobId && (
        <div className="mt-6">
          <EmptyState
            icon={FlaskConical}
            title="No jobs yet"
            description="Upload a video and run a job to see it processed here."
          />
        </div>
      )}

      <section className="mt-10">
        <SectionHeader title="AI Shorts Analyzer" />
        <Card padding="lg" className="space-y-4">
          <p className="text-xs leading-relaxed text-zinc-500">
            Generates platform-tuned titles, captions, and hashtags for a short video (max 100MB / 5 min).
            Uses the same uploaded video from step 1. 300 analyses/month on the current plan.
          </p>

          <div className="flex flex-wrap gap-2">
            {SHORTS_PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleShortsPlatform(p.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  shortsPlatforms.includes(p.id)
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            className="w-full"
            disabled={!videoUrl || shortsPlatforms.length === 0 || analyzeShortsMutation.isPending}
            onClick={() => analyzeShortsMutation.mutate()}
          >
            {analyzeShortsMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {analyzeShortsMutation.isPending ? "Analyzing…" : "Analyze Video"}
          </Button>
          {!videoUrl && (
            <p className="text-[11px] text-zinc-400">Upload a video in step 1 first.</p>
          )}

          {shortsResult && (
            <div className="space-y-3 border-t border-zinc-100 pt-4">
              {SHORTS_PLATFORMS.filter((p) => shortsResult[p.id]).length > 0 ? (
                SHORTS_PLATFORMS.filter((p) => shortsResult[p.id]).map((p) => {
                  const r = shortsResult[p.id] as Record<string, unknown>;
                  return (
                    <div key={p.id} className="rounded-lg border border-zinc-200 p-3.5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{p.label}</p>
                      {Object.entries(r)
                        .filter(([, v]) => typeof v === "string" && v)
                        .map(([k, v]) => (
                          <div key={k} className="mb-2 last:mb-0">
                            <p className="text-[11px] font-medium capitalize text-zinc-500">{k.replace(/_/g, " ")}</p>
                            <p className="whitespace-pre-wrap text-sm text-zinc-900">{v as string}</p>
                          </div>
                        ))}
                    </div>
                  );
                })
              ) : (
                <pre className="max-h-80 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
                  {JSON.stringify(shortsResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

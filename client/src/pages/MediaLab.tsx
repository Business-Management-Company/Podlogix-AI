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
interface FfmpegJob {
  job_id: string;
  status: "PENDING" | "PROCESSING" | "FINISHED" | "ERROR";
  output_extension?: string;
}

const PRESETS = [
  {
    id: "refine",
    label: "Refine Audio — the one-click cleanup",
    description: "Cuts dead air and long pauses, masters loudness to podcast standard (-16 LUFS). Real editing, not a filter toggle.",
    outputExtension: "mp3",
    command:
      "ffmpeg -y -i {input} -vn -af silenceremove=stop_periods=-1:stop_duration=0.75:stop_threshold=-38dB,loudnorm=I=-16:TP=-1.5:LRA=11 -acodec libmp3lame -q:a 2 {output}",
  },
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
    <div className="w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
          <FlaskConical className="h-5 w-5 text-zinc-400" />
          Media Lab
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          The conversion bench — refine, convert, and package anything on your media shelf. Beta, your account only.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
        {/* ── The bench ── */}
        <div className="space-y-6">
          <section>
            <SectionHeader title="1. Pick your source" />
            <Card padding="lg" className="space-y-4">
              <LibrarySourcePicker current={videoUrl} onPick={(url) => setVideoUrl(url)} />
              {videoUrl ? (
                <div className="flex items-center gap-3">
                  <video src={videoUrl} controls className="h-24 w-40 shrink-0 rounded-lg bg-black object-cover" />
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
                  buttonClassName="!h-auto !w-full !justify-center !gap-2 !border !border-dashed !border-zinc-300 !bg-white !py-4 !text-zinc-500 hover:!bg-zinc-50"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs font-medium">Or upload a new video</span>
                  <span className="text-[11px] text-zinc-400">· up to 100MB</span>
                </ObjectUploader>
              )}
            </Card>
          </section>

          <section>
            <SectionHeader title="2. Choose an operation" />
            <Card padding="lg" className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPreset(p.id); setCustomCommand(""); }}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      selectedPreset === p.id ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-zinc-900">{p.label}</p>
                      {selectedPreset === p.id && <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-zinc-950" />}
                    </div>
                    <p className="mt-1 text-xs leading-snug text-zinc-500">{p.description}</p>
                  </button>
                ))}
              </div>
              <details>
                <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                  Advanced: custom FFmpeg command (overrides the preset)
                </summary>
                <Textarea
                  rows={2}
                  placeholder={preset.command}
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  className="mt-2 font-mono text-xs"
                />
              </details>
            </Card>
          </section>

        </div>

        {/* ── Run + status rail ── */}
        <div className="mt-6 space-y-3 lg:sticky lg:top-6 lg:mt-0">
          <Card padding="lg" className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Ready to run</p>
              <p className="mt-1 text-sm font-medium text-zinc-900">{customCommand.trim() ? "Custom command" : preset.label}</p>
              <p className="text-xs text-zinc-500">{videoUrl ? "Source selected ✓" : "Pick a source first"}</p>
            </div>
            <Button
              className="w-full"
              disabled={!videoUrl || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              Run Job
            </Button>
          </Card>

          {activeJobId && (
            <Card padding="lg">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Job status</p>
            {!job ? (
              <p className="text-xs text-zinc-500">Loading…</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-zinc-500">{job.job_id}</p>
                  <div className="mt-1.5"><StatusBadge status={job.status} /></div>
                </div>
                {job.status === "FINISHED" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await apiRequest("POST", "/api/media-lab/collect", {
                            jobId: job.job_id,
                            extension: preset.outputExtension,
                            title: `${preset.label} — ${new Date().toLocaleDateString()}`,
                          });
                          if (!res.ok) throw new Error();
                          toast({ title: "Saved to your Media Library" });
                        } catch {
                          toast({ title: "Couldn't save to library", variant: "destructive" });
                        }
                      }}
                    >
                      Save to library
                    </Button>
                    <a href={`/api/media-lab/ffmpeg/jobs/${job.job_id}/download`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm"><Download className="mr-1.5 h-3.5 w-3.5" /> Download</Button>
                    </a>
                  </div>
                )}
              </div>
            )}
            </Card>
          )}

          {consumption?.consumption && (
            <Card className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">FFmpeg minutes</span>
              <span className="text-xs font-semibold tabular-nums text-zinc-900">
                {consumption.consumption.remaining_minutes.toFixed(0)} / {consumption.consumption.quota_minutes}
              </span>
            </Card>
          )}
          <p className="px-1 text-[11px] leading-relaxed text-zinc-500">
            Finished jobs download directly or save straight into your Media Library — the studio, the lab, and the
            composer all share that shelf.
          </p>
        </div>
      </div>
    </div>
  );
}


interface LibraryVideo {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  platform: string;
}

/** Grab a source straight from the Media Library — live-studio clips and
 *  recordings included. The lab and the studio share one shelf. */
function LibrarySourcePicker({ current, onPick }: { current: string | null; onPick: (url: string) => void }) {
  const { data } = useQuery<{ items: LibraryVideo[] }>({ queryKey: ["/api/media-library"], retry: false });
  const videos = (data?.items ?? []).filter((i) => i.mediaType === "video" && i.mediaUrl);
  if (videos.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">From your library</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {videos.slice(0, 12).map((v) => (
          <button
            key={v.id}
            onClick={() => onPick(v.mediaUrl!)}
            className={`w-40 shrink-0 overflow-hidden rounded-lg border text-left transition-colors ${
              current === v.mediaUrl ? "border-zinc-950 ring-1 ring-zinc-950" : "border-zinc-200 hover:border-zinc-400"
            }`}
          >
            <video src={v.mediaUrl!} className="h-20 w-full bg-black object-cover" muted />
            <p className="truncate px-2 py-1 text-[11px] text-zinc-600">
              {v.caption || v.platform}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

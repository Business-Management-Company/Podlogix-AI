import { Link, useParams } from "wouter";
import { Card, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Mic, Rss, Server, Share2, UploadCloud } from "lucide-react";

/**
 * /shows/:id/hosting — host the show on Podlogix instead of (or alongside) an
 * external host. Episodes live in our storage, we generate the RSS feed, and
 * Distribution submits it everywhere. This page is the front door: what
 * hosting here means, and the three steps to move in.
 */

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload your episodes",
    body: "Add audio files right here — they live in Podlogix storage, not on someone else's server. Already hosted elsewhere? Import your RSS feed and everything copies over.",
    action: { label: "Go to Episodes", suffix: "/episodes" },
  },
  {
    icon: Rss,
    title: "Podlogix generates your feed",
    body: "Your show gets a standard RSS feed, generated and served by Podlogix. Any podcast app in the world can read it — it's the same plumbing every host uses.",
    action: { label: "Manage RSS", href: "/dashboard/rss" },
  },
  {
    icon: Share2,
    title: "Submit it everywhere",
    body: "Apple Podcasts, Spotify, and the rest — the Distribution page walks each submission and tracks which platforms are live.",
    action: { label: "Open Distribution", suffix: "/distribution" },
  },
];

export default function ShowHosting() {
  const { id } = useParams<{ id: string }>();
  const base = `/shows/${id}`;

  return (
    <div className="w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
          <Server className="h-6 w-6 text-zinc-400" />
          Host on Podlogix
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Keep the whole show under one roof — episodes, feed, and distribution, hosted here.
        </p>
      </div>

      <Card padding="lg" className="mb-6 space-y-2">
        <p className="text-sm leading-relaxed text-zinc-700">
          Right now your episodes can sync from an outside host like Buzzsprout. Hosting on Podlogix means the
          files themselves live here: you upload once, we serve the audio, generate the RSS feed podcast apps
          subscribe to, and connect it straight into everything else — the Studio files recordings next to your
          episodes, the composer promotes them, and Distribution tracks where the show is live.
        </p>
        <ul className="space-y-1.5 pt-1 text-sm text-zinc-700">
          {[
            "Your files, your feed — nothing rented from another host",
            "One library: studio recordings, clips, and episodes side by side",
            "Included in your plan — no separate hosting bill",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {line}
            </li>
          ))}
        </ul>
      </Card>

      <SectionHeader title="Moving in — three steps" />
      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <Card key={step.title} padding="lg" className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
              <step.icon className="h-5 w-5 text-zinc-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-950">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{step.body}</p>
            </div>
            <Link href={step.action.href ?? `${base}${step.action.suffix}`}>
              <Button variant="outline" size="sm" className="shrink-0">
                {step.action.label}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
        <Mic className="h-3.5 w-3.5" />
        Staying on your current host is fine too — Podlogix keeps syncing episodes either way.
      </p>
    </div>
  );
}

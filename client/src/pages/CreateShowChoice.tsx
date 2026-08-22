import { Link } from "wouter";
import { ArrowLeft, Mic, Rss } from "lucide-react";
import { Card } from "@/components/kit";

export default function CreateShowChoice() {
  return (
    <div className="w-full max-w-4xl px-6 py-8">
      <Link href="/shows">
        <span className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700">
          <ArrowLeft size={16} />
          Back to shows
        </span>
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Add a show</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Do you already have a podcast, or are you starting a brand new one?
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link href="/dashboard/rss">
          <Card
            interactive
            padding="lg"
            className="flex h-full flex-col items-center gap-4 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <Rss size={28} className="text-zinc-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-950">
                I already have a podcast
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Bring in your existing show via its RSS feed. We'll pull in
                your episodes automatically.
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/shows/new/create">
          <Card
            interactive
            padding="lg"
            className="flex h-full flex-col items-center gap-4 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <Mic size={28} className="text-zinc-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-950">
                I'm starting from scratch
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                No podcast yet? Set up your show and upload your first
                episode — we'll host it and give you an RSS feed for Spotify
                and Apple Podcasts.
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Loader2, Play, Phone, LifeBuoy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface TranscriptMatch {
  episodeId: string;
  episodeTitle: string;
  showTitle: string;
  showArtwork: string | null;
  audioUrl: string | null;
  publishedAt: string | null;
  snippet: string;
  matchedTerms: string[];
  matchCount: number;
}

interface CrisisResource { name: string; action: string; detail: string }
interface SearchResponse {
  query: string;
  crisis: boolean;
  resources: { heading: string; resources: CrisisResource[] } | null;
  terms: string[];
  matches: TranscriptMatch[];
}

/** Bold the matched terms inside a snippet. */
function Snippet({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <span>{text}</span>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  const lowered = new Set(terms.map((t) => t.toLowerCase()));
  return (
    <span>
      {parts.map((part, i) =>
        lowered.has(part.toLowerCase())
          ? <mark key={i} className="rounded bg-amber-100 px-0.5 font-medium text-amber-900">{part}</mark>
          : <span key={i}>{part}</span>,
      )}
    </span>
  );
}

export default function TranscriptSearch() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);

  const search = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/transcript-search", { query });
      if (!res.ok) throw new Error("search failed");
      return (await res.json()) as SearchResponse;
    },
    onSuccess: (result) => setData(result),
  });

  const submit = () => {
    const q = input.trim();
    if (q) search.mutate(q);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <header className="mb-5">
        <h1 className="text-lg font-bold tracking-tight text-zinc-950">Search what shows have said</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Search across your transcribed episodes — ask in plain language and see which shows brought it up.
        </p>
      </header>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. filing a VA disability claim, or PTSD support for veterans"
          className="flex-1"
        />
        <Button onClick={submit} disabled={search.isPending || !input.trim()}>
          {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-2">Search</span>
        </Button>
      </div>

      {/* Crisis resources always come first, above any results. */}
      {data?.crisis && data.resources ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <LifeBuoy className="h-5 w-5" />
            <h2 className="text-sm font-bold">You're not alone — reach a real person now</h2>
          </div>
          <p className="mt-1 text-sm text-red-700">{data.resources.heading}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.resources.resources.map((r) => (
              <div key={r.name} className="rounded-lg border border-red-200 bg-white p-3">
                <p className="text-sm font-semibold text-zinc-900">{r.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-red-700">
                  <Phone className="h-3.5 w-3.5" />{r.action}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{r.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {search.isError ? (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Search failed — try again.</p>
      ) : null}

      {data && !search.isPending ? (
        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {data.matches.length > 0
              ? `${data.matches.length} show${data.matches.length === 1 ? "" : "s"} mentioned this`
              : "No transcribed episodes matched"}
            {data.terms.length > 0 ? <span className="ml-1 font-normal normal-case tracking-normal text-zinc-400">· looked for {data.terms.map((t) => `"${t}"`).join(", ")}</span> : null}
          </p>

          {data.matches.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
              Nothing in your transcribed episodes yet. Transcribe more episodes and they'll become searchable here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.matches.map((m) => (
                <div key={m.episodeId} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    {m.showArtwork ? (
                      <img src={m.showArtwork} alt="" className="h-11 w-11 shrink-0 rounded-md border border-zinc-200 object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400"><Play className="h-4 w-4" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{m.showTitle}</p>
                      <p className="truncate text-xs text-zinc-500">{m.episodeTitle}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {m.matchCount} mention{m.matchCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-3 border-l-2 border-amber-300 pl-3 text-sm leading-relaxed text-zinc-700">
                    <Snippet text={m.snippet} terms={m.matchedTerms} />
                  </p>
                  {m.audioUrl ? (
                    <a href={m.audioUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900">
                      <Play className="h-3 w-3" />Open episode
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {data.matches.length > 0 ? (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400">
              <Sparkles className="h-3.5 w-3.5" />Coming next: an AI that reads these and answers you directly.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

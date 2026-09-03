import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Send, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

/**
 * "Ask this episode" — a side panel for finding one moment in one episode.
 *
 * Two ways in, side by side:
 *   - Find: a plain keyword search that highlights every match in the
 *     transcript and steps through them (fast, free, exact).
 *   - Ask: a question in plain language; the AI answers from the transcript
 *     and returns verbatim passages, which are highlighted in the same pane so
 *     the answer always points at the actual words.
 */

interface EpisodeLike { id: string; title: string; duration?: number | null }

interface Passage { quote: string; position: number; approxMinute: number | null }
interface AskResponse {
  answer: string;
  passages: Passage[];
  crisis: { heading: string; resources: Array<{ name: string; action: string; detail?: string }> } | null;
}
interface Turn { role: "user" | "assistant"; content: string; passages?: Passage[]; crisis?: AskResponse["crisis"] }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function EpisodeAskSheet({ episode, onOpenChange }: { episode: EpisodeLike | null; onOpenChange: (open: boolean) => void }) {
  const [find, setFind] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);

  const transcriptQuery = useQuery<{ transcript: string; wordCount: number }>({
    queryKey: ["/api/listener/episodes", episode?.id, "transcript"],
    queryFn: async () => (await apiRequest("GET", `/api/listener/episodes/${episode!.id}/transcript`)).json(),
    enabled: !!episode,
  });
  const transcript = transcriptQuery.data?.transcript ?? "";

  // Reset per episode.
  useEffect(() => { setFind(""); setFindIndex(0); setQuestion(""); setTurns([]); setActiveQuote(null); }, [episode?.id]);

  // Split the transcript into segments: plain text, keyword hits, and AI passages.
  const segments = useMemo(() => {
    if (!transcript) return [] as Array<{ text: string; kind: "plain" | "find" | "passage"; n?: number }>;
    const marks: Array<{ start: number; end: number; kind: "find" | "passage" }> = [];
    if (activeQuote) {
      const i = transcript.toLowerCase().indexOf(activeQuote.toLowerCase());
      if (i >= 0) marks.push({ start: i, end: i + activeQuote.length, kind: "passage" });
    }
    const term = find.trim();
    if (term.length >= 2) {
      const re = new RegExp(escapeRe(term), "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(transcript)) && marks.length < 2000) marks.push({ start: m.index, end: m.index + m[0].length, kind: "find" });
    }
    marks.sort((a, b) => a.start - b.start);
    const out: Array<{ text: string; kind: "plain" | "find" | "passage"; n?: number }> = [];
    let cursor = 0, n = 0;
    for (const mk of marks) {
      if (mk.start < cursor) continue; // overlapping — skip
      if (mk.start > cursor) out.push({ text: transcript.slice(cursor, mk.start), kind: "plain" });
      out.push({ text: transcript.slice(mk.start, mk.end), kind: mk.kind, n: mk.kind === "find" ? n++ : undefined });
      cursor = mk.end;
    }
    if (cursor < transcript.length) out.push({ text: transcript.slice(cursor), kind: "plain" });
    return out;
  }, [transcript, find, activeQuote]);
  const findCount = segments.filter((s) => s.kind === "find").length;

  // Scroll the current keyword hit (or the active AI passage) into view.
  useEffect(() => {
    const el = paneRef.current?.querySelector<HTMLElement>(activeQuote ? '[data-passage="1"]' : `[data-find="${findIndex}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [findIndex, findCount, activeQuote]);

  const step = (d: number) => { if (findCount) { setActiveQuote(null); setFindIndex((i) => (i + d + findCount) % findCount); } };

  const ask = async () => {
    const q = question.trim();
    if (!q || !episode || asking) return;
    setAsking(true);
    setTurns((t) => [...t, { role: "user", content: q }]);
    setQuestion("");
    try {
      const history = turns.slice(-6).map(({ role, content }) => ({ role, content }));
      const res = await apiRequest("POST", `/api/listener/episodes/${episode.id}/ask`, { question: q, history });
      const data = (await res.json()) as AskResponse;
      setTurns((t) => [...t, { role: "assistant", content: data.answer, passages: data.passages, crisis: data.crisis }]);
      if (data.passages?.[0]) { setFind(""); setActiveQuote(data.passages[0].quote); }
    } catch (e: any) {
      let reason = String(e?.message || "Couldn't get an answer.");
      try { reason = JSON.parse(reason.replace(/^\d{3}:\s*/, "")).message || reason; } catch { reason = reason.replace(/^\d{3}:\s*/, ""); }
      setTurns((t) => [...t, { role: "assistant", content: reason }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <Sheet open={!!episode} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="pr-8 text-base leading-snug">{episode?.title}</SheetTitle>
          <SheetDescription>Find a moment: search a word, or ask what you're looking for.</SheetDescription>
        </SheetHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_auto]">
          {/* Find bar */}
          <div className="flex items-center gap-2 border-b px-5 py-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={find}
                onChange={(e) => { setFind(e.target.value); setFindIndex(0); setActiveQuote(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") step(e.shiftKey ? -1 : 1); }}
                placeholder="Find a word or phrase in this episode…"
                className="pl-8"
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {find.trim().length >= 2 ? (findCount ? `${findIndex + 1} / ${findCount}` : "0 hits") : ""}
            </span>
            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => step(-1)} disabled={!findCount} aria-label="Previous match"><ChevronUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => step(1)} disabled={!findCount} aria-label="Next match"><ChevronDown className="h-4 w-4" /></Button>
          </div>

          {/* Transcript pane + answers */}
          <div className="grid min-h-0 grid-cols-1 md:grid-cols-[1fr_minmax(240px,42%)]">
            <div ref={paneRef} className="min-h-0 overflow-y-auto px-5 py-4 text-[15px] leading-relaxed whitespace-pre-wrap">
              {transcriptQuery.isLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading transcript…</span>
              ) : transcriptQuery.error ? (
                <span className="text-destructive">This episode doesn't have a transcript yet.</span>
              ) : (
                segments.map((s, i) =>
                  s.kind === "plain" ? (
                    <span key={i}>{s.text}</span>
                  ) : s.kind === "passage" ? (
                    <mark key={i} data-passage="1" className="rounded bg-primary/25 px-0.5 text-foreground ring-1 ring-primary/50">{s.text}</mark>
                  ) : (
                    <mark key={i} data-find={s.n} className={`rounded px-0.5 text-foreground ${s.n === findIndex ? "bg-amber-400/80 ring-1 ring-amber-500" : "bg-amber-200/60 dark:bg-amber-300/30"}`}>{s.text}</mark>
                  ),
                )
              )}
            </div>

            <div className="min-h-0 overflow-y-auto border-t md:border-l md:border-t-0 bg-muted/30 px-4 py-4 space-y-4">
              {turns.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask in plain language — <em>"where do they talk about pricing?"</em> — and the answer will point at the exact passages.
                </p>
              )}
              {turns.map((t, i) => (
                <div key={i} className={t.role === "user" ? "text-sm font-medium" : "space-y-2"}>
                  {t.role === "user" ? (
                    <p className="rounded-lg bg-background px-3 py-2 border">{t.content}</p>
                  ) : (
                    <>
                      {t.crisis && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
                          <p className="font-semibold mb-1">{t.crisis.heading}</p>
                          <ul className="space-y-1">
                            {t.crisis.resources.map((r) => <li key={r.name}><span className="font-medium">{r.name}:</span> {r.action}{r.detail ? ` — ${r.detail}` : ""}</li>)}
                          </ul>
                        </div>
                      )}
                      <p className="flex gap-2 text-sm"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{t.content}</span></p>
                      {t.passages && t.passages.length > 0 && (
                        <div className="space-y-1.5">
                          {t.passages.map((p, j) => (
                            <button
                              key={j}
                              type="button"
                              onClick={() => { setFind(""); setActiveQuote(p.quote); }}
                              className={`block w-full rounded-md border px-2.5 py-2 text-left text-xs leading-snug hover:bg-background ${activeQuote === p.quote ? "border-primary bg-background" : "border-border"}`}
                            >
                              {p.approxMinute != null && <span className="mr-1.5 font-mono text-[11px] text-primary">~{p.approxMinute} min</span>}
                              <span className="text-muted-foreground">"{p.quote.length > 140 ? p.quote.slice(0, 140) + "…" : p.quote}"</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              {asking && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Reading the episode…</p>}
            </div>
          </div>

          {/* Ask bar */}
          <form className="flex items-center gap-2 border-t px-5 py-3" onSubmit={(e) => { e.preventDefault(); void ask(); }}>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask this episode… e.g. when do they talk about exits?"
              disabled={!transcript || asking}
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="sm" disabled={!question.trim() || !transcript || asking}>
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Ask</span>
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Sparkles, Plus, Send, Loader2 } from "lucide-react";

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  loading?: boolean;
}

let _id = 0;
function nextId() { return `ai-${++_id}-${Date.now()}`; }

const CHIPS = [
  "Write show notes for my last episode",
  "Give me 5 episode ideas for my podcast",
  "How do I grow my audience?",
  "Draft a sponsor pitch email",
  "What should I post on social this week?",
  "Tips to improve my audio quality",
];

const GREETING: AiMessage = {
  id: "greeting",
  role: "assistant",
  text: "Hey! I'm your Podlogix AI — ask me anything about your podcast: episode ideas, show notes, growth, sponsorships, or whatever's on your mind. 🎙️",
};

export function AiChatCore({ className = "" }: { className?: string }) {
  const [messages, setMessages] = useState<AiMessage[]>([GREETING]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: dashData } = useQuery<{ podcasts: Array<{ id: string; title: string }> }>({
    queryKey: ["/api/dashboard"],
  });
  const { data: episodesData } = useQuery<any[]>({
    queryKey: ["/api/podcasts", dashData?.podcasts?.[0]?.id, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${dashData!.podcasts[0].id}/episodes`);
      return res.json();
    },
    enabled: !!dashData?.podcasts?.[0]?.id,
  });

  const context = {
    podcastTitle: dashData?.podcasts?.[0]?.title,
    episodeCount: Array.isArray(episodesData)
      ? episodesData.filter((e: any) => e.status === "published").length
      : undefined,
    draftCount: Array.isArray(episodesData)
      ? episodesData.filter((e: any) => e.status !== "published").length
      : undefined,
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showChips = messages.length <= 1;

  const sendMessage = async (input: string) => {
    if (!input.trim() || loading) return;
    const userMsg: AiMessage = { id: nextId(), role: "user", text: input.trim() };
    const loadingId = nextId();
    setMessages((m) => [...m, userMsg, { id: loadingId, role: "assistant", text: "", loading: true }]);
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => !m.loading && m.id !== "greeting" && m.text)
        .slice(-9)
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "assistant" as const, content: GREETING.text }, ...history],
          context,
        }),
      });
      const data = await res.json();
      const text = res.ok
        ? (data.text ?? "Sorry, I couldn't get a response.")
        : "I'm having trouble right now — please try again.";
      setMessages((m) => m.map((msg) => (msg.id === loadingId ? { ...msg, text, loading: false } : msg)));
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingId ? { ...msg, text: "Connection error — please try again.", loading: false } : msg
        )
      );
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    if (inputRef.current) inputRef.current.value = "";
    sendMessage(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const val = inputRef.current?.value?.trim();
      if (!val) return;
      if (inputRef.current) inputRef.current.value = "";
      sendMessage(val);
    }
  };

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 shrink-0 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/15">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold">Podlogix AI</span>
        </div>
        <button
          onClick={() => {
            setMessages([GREETING]);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="flex items-center gap-1 text-xs text-white/70 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          <Plus className="h-3 w-3" />
          New Chat
        </button>
      </div>

      {/* Chips */}
      {showChips && (
        <div className="px-3 pt-3 pb-1 grid grid-cols-2 gap-1.5 shrink-0 border-b">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              className="text-[11px] text-left px-2.5 py-2 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground leading-snug"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm ml-auto max-w-[82%]"
                : "bg-muted text-foreground rounded-bl-sm mr-auto max-w-[95%] shadow-sm border border-border"
            }`}
          >
            {m.loading ? (
              <div className="flex items-center gap-2 py-1">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-2 h-2 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground italic">Thinking…</span>
              </div>
            ) : m.role === "assistant" ? (
              <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>p:last-child]:mb-0">
                <ReactMarkdown>{m.text}</ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 p-3 border-t">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 min-h-[52px] max-h-[120px] rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="Ask me anything about your podcast…"
            rows={2}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
          AI may make mistakes — verify important information.
        </p>
      </form>
    </div>
  );
}

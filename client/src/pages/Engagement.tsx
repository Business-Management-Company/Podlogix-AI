import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Inbox, Loader2, MessageCircle, Send } from "lucide-react";
import { SiInstagram, SiFacebook, SiYoutube, SiLinkedin } from "react-icons/si";

interface UploadPostAccount {
  platform: string;
  platformUsername: string;
  isConnected: boolean;
  reauthRequired?: boolean;
}

interface DmParticipant {
  id: string;
  username?: string;
}

interface DmMessage {
  id: string;
  created_time?: string;
  from?: DmParticipant;
  message?: string;
}

interface DmConversation {
  id: string;
  participants?: { data?: DmParticipant[] };
  messages?: { data?: DmMessage[] };
}

interface PostComment {
  id: string;
  text?: string;
  timestamp?: string;
  user?: { id?: string; username?: string };
}

const COMMENT_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: SiInstagram },
  { key: "facebook", label: "Facebook", icon: SiFacebook },
  { key: "youtube", label: "YouTube", icon: SiYoutube },
  { key: "linkedin", label: "LinkedIn", icon: SiLinkedin },
];

type EngagementTab = "messages" | "comments";

export default function Engagement() {
  const { toast } = useToast();
  const [tab, setTab] = useState<EngagementTab>("messages");

  const { data: accountsData } = useQuery<{ accounts: UploadPostAccount[] }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });
  const accounts = accountsData?.accounts ?? [];
  const instagramAccount = accounts.find((a) => a.platform === "instagram" && a.isConnected);
  const myIgUsername = instagramAccount?.platformUsername?.toLowerCase() ?? null;

  // ---------- Messages (Instagram DMs) ----------
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const {
    data: dmData,
    isLoading: dmsLoading,
    refetch: refetchDms,
  } = useQuery<{ conversations: DmConversation[] }>({
    queryKey: ["/api/upload-post/dms/conversations"],
    enabled: !!instagramAccount && tab === "messages",
    retry: false,
  });
  const conversations = dmData?.conversations ?? [];
  const selectedConversation =
    conversations.find((c) => c.id === selectedConversationId) ?? conversations[0] ?? null;

  // The other person in a 1:1 thread — whoever isn't our connected handle.
  const otherParticipant = (conv: DmConversation): DmParticipant | null => {
    const people = conv.participants?.data ?? [];
    return people.find((p) => (p.username ?? "").toLowerCase() !== myIgUsername) ?? people[0] ?? null;
  };

  const sortedMessages = useMemo(() => {
    const msgs = [...(selectedConversation?.messages?.data ?? [])];
    return msgs.sort((a, b) =>
      new Date(a.created_time ?? 0).getTime() - new Date(b.created_time ?? 0).getTime()
    );
  }, [selectedConversation]);

  const sendDmMutation = useMutation({
    mutationFn: async () => {
      const recipient = selectedConversation ? otherParticipant(selectedConversation) : null;
      if (!recipient?.id) throw new Error("No recipient");
      const res = await apiRequest("POST", "/api/upload-post/dms/send", {
        recipientId: recipient.id,
        message: reply,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Couldn't send the message");
      }
      return res.json();
    },
    onSuccess: () => {
      setReply("");
      refetchDms();
      toast({ title: "Reply sent" });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't send", description: err.message, variant: "destructive" }),
  });

  // ---------- Comments ----------
  const [commentPlatform, setCommentPlatform] = useState("instagram");
  const [postUrl, setPostUrl] = useState("");
  const [comments, setComments] = useState<PostComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const loadComments = async (cursor?: string) => {
    if (!postUrl.trim()) return;
    setCommentsLoading(true);
    try {
      const params = new URLSearchParams({ platform: commentPlatform, postUrl: postUrl.trim() });
      if (cursor) params.set("after", cursor);
      const res = await apiRequest("GET", `/api/upload-post/comments?${params}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to load comments");
      setComments((prev) => (cursor ? [...prev, ...(body.comments ?? [])] : body.comments ?? []));
      setNextCursor(body.pagination?.has_next ? body.pagination?.next_cursor ?? null : null);
      setCommentsLoaded(true);
    } catch (err) {
      toast({
        title: "Couldn't load comments",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await apiRequest("POST", "/api/upload-post/comments", {
        platform: commentPlatform,
        message: commentText,
        postUrl: postUrl.trim() || undefined,
        commentId: replyingTo ?? undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to post comment");
      setCommentText("");
      setReplyingTo(null);
      toast({ title: replyingTo ? "Reply posted" : "Comment posted" });
      loadComments();
    } catch (err) {
      toast({
        title: "Couldn't post",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  const tabButton = (key: EngagementTab, label: string, Icon: React.ElementType) => (
    <button
      onClick={() => setTab(key)}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        tab === key ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Engagement</h1>
        <p className="mt-1 text-sm text-zinc-500">
          DMs and comments from your connected accounts, answered in one place.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {tabButton("messages", "Messages", MessageCircle)}
        {tabButton("comments", "Comments", Inbox)}
      </div>

      {tab === "messages" && (
        <>
          {instagramAccount && (
            <div className="mb-4 flex items-center gap-2 text-sm text-zinc-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
                <SiInstagram className="h-3 w-3 text-white" />
              </span>
              <span className="font-medium text-zinc-950">Instagram inbox</span>
              <span className="text-zinc-400">@{instagramAccount.platformUsername.replace(/^@/, "")} · the only platform with DM access today</span>
            </div>
          )}
          {!instagramAccount ? (
            <EmptyState
              icon={MessageCircle}
              title="Connect Instagram to see your DMs"
              description="Direct messages are available for Instagram today. Other platforms will follow as Upload-Post adds them."
              action={{ label: "Go to Connectors", href: "/connectors" }}
            />
          ) : dmsLoading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 size={14} className="animate-spin" /> Loading conversations…
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No conversations yet"
              description="When people DM your Instagram account, the threads show up here — the full inbox, not just automated replies."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-[260px,1fr]">
              <Card padding="none" className="divide-y divide-zinc-100 self-start">
                {conversations.map((conv) => {
                  const other = otherParticipant(conv);
                  const last = conv.messages?.data?.[0];
                  const active = selectedConversation?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={`block w-full px-4 py-3 text-left transition-colors ${
                        active ? "bg-zinc-50" : "hover:bg-zinc-50"
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-zinc-950">
                        @{other?.username ?? "unknown"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{last?.message ?? ""}</p>
                    </button>
                  );
                })}
              </Card>

              <Card padding="none" className="flex min-h-[360px] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {sortedMessages.map((msg) => {
                    const mine = (msg.from?.username ?? "").toLowerCase() === myIgUsername;
                    return (
                      <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                            mine ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.message || <span className="italic opacity-70">(attachment or story reply)</span>}
                          </p>
                          {msg.created_time && (
                            <p className={`mt-0.5 text-[10px] ${mine ? "text-zinc-400" : "text-zinc-500"}`}>
                              {new Date(msg.created_time).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-zinc-100 p-3">
                  <div className="flex gap-2">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write a reply…"
                      rows={2}
                      className="flex-1 resize-none"
                    />
                    <Button
                      onClick={() => sendDmMutation.mutate()}
                      disabled={!reply.trim() || sendDmMutation.isPending}
                      className="self-end"
                    >
                      {sendDmMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Instagram allows replies within 24 hours of their last message, with a daily send cap.
                  </p>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {tab === "comments" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {COMMENT_PLATFORMS.map(({ key, label, icon: Icon }) => {
              const isConnected = accounts.some((a) => a.platform === key && a.isConnected);
              return (
                <button
                  key={key}
                  onClick={() => {
                    setCommentPlatform(key);
                    setComments([]);
                    setCommentsLoaded(false);
                    setNextCursor(null);
                    setReplyingTo(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    commentPlatform === key
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {!isConnected && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      not connected
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Input
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="Paste a post URL to load its comments"
              className="flex-1"
            />
            <Button onClick={() => loadComments()} disabled={!postUrl.trim() || commentsLoading}>
              {commentsLoading ? <Loader2 size={14} className="animate-spin" /> : "Load comments"}
            </Button>
          </div>
          {commentPlatform === "youtube" && (
            <p className="text-[11px] text-zinc-400">
              If YouTube comments fail with a permission error, reconnect YouTube from Connectors to grant comment access.
            </p>
          )}

          {commentsLoaded && (
            <section>
              <SectionHeader title={`Comments (${comments.length}${nextCursor ? "+" : ""})`} />
              {comments.length === 0 ? (
                <Card>
                  <p className="text-sm text-zinc-500">No comments on this post yet.</p>
                </Card>
              ) : (
                <Card padding="none" className="divide-y divide-zinc-100">
                  {comments.map((comment) => (
                    <div key={comment.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-950">
                            @{comment.user?.username ?? "unknown"}
                            {comment.timestamp && (
                              <span className="ml-2 text-[11px] font-normal text-zinc-400">
                                {new Date(comment.timestamp).toLocaleString()}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-zinc-700">
                            {comment.text}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => {
                            setReplyingTo(replyingTo === comment.id ? null : comment.id);
                            setCommentText("");
                          }}
                        >
                          {replyingTo === comment.id ? "Close" : "Reply"}
                        </Button>
                      </div>
                      {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={`Reply to @${comment.user?.username ?? "them"}…`}
                            rows={2}
                            className="flex-1 resize-none"
                          />
                          <Button onClick={submitComment} disabled={!commentText.trim()} className="self-end">
                            <Send size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              )}
              {nextCursor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => loadComments(nextCursor)}
                  disabled={commentsLoading}
                >
                  {commentsLoading ? <Loader2 size={14} className="animate-spin" /> : "Load more"}
                </Button>
              )}

              {commentPlatform !== "instagram" && !replyingTo && (
                <div className="mt-4 flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a top-level comment…"
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  <Button onClick={submitComment} disabled={!commentText.trim()} className="self-end">
                    <Send size={14} />
                  </Button>
                </div>
              )}
              {commentPlatform === "instagram" && (
                <p className="mt-3 text-[11px] text-zinc-400">
                  Instagram only supports replying to existing comments, not adding new top-level ones.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

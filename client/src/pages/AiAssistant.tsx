import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  FileText,
  Mic,
  Scissors,
  Tag
} from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  messages?: Message[];
}

export default function AiAssistant() {
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/ai/conversations'],
    enabled: isAuthenticated,
  });

  const { data: activeConversation, isLoading: conversationLoading } = useQuery<Conversation>({
    queryKey: ['/api/ai/conversations', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      const res = await fetch(`/api/ai/conversations/${activeConversationId}`);
      return res.json();
    },
    enabled: !!activeConversationId,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, streamingContent]);

  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest('POST', '/api/ai/conversations', { title });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/conversations'] });
      setActiveConversationId(data.id);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/ai/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/conversations'] });
      if (activeConversationId) {
        setActiveConversationId(null);
      }
    },
  });

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    let conversationId = activeConversationId;

    if (!conversationId) {
      const title = input.slice(0, 50) + (input.length > 50 ? "..." : "");
      const newConversation = await createConversationMutation.mutateAsync(title);
      conversationId = newConversation.id;
    }

    const userMessage = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              setStreamingContent((prev) => prev + event.content);
            }
            if (event.done) {
              setIsStreaming(false);
              setStreamingContent("");
              queryClient.invalidateQueries({ queryKey: ['/api/ai/conversations', conversationId] });
            }
          } catch (e) {}
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
      setIsStreaming(false);
    }
  };

  const quickActions = [
    { icon: FileText, label: "Show Notes", action: "show_notes", prompt: "Generate show notes for my latest episode about..." },
    { icon: Tag, label: "Episode Titles", action: "title", prompt: "Suggest titles for an episode about..." },
    { icon: Scissors, label: "Find Viral Clips", action: "clips", prompt: "Here's my episode transcript, find viral moments:\n\n" },
    { icon: MessageSquare, label: "Description", action: "description", prompt: "Write a podcast description for an episode about..." },
  ];

  if (authLoading || conversationsLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-full bg-background flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversations */}
        <div className="w-64 border-r bg-card/30 hidden md:flex flex-col">
          <div className="p-4 border-b">
            <Button 
              className="w-full" 
              onClick={() => {
                setActiveConversationId(null);
                setStreamingContent("");
              }}
              data-testid="button-new-chat"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer hover-elevate ${
                    activeConversationId === conv.id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <span className="text-sm truncate flex-1" data-testid={`conversation-${conv.id}`}>
                    {conv.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversationMutation.mutate(conv.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {!activeConversationId && !isStreaming ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-2xl"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">How can I help your podcast today?</h2>
                <p className="text-muted-foreground mb-8">
                  I can generate show notes, suggest viral clips, write descriptions, 
                  create episode titles, and more.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {quickActions.map((action) => (
                    <Button
                      key={action.action}
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2 hover-elevate"
                      onClick={() => setInput(action.prompt)}
                      data-testid={`quick-action-${action.action}`}
                    >
                      <action.icon className="h-5 w-5 text-primary" />
                      <span className="text-sm">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto space-y-4">
                {activeConversation?.messages?.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
                {streamingContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted">
                      <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          {/* Input Area */}
          <div className="border-t p-4 bg-card/50">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about show notes, viral clips, episode titles..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                data-testid="input-message"
              />
              <Button
                size="icon"
                className="h-[60px] w-[60px]"
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                data-testid="button-send"
              >
                {isStreaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

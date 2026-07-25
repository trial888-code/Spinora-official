"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Headphones, MessageCircle, Minimize2, X, ArrowLeft, Bot, Sparkles, MessageSquarePlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageContent } from "@/components/chat/chat-message-content";
import { MobileChatShell, useMobileChatClose } from "@/components/chat/mobile-chat-shell";
import { appendMessage, mergeMessagesById } from "@/lib/chat/merge-messages";
import { subscribeToConversationInserts } from "@/lib/chat/subscribe-messages";
import { markConversationReadClient, sendMessageClient } from "@/lib/chat/send-message-client";
import { useChatAutoScroll } from "@/lib/chat/use-chat-auto-scroll";
import { CHAT_SCROLL_CLASS } from "@/lib/chat/chat-layout";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { askWebsiteAiChatbotAction } from "@/lib/actions/admin/ai-faq-actions";
import type { Message } from "@/types/database";

interface UserQuickChatProps {
  open: boolean;
  conversationId: string;
  userId: string;
  onClose: () => void;
}

type ChatMode = "ai" | "agent";

function QuickChatPanel({
  conversationId,
  userId,
  onClose,
  isMobile,
}: {
  conversationId: string;
  userId: string;
  onClose: () => void;
  isMobile: boolean;
}) {
  const closeViaBack = useMobileChatClose();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("ai");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!supabase || !conversationId || conversationId === "pending") return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((prev) => mergeMessagesById(prev, data ?? []));
    void markConversationReadClient(supabase, conversationId, userId);
  }, [supabase, conversationId, userId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!supabase || !conversationId || conversationId === "pending" || !userId) return;

    return subscribeToConversationInserts(
      supabase,
      `quick-chat-${conversationId}`,
      conversationId,
      (msg) => {
        setMessages((prev) => appendMessage(prev, msg));
        if (msg.sender_id !== userId) {
          void markConversationReadClient(supabase, conversationId, userId);
        }
      }
    );
  }, [supabase, conversationId, userId]);

  useEffect(() => {
    if (!supabase || !conversationId || conversationId === "pending") return;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void loadMessages();
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [supabase, conversationId, loadMessages]);

  const fingerprint = messages.length > 0 ? messages[messages.length - 1]?.id : "";
  const { onScroll: onScrollMessages } = useChatAutoScroll(scrollRef, messages.length, fingerprint);

  async function handleSend(file: File | null): Promise<boolean> {
    if ((!input.trim() && !file) || !userId || !supabase) return false;
    const activeConvId = conversationId === "pending" ? "default" : conversationId;

    setLoading(true);
    const content = input.trim();
    setInput("");

    // Send user message to DB conversation
    const result = await sendMessageClient(supabase, {
      conversationId: activeConvId,
      senderId: userId,
      content,
      kind: "user",
    });

    if (result.error) {
      setInput(content);
      setLoading(false);
      return false;
    }

    if (result.message) {
      setMessages((prev) => appendMessage(prev, result.message!));
    }

    // IF AI MODE: Call Gemini AI chatbot to respond automatically!
    if (chatMode === "ai" && content) {
      try {
        const aiRes = await askWebsiteAiChatbotAction(content, []);
        if (aiRes.ok && aiRes.reply) {
          await sendMessageClient(supabase, {
            conversationId: activeConvId,
            senderId: "00000000-0000-0000-0000-000000000000",
            content: aiRes.reply,
            kind: "admin",
          });
        }
      } catch {}
    }

    setLoading(false);
    return true;
  }

  function handleClose() {
    if (closeViaBack) {
      closeViaBack();
      return;
    }
    onClose();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden bg-[#121212]">
      {/* Header Bar */}
      <div className="flex flex-col border-b border-white/10 bg-[#141414] shrink-0 safe-area-top">
        <div className="flex items-center gap-2 px-3 py-2.5">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleClose}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shrink-0">
            {chatMode === "ai" ? <Bot className="h-4 w-4 text-white" /> : <Headphones className="h-4 w-4 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {chatMode === "ai" ? "Spinora AI Assistant" : "Live Agent Support"}
            </p>
            <p className="text-[10px] text-emerald-400 font-medium">
              {chatMode === "ai" ? "Instant 24/7 AI Answers" : "Connected to Staff"}
            </p>
          </div>
          <Link
            href={`/dashboard/messages`}
            className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300 px-1.5 shrink-0"
          >
            Full view
          </Link>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground shrink-0"
            aria-label={isMobile ? "Close chat" : "Minimize chat"}
          >
            {isMobile ? <X className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
        </div>

        {/* 🟢 TOGGLE SWITCH: CHATBOT AI vs REAL AGENT */}
        <div className="grid grid-cols-2 gap-1 px-3 pb-2.5">
          <button
            type="button"
            onClick={() => setChatMode("ai")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all",
              chatMode === "ai"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            )}
          >
            <Bot className="size-3.5" />
            <span>🤖 AI Chatbot</span>
          </button>
          <button
            type="button"
            onClick={() => setChatMode("agent")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all",
              chatMode === "agent"
                ? "bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            )}
          >
            <Headphones className="size-3.5" />
            <span>🎧 Real Agent</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={onScrollMessages}
        className={cn(CHAT_SCROLL_CLASS, "flex-1 min-h-0 p-3 space-y-2.5 bg-[#0f0f0f]")}
      >
        {messages.length === 0 ? (
          <div className="py-4 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-white uppercase tracking-wider">How can we help you today?</p>
              <p className="text-[11px] text-zinc-400">Choose your preferred support channel below:</p>
            </div>

            {/* 🟢 2 BIG INTERACTIVE CHOICE BUTTONS */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setChatMode("ai")}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3",
                  chatMode === "ai"
                    ? "bg-cyan-950/40 border-cyan-500/50 text-white shadow-md"
                    : "bg-[#181818] border-white/10 text-zinc-300 hover:bg-white/5"
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Bot className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    🤖 Chat with AI Assistant
                    {chatMode === "ai" && <span className="text-[9px] text-emerald-400 font-bold">ACTIVE</span>}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    Instant 24/7 answers for cashout speeds, $5.00 min deposits, Juwa & Orion Stars logins.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChatMode("agent")}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3",
                  chatMode === "agent"
                    ? "bg-purple-950/40 border-purple-500/50 text-white shadow-md"
                    : "bg-[#181818] border-white/10 text-zinc-300 hover:bg-white/5"
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
                  <Headphones className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white flex items-center gap-1.5">
                    🎧 Talk to Real Support Agent
                    {chatMode === "agent" && <span className="text-[9px] text-purple-400 font-bold">ACTIVE</span>}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    Connect directly with human customer service agents for complex inquiries.
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === userId;
            const isAi = msg.sender_id === "00000000-0000-0000-0000-000000000000";

            return (
              <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs break-words leading-relaxed",
                    isOwn
                      ? "bg-cyan-600 text-white font-medium rounded-br-md"
                      : isAi
                      ? "bg-zinc-800/90 text-cyan-200 border border-cyan-500/30 rounded-bl-md"
                      : "bg-[#1e1e1e] text-zinc-200 border border-white/10 rounded-bl-md"
                  )}
                >
                  <ChatMessageContent message={msg} />
                  <p className="text-[9px] opacity-60 mt-1">{formatRelativeTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={loading}
        placeholder={chatMode === "ai" ? "Ask AI Assistant..." : "Message real agent..."}
        className="bg-[#121212] border-white/10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      />
    </div>
  );
}

export function UserQuickChat({ open, conversationId, userId, onClose }: UserQuickChatProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (!open) return null;

  const panel = (
    <QuickChatPanel
      conversationId={conversationId}
      userId={userId}
      onClose={onClose}
      isMobile={isMobile}
    />
  );

  if (isMobile) {
    return (
      <MobileChatShell open={open} onClose={onClose}>
        {panel}
      </MobileChatShell>
    );
  }

  return (
    <div className="fixed bottom-[5.5rem] right-6 z-[140] w-[min(100vw-2rem,22rem)] h-[min(70vh,28rem)] rounded-2xl border border-white/10 bg-[#121212] shadow-2xl flex flex-col overflow-hidden">
      {panel}
    </div>
  );
}

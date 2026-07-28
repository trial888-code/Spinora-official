"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Minimize2, Bot, Headphones, Send, Paperclip, Loader2, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { uploadChatAttachment } from "@/lib/chat/attachments";
import {
  markConversationReadClient,
  sendMessageClient,
} from "@/lib/chat/send-message-client";
import { formatRelativeTime } from "@/lib/utils";
import { CHAT_SCROLL_CLASS } from "@/lib/chat/chat-layout";
import { useChatAutoScroll } from "@/lib/chat/use-chat-auto-scroll";
import { playIncomingMessageSound } from "@/lib/chat/message-notification-sound";
import { askWebsiteAiChatbotAction } from "@/lib/actions/admin/ai-faq-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Message } from "@/types/database";

type ChatMode = "ai" | "agent";

interface GuestMessage {
  id: string;
  sender_id: "user" | "bot";
  content: string;
  created_at: string;
  attachment_url?: string;
  attachment_type?: "image" | "file";
}

const INITIAL_WELCOME_MSG: GuestMessage = {
  id: "welcome-1",
  sender_id: "bot",
  content: "👋 Welcome to Spinora Casino VIP! I'm your 24/7 AI Assistant. How can I help you load game credits, claim bonuses, or play today?",
  created_at: new Date().toISOString(),
};

/** Unified Chat Widget for Guests and Logged-In Players */
export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestMessages, setGuestMessages] = useState<GuestMessage[]>([INITIAL_WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("ai");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const currentMsgCount = isLoggedIn ? messages.length : guestMessages.length;
  const messageFingerprint = isLoggedIn
    ? messages.length > 0 ? messages[messages.length - 1]?.id : ""
    : guestMessages.length > 0 ? guestMessages[guestMessages.length - 1]?.id : "";

  const { onScroll: onScrollMessages } = useChatAutoScroll(
    scrollRef,
    currentMsgCount,
    messageFingerprint
  );

  // Guest Chat Persistence in LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spin_guest_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGuestMessages(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (guestMessages.length > 0) {
        localStorage.setItem("spin_guest_messages", JSON.stringify(guestMessages));
      }
    } catch {}
  }, [guestMessages]);

  useEffect(() => {
    if (!supabase) {
      setIsLoggedIn(false);
      return;
    }
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true);
        setUserId(user.id);
      } else {
        setIsLoggedIn(false);
        let guestId = localStorage.getItem("spin_guest_id");
        if (!guestId) {
          guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem("spin_guest_id", guestId);
        }
        setUserId(guestId);
      }
    });
  }, [supabase]);

  const initChat = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      conv = newConv;
    }

    if (conv) {
      setConversationId(conv.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      if (msgs) setMessages(msgs);
    }
  }, [supabase]);

  useEffect(() => {
    if (open && supabase && isLoggedIn) {
      void initChat();
    }
  }, [open, initChat, supabase, isLoggedIn]);

  useEffect(() => {
    if (open && conversationId && isLoggedIn && supabase && userId) {
      void markConversationReadClient(supabase, conversationId, userId);
    }
  }, [open, conversationId, isLoggedIn, supabase, userId]);

  useEffect(() => {
    if (!conversationId || !supabase || !isLoggedIn) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          if (userId && msg.sender_id !== userId) {
            playIncomingMessageSound(msg.sender_id, userId);
            setOpen(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, isLoggedIn, userId]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const content = input.trim();
    if (!content && !selectedFile) return;

    const currentFile = selectedFile;
    const currentPreview = filePreview;
    setInput("");
    clearSelectedFile();
    setLoading(true);

    // --- GUEST VISITOR CHAT FLOW ---
    if (!isLoggedIn) {
      const userMsg: GuestMessage = {
        id: `guest_msg_${Date.now()}`,
        sender_id: "user",
        content: content || (currentFile ? `Uploaded ${currentFile.name}` : ""),
        created_at: new Date().toISOString(),
        attachment_url: currentPreview ?? undefined,
        attachment_type: currentFile?.type.startsWith("image/") ? "image" : "file",
      };

      setGuestMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch("/api/chat/live-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            hasMedia: !!currentFile,
            mediaName: currentFile?.name,
            userId: userId || "guest_visitor",
          }),
        });
        const data = await res.json();
        setLoading(false);

        const botReply: GuestMessage = {
          id: `bot_msg_${Date.now()}`,
          sender_id: "bot",
          content: data.reply || "I'm here to help! Ask me anything about games or cashouts.",
          created_at: new Date().toISOString(),
        };

        setGuestMessages((prev) => [...prev, botReply]);
        if (data.alertedTelegram) {
          toast.success("🚨 Alerted Human Support Team!");
        }
      } catch {
        setLoading(false);
        setGuestMessages((prev) => [
          ...prev,
          {
            id: `bot_msg_${Date.now()}`,
            sender_id: "bot",
            content: "⚡ I'm here! You can load game credits on your Dashboard or ask me how to play.",
            created_at: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    // --- LOGGED IN USER CHAT FLOW ---
    if (!conversationId || !userId || !supabase) {
      setLoading(false);
      toast.error("Connecting to chat server...");
      return;
    }

    let attachment: { url: string; type: "image" | "file"; name: string } | undefined;

    if (currentFile) {
      const uploadResult = await uploadChatAttachment(supabase, conversationId, currentFile);
      if ("error" in uploadResult) {
        toast.error(uploadResult.error);
        setLoading(false);
        return;
      }
      attachment = uploadResult.data;
    }

    const result = await sendMessageClient(supabase, {
      conversationId,
      senderId: userId,
      content,
      attachment,
      kind: "user",
    });

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    if (result.message) {
      setMessages((prev) =>
        prev.some((m) => m.id === result.message!.id) ? prev : [...prev, result.message!]
      );
    }

    if (chatMode === "ai" && content) {
      try {
        const aiRes = await askWebsiteAiChatbotAction(content, []);
        if (aiRes.ok && aiRes.reply) {
          await sendMessageClient(supabase, {
            conversationId,
            senderId: "00000000-0000-0000-0000-000000000000",
            content: aiRes.reply,
            kind: "admin",
          });
        }
      } catch {}
    }

    setLoading(false);
  }

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black shadow-2xl hover:scale-110 transition-transform shadow-amber-500/40 border-2 border-amber-300"
          aria-label="Open Casino Live Support Chat"
        >
          <Bot className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-bold text-black items-center justify-center">1</span>
          </span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed z-50 glass rounded-3xl shadow-2xl overflow-hidden inset-x-3 bottom-3 max-h-[min(540px,calc(100dvh-1.5rem))] flex flex-col sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 sm:max-h-[min(580px,calc(100dvh-3rem))] border border-amber-500/30 bg-zinc-950/95"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-black px-4 py-3 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-black text-xs">
                  <Bot className="h-5 w-5" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-black" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm tracking-wide">
                    Spinora VIP Support
                  </h3>
                  <p className="text-[10px] text-amber-300/80 flex items-center gap-1 font-semibold">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    24/7 AI Assistant Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mode Switch (Logged in users only) */}
            {isLoggedIn && (
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#141414] border-b border-white/10">
                <button
                  type="button"
                  onClick={() => setChatMode("ai")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-extrabold transition-all",
                    chatMode === "ai"
                      ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Bot className="size-3.5" />
                  <span>🤖 AI Assistant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChatMode("agent")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-extrabold transition-all",
                    chatMode === "agent"
                      ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Headphones className="size-3.5" />
                  <span>🎧 Human Agent</span>
                </button>
              </div>
            )}

            {/* Message Area */}
            <div
              ref={scrollRef}
              onScroll={onScrollMessages}
              className={`${CHAT_SCROLL_CLASS} p-4 space-y-3 bg-[#0a0a0a] flex-1 overflow-y-auto min-h-[300px]`}
            >
              {isLoggedIn ? (
                messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-10">
                    Send a message below to start chatting with support.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isUser = m.sender_id === userId;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex flex-col max-w-[85%] space-y-1",
                          isUser ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm",
                            isUser
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black font-medium rounded-br-none"
                              : "bg-zinc-800/90 text-zinc-100 border border-white/10 rounded-bl-none"
                          )}
                        >
                          {m.content}
                        </div>
                        <span className="text-[9px] text-zinc-500 px-1">
                          {formatRelativeTime(m.created_at)}
                        </span>
                      </div>
                    );
                  })
                )
              ) : (
                // Guest Visitor Chat Messages
                guestMessages.map((m) => {
                  const isUser = m.sender_id === "user";
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex flex-col max-w-[85%] space-y-1",
                        isUser ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm",
                          isUser
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black font-medium rounded-br-none"
                            : "bg-zinc-800/90 text-zinc-100 border border-amber-500/20 rounded-bl-none"
                        )}
                      >
                        {m.content}
                      </div>
                      {m.attachment_url && (
                        <img
                          src={m.attachment_url}
                          alt="Attachment"
                          className="max-w-[180px] rounded-lg border border-white/20 mt-1"
                        />
                      )}
                      <span className="text-[9px] text-zinc-500 px-1">
                        {formatRelativeTime(m.created_at)}
                      </span>
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-amber-300/80 mr-auto bg-zinc-900 border border-amber-500/20 px-3 py-1.5 rounded-full">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  <span>Spinora AI is typing…</span>
                </div>
              )}
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSend} className="p-3 bg-zinc-900 border-t border-white/10 flex flex-col gap-2">
              {filePreview && (
                <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-amber-500/30">
                  <img src={filePreview} alt="Preview" className="h-10 w-10 object-cover rounded" />
                  <span className="text-xs text-zinc-300 truncate flex-1">{selectedFile?.name}</span>
                  <button type="button" onClick={clearSelectedFile} className="text-zinc-400 hover:text-white p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-zinc-400 hover:text-amber-300 rounded-xl hover:bg-white/5 transition-colors shrink-0"
                  title="Upload receipt / media photo"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything or request credits..."
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/50"
                />

                <button
                  type="submit"
                  disabled={loading || (!input.trim() && !selectedFile)}
                  className="p-2 bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-40 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

              {!isLoggedIn && (
                <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1 pt-1">
                  <span>Guest visitor session</span>
                  <a href="/login" className="text-amber-300 hover:underline font-semibold">
                    Login for full VIP Perks →
                  </a>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

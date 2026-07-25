"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { uploadChatAttachment } from "@/lib/chat/attachments";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageContent } from "@/components/chat/chat-message-content";
import { MobileChatShell, useMobileChatClose } from "@/components/chat/mobile-chat-shell";
import { UnreadBadge } from "@/components/ui/unread-badge";
import {
  ensureUserConversation,
  getUserConversations,
  initUserMessagesInbox,
  type ConversationPreview,
  type UserMessagesInboxInitialData,
} from "@/lib/actions/messages";
import {
  markConversationReadClient,
  sendMessageClient,
} from "@/lib/chat/send-message-client";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { cn, formatRelativeTime } from "@/lib/utils";
import { CHAT_INBOX_CARD_CLASS, CHAT_SCROLL_CLASS } from "@/lib/chat/chat-layout";
import { useChatAutoScroll } from "@/lib/chat/use-chat-auto-scroll";
import { CHAT_INCOMING_EVENT, type ChatIncomingDetail } from "@/lib/chat/events";
import { playIncomingMessageSound } from "@/lib/chat/message-notification-sound";
import { appendMessage, mergeMessagesById } from "@/lib/chat/merge-messages";
import { subscribeToConversationInserts, subscribeToMessageInserts } from "@/lib/chat/subscribe-messages";
import { askWebsiteAiChatbotAction } from "@/lib/actions/admin/ai-faq-actions";
import { toast } from "sonner";
import { ArrowLeft, Headphones, MessageCircle, Bot } from "lucide-react";
import type { Message } from "@/types/database";

type ChatMode = "ai" | "agent";

interface UserChatPanelProps {
  showMobileBack?: boolean;
  onBack?: () => void;
  selectedConversation: ConversationPreview | undefined;
  messages: Message[];
  userId: string | null;
  selectedId: string | null;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (file: File | null) => Promise<boolean>;
  loading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScrollMessages?: () => void;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
}

function UserChatPanel({
  showMobileBack,
  onBack,
  selectedConversation,
  messages,
  userId,
  input,
  onInputChange,
  onSend,
  loading,
  scrollRef,
  onScrollMessages,
  chatMode,
  onChatModeChange,
}: UserChatPanelProps) {
  const closeViaBack = useMobileChatClose();

  function handleBack() {
    if (closeViaBack) {
      closeViaBack();
      return;
    }
    onBack?.();
  }

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select a chat from the list to start messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {/* Header Bar */}
      <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col gap-2.5 bg-[#121212] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {showMobileBack && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleBack}
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shrink-0">
            {chatMode === "ai" ? <Bot className="h-5 w-5 text-white" /> : <Headphones className="h-5 w-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-white truncate">
              {chatMode === "ai" ? "Spinora AI Assistant" : selectedConversation.title}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {chatMode === "ai" ? "Instant 24/7 AI Answers" : selectedConversation.subtitle}
            </p>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shrink-0">
            Live
          </Badge>
        </div>

        {/* 🟢 TOGGLE SWITCH: CHATBOT AI vs REAL AGENT */}
        <div className="grid grid-cols-2 gap-2 bg-[#1a1a1a] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => onChatModeChange("ai")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all",
              chatMode === "ai"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Bot className="size-4" />
            <span>🤖 AI Chatbot</span>
          </button>
          <button
            type="button"
            onClick={() => onChatModeChange("agent")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all",
              chatMode === "agent"
                ? "bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Headphones className="size-4" />
            <span>🎧 Real Agent</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScrollMessages}
        className={`${CHAT_SCROLL_CLASS} p-3 sm:p-4 pb-4 space-y-3 bg-[#0f0f0f]`}
      >
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Say hello — our team typically replies in minutes.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === userId;
            const isAi = msg.sender_id === "00000000-0000-0000-0000-000000000000";

            return (
              <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm break-words",
                    isOwn
                      ? "gradient-bg text-white rounded-br-md"
                      : isAi
                      ? "bg-zinc-800 text-cyan-200 border border-cyan-500/30 rounded-bl-md"
                      : "bg-[#1e1e1e] text-foreground border border-white/5 rounded-bl-md"
                  )}
                >
                  {!isOwn && (
                    <p className="text-[10px] font-semibold text-orange-400 mb-1">
                      {isAi ? "🤖 AI Assistant" : "Support"}
                    </p>
                  )}
                  <ChatMessageContent message={msg} />
                  <p className="text-[10px] opacity-60 mt-1">{formatRelativeTime(msg.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ChatComposer
        value={input}
        onChange={onInputChange}
        onSend={onSend}
        loading={loading}
        placeholder={chatMode === "ai" ? "Ask AI Assistant..." : "Type a message..."}
        className="bg-[#121212] border-white/10 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      />
    </div>
  );
}

export function UserMessagesInbox({
  initialData,
  profileUserId,
}: {
  initialData?: UserMessagesInboxInitialData;
  profileUserId?: string;
}) {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { refresh: refreshUnread } = useUnreadMessages();

  const [hasServerData] = useState(() => Boolean(initialData?.userId));
  const [userId, setUserId] = useState<string | null>(() => initialData?.userId ?? null);
  const [conversations, setConversations] = useState<ConversationPreview[]>(
    () => initialData?.conversations ?? []
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialData?.selectedConversationId ?? null
  );
  const [messages, setMessages] = useState<Message[]>(() => initialData?.messages ?? []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(() => !initialData?.userId);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("ai");

  const scrollRef = useRef<HTMLDivElement>(null);
  const initialConversationHandled = useRef(false);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;

  const loadConversations = useCallback(async () => {
    if (!supabase) return;
    const list = await getUserConversations();
    if (Array.isArray(list)) setConversations(list);
  }, [supabase]);

  const scheduleInboxSync = useCallback(() => {
    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(() => {
      void refreshUnread();
      void loadConversations();
    }, 200);
  }, [refreshUnread, loadConversations]);

  const loadMessages = useCallback(
    async (convId: string, options?: { syncSidebar?: boolean }) => {
      if (!supabase) return;

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      setMessages((prev) => mergeMessagesById(prev, data ?? []));
      if (userId) void markConversationReadClient(supabase, convId, userId);
      if (options?.syncSidebar !== false) {
        void refreshUnread();
        void loadConversations();
      }
    },
    [supabase, userId, refreshUnread, loadConversations]
  );

  const init = useCallback(async () => {
    if (hasServerData) {
      void refreshUnread();
      return;
    }

    if (profileUserId && !userId) {
      setUserId(profileUserId);
    }

    if (!supabase) {
      setInitLoading(false);
      return;
    }

    const activeUserId = userId ?? profileUserId;
    if (!activeUserId) {
      setInitLoading(false);
      return;
    }

    setInitLoading(true);
    try {
      const data = (await initUserMessagesInbox()) as {
        userId?: string;
        conversations?: ConversationPreview[];
        messages?: Message[];
        selectedConversationId?: string;
        error?: string;
      };

      if (!data || data.error || !data.userId) {
        return;
      }

      setUserId(data.userId);
      setConversations(data.conversations ?? []);
      if (data.selectedConversationId) {
        setSelectedId(data.selectedConversationId);
        selectedIdRef.current = data.selectedConversationId;
      }
      setMessages(data.messages ?? []);
      void refreshUnread();
    } finally {
      setInitLoading(false);
    }
  }, [supabase, refreshUnread, hasServerData, profileUserId, userId]);

  useEffect(() => {
    if (profileUserId) {
      setUserId((current) => current ?? profileUserId);
    }
  }, [profileUserId]);

  useEffect(() => {
    init();
  }, [init]);

  const openConversation = useCallback(
    async (convId: string) => {
      if (convId === selectedIdRef.current) {
        setMobileChatOpen(true);
        return;
      }
      setSelectedId(convId);
      setMobileChatOpen(true);
      await loadMessages(convId);
    },
    [loadMessages]
  );

  useEffect(() => {
    const conversationParam = searchParams.get("conversation");
    if (!conversationParam || initialConversationHandled.current || initLoading) return;
    initialConversationHandled.current = true;
    void openConversation(conversationParam);
  }, [searchParams, initLoading, openConversation]);

  const handleIncomingMessage = useCallback(
    (msg: Message) => {
      if (!supabase || !userId || msg.sender_id === userId) return;

      playIncomingMessageSound(msg.sender_id, userId);

      if (msg.conversation_id === selectedIdRef.current) {
        setMessages((prev) => appendMessage(prev, msg));
        setMobileChatOpen(true);
        void markConversationReadClient(supabase!, msg.conversation_id, userId).then(() =>
          scheduleInboxSync()
        );
        return;
      }

      setSelectedId(msg.conversation_id);
      selectedIdRef.current = msg.conversation_id;
      setMobileChatOpen(true);
      setMessages((prev) => appendMessage(prev, msg));
      scheduleInboxSync();
      void loadMessages(msg.conversation_id, { syncSidebar: false });
    },
    [userId, supabase, scheduleInboxSync, loadMessages]
  );

  useEffect(() => {
    if (!supabase || !userId) return;

    return subscribeToMessageInserts(
      supabase,
      `user-inbox-${userId}`,
      userId,
      (msg) => {
        if (msg.conversation_id === selectedIdRef.current) return;
        handleIncomingMessage(msg);
      }
    );
  }, [supabase, userId, handleIncomingMessage]);

  useEffect(() => {
    if (!supabase || !selectedId) return;

    return subscribeToConversationInserts(
      supabase,
      `user-live-${selectedId}`,
      selectedId,
      (msg) => {
        if (msg.sender_id === userId) return;
        handleIncomingMessage(msg);
      }
    );
  }, [supabase, selectedId, userId, handleIncomingMessage]);

  useEffect(() => {
    if (!supabase || !selectedId) return;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) setMessages((prev) => mergeMessagesById(prev, data));
        });
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [supabase, selectedId]);

  const messageFingerprint = messages.length > 0 ? messages[messages.length - 1]?.id : "";
  const { onScroll: onScrollMessages } = useChatAutoScroll(
    scrollRef,
    messages.length,
    messageFingerprint
  );

  async function selectConversation(convId: string) {
    await openConversation(convId);
  }

  async function handleSend(file: File | null): Promise<boolean> {
    if ((!input.trim() && !file) || !selectedId) return false;
    if (!supabase) {
      toast.error("Chat is unavailable. Check your connection.");
      return false;
    }

    setLoading(true);
    const content = input.trim();
    setInput("");

    let attachment:
      | { url: string; type: "image" | "file"; name: string }
      | undefined;

    if (file) {
      const uploadResult = await uploadChatAttachment(supabase, selectedId, file);
      if ("error" in uploadResult) {
        toast.error(uploadResult.error);
        setInput(content);
        setLoading(false);
        return false;
      }
      attachment = uploadResult.data;
    }

    const result = await sendMessageClient(supabase, {
      conversationId: selectedId,
      senderId: userId!,
      content,
      attachment,
      kind: "user",
    });
    if (result.error) {
      toast.error(result.error);
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
            conversationId: selectedId,
            senderId: "00000000-0000-0000-0000-000000000000",
            content: aiRes.reply,
            kind: "admin",
          });
        }
      } catch {}
    }

    setLoading(false);
    scheduleInboxSync();
    return true;
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const chatPanelProps = {
    selectedConversation,
    messages,
    userId,
    selectedId,
    input,
    onInputChange: setInput,
    onSend: handleSend,
    loading,
    scrollRef,
    onScrollMessages,
    chatMode,
    onChatModeChange: setChatMode,
  };

  if (initLoading) {
    return (
      <Card className={`${CHAT_INBOX_CARD_CLASS} items-center justify-center`}>
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      </Card>
    );
  }

  if (!supabase || !userId) {
    return (
      <Card className={`${CHAT_INBOX_CARD_CLASS} items-center justify-center p-8 text-center`}>
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm font-semibold text-white mb-1">Log in to view your messages</p>
        <p className="text-xs text-muted-foreground mb-4">
          Chat with our support team to get help with deposits, cashouts, or game issues.
        </p>
        <Button size="sm" asChild>
          <a href="/login">Log In</a>
        </Button>
      </Card>
    );
  }

  return (
    <Card className={`${CHAT_INBOX_CARD_CLASS} p-0 overflow-hidden`}>
      <div className="flex flex-1 min-h-0 h-full">
        {/* Desktop Sidebar Conversations List */}
        <div className="w-80 border-r border-white/10 flex flex-col bg-[#141414] shrink-0 hidden md:flex">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">Messages</h2>
            {conversations.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {conversations.length}
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No messages yet</p>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => selectConversation(conv.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3",
                      isSelected ? "bg-white/10 text-white" : "hover:bg-white/5 text-muted-foreground"
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shrink-0 font-bold text-white text-xs">
                      {chatMode === "ai" ? <Bot className="size-4" /> : <Headphones className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-semibold text-white truncate">{conv.title}</p>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && <UnreadBadge count={conv.unreadCount} />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Panel (Desktop) */}
        <div className="hidden md:flex flex-1 flex-col min-w-0">
          <UserChatPanel {...chatPanelProps} />
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex-1 flex flex-col min-w-0">
          <MobileChatShell
            open={mobileChatOpen}
            onClose={() => setMobileChatOpen(false)}
          >
            <UserChatPanel {...chatPanelProps} showMobileBack onBack={() => setMobileChatOpen(false)} />
          </MobileChatShell>

          {!mobileChatOpen && (
            <div className="flex-1 flex flex-col p-3 space-y-2 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No message history</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      void ensureUserConversation().then((res) => {
                        if (res.conversationId) void openConversation(res.conversationId);
                      });
                    }}
                  >
                    Start Chat
                  </Button>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => selectConversation(conv.id)}
                    className="w-full text-left p-3.5 rounded-xl border border-white/10 bg-[#161616] flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                      {chatMode === "ai" ? <Bot className="size-5" /> : <Headphones className="size-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{conv.title}</p>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && <UnreadBadge count={conv.unreadCount} />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

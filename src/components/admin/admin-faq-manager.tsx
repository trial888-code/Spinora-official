"use client";

import { useState } from "react";
import { Plus, Trash2, HelpCircle, Sparkles, Send, Bot, User, CheckCircle2, MessageSquarePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { askWebsiteAiChatbotAction, generateWebsiteFaqsAction } from "@/lib/actions/admin/ai-faq-actions";

type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

const INITIAL_FAQS: FaqItem[] = [
  {
    id: "1",
    category: "Cashouts",
    question: "How fast are cashouts processed?",
    answer: "Cashouts are processed and sent to your CashApp, Venmo, or PayPal within 5 to 15 minutes 24/7!",
  },
  {
    id: "2",
    category: "Deposits",
    question: "What is the minimum deposit amount?",
    answer: "Minimum deposit is only $5.00 via CashApp, Venmo, PayPal, Chime, or Crypto.",
  },
  {
    id: "3",
    category: "Game Account",
    question: "How do I get my Juwa or Orion Stars login?",
    answer: "Your game login pin is generated automatically upon deposit and sent directly to your inbox!",
  },
  {
    id: "4",
    category: "Bonuses",
    question: "Is there a daily deposit match bonus?",
    answer: "Yes! We offer a 50% match bonus on your daily deposit plus free slot spins.",
  },
];

type Message = {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
};

export function WebsiteAiChatbotManager() {
  const [faqs, setFaqs] = useState<FaqItem[]>(INITIAL_FAQS);
  const [category, setCategory] = useState("Cashouts");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [generating, setGenerating] = useState(false);

  // Live Interactive Chat Simulation State powered by Gemini AI
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "👋 Hey there! I'm your Spinora AI Concierge. Ask me anything about deposits, cashouts, or game logins!",
      timestamp: "Just now",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  function handleAddFaq() {
    if (!question.trim() || !answer.trim()) {
      toast.error("Please enter both a question and an answer.");
      return;
    }

    const newItem: FaqItem = {
      id: Date.now().toString(),
      category: category.trim() || "General",
      question: question.trim(),
      answer: answer.trim(),
    };

    setFaqs((prev) => [newItem, ...prev]);
    setQuestion("");
    setAnswer("");
    toast.success("✅ New FAQ Saved & Injected into Website AI memory!");
  }

  async function handleAutoGenerateFaqs() {
    setGenerating(true);
    toast.info("Generating website FAQs using Google Gemini AI...");

    try {
      const res = await generateWebsiteFaqsAction();
      setGenerating(false);

      if (!res.ok || !res.faqs) {
        toast.error(res.error || "Could not generate FAQs using Gemini AI.");
        return;
      }

      setFaqs((prev) => [...res.faqs!, ...prev]);
      toast.success(`✨ Generated ${res.faqs.length} new website FAQs using Gemini AI!`);
    } catch {
      setGenerating(false);
      toast.error("Error connecting to Gemini AI.");
    }
  }

  function handleDeleteFaq(id: string) {
    setFaqs((prev) => prev.filter((item) => item.id !== id));
    toast.success("FAQ deleted from AI memory.");
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setChatMessages((prev) => [...prev, { sender: "user", text: userText, timestamp: timeStr }]);
    setInputMsg("");
    setIsTyping(true);

    try {
      const res = await askWebsiteAiChatbotAction(userText, faqs, "Friendly Host");
      setIsTyping(false);

      const botReply = res.ok && res.reply ? res.reply : "Hey! I'm here to help you. For cashout or deposit support, our 24/7 cashier team is ready to assist!";

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setIsTyping(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 🟢 STEP 1: HUGE FAQ ADDING FORM & GEMINI AI 1-CLICK GENERATOR */}
      <GlassCard className="p-6 border-2 border-cyan-500/50 bg-gradient-to-r from-cyan-950/30 via-zinc-900 to-black space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40">
              <MessageSquarePlus className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                ➕ WEBSITE FAQ &amp; KNOWLEDGE FORM
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                  REAL HUMAN UNDERSTANDING (GEMINI AI)
                </span>
              </h2>
              <p className="text-xs text-cyan-200/80">
                Add custom questions manually or use <strong>Google Gemini AI</strong> to generate FAQs customized for your website!
              </p>
            </div>
          </div>

          <Button
            onClick={() => void handleAutoGenerateFaqs()}
            disabled={generating}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs gap-2 py-5 px-5 rounded-xl shadow-lg border border-purple-400/30 shrink-0"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4 text-amber-300 fill-amber-300" />
            )}
            {generating ? "Gemini AI Generating..." : "✨ Auto-Generate Website FAQs with Gemini AI"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-cyan-300 block mb-1">1. Category Name</label>
            <Input
              placeholder="e.g. Cashouts, Deposits, Rules"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-black/60 border-cyan-500/30 text-white placeholder:text-zinc-500 font-medium"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-cyan-300 block mb-1">2. Customer Question</label>
            <Input
              placeholder="e.g. How do I redeem my cashout winnings?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="bg-black/60 border-cyan-500/30 text-white placeholder:text-zinc-500 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-cyan-300 block mb-1">3. Human-Like AI Answer</label>
          <Textarea
            placeholder="e.g. Cashouts are reviewed and sent via CashApp/Venmo within 5-15 minutes 24/7!"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            className="bg-black/60 border-cyan-500/30 text-white placeholder:text-zinc-500 font-medium"
          />
        </div>

        <Button
          onClick={handleAddFaq}
          className="w-full py-6 text-sm font-extrabold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black shadow-lg"
        >
          <Plus className="size-5 mr-2 stroke-[3]" /> SAVE NEW FAQ TO WEBSITE AI MEMORY
        </Button>
      </GlassCard>

      {/* 🟢 STEP 2: ACTIVE FAQS LIST & LIVE CHAT SIMULATOR */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Active Saved FAQs List (7 Cols) */}
        <div className="lg:col-span-7">
          <GlassCard className="p-6 border-border/50 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <HelpCircle className="size-4 text-cyan-400" /> Active AI Memory FAQs ({faqs.length})
              </h3>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-xl border border-border/50 bg-black/40 p-4 space-y-2 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase">
                          {faq.category}
                        </span>
                        <p className="text-sm font-bold text-white">❓ {faq.question}</p>
                      </div>
                      <p className="text-xs text-zinc-300 pl-1 leading-relaxed">💡 {faq.answer}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 shrink-0 font-bold text-xs"
                    >
                      <Trash2 className="size-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Live Website AI Simulator (5 Cols) */}
        <div className="lg:col-span-5">
          <GlassCard className="p-0 border-cyan-500/40 overflow-hidden flex flex-col h-[520px]">
            <div className="bg-cyan-950/40 border-b border-cyan-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Live AI Human Understanding Tester</h4>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Powered by Google Gemini AI
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-black/40 text-xs">
              {chatMessages.map((m, idx) => (
                <div key={idx} className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {m.sender === "bot" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                      <Bot className="size-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      m.sender === "user"
                        ? "bg-cyan-600 text-white font-medium"
                        : "bg-zinc-800 text-zinc-200 border border-zinc-700/50"
                    }`}
                  >
                    <p>{m.text}</p>
                  </div>
                  {m.sender === "user" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-300 text-[10px]">
                      <User className="size-3.5" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && <p className="text-[10px] text-cyan-400 italic flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> Gemini AI understanding message...</p>}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-border/40 bg-background flex gap-2">
              <Input
                placeholder="Type any natural message or typo to test human understanding..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="bg-background text-xs"
              />
              <Button type="submit" size="icon" className="bg-cyan-600 hover:bg-cyan-500 text-white shrink-0">
                <Send className="size-3.5" />
              </Button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// Purpose: SCR-15 AI Spending Assistant screen — provides a conversational Q&A interface for natural-language questions about trip expenses, settlements, and member balances. The AI reads pre-computed Firestore data only and NEVER recalculates or overrides Module 4 deterministic financial math. Also includes the AI audit summary generator for PDF reports.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuthStore } from "@/store/authStore";
import { subscribeToTrip } from "@/lib/firebase/trips";
import { subscribeToTripExpenses } from "@/lib/firebase/expenses";
import { subscribeToTripSettlements } from "@/lib/firebase/settlements";
import type { TripDocument } from "@/types/trip";
import type { ExpenseDocument } from "@/types/expense";
import type { SettlementDocument } from "@/types/settlement";
import type { ChatRequestBody } from "@/app/api/ai/chat/route";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  FileText,
  AlertCircle,
  Copy,
  CheckCheck,
} from "lucide-react";
import toast from "react-hot-toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

const SUGGESTED_QUESTIONS_EN = [
  "How much did we spend on food?",
  "Who paid the most?",
  "Who owes the most money?",
  "What is the total trip cost?",
  "Which category had the highest spend?",
  "Are all settlements complete?",
];

const SUGGESTED_QUESTIONS_TA = [
  "உணவுக்கு எவ்வளவு செலவானது?",
  "யார் அதிகம் பணம் செலுத்தினார்?",
  "யார் அதிகம் கடன்பட்டிருக்கிறார்?",
  "மொத்த பயண செலவு என்ன?",
  "எந்த வகையில் அதிகம் செலவானது?",
  "எல்லா தீர்வுகளும் முடிந்தனவா?",
];

export default function AiAssistantPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { lang } = useLanguage();
  const { user } = useAuthStore();

  const [trip, setTrip] = useState<TripDocument | null>(null);
  const [expenses, setExpenses] = useState<ExpenseDocument[]>([]);
  const [settlements, setSettlements] = useState<SettlementDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI summary state
  const [summaryText, setSummaryText] = useState<string>("");
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Real-time subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!tripId) return;
    return subscribeToTrip(tripId, (data) => {
      if (data) {
        setTrip(data);
      } else {
        const sampleDemo: TripDocument = {
          tripId: tripId || "demo-trip",
          name: "Ooty Trip 2026",
          destination: "Ooty, Tamil Nadu",
          startDate: "2026-08-20",
          endDate: "2026-08-25",
          createdBy: "user_demo",
          totalExpensePaise: 920000,
          stops: [],
          members: [
            { memberId: "m1", name: "Anand", phone: "+919876543210", upiId: "anand@okhdfcbank", joinedAt: {} as any },
            { memberId: "m2", name: "Bala", phone: "+919876543211", upiId: "bala@paytm", joinedAt: {} as any },
            { memberId: "m3", name: "Chitra", phone: "+919876543212", upiId: "chitra@ybl", joinedAt: {} as any },
          ],
          memberIds: ["m1", "m2", "m3"],
          createdAt: {} as any,
        };
        setTrip(sampleDemo);
      }
      setLoading(false);
    });
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    return subscribeToTripExpenses(tripId, setExpenses);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    return subscribeToTripSettlements(tripId, (all) => {
      setSettlements(all.filter((s) => s.status !== "replaced"));
    });
  }, [tripId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Member balances (same logic as Module 4 display — read-only) ──────────
  const memberBalances = (trip?.members || []).map((member) => {
    const paid = expenses
      .filter((e) => e.paidBy === member.memberId)
      .reduce((s, e) => s + e.amountPaise, 0);
    const share = expenses
      .flatMap((e) => e.splitDetails)
      .filter((d) => d.memberId === member.memberId)
      .reduce((s, d) => s + d.sharePaise, 0);
    return {
      name: member.name,
      totalPaidPaise: paid,
      totalSharePaise: share,
      netBalancePaise: paid - share,
    };
  });

  const memberName = (id: string) =>
    trip?.members.find((m) => m.memberId === id)?.name ?? id;

  // ── Build serialized context for AI ──────────────────────────────────────
  const buildContext = useCallback((): ChatRequestBody["context"] | null => {
    if (!trip) return null;
    return {
      tripName: trip.name,
      destination: trip.destination,
      totalExpensePaise: trip.totalExpensePaise,
      memberCount: trip.members.length,
      expenses: expenses.map((e) => ({
        description: e.description,
        category: e.category,
        amountPaise: e.amountPaise,
        paidByName: memberName(e.paidBy),
      })),
      memberBalances,
      settlements: settlements.map((s) => ({
        fromName: memberName(s.fromMemberId),
        toName: memberName(s.toMemberId),
        amountPaise: s.amountPaise,
        status: s.status,
      })),
    };
  }, [trip, expenses, settlements, memberBalances]);

  // ── Send chat message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const context = buildContext();
    if (!context) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setSending(true);

    try {
      const body: ChatRequestBody = {
        question: text.trim(),
        lang: lang as "ta" | "en",
        context,
      };

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const resetHeader = res.headers.get("X-RateLimit-Reset");
        const resetIn = resetHeader
          ? Math.max(0, Math.ceil((parseInt(resetHeader) * 1000 - Date.now()) / 1000))
          : 60;
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: lang === "ta"
              ? `அதிக கோரிக்கைகள். ${resetIn} வினாடிகளுக்குப் பிறகு மீண்டும் முயற்சிக்கவும்.`
              : `Too many requests. Please wait ${resetIn} seconds before asking again.`,
            timestamp: new Date(),
            error: true,
          },
        ]);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.answer || data.error || "No response",
          timestamp: new Date(),
          error: !!data.error,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: lang === "ta"
            ? "AI உதவியாளர் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."
            : "AI assistant is unavailable. Please try again.",
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [sending, lang, buildContext]);

  // ── Generate AI summary ──────────────────────────────────────────────────
  const generateSummary = async () => {
    if (!trip || generatingSummary) return;
    setGeneratingSummary(true);

    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amountPaise;
    });
    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amountPaise]) => ({ category, amountPaise }));

    const topSpender = memberBalances.reduce<{ name: string; amountPaise: number } | null>(
      (best, mb) =>
        !best || mb.totalPaidPaise > best.amountPaise
          ? { name: mb.name, amountPaise: mb.totalPaidPaise }
          : best,
      null
    );

    const settledCount = settlements.filter((s) => s.status === "settled").length;

    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          tripName: trip.name,
          destination: trip.destination,
          totalExpensePaise: trip.totalExpensePaise,
          memberCount: trip.members.length,
          startDate: trip.startDate,
          endDate: trip.endDate,
          topCategories,
          topSpender,
          settledCount,
          totalSettlements: settlements.length,
          estimatedDistanceKm: trip.estimatedDistanceMeters
            ? Math.round(trip.estimatedDistanceMeters / 1000)
            : undefined,
        }),
      });

      const data = await res.json();
      if (data.summary) {
        setSummaryText(data.summary);
        toast.success(
          lang === "ta" ? "AI சுருக்கம் உருவாக்கப்பட்டது!" : "AI summary generated!"
        );
      } else {
        throw new Error(data.error || "No summary returned");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(lang === "ta" ? `சுருக்கம் உருவாக்க முடியவில்லை: ${msg}` : `Summary failed: ${msg}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading || !trip) {
    return (
      <div className="min-h-screen bg-[#08131d] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const questions = lang === "ta" ? SUGGESTED_QUESTIONS_TA : SUGGESTED_QUESTIONS_EN;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08131d] via-[#0b1b2b] to-[#060e17] text-white flex flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#08131d]/85 border-b border-white/10 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>{lang === "ta" ? "AI பயண உதவியாளர்" : "AI Spending Assistant"}</span>
            </h1>
            <p className="text-[11px] text-amber-400 font-medium truncate">
              {trip.name} · {lang === "ta" ? "படிக்க மட்டுமே" : "Read-only · Never overrides math"}
            </p>
          </div>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-4 overflow-hidden">

        {/* Read-only disclaimer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300 leading-relaxed">
            {lang === "ta"
              ? "AI உதவியாளர் தரவை விளக்குகிறது மட்டுமே. உண்மையான கணக்கீடுகள் (Module 4) மாறாது."
              : "AI explains pre-computed data only. All balance & settlement math (Module 4) is deterministic and immutable."}
          </p>
        </div>

        {/* ─── AI Audit Summary Card ─── */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-400" />
              <span>{lang === "ta" ? "AI தணிக்கை சுருக்கம்" : "AI Audit Summary"}</span>
            </h2>
            <button
              type="button"
              onClick={generateSummary}
              disabled={generatingSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {generatingSummary ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span>
                {generatingSummary
                  ? lang === "ta" ? "உருவாக்குகிறது…" : "Generating…"
                  : summaryText
                  ? lang === "ta" ? "மீண்டும் உருவாக்கு" : "Regenerate"
                  : lang === "ta" ? "உருவாக்கு" : "Generate"}
              </span>
            </button>
          </div>

          {summaryText ? (
            <div className="relative">
              <p className="text-xs text-gray-200 leading-relaxed">{summaryText}</p>
              <button
                type="button"
                onClick={() => handleCopy("summary", summaryText)}
                className="absolute top-0 right-0 p-1 text-gray-500 hover:text-white"
                title="Copy summary"
              >
                {copiedId === "summary"
                  ? <CheckCheck className="h-3.5 w-3.5 text-teal-400" />
                  : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              {lang === "ta"
                ? "AI-ஐ கொண்டு உங்கள் பயண செலவுகளின் சுருக்கத்தை PDF க்காக உருவாக்குங்கள்."
                : "Generate a plain-language spending summary for your PDF report."}
            </p>
          )}
        </div>

        {/* ─── Chat Window ─── */}
        <div className="flex-1 flex flex-col min-h-0 rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[400px]">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {lang === "ta" ? "வணக்கம்! என்ன கேட்கலாம்?" : "Ask me about your trip spending"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {lang === "ta"
                      ? "பயண செலவுகள் பற்றி கேளுங்கள்"
                      : "Questions about expenses, balances & settlements"}
                  </p>
                </div>

                {/* Suggested questions */}
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {questions.slice(0, 4).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed relative group",
                    msg.role === "user"
                      ? "bg-teal-600 text-white rounded-tr-sm"
                      : msg.error
                      ? "bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-tl-sm"
                      : "bg-white/[0.05] border border-white/10 text-gray-200 rounded-tl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && !msg.error && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="absolute top-1.5 right-1.5 p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-all"
                    >
                      {copiedId === msg.id
                        ? <CheckCheck className="h-3 w-3 text-teal-400" />
                        : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-teal-400" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.05] border border-white/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (after first message) */}
          {messages.length > 0 && (
            <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto">
              {questions.slice(0, 3).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={sending}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white whitespace-nowrap shrink-0 transition-all disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputText);
                }
              }}
              placeholder={
                lang === "ta"
                  ? "செலவுகள் பற்றி கேளுங்கள்…"
                  : "Ask about your trip spending…"
              }
              maxLength={500}
              disabled={sending}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-teal-500 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendMessage(inputText)}
              disabled={sending || !inputText.trim()}
              className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Purpose: Next.js Route Handler for conversational spending Q&A — accepts pre-serialized trip financial context (expenses, settlements, member balances) plus a user question, sends it to Gemini via the secure server-side gateway, and returns a natural-language answer. The AI NEVER recomputes balances or overrides Module 4 deterministic math.

import { NextRequest, NextResponse } from "next/server";
import { geminiGenerateText } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/aiRateLimit";

export const runtime = "nodejs";

// ─── System Prompt: guard rails for financial AI ─────────────────────────────

const CHAT_SYSTEM_PROMPT_EN = `You are a helpful travel expense assistant for the Vazhithunai trip expense tracker app.

STRICT RULES you MUST follow:
1. You ONLY explain and summarize the pre-computed financial data provided in the context. You NEVER recalculate balances, splits, or settlements yourself.
2. The numbers in the context are authoritative and deterministic — do NOT second-guess or recalculate them.
3. Answer only questions related to the trip's spending data. Politely decline off-topic requests.
4. Keep responses concise (3-5 sentences max unless the user asks for detail).
5. Format amounts in Indian Rupees (₹). Convert paise to rupees by dividing by 100.
6. Be friendly and helpful. Use the member names from the context (not member IDs).
7. Do NOT reveal raw internal data structures, paise integers, or member IDs to the user.`;

const CHAT_SYSTEM_PROMPT_TA = `நீங்கள் வழித்துணை பயண செலவு கண்காணிப்பு பயன்பாட்டிற்கான உதவியாளர்.

கண்டிப்பான விதிகள்:
1. வழங்கப்பட்ட நிதி தரவை மட்டுமே விளக்குங்கள். நீங்கள் கணக்கீடுகளை மறுவிசாரிக்க வேண்டாம்.
2. சூழலில் உள்ள எண்கள் சரியானவை — அவற்றை மீண்டும் கணக்கிட வேண்டாம்.
3. பயண செலவுகளுடன் தொடர்புடைய கேள்விகளுக்கு மட்டுமே பதில் சொல்லுங்கள்.
4. பதில்களை சுருக்கமாக வையுங்கள் (3-5 வாக்கியங்கள்).
5. தொகைகளை இந்திய ரூபாயில் (₹) காட்டுங்கள்.
6. உறுப்பினர் பெயர்களை பயன்படுத்துங்கள், ID-களை அல்ல.`;

export interface ChatRequestBody {
  question: string;
  lang: "ta" | "en";
  context: {
    tripName: string;
    destination: string;
    totalExpensePaise: number;
    memberCount: number;
    expenses: Array<{
      description: string;
      category: string;
      amountPaise: number;
      paidByName: string;
    }>;
    memberBalances: Array<{
      name: string;
      totalPaidPaise: number;
      totalSharePaise: number;
      netBalancePaise: number;
    }>;
    settlements: Array<{
      fromName: string;
      toName: string;
      amountPaise: number;
      status: string;
    }>;
  };
}

/**
 * POST /api/ai/chat
 * Body: ChatRequestBody JSON
 * Returns: { answer: string } or { error: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Rate limit: 10 chat messages per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`chat:${ip}`, 10, 60_000);

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
  };

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment before asking again." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  // 2. Parse request body
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: rateLimitHeaders });
  }

  const { question, lang, context } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400, headers: rateLimitHeaders });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "Question too long (max 500 chars)" }, { status: 400, headers: rateLimitHeaders });
  }

  // 3. Serialize context for the prompt
  const totalInr = (context.totalExpensePaise / 100).toFixed(2);
  const avgPerMemberInr = context.memberCount > 0
    ? (context.totalExpensePaise / context.memberCount / 100).toFixed(2)
    : "0.00";

  const contextText = `
=== TRIP FINANCIAL DATA (READ-ONLY) ===
Trip: ${context.tripName}
Destination: ${context.destination}
Total Spend: ₹${totalInr}
Members: ${context.memberCount}
Average per member: ₹${avgPerMemberInr}

--- EXPENSES (${context.expenses.length} total) ---
${context.expenses
    .map(
      (e) =>
        `• ${e.paidByName} paid ₹${(e.amountPaise / 100).toFixed(2)} for "${e.description}" [${e.category}]`
    )
    .join("\n")}

--- NET BALANCES (pre-computed, authoritative) ---
${context.memberBalances
    .map((mb) => {
      const net = (mb.netBalancePaise / 100).toFixed(2);
      const role = mb.netBalancePaise > 0 ? "is owed" : mb.netBalancePaise < 0 ? "owes" : "is settled";
      return `• ${mb.name} paid ₹${(mb.totalPaidPaise / 100).toFixed(2)}, share ₹${(mb.totalSharePaise / 100).toFixed(2)} — ${role} ₹${Math.abs(Number(net)).toFixed(2)}`;
    })
    .join("\n")}

--- SETTLEMENTS ---
${context.settlements
    .map((s) => `• ${s.fromName} → ${s.toName}: ₹${(s.amountPaise / 100).toFixed(2)} [${s.status}]`)
    .join("\n") || "No settlements recorded yet."}
=== END OF DATA ===

USER QUESTION: ${question}`;

  // 4. Call Gemini
  try {
    const systemPrompt = lang === "ta" ? CHAT_SYSTEM_PROMPT_TA : CHAT_SYSTEM_PROMPT_EN;
    const answer = await geminiGenerateText(contextText, systemPrompt, {
      temperature: 0.4,
      maxOutputTokens: 512,
    });

    return NextResponse.json({ answer }, { headers: rateLimitHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AI Chat] Gemini error:", message);

    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured. Add GEMINI_API_KEY to .env.local" },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      { error: "AI assistant is unavailable. Please try again later." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

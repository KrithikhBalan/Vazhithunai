// Purpose: Next.js Route Handler for AI-generated trip audit summary — accepts pre-serialized trip financial context and language preference, sends to Gemini, and returns a concise plain-language paragraph describing spending patterns for inclusion in the PDF report (Module 7). Rate-limited to 5 requests per minute.

import { NextRequest, NextResponse } from "next/server";
import { geminiGenerateText } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/aiRateLimit";

export const runtime = "nodejs";

interface SummaryRequestBody {
  lang: "ta" | "en";
  tripName: string;
  destination: string;
  totalExpensePaise: number;
  memberCount: number;
  startDate: string;
  endDate: string;
  topCategories: Array<{ category: string; amountPaise: number }>;
  topSpender: { name: string; amountPaise: number } | null;
  settledCount: number;
  totalSettlements: number;
  estimatedDistanceKm?: number;
}

/**
 * POST /api/ai/summary
 * Body: SummaryRequestBody JSON
 * Returns: { summary: string } or { error: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Rate limit: 5 summaries per minute per IP (more expensive operation)
  const ip = getClientIp(req);
  const rl = checkRateLimit(`summary:${ip}`, 5, 60_000);

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
  };

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating another summary." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  // 2. Parse body
  let body: SummaryRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: rateLimitHeaders });
  }

  const {
    lang,
    tripName,
    destination,
    totalExpensePaise,
    memberCount,
    startDate,
    endDate,
    topCategories,
    topSpender,
    settledCount,
    totalSettlements,
    estimatedDistanceKm,
  } = body;

  const totalInr = (totalExpensePaise / 100).toFixed(2);
  const avgInr = memberCount > 0
    ? (totalExpensePaise / memberCount / 100).toFixed(2)
    : "0.00";

  const categoryList = topCategories
    .slice(0, 5)
    .map((c) => `${c.category} (₹${(c.amountPaise / 100).toFixed(0)})`)
    .join(", ");

  // 3. Build prompt
  const prompt = lang === "ta"
    ? `நீங்கள் ஒரு நிதி அறிக்கை எழுத்தாளர். பின்வரும் பயண செலவு தரவை வைத்து, சுருக்கமான, இயற்கையான தமிழ் பத்தியை உருவாக்குங்கள். கவிதை வேண்டாம், ஒரு தெளிவான பத்தி மட்டும்.

பயண பெயர்: ${tripName}
சேருமிடம்: ${destination}
தேதிகள்: ${startDate} முதல் ${endDate} வரை
உறுப்பினர்கள்: ${memberCount} பேர்
மொத்த செலவு: ₹${totalInr}
ஒருவருக்கு சராசரி: ₹${avgInr}
முக்கிய வகைகள்: ${categoryList}
${topSpender ? `அதிகம் செலுத்தியவர்: ${topSpender.name} (₹${(topSpender.amountPaise / 100).toFixed(0)})` : ""}
${estimatedDistanceKm ? `மதிப்பிடப்பட்ட தூரம்: ${estimatedDistanceKm} கி.மீ` : ""}
தீர்வு நிலை: ${settledCount}/${totalSettlements} முடிந்தது

ஒரு அழகான, தெளிவான தமிழ் பத்தியில் இந்த பயண செலவை விளக்குங்கள்:`
    : `You are a financial report writer. Based on the trip expense data below, write a concise, natural English paragraph summarizing the trip's spending patterns. Write one clear paragraph only, no bullet points.

Trip: ${tripName}
Destination: ${destination}
Dates: ${startDate} to ${endDate}
Members: ${memberCount}
Total Spend: ₹${totalInr}
Average per member: ₹${avgInr}
Top spending categories: ${categoryList}
${topSpender ? `Largest contributor: ${topSpender.name} (₹${(topSpender.amountPaise / 100).toFixed(0)})` : ""}
${estimatedDistanceKm ? `Estimated distance: ${estimatedDistanceKm} km` : ""}
Settlement status: ${settledCount}/${totalSettlements} complete

Write a concise, professional summary paragraph:`;

  // 4. Call Gemini
  try {
    const summary = await geminiGenerateText(prompt, undefined, {
      temperature: 0.6,
      maxOutputTokens: 300,
    });

    // Clean up any markdown artifacts
    const cleaned = summary
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

    return NextResponse.json({ summary: cleaned }, { headers: rateLimitHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AI Summary] Gemini error:", message);

    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured. Add GEMINI_API_KEY to .env.local" },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      { error: "Summary generation failed. Please try again." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

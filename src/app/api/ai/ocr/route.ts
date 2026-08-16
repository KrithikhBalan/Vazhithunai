// Purpose: Next.js Route Handler for receipt/bill OCR — accepts a multipart/form-data image upload, sends it to Gemini Vision through the server-side gateway (GEMINI_API_KEY never leaves the server), and returns extracted {amountPaise, description, category} JSON for pre-filling the expense form. The user must confirm before saving.

import { NextRequest, NextResponse } from "next/server";
import { geminiAnalyzeImage } from "@/lib/gemini";
import { checkRateLimit, getClientIp } from "@/lib/aiRateLimit";
import type { ExpenseCategory } from "@/types/expense";

export const runtime = "nodejs";

// Valid expense categories for validation
const VALID_CATEGORIES: ExpenseCategory[] = [
  "fuel", "toll", "food", "tea_snacks", "hotel",
  "parking", "tickets", "shopping", "travel", "miscellaneous",
];

const OCR_SYSTEM_PROMPT = `You are a receipt/bill OCR assistant for a travel expense app.
Analyze the provided receipt image and extract the following information.
Return ONLY a valid JSON object with these exact fields:
{
  "amountPaise": <integer — total amount in Indian Paise (1 INR = 100 Paise), 0 if unclear>,
  "description": "<vendor name or brief description, max 60 chars>",
  "category": "<one of: fuel | toll | food | tea_snacks | hotel | parking | tickets | shopping | travel | miscellaneous>",
  "confidence": <0.0 to 1.0 — your confidence in the extraction>
}
Rules:
- amountPaise must be an integer (multiply INR amount by 100)
- If the total is unclear, set amountPaise to 0
- Pick the most appropriate category from the allowed list
- Return ONLY the JSON object, no markdown, no explanation`;

/**
 * POST /api/ai/ocr
 * Body: FormData with field "image" (File)
 * Returns: { amountPaise, description, category, confidence } or { error }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Rate limit: 10 OCR scans per minute per IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(`ocr:${ip}`, 10, 60_000);

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
  };

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before scanning again." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: rateLimitHeaders });
  }

  const imageFile = formData.get("image") as File | null;
  if (!imageFile || imageFile.size === 0) {
    return NextResponse.json({ error: "No image provided" }, { status: 400, headers: rateLimitHeaders });
  }

  // 3. Validate file type and size
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
  if (!allowedMimes.includes(imageFile.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP, or HEIC." },
      { status: 400, headers: rateLimitHeaders }
    );
  }
  if (imageFile.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large. Max 10MB." }, { status: 400, headers: rateLimitHeaders });
  }

  // 4. Convert to base64 for Gemini Vision API
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  // 5. Call Gemini Vision
  try {
    const rawResponse = await geminiAnalyzeImage(
      base64,
      imageFile.type,
      OCR_SYSTEM_PROMPT,
      { temperature: 0.1, maxOutputTokens: 256 }
    );

    // 6. Parse and validate JSON response
    let parsed: {
      amountPaise?: number;
      description?: string;
      category?: string;
      confidence?: number;
    };

    try {
      // Strip potential markdown fences
      const cleaned = rawResponse.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[OCR] Failed to parse Gemini JSON:", rawResponse);
      return NextResponse.json(
        { error: "OCR model returned invalid JSON. Please try again." },
        { status: 500, headers: rateLimitHeaders }
      );
    }

    // 7. Sanitize output
    const amountPaise = Math.max(0, Math.floor(Number(parsed.amountPaise) || 0));
    const description = String(parsed.description || "").slice(0, 60).trim();
    const category: ExpenseCategory = VALID_CATEGORIES.includes(parsed.category as ExpenseCategory)
      ? (parsed.category as ExpenseCategory)
      : "miscellaneous";
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));

    return NextResponse.json(
      { amountPaise, description, category, confidence, aiGenerated: true },
      { headers: rateLimitHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[OCR] Gemini error:", message);

    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured. Add GEMINI_API_KEY to .env.local" },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      { error: "Receipt scanning failed. Please try again or enter details manually." },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

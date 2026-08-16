// Purpose: Thin server-side wrapper around the Google Gemini API — exposes generateText (for chat/summaries) and analyzeImage (for receipt OCR vision calls). The GEMINI_API_KEY environment variable is read server-side only and never sent to the client.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.0-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "[Gemini] GEMINI_API_KEY is not set. Add it to .env.local: GEMINI_API_KEY=your_key_here"
    );
  }
  return key;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiGenerateRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
  systemInstruction?: {
    parts: GeminiPart[];
  };
}

/**
 * Calls Gemini generateContent and returns the text response.
 * Throws on network error or non-200 response.
 */
export async function geminiGenerateText(
  userPrompt: string,
  systemPrompt?: string,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();

  const requestBody: GeminiGenerateRequest = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      maxOutputTokens: options?.maxOutputTokens ?? 1024,
    },
  };

  if (systemPrompt) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  const res = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.trim();
}

/**
 * Sends an image (as base64) + a prompt to Gemini Vision and returns the text response.
 * Used for receipt OCR extraction.
 */
export async function geminiAnalyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();

  const requestBody: GeminiGenerateRequest = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.1,
      maxOutputTokens: options?.maxOutputTokens ?? 512,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini Vision API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return text.trim();
}

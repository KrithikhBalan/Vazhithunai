// Purpose: Registers embedded Noto Sans Tamil TTF fonts into @react-pdf/renderer's font cache so that Tamil Unicode glyphs (U+0B80–U+0BFF) render correctly in generated PDF documents — Latin fallback also included.

import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Call once before rendering any PDF document.
 * Registers NotoSansTamil (Regular + Bold) embedded as base64 data URIs
 * so the PDF is fully self-contained — no external font server needed.
 *
 * IMPORTANT: @react-pdf/renderer requires font.src to be either:
 *  - An absolute file:// URL (on Node.js/server)
 *  - A base64 data URI
 *  - An http/https URL accessible from the server process
 *
 * We use server-relative absolute file paths via process.cwd().
 */
export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;

  // NotoSansTamil — supports full Tamil Unicode block (U+0B80–U+0BFF)
  // Variable-weight TTF also covers Latin, Devanagari numerals, ₹ symbol
  const base = process.cwd() + "/public/fonts";

  Font.register({
    family: "NotoSansTamil",
    fonts: [
      {
        src: `${base}/NotoSansTamil-Regular.ttf`,
        fontWeight: "normal",
      },
      {
        src: `${base}/NotoSansTamil-Bold.ttf`,
        fontWeight: "bold",
      },
    ],
  });

  // Disable hyphenation for Tamil text — Tamil doesn't use hyphens
  Font.registerHyphenationCallback((word) => [word]);
}

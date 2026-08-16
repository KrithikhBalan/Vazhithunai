// Purpose: Next.js Route Handler for server-side PDF report generation — fetches trip data from Firestore, registers Tamil Unicode fonts, renders a bilingual @react-pdf/renderer Document, and streams the binary PDF to the client with correct Content-Disposition headers for download or inline preview.

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { registerPdfFonts } from "@/lib/pdfFonts";
import { fetchTripReportData } from "@/lib/tripReportData";
import { TripReportDocument } from "@/components/pdf/TripReportDocument";

export const runtime = "nodejs"; // Must be Node.js — pdf-lib and canvas don't run on Edge

/**
 * GET /api/reports/pdf?tripId={tripId}&lang={ta|en}&download={0|1}
 *
 * Generates a bilingual PDF trip audit report and streams it to the client.
 * - lang: "ta" (Tamil, default for Tamil users) or "en" (English)
 * - download: "1" triggers Content-Disposition: attachment (file download)
 *             "0" (default) triggers Content-Disposition: inline (browser preview)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const tripId = searchParams.get("tripId");
  const lang = (searchParams.get("lang") === "ta" ? "ta" : "en") as "ta" | "en";
  const download = searchParams.get("download") === "1";

  if (!tripId) {
    return NextResponse.json({ error: "tripId is required" }, { status: 400 });
  }

  try {
    // 1. Register Tamil Unicode fonts (no-op if already registered)
    registerPdfFonts();

    // 2. Fetch all Firestore data for the trip
    const reportData = await fetchTripReportData(tripId);

    // 3. Render the PDF document to a binary Buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(TripReportDocument, { data: reportData, lang })
    );

    // 4. Build safe filename
    const safeName = reportData.trip.name
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
    const filename = `Vazhithunai_${safeName}_Report.pdf`;

    // 5. Return the PDF buffer with correct headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PDF Report API] Error:", message);

    if (message.includes("Trip not found")) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to generate PDF report", details: message },
      { status: 500 }
    );
  }
}

// Purpose: Next.js Server-Side API Route for rapid emergency and roadside help services (Fuel stations, 24x7 Hospitals, ATMs, Pharmacies, Highway food) near user location.

import { NextResponse } from "next/server";
import { CURATED_EMERGENCY, calculateDistanceKm } from "@/lib/placesData";
import type { EmergencyServiceItem, HelpCategory } from "@/types/place";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") || "fuel").toLowerCase().trim() as HelpCategory;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const userLat = latStr ? parseFloat(latStr) : null;
  const userLng = lngStr ? parseFloat(lngStr) : null;

  let items = CURATED_EMERGENCY.filter((item) => item.category === category);

  // If none found for category in sample, return all
  if (items.length === 0) {
    items = CURATED_EMERGENCY;
  }

  // Calculate distance if coordinates provided
  if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
    items = items.map((item) => ({
      ...item,
      distanceKm: calculateDistanceKm(userLat, userLng, item.location.latitude, item.location.longitude),
    }));
    items.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
  }

  return NextResponse.json({ services: items });
}

// Purpose: Next.js Server-Side API Route proxying Google Places API (New) Text Search with strict field masking and curated nationwide fallback dataset.

import { NextResponse } from "next/server";
import { CURATED_PLACES, calculateDistanceKm } from "@/lib/placesData";
import type { PlaceSummary } from "@/types/place";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").toLowerCase().trim();
  const category = (searchParams.get("category") || "all").toLowerCase().trim();
  const city = (searchParams.get("city") || "").toLowerCase().trim();
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const userLat = latStr ? parseFloat(latStr) : null;
  const userLng = lngStr ? parseFloat(lngStr) : null;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  // 1. If Google API Key is present and a specific search query is supplied, call Google Places API (New)
  if (apiKey && query) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          // Field Masking to limit Google Cloud billing costs
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.types,places.location",
        },
        body: JSON.stringify({
          textQuery: `${query} ${city ? city : "Tamil Nadu tourist places"}`,
          languageCode: "en",
          maxResultCount: 15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const googlePlaces: PlaceSummary[] = (data.places || []).map((p: any) => {
          const photoName = p.photos?.[0]?.name;
          const photoUrl = photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=600&maxWidthPx=800&key=${apiKey}`
            : "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80";

          return {
            id: p.id,
            displayName: p.displayName?.text || "Tourist Spot",
            formattedAddress: p.formattedAddress || "",
            rating: p.rating || 4.5,
            userRatingCount: p.userRatingCount || 100,
            category: category !== "all" ? category : "nature",
            location: p.location
              ? { latitude: p.location.latitude, longitude: p.location.longitude }
              : undefined,
            photoUrl,
          };
        });

        if (googlePlaces.length > 0) {
          return NextResponse.json({ places: googlePlaces, source: "google_places_api" });
        }
      }
    } catch (err) {
      console.warn("[Google Places API Proxy] Falling back to curated database:", err);
    }
  }

  // 2. High-performance curated dataset matching
  let filtered = [...CURATED_PLACES];

  if (category && category !== "all") {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category);
  }

  if (city) {
    filtered = filtered.filter(
      (p) =>
        p.city?.toLowerCase().includes(city) ||
        p.formattedAddress.toLowerCase().includes(city) ||
        p.displayName.toLowerCase().includes(city)
    );
  }

  if (query) {
    filtered = filtered.filter(
      (p) =>
        p.displayName.toLowerCase().includes(query) ||
        (p.tamilName && p.tamilName.includes(query)) ||
        p.formattedAddress.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.city && p.city.toLowerCase().includes(query))
    );
  }

  // Add calculated distance if user coordinates provided
  if (userLat !== null && userLng !== null && !isNaN(userLat) && !isNaN(userLng)) {
    filtered = filtered.map((p) => {
      if (p.location) {
        return {
          ...p,
          distanceKm: calculateDistanceKm(userLat, userLng, p.location.latitude, p.location.longitude),
        };
      }
      return p;
    });

    // Sort by proximity
    filtered.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
  }

  return NextResponse.json({ places: filtered, source: "curated_database" });
}

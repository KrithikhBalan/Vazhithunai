// Purpose: Next.js Server-Side API Route for fetching detailed information, high-res photos, and opening hours for a specific tourist spot.

import { NextResponse } from "next/server";
import { CURATED_PLACES } from "@/lib/placesData";
import type { PlaceSummary } from "@/types/place";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  // 1. Check curated database first
  const found = CURATED_PLACES.find((p) => p.id === placeId);
  if (found) {
    return NextResponse.json({ place: found });
  }

  // 2. Query Google Places API (New) if key available
  if (apiKey && placeId) {
    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,rating,userRatingCount,photos,types,location,editorialSummary,regularOpeningHours,internationalPhoneNumber,websiteUri",
        },
      });

      if (response.ok) {
        const p = await response.json();
        const photoUrls: string[] = (p.photos || []).slice(0, 4).map(
          (photo: any) =>
            `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200&key=${apiKey}`
        );

        const placeDetail: PlaceSummary = {
          id: p.id,
          displayName: p.displayName?.text || "Tourist Attraction",
          formattedAddress: p.formattedAddress || "",
          rating: p.rating || 4.5,
          userRatingCount: p.userRatingCount || 50,
          category: "nature",
          location: p.location
            ? { latitude: p.location.latitude, longitude: p.location.longitude }
            : undefined,
          photoUrl: photoUrls[0] || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
          photos: photoUrls,
          description: p.editorialSummary?.text || "Popular tourist destination.",
          phoneNumber: p.internationalPhoneNumber,
          websiteUri: p.websiteUri,
          openingHours: p.regularOpeningHours?.weekdayDescriptions,
        };

        return NextResponse.json({ place: placeDetail });
      }
    } catch (err) {
      console.warn("Google Place Detail fetch error:", err);
    }
  }

  // Return fallback generic details if not found
  return NextResponse.json(
    {
      place: {
        id: placeId,
        displayName: "Scenic Tourist Destination",
        tamilName: "சுற்றுலா தலம்",
        formattedAddress: "Tamil Nadu, India",
        rating: 4.6,
        userRatingCount: 500,
        category: "nature",
        photoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
        description: "Explore the scenic beauty and cultural richness of this destination.",
      },
    }
  );
}

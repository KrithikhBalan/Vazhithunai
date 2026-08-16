// Purpose: Next.js Server-Side API Route for Google Routes API (computeRoutes) proxying distance, travel duration, mileage-based fuel cost, and highway toll estimation with rate limiting.

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/aiRateLimit";
import type { RouteCalculationResult } from "@/types/place";

export async function POST(request: Request) {
  // Rate limit: 30 route computations per minute per IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`routes_compute:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a moment." },
      { status: 429, headers: { "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const origin = body.origin || "Chennai, Tamil Nadu";
    const destination = body.destination || "Ooty, Tamil Nadu";
    const vehicleType = body.vehicleType || "sedan";
    const fuelPricePerLiter = body.fuelPricePerLiter || 102; // ₹102 per liter
    const customMileage = body.mileageKmPerLiter;

    // Vehicle Mileage defaults (km per liter / kWh)
    const mileageMap: Record<string, number> = {
      sedan: 15,
      suv: 12,
      bike: 40,
      ev: 7, // 7 km per kWh
    };

    const mileage = customMileage || mileageMap[vehicleType] || 15;

    // Default route metrics: approx 540 km between Chennai and Ooty
    let distanceMeters = 540000;
    let durationSeconds = 32400; // 9 hours
    let polyline = "";

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_ROUTES_API_KEY;

    // Call Google Routes API if key present
    if (apiKey) {
      try {
        const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
          },
          body: JSON.stringify({
            origin: { address: origin },
            destination: { address: destination },
            travelMode: vehicleType === "bike" ? "TWO_WHEELER" : "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const route = data.routes?.[0];
          if (route) {
            distanceMeters = route.distanceMeters || distanceMeters;
            durationSeconds = parseInt(route.duration?.replace("s", "") || "32400", 10);
            polyline = route.polyline?.encodedPolyline || "";
          }
        }
      } catch (err) {
        console.warn("Routes API fallback:", err);
      }
    }

    const distanceKm = distanceMeters / 1000;
    const fuelQuantityLiters = Math.round((distanceKm / mileage) * 10) / 10;
    const fuelCostRupees = Math.round(fuelQuantityLiters * fuelPricePerLiter);
    const fuelCostPaise = fuelCostRupees * 100;

    // Estimated highway toll: ~₹1.10 per kilometer on NH highways in India
    const tollCostRupees = Math.round(distanceKm * 1.1);
    const tollCostPaise = tollCostRupees * 100;

    const totalTravelCostPaise = fuelCostPaise + tollCostPaise;

    const result: RouteCalculationResult = {
      origin,
      destination,
      distanceMeters,
      durationSeconds,
      polyline,
      stopsCount: (body.stops || []).length,
      estimatedFuelCostPaise: fuelCostPaise,
      estimatedTollCostPaise: tollCostPaise,
      totalTravelCostPaise,
      fuelQuantityLiters,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to compute route" }, { status: 500 });
  }
}

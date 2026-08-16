// Purpose: TypeScript type definitions for Places, Tourist Attractions, Hotel listings, Emergency Services, Trip Itinerary Stops, and Google Routes calculations.

export type PlaceCategory =
  | "all"
  | "nature"
  | "hills"
  | "beaches"
  | "temples"
  | "heritage"
  | "waterfalls"
  | "adventure"
  | "wildlife";

export type HelpCategory =
  | "fuel"
  | "atm"
  | "hospital"
  | "pharmacy"
  | "restaurant"
  | "mechanic"
  | "ev_charging";

/** Place summary returned by Google Places API (New) with field masking */
export interface PlaceSummary {
  id: string;
  displayName: string;
  tamilName?: string;
  formattedAddress: string;
  rating?: number;
  userRatingCount?: number;
  photoUrl?: string | null;
  photos?: string[];
  category: PlaceCategory | string;
  location?: { latitude: number; longitude: number };
  city?: string;
  state?: string;
  description?: string;
  highlights?: string[];
  priceLevel?: string;
  phoneNumber?: string;
  websiteUri?: string;
  openingHours?: string[];
  distanceKm?: number;
}

/** Hotel listing for SCR-09 Hotel Discovery */
export interface HotelItem {
  id: string;
  name: string;
  tamilName?: string;
  formattedAddress: string;
  rating: number;
  userRatingCount: number;
  priceLevel?: string; // "₹" | "₹₹" | "₹₹₹" | "₹₹₹₹"
  approxNightPaise: number;
  phoneNumber: string;
  photoUrl: string;
  amenities: string[];
  location: { latitude: number; longitude: number };
  distanceKm?: number;
}

/** Emergency / Utility service listing for SCR-08 */
export interface EmergencyServiceItem {
  id: string;
  category: HelpCategory;
  name: string;
  tamilName?: string;
  address: string;
  phoneNumber?: string;
  isOpenNow?: boolean;
  distanceKm?: number;
  rating?: number;
  location: { latitude: number; longitude: number };
}

/** A single itinerary stop attached to a Trip */
export interface TripStop {
  stopId: string;
  placeId: string;
  name: string;
  tamilName?: string;
  category?: string;
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
  photoUrl?: string | null;
  order: number;
  notes?: string;
  addedAt: string;
}

/** Route computation output from Google Routes API proxy for SCR-10 */
export interface RouteCalculationResult {
  origin: string;
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  stopsCount: number;
  estimatedFuelCostPaise: number;
  estimatedTollCostPaise: number;
  totalTravelCostPaise: number;
  fuelQuantityLiters: number;
}

// Purpose: TypeScript type definitions for Trip entities, Trip members, Trip stops (itinerary), and Firestore document schema with indexed query support.

import type { Timestamp } from "firebase/firestore";
import type { TripStop } from "./place";

export interface TripMember {
  memberId: string; // Auth UID or synthetic ID for offline members
  name: string;
  phone?: string;
  email?: string | null;
  photoURL?: string | null;
  upiId?: string | null;
  role?: "admin" | "member";
  joinedAt?: Timestamp | Date | string;
}

export interface TripDocument {
  tripId: string;
  name: string;
  description?: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  coverPhotoUrl?: string | null;
  members: TripMember[];
  memberIds: string[]; // Indexed array of member IDs for Firestore array-contains security queries
  stops?: TripStop[]; // Ordered list of tourist/hotel stops added to this trip
  totalExpensePaise: number; // 64-bit integer sum of all expenses in paise (1 INR = 100 Paise)
  estimatedDistanceMeters?: number; // Distance in meters computed via Routes API
  estimatedDurationSeconds?: number; // Travel duration in seconds
  estimatedFuelCostPaise?: number; // Estimated fuel expense in paise
  estimatedTollCostPaise?: number; // Estimated highway toll expense in paise
  vehicleType?: "sedan" | "suv" | "bike" | "ev";
  settlementStatus?: "unsettled" | "partially_settled" | "settled";
  createdBy: string; // memberId / UID
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

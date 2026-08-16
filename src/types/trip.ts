// Purpose: TypeScript type definitions for Trip entities, Trip members, and Trip Firestore documents with indexed memberIds for security rules.

import type { Timestamp } from "firebase/firestore";

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
  totalExpensePaise: number; // 64-bit integer sum of all expenses in paise (1 INR = 100 Paise)
  settlementStatus?: "unsettled" | "partially_settled" | "settled";
  createdBy: string; // memberId / UID
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

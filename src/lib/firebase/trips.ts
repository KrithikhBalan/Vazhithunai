// Purpose: Firestore CRUD operations and real-time listeners for Trips with memberIds query indexing matching Firestore security rules.

import { db } from "./config";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { TripDocument, TripMember } from "@/types/trip";

const TRIPS_COLLECTION = "trips";

/**
 * Creates a new trip document in Firestore with indexed memberIds.
 */
export async function createTrip(
  tripData: Omit<TripDocument, "tripId" | "createdAt" | "totalExpensePaise" | "memberIds"> & {
    tripId?: string;
  }
): Promise<string> {
  const tripId = tripData.tripId || `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);

  const memberIds = Array.from(new Set(tripData.members.map((m) => m.memberId).concat(tripData.createdBy)));

  const newTrip: TripDocument = {
    ...tripData,
    tripId,
    memberIds,
    totalExpensePaise: 0,
    settlementStatus: "unsettled",
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  await setDoc(tripRef, newTrip);
  return tripId;
}

/**
 * Retrieves a single trip by tripId.
 */
export async function getTrip(tripId: string): Promise<TripDocument | null> {
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);
  const snap = await getDoc(tripRef);
  if (!snap.exists()) return null;
  return snap.data() as TripDocument;
}

/**
 * Subscribes to real-time updates for a single trip.
 */
export function subscribeToTrip(
  tripId: string,
  onUpdate: (trip: TripDocument | null) => void
): Unsubscribe {
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);
  return onSnapshot(
    tripRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as TripDocument);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn(`[Firestore] subscribeToTrip error for trip ${tripId}:`, error);
      onUpdate(null);
    }
  );
}

/**
 * Subscribes to trips that the authenticated user participates in.
 * Uses `where("memberIds", "array-contains", userId)` to strictly comply with Firestore security rules.
 */
export function subscribeToUserTrips(
  userId: string,
  onUpdate: (trips: TripDocument[]) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const tripsRef = collection(db, TRIPS_COLLECTION);
  // Indexed query matching security rule: request.auth.uid in resource.data.memberIds
  const q = query(tripsRef, where("memberIds", "array-contains", userId));

  return onSnapshot(
    q,
    (snap) => {
      const trips: TripDocument[] = [];
      snap.forEach((docSnap) => {
        trips.push(docSnap.data() as TripDocument);
      });
      onUpdate(trips);
    },
    (error) => {
      console.warn("[Firestore] subscribeToUserTrips error:", error);
      onUpdate([]);
    }
  );
}

/**
 * Ensures a sample demo trip exists for instant testing if no trips are found for the user.
 */
export async function ensureDemoTrip(user: { uid: string; name: string; phone?: string }): Promise<TripDocument> {
  const demoTripId = `demo_trip_${user.uid.slice(0, 8)}`;
  const existing = await getTrip(demoTripId);
  if (existing) return existing;

  const defaultMembers: TripMember[] = [
    {
      memberId: user.uid,
      name: user.name || "You",
      phone: user.phone || "+91 9876543210",
      role: "admin",
    },
    {
      memberId: "member_kavitha",
      name: "Kavitha (கவிதா)",
      phone: "+91 9840112233",
      role: "member",
    },
    {
      memberId: "member_senthil",
      name: "Senthil (செந்தில்)",
      phone: "+91 9789044556",
      role: "member",
    },
    {
      memberId: "member_praveen",
      name: "Praveen (பிரவீன்)",
      phone: "+91 9444088990",
      role: "member",
    },
  ];

  const demoTrip: TripDocument = {
    tripId: demoTripId,
    name: "Ooty Hills Getaway (ஊட்டி பயணம்)",
    description: "Weekend road trip across Nilgiri mountains with friends.",
    destination: "Ooty, Tamil Nadu",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    members: defaultMembers,
    memberIds: defaultMembers.map((m) => m.memberId),
    totalExpensePaise: 0,
    settlementStatus: "unsettled",
    createdBy: user.uid,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(doc(db, TRIPS_COLLECTION, demoTripId), demoTrip);
  return demoTrip;
}

// Purpose: Firestore CRUD operations and real-time listeners for Trips and trip member management.

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
  orderBy,
  getDocs,
} from "firebase/firestore";
import type { TripDocument, TripMember } from "@/types/trip";

const TRIPS_COLLECTION = "trips";

/**
 * Creates a new trip document in Firestore.
 */
export async function createTrip(
  tripData: Omit<TripDocument, "tripId" | "createdAt" | "totalExpensePaise"> & {
    tripId?: string;
  }
): Promise<string> {
  const tripId = tripData.tripId || `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);

  const newTrip: TripDocument = {
    ...tripData,
    tripId,
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
): () => void {
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);
  return onSnapshot(tripRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as TripDocument);
    } else {
      onUpdate(null);
    }
  });
}

/**
 * Subscribes to trips that a user participates in or created.
 */
export function subscribeToUserTrips(
  userId: string,
  onUpdate: (trips: TripDocument[]) => void
): () => void {
  const tripsRef = collection(db, TRIPS_COLLECTION);
  // Real-time listener for all user trips
  return onSnapshot(tripsRef, (snap) => {
    const trips: TripDocument[] = [];
    snap.forEach((docSnap) => {
      const trip = docSnap.data() as TripDocument;
      // Filter if user is creator or member
      const isMember = trip.members?.some((m) => m.memberId === userId);
      const isCreator = trip.createdBy === userId;
      if (isMember || isCreator) {
        trips.push(trip);
      }
    });
    onUpdate(trips);
  });
}

/**
 * Ensures a sample demo trip exists for instant testing if no trips are found.
 */
export async function ensureDemoTrip(user: { uid: string; name: string; phone?: string }): Promise<TripDocument> {
  const demoTripId = `demo_trip_${user.uid.slice(0, 6)}`;
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
    totalExpensePaise: 0,
    settlementStatus: "unsettled",
    createdBy: user.uid,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(doc(db, TRIPS_COLLECTION, demoTripId), demoTrip);
  return demoTrip;
}

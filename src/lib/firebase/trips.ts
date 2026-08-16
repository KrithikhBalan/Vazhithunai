// Purpose: Firestore CRUD operations and real-time listeners for Trips, including itinerary stops management, member query indexing, and Google Routes cost estimation synchronization.

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
import type { TripStop } from "@/types/place";

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
    stops: tripData.stops || [],
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
 * Adds a place/attraction stop to a trip's itinerary.
 */
export async function addStopToTrip(
  tripId: string,
  stopData: Omit<TripStop, "stopId" | "addedAt">
): Promise<TripStop> {
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) throw new Error("Trip not found");

  const currentStops: TripStop[] = tripSnap.data().stops || [];
  const stopId = `stop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newStop: TripStop = {
    ...stopData,
    stopId,
    order: currentStops.length + 1,
    addedAt: new Date().toISOString(),
  };

  const updatedStops = [...currentStops, newStop];
  await updateDoc(tripRef, {
    stops: updatedStops,
    updatedAt: serverTimestamp(),
  });

  return newStop;
}

/**
 * Removes a place stop from a trip.
 */
export async function removeStopFromTrip(
  tripId: string,
  stopId: string
): Promise<void> {
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) return;

  const currentStops: TripStop[] = tripSnap.data().stops || [];
  const updatedStops = currentStops
    .filter((s) => s.stopId !== stopId)
    .map((s, index) => ({ ...s, order: index + 1 }));

  await updateDoc(tripRef, {
    stops: updatedStops,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Writes computed Google Routes distance, duration, fuel cost, and toll metrics to the trip doc.
 */
export async function updateTripRouteEstimates(
  tripId: string,
  estimates: {
    distanceMeters: number;
    durationSeconds: number;
    fuelCostPaise: number;
    tollCostPaise: number;
    vehicleType?: string;
  }
): Promise<void> {
  const tripRef = doc(db, TRIPS_COLLECTION, tripId);
  await updateDoc(tripRef, {
    estimatedDistanceMeters: estimates.distanceMeters,
    estimatedDurationSeconds: estimates.durationSeconds,
    estimatedFuelCostPaise: estimates.fuelCostPaise,
    estimatedTollCostPaise: estimates.tollCostPaise,
    vehicleType: estimates.vehicleType || "sedan",
    updatedAt: serverTimestamp(),
  });
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

  const defaultStops: TripStop[] = [
    {
      stopId: "stop_ooty_botanical",
      placeId: "place_ooty_botanical",
      name: "Government Botanical Garden, Ooty",
      tamilName: "அரசு தாவரவியல் பூங்கா, ஊட்டி",
      category: "nature",
      formattedAddress: "Vannarapettai, Ooty, Tamil Nadu 643002",
      photoUrl: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&auto=format&fit=crop&q=80",
      order: 1,
      addedAt: new Date().toISOString(),
    },
    {
      stopId: "stop_pykara_lake",
      placeId: "place_pykara_lake",
      name: "Pykara Lake & Waterfalls",
      tamilName: "பைகாரா ஏரி மற்றும் நீர்வீழ்ச்சி",
      category: "waterfalls",
      formattedAddress: "Pykara, Sholur, Tamil Nadu 643237",
      photoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
      order: 2,
      addedAt: new Date().toISOString(),
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
    stops: defaultStops,
    totalExpensePaise: 0,
    estimatedDistanceMeters: 540000, // 540 km round trip
    estimatedDurationSeconds: 32400, // 9 hours
    estimatedFuelCostPaise: 380000, // ₹3,800 fuel
    estimatedTollCostPaise: 55000, // ₹550 toll
    vehicleType: "sedan",
    settlementStatus: "unsettled",
    createdBy: user.uid,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(doc(db, TRIPS_COLLECTION, demoTripId), demoTrip);
  return demoTrip;
}

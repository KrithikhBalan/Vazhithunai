// Purpose: Zustand global state store for Authentication status (Firebase user object, Firestore user profile doc, and loading state).

import { create } from "zustand";
import type { User } from "firebase/auth";
import type { UserDocument } from "@/types/user";

interface AuthState {
  /** Firebase Auth user — null when signed out, undefined while resolving */
  user: User | null | undefined;
  /** Firestore UserDocument — null when not yet loaded or signed out */
  userDoc: UserDocument | null;
  /** True while onAuthStateChanged is resolving on first load */
  loading: boolean;
  setUser: (user: User | null) => void;
  setUserDoc: (doc: UserDocument | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined, // undefined = unresolved
  userDoc: null,
  loading: true,
  setUser: (user) => set({ user }),
  setUserDoc: (userDoc) => set({ userDoc }),
  setLoading: (loading) => set({ loading }),
}));

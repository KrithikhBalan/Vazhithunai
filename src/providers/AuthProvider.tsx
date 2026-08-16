"use client";

import { useEffect, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { upsertUser, subscribeToUser } from "@/lib/firebase/users";
import { useAuthStore } from "@/store/authStore";
import { getStoredLang } from "@/i18n";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Listens to Firebase onAuthStateChanged and keeps Zustand authStore in sync.
 * Also triggers Firestore upsertUser on every sign-in and subscribes to
 * real-time updates on the users/{uid} document.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setUserDoc, setLoading } = useAuthStore();

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Tear down previous user listener
      unsubscribeUser?.();
      unsubscribeUser = null;

      if (firebaseUser) {
        setUser(firebaseUser);

        // Upsert Firestore document on every auth event
        const lang = getStoredLang();
        await upsertUser(firebaseUser, lang).catch(console.error);

        // Subscribe to real-time user document updates
        unsubscribeUser = subscribeToUser(firebaseUser.uid, (doc) => {
          setUserDoc(doc);
        });
      } else {
        setUser(null);
        setUserDoc(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUser?.();
    };
  }, [setUser, setUserDoc, setLoading]);

  return <>{children}</>;
}

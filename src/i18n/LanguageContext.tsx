"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Language, Namespace, Dictionary } from "@/types/i18n";
import {
  getAllDictionaries,
  getStoredLang,
  storeLang,
  translate,
} from "./index";

// ─── Context ──────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => Promise<void>;
  t: (namespace: Namespace, key: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface LanguageProviderProps {
  children: ReactNode;
  /** Optional: uid to also persist preference to Firestore */
  uid?: string | null;
}

export function LanguageProvider({ children, uid }: LanguageProviderProps) {
  const [lang, setLangState] = useState<Language>(() => getStoredLang());
  const [dicts, setDicts] = useState<Record<Namespace, Dictionary> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load dictionaries whenever language changes
  useEffect(() => {
    setIsLoading(true);
    getAllDictionaries(lang)
      .then((loaded) => {
        setDicts(loaded);
        // Update <html lang="..."> attribute
        document.documentElement.lang = lang;
      })
      .finally(() => setIsLoading(false));
  }, [lang]);

  const setLang = useCallback(
    async (newLang: Language) => {
      setLangState(newLang);
      storeLang(newLang);

      // Persist to Firestore if user is signed in
      if (uid) {
        const { updateLanguagePreference } = await import(
          "@/lib/firebase/users"
        );
        await updateLanguagePreference(uid, newLang).catch(console.error);
      }
    },
    [uid]
  );

  const t = useCallback(
    (namespace: Namespace, key: string): string => {
      if (!dicts) return key;
      const dict = dicts[namespace];
      if (!dict) return key;
      return translate(dict, key);
    },
    [dicts]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}

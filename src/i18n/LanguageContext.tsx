// Purpose: React Context and hook (useLanguage) providing reactive language switching, translation function t(namespace, key) or t("namespace.key"), and syncing preferences to Firestore and localStorage.

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

export interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  t: (namespaceOrPath: Namespace | string, key?: string) => string;
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
    (namespaceOrPath: Namespace | string, key?: string): string => {
      if (!dicts) return key || namespaceOrPath;

      if (key !== undefined) {
        // Called as t("expenses", "addExpense")
        const dict = dicts[namespaceOrPath as Namespace];
        if (!dict) return key;
        return translate(dict, key);
      } else {
        // Called as t("expenses.categories.fuel") or t("expenses.addExpense")
        const parts = namespaceOrPath.split(".");
        const ns = parts[0] as Namespace;
        const subKey = parts.slice(1).join(".");
        const dict = dicts[ns];
        if (!dict) return namespaceOrPath;
        return translate(dict, subKey);
      }
    },
    [dicts]
  );

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, setLanguage: setLang, t, isLoading }}
    >
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

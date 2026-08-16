import { create } from "zustand";
import type { Language } from "@/types/user";

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
}

/**
 * Zustand mirror of language state.
 * Primary source of truth is LanguageContext; this store is for
 * components outside the React tree (e.g. middleware, utilities).
 */
export const useLangStore = create<LangState>((set) => ({
  lang: "en",
  setLang: (lang) => set({ lang }),
}));

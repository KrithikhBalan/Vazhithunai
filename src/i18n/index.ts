// Purpose: Dynamic dictionary loaders, translation helpers (dot notation resolver), and localStorage helpers for instant bilingual support (Tamil & English).

import type { Language, Namespace, Dictionary } from "@/types/i18n";

/**
 * Loads a single dictionary namespace for the given language.
 * Uses dynamic import so Next.js code-splits each namespace.
 */
export async function getDictionary(
  lang: Language,
  namespace: Namespace
): Promise<Dictionary> {
  try {
    const dict = await import(`./dictionaries/${lang}/${namespace}.json`);
    return dict.default as Dictionary;
  } catch {
    // Fallback to English if Tamil file missing
    if (lang !== "en") {
      const fallback = await import(`./dictionaries/en/${namespace}.json`);
      return fallback.default as Dictionary;
    }
    return {};
  }
}

/**
 * Loads ALL namespaces for a language in parallel.
 * Used at app initialisation to preload full i18n payload.
 */
export async function getAllDictionaries(
  lang: Language
): Promise<Record<Namespace, Dictionary>> {
  const namespaces: Namespace[] = [
    "common",
    "trips",
    "expenses",
    "settlement",
    "tourist",
    "reports",
  ];
  const results = await Promise.all(
    namespaces.map((ns) => getDictionary(lang, ns))
  );
  return Object.fromEntries(
    namespaces.map((ns, i) => [ns, results[i]])
  ) as Record<Namespace, Dictionary>;
}

/**
 * Translates a dot-notated key within a dictionary.
 * e.g. t(dict, "nav.trips") or t(dict, "appName")
 */
export function translate(dict: Dictionary, key: string): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = dict;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return key;
    current = current[part];
  }
  return typeof current === "string" ? current : key;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LANG_KEY = "vt_lang";

export function getStoredLang(): Language {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "ta" ? "ta" : "en";
}

export function storeLang(lang: Language): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANG_KEY, lang);
}

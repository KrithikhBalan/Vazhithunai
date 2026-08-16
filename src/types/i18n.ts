import type { Language } from "./user";

export type { Language };

/** The six dictionary namespaces */
export type Namespace =
  | "common"
  | "trips"
  | "expenses"
  | "settlement"
  | "tourist"
  | "reports";

/** Generic dictionary — keyed string values (nested allowed via dot notation in helpers) */
export type Dictionary = Record<string, string | Record<string, string>>;

/** Full i18n context shape */
export interface I18nContext {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (namespace: Namespace, key: string) => string;
}

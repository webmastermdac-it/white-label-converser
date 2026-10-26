import type { Locale } from "date-fns";
import { de, enGB, es, fr, it, pt } from "date-fns/locale";
import { getAppLang, type AppLang } from "@/hooks/useLanguage";

const DATE_FNS_LOCALES: Record<AppLang, Locale> = { it, en: enGB, fr, de, es, pt };

/** date-fns locale for the current UI language. */
export const dateFnsLocale = (): Locale => DATE_FNS_LOCALES[getAppLang()];

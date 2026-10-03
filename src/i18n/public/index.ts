import fr from "./fr";
import de from "./de";
import es from "./es";
import pt from "./pt";

/** Public-site dictionaries for extra languages. Key = English source text. Missing keys fall back to English. */
export const publicDictionaries: Record<"fr" | "de" | "es" | "pt", Record<string, string>> = { fr, de, es, pt };

/**
 * i18n check for the PUBLIC site and the BACK-OFFICE dashboard (fr, de, es, pt dictionaries).
 * Public pages are checked against src/i18n/public; every other page/component against
 * src/i18n/app (public entries count too, since lookups fall back between them).
 * Extracts English source strings:
 *  - tx("English", "Italiano", vars?) calls (first argument) and tl("Italiano", "English") calls (second argument)
 *  - t("English", "Italiano") / t("English") calls (first argument)
 *  - t("translationKey") calls resolved through src/i18n/translations.ts
 *  - object literals with string `en` + `it` properties (e.g. { en, it } content)
 * Reports missing strings and translations that alter technical tokens.
 *
 * Usage: npm run i18n:check            (exit 1 if anything is missing)
 *        npm run i18n:check -- --json  (print missing strings as JSON)
 */
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { translations } from "../src/i18n/translations";
import { publicDictionaries } from "../src/i18n/public";
import { appDictionaries } from "../src/i18n/app";

const PUBLIC_SOURCES = [
  "src/pages/LandingPage.tsx",
  "src/pages/VerticalLanding.tsx",
  "src/pages/SetupAssistito.tsx",
  "src/pages/Register.tsx",
  "src/pages/Login.tsx",
  "src/pages/NotFound.tsx",
  "src/pages/Terms.tsx",
  "src/pages/PrivacyPolicy.tsx",
  "src/components/CookieBanner.tsx",
  "src/components/PublicLanguageSelect.tsx",
  "src/content/verticals.ts",
  "src/components/landing",
];

// Back-office: everything else under src, except shadcn primitives, generated types, tests and the dictionaries themselves.
const APP_EXCLUDE = [/^src\/components\/ui\//, /^src\/integrations\//, /^src\/test\//, /^src\/i18n\//, /^src\/lib\/siteKnowledgeExport\.ts$/,
  // MDAC-internal super-admin area: Italian/English only.
  /^src\/pages\/admin\//, /^src\/components\/admin\//, /^src\/components\/AdminSidebar\.tsx$/, /^src\/layouts\/AdminLayout\.tsx$/];

function listFiles(path: string): string[] {
  if (statSync(path).isDirectory()) return readdirSync(path).flatMap((f) => listFiles(join(path, f)));
  return /\.(tsx?|jsx?)$/.test(path) ? [path] : [];
}

const publicStrings = new Map<string, string>(); // en -> first file
const appStrings = new Map<string, string>();
const textOf = (n: ts.Node | undefined) =>
  n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined;
const addTo = (strings: Map<string, string>) => (en: string | undefined, file: string) => {
  if (en && en.trim() && /[A-Za-z]/.test(en) && !/^[a-z]{2}-[A-Z]{2}$/.test(en) && !strings.has(en)) strings.set(en, file);
};

const BRANDS = ["Genius Chatbot", "MDAC", "Calendly", "Stripe", "WooCommerce", "Shopify", "PrestaShop", "Instagram", "Concierge"];
const extract = (value: string, pattern: RegExp) => [...value.matchAll(pattern)].map((match) => match[0]).sort();
// Times are localized freely (3:30 pm -> 15h30 / 15:30 Uhr, 9am–6pm -> de 9h à 18h): strip them before comparing numbers.
const SUFFIX = String.raw`(?:Uhr|h|am|pm|a\.m\.|p\.m\.|de la madrugada|de la mañana|de la tarde|da manhã|da tarde|du matin|du soir|nachts|morgens)`;
const TIME_PATTERNS = [
  /(?<![\d:.,])\d{1,2}[:h]\d{2}(?:\s*(?:Uhr|h|am|pm|a\.m\.|p\.m\.))?(?![\p{L}\d])/giu,
  new RegExp(String.raw`(?<![\d:.,])\d{1,2}\s*(?:h|am|pm)?\s*(?:–|-|bis|à|a|às|to)\s*\d{1,2}\s*${SUFFIX}(?![\p{L}])`, "giu"),
  new RegExp(String.raw`(?<![\d:.,])\d{1,2}\s*${SUFFIX}(?![\p{L}])`, "giu"),
];
const stripTimes = (value: string) => TIME_PATTERNS.reduce((acc, re) => acc.replace(re, " "), value);
const extractNumbers = (value: string) => extract(stripTimes(value), /\d+(?:[.,]\d+|[ \u00a0\u202f]\d{3}(?!\d))*/g).map((token) => {
  const compact = token.replace(/(?<=\d)[.,\u00a0\u202f ](?=\d{3}(?:\D|$))/g, "");
  return compact.replace(",", ".");
}).sort();
const sameTokens = (left: string[], right: string[]) => JSON.stringify(left) === JSON.stringify(right);

function technicalIssues(source: string, translated: string): string[] {
  const issues: string[] = [];
  const sourceLocales = extract(source, /\b[a-z]{2}-[A-Z]{2}\b/g);
  const translatedLocales = extract(translated, /\b[a-z]{2}-[A-Z]{2}\b/g);
  if (!sameTokens(sourceLocales, translatedLocales)) issues.push("locale code");

  const sourceUrls = extract(source, /https?:\/\/[^\s)]+/g);
  const translatedUrls = extract(translated, /https?:\/\/[^\s)]+/g);
  if (!sameTokens(sourceUrls, translatedUrls)) issues.push("URL");

  const sourceEmails = extract(source, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi).map((value) => value.toLowerCase());
  const translatedEmails = extract(translated, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi).map((value) => value.toLowerCase());
  if (!sameTokens(sourceEmails, translatedEmails)) issues.push("email");

  if (!sameTokens(extractNumbers(source), extractNumbers(translated))) issues.push("number/amount");
  if ((source.match(/€/g) ?? []).length !== (translated.match(/€/g) ?? []).length) issues.push("currency");

  for (const brand of BRANDS) {
    if (source.includes(brand) && !translated.includes(brand)) issues.push(`brand ${brand}`);
  }

  const sourcePlaceholders = extract(source, /\{[A-Za-z0-9_.-]+\}/g);
  const translatedPlaceholders = extract(translated, /\{[A-Za-z0-9_.-]+\}/g);
  if (!sameTokens(sourcePlaceholders, translatedPlaceholders)) issues.push("placeholder");

  const sourceTags = extract(source, /<\/?[A-Za-z][^>]*>/g).map((tag) => tag.replace(/\s+/g, " "));
  const translatedTags = extract(translated, /<\/?[A-Za-z][^>]*>/g).map((tag) => tag.replace(/\s+/g, " "));
  if (!sameTokens(sourceTags, translatedTags)) issues.push("HTML tag");
  return [...new Set(issues)];
}

function collect(files: string[], add: (en: string | undefined, file: string) => void) {
  for (const file of files) {
    const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const fn = node.expression.text;
        if (fn === "t") {
          const first = textOf(node.arguments[0]);
          if (first !== undefined) {
            const entry = node.arguments.length === 1 ? (translations as Record<string, { en: string }>)[first] : undefined;
            add(entry ? entry.en : first, file);
          }
        }
        if (fn === "tx") add(textOf(node.arguments[0]), file);
        if (fn === "tl" && node.arguments.length >= 2) add(textOf(node.arguments[1]), file);
      }
      if (ts.isObjectLiteralExpression(node)) {
        const props = new Map<string, string | undefined>();
        for (const p of node.properties) {
          if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) props.set(p.name.text, textOf(p.initializer));
        }
        if (props.has("en") && props.has("it")) add(props.get("en"), file);
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
}

const publicFiles = PUBLIC_SOURCES.flatMap(listFiles);
collect(publicFiles, addTo(publicStrings));
const publicSet = new Set(publicFiles);
const appFiles = listFiles("src").filter((f) => !publicSet.has(f) && !APP_EXCLUDE.some((re) => re.test(f)));
collect(appFiles, addTo(appStrings));
// Shared dashboard labels in translations.ts are looked up dynamically too.
for (const entry of Object.values(translations as Record<string, { en: string }>)) addTo(appStrings)(entry.en, "src/i18n/translations.ts");

type Lang = "fr" | "de" | "es" | "pt";
const LANGS: Lang[] = ["fr", "de", "es", "pt"];
const missing: Record<string, string[]> = {};
const invalid: Record<string, { source: string; issues: string[] }[]> = {};
const sources: Record<string, string> = {};
for (const lang of LANGS) {
  missing[`public.${lang}`] = [...publicStrings.keys()].filter((en) => !publicDictionaries[lang][en]);
  missing[`app.${lang}`] = [...appStrings.keys()].filter((en) => !appDictionaries[lang][en] && !publicDictionaries[lang][en]);
  for (const [scope, dict] of [["public", publicDictionaries[lang]], ["app", appDictionaries[lang]]] as const) {
    invalid[`${scope}.${lang}`] = Object.entries(dict).flatMap(([source, translated]) => {
      const issues = technicalIssues(source, translated);
      return issues.length ? [{ source, issues }] : [];
    });
  }
}
for (const [en, file] of [...publicStrings, ...appStrings]) sources[en] ??= file;

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ missing, invalid, sources }, null, 2));
} else {
  console.log(`Public strings found: ${publicStrings.size} · Back-office strings found: ${appStrings.size}`);
  let total = 0;
  for (const [scope, list] of Object.entries(missing)) {
    total += list.length;
    console.log(`${scope}: ${list.length} missing`);
    for (const en of list.slice(0, 15)) console.log(`   - ${JSON.stringify(en)}  (${sources[en]})`);
    if (list.length > 15) console.log(`   ... and ${list.length - 15} more`);
  }
  for (const [scope, list] of Object.entries(invalid)) {
    total += list.length;
    console.log(`${scope}: ${list.length} altered technical strings`);
    for (const item of list.slice(0, 15)) console.log(`   - ${JSON.stringify(item.source)}: ${item.issues.join(", ")}`);
    if (list.length > 15) console.log(`   ... and ${list.length - 15} more`);
  }
  if (total > 0) process.exit(1);
  console.log("All public and back-office strings translated; technical tokens preserved.");
}

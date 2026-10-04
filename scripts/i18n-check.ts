/**
 * i18n check for the PUBLIC site (fr, de, es, pt dictionaries).
 * Extracts English source strings from public pages:
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

function listFiles(path: string): string[] {
  if (statSync(path).isDirectory()) return readdirSync(path).flatMap((f) => listFiles(join(path, f)));
  return /\.(tsx?|jsx?)$/.test(path) ? [path] : [];
}

const strings = new Map<string, string>(); // en -> first file
const textOf = (n: ts.Node | undefined) =>
  n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined;
const add = (en: string | undefined, file: string) => {
  if (en && en.trim() && /[A-Za-z]/.test(en) && !/^[a-z]{2}-[A-Z]{2}$/.test(en) && !strings.has(en)) strings.set(en, file);
};

const BRANDS = ["Genius Chatbot", "MDAC", "Calendly", "Stripe", "WooCommerce", "Shopify", "PrestaShop", "Instagram", "Concierge"];
const extract = (value: string, pattern: RegExp) => [...value.matchAll(pattern)].map((match) => match[0]).sort();
// Times are localized freely (3:30 pm -> 15h30 / 15:30 Uhr, 9am–6pm -> de 9h à 18h): strip them before comparing numbers.
const TIME_PATTERNS = [
  /\b\d{1,2}(?:[:.h]\d{2})?\s*(?:h|am|pm|a\.m\.|p\.m\.)?\s*(?:–|-|bis|à|a|às|to)\s*\d{1,2}(?:[:.h]\d{2})?\s*(?:Uhr|h|am|pm|a\.m\.|p\.m\.)(?![A-Za-z])/gi,
  /\b\d{1,2}\s*(?:–|-|bis|à|a|às|to)\s*\d{1,2}[:h]\d{2}(?![A-Za-z\d])/gi,
  /\b\d{1,2}[:h]\d{2}(?:\s*(?:Uhr|h|am|pm|a\.m\.|p\.m\.))?(?![A-Za-z\d])/gi,
  /\b\d{1,2}\s*(?:Uhr|h|am|pm|a\.m\.|p\.m\.)(?![A-Za-z])/gi,
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

for (const file of PUBLIC_SOURCES.flatMap(listFiles)) {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t") {
      const first = textOf(node.arguments[0]);
      if (first !== undefined) {
        const entry = node.arguments.length === 1 ? (translations as Record<string, { en: string }>)[first] : undefined;
        add(entry ? entry.en : first, file);
      }
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

const missing: Record<string, string[]> = {};
const invalid: Record<string, { source: string; issues: string[] }[]> = {};
for (const [lang, dict] of Object.entries(publicDictionaries)) {
  missing[lang] = [...strings.keys()].filter((en) => !dict[en]);
  invalid[lang] = Object.entries(dict).flatMap(([source, translated]) => {
    const issues = technicalIssues(source, translated);
    return issues.length ? [{ source, issues }] : [];
  });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ missing, invalid }, null, 2));
} else {
  console.log(`Public strings found: ${strings.size}`);
  let total = 0;
  for (const [lang, list] of Object.entries(missing)) {
    total += list.length;
    console.log(`${lang}: ${list.length} missing`);
    for (const en of list.slice(0, 15)) console.log(`   - ${JSON.stringify(en)}  (${strings.get(en)})`);
    if (list.length > 15) console.log(`   ... and ${list.length - 15} more`);
  }
  for (const [lang, list] of Object.entries(invalid)) {
    total += list.length;
    console.log(`${lang}: ${list.length} altered technical strings`);
    for (const item of list.slice(0, 15)) console.log(`   - ${JSON.stringify(item.source)}: ${item.issues.join(", ")}`);
    if (list.length > 15) console.log(`   ... and ${list.length - 15} more`);
  }
  if (total > 0) process.exit(1);
  console.log("All public strings translated; technical tokens preserved.");
}

/**
 * i18n check for the PUBLIC site (fr, de, es, pt dictionaries).
 * Extracts English source strings from public pages:
 *  - t("English", "Italiano") / t("English") calls (first argument)
 *  - t("translationKey") calls resolved through src/i18n/translations.ts
 *  - object literals with string `en` + `it` properties (e.g. { en, it } content)
 * Reports strings missing from src/i18n/public/{fr,de,es,pt}.ts.
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
for (const [lang, dict] of Object.entries(publicDictionaries)) {
  missing[lang] = [...strings.keys()].filter((en) => !dict[en]);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(missing, null, 2));
} else {
  console.log(`Public strings found: ${strings.size}`);
  let total = 0;
  for (const [lang, list] of Object.entries(missing)) {
    total += list.length;
    console.log(`${lang}: ${list.length} missing`);
    for (const en of list.slice(0, 15)) console.log(`   - ${JSON.stringify(en)}  (${strings.get(en)})`);
    if (list.length > 15) console.log(`   ... and ${list.length - 15} more`);
  }
  if (total > 0) process.exit(1);
  console.log("All public strings translated.");
}

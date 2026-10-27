# Architecture Rules

- Keep sector-specific menus, integrations, templates, and onboarding requirements in `src/lib/modules.ts` so the `general` sector can expose optional tools without mandatory setup steps.
- Public-site extra languages (fr/de/es/pt) live in `src/i18n/public/*.ts` keyed by the English source; `t()`/`localized()` fall back to English, and `npm run i18n:check` must report zero missing or technically altered strings.
- Back-office strings go through `tx(en, it, vars?)` (or `t(en, it)` / a local `tl(it, en)` that delegates to `tx`) — never `lang === "it" ? … : …`; extra languages live in `src/i18n/app/*.ts` keyed by the English source, `{0}` placeholders fill from `vars`, dates use `appLocale()` / `dateFnsLocale()`, and `npm run i18n:check` covers them too. The super-admin area (`src/pages/admin`) stays IT/EN only.
- Hotel import link matching lives in a pure helper within the edge function and only returns discovered site URLs, so deterministic matching is testable without network or AI.
- ClientLayout owns the guest-request subscription and lamp preference, passing state to the sidebar and lamp to avoid duplicate notification sounds.
- Service-hour checks use a pure local-device-time helper; request-hour saves merge the latest hotel_profile JSON and normalization preserves these settings.
- Keep jsPDF's transitive DOMPurify dependency on a patched release through the package override so PDF HTML sanitization cannot reinstall the known vulnerable version.

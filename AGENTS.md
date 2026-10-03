# Architecture Rules

- Keep sector-specific menus, integrations, templates, and onboarding requirements in `src/lib/modules.ts` so the `general` sector can expose optional tools without mandatory setup steps.- Public-site extra languages (fr/de/es/pt) live in `src/i18n/public/*.ts` keyed by the English source; `t()`/`localized()` fall back to English, and `npm run i18n:check` must report zero missing strings.

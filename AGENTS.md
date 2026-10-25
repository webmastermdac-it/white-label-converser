# Architecture Rules

- Keep sector-specific menus, integrations, templates, and onboarding requirements in `src/lib/modules.ts` so the `general` sector can expose optional tools without mandatory setup steps.
- Public-site extra languages (fr/de/es/pt) live in `src/i18n/public/*.ts` keyed by the English source; `t()`/`localized()` fall back to English, and `npm run i18n:check` must report zero missing or technically altered strings.
- Hotel import link matching lives in a pure helper within the edge function and only returns discovered site URLs, so deterministic matching is testable without network or AI.
- ClientLayout owns the guest-request subscription and lamp preference, passing state to the sidebar and lamp to avoid duplicate notification sounds.

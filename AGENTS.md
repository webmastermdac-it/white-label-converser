# Architecture Rules

- Keep sector-specific menus, integrations, templates, and onboarding requirements in `src/lib/modules.ts` so the `general` sector can expose optional tools without mandatory setup steps.
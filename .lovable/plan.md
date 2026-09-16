# Knowledge Base simplification and Pro gating

## Changes
- Remove the guided wizard import and rendered block from the Knowledge Base page while leaving its source files untouched.
- Keep the existing Instructions textarea and save behavior, but replace its placeholder and helper copy with clearer guidance in Italian and English.
- Introduce one reusable locked-feature treatment on this page: lock icon, compact Pro badge, consistent helper copy, and the existing upgrade action.
- Apply that treatment to locked document upload, advanced RAG sources, and ecommerce integration controls without changing unlocked behavior.
- Add a slim dismissible Pro-features banner visible only to Free-plan clients, using the existing Pro upgrade flow.
- Confirm whether either unused template component is rendered elsewhere and remove only any discovered wiring.

## Technical details
- Changes stay limited to `ClientRAGKnowledgeBase.tsx` and any verified usage file for the two retired template components.
- No database data, backend logic, or wizard/template source files will be changed.
- Validate compilation and the affected desktop/mobile page states.

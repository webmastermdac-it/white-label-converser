

## Analisi del Problema

Ci sono **due sistemi sovrapposti** che fanno la stessa cosa:

1. **Tab "Messaggi" → KnowledgeBaseWizard** (in ChatbotConfigForm): wizard a 4 step che raccoglie template, documenti, scraping e genera un system prompt testuale salvato in `chatbot_configs.knowledge_base`. **Non salva correttamente** perché `handleSave` chiama `onSave` ma il salvataggio DB dipende dal parent che deve poi fare `save()`.

2. **Pagina "Knowledge Base"** (ClientRAGKnowledgeBase): pipeline RAG completo con upload file, URL, sitemap, FAQ, testo libero → embedding → ricerca semantica. Salva in tabelle `knowledge_base` e `knowledge_chunks`.

Entrambi gestiscono: documenti, scraping web, FAQ, template di settore.

---

## Proposta: Separare le Responsabilità

### Tab "Messaggi" → Solo System Prompt Semplice
- **Rimuovere il KnowledgeBaseWizard** dalla tab Messaggi
- Lasciare solo la **textarea del system prompt** (istruzioni base, tono, ruolo) — funziona per tutti i piani
- Aggiungere un **banner informativo** per utenti Starter/Pro che dice: "Per addestrare il bot con documenti e RAG, vai alla Knowledge Base" con link diretto

### Pagina "Knowledge Base" → Unico Punto per Contenuti Avanzati
- Resta il sistema RAG attuale (upload file, URL, sitemap, FAQ, testo libero)
- Nessuna duplicazione

### Risultato
- **Free**: Tab Messaggi con textarea system prompt + max 5 FAQ manuali. KB page bloccata.
- **Starter/Pro**: Tab Messaggi con textarea + link alla KB page. KB page con pipeline RAG completo.

---

## Modifiche Tecniche

1. **`ChatbotConfigForm.tsx`** — Nella sezione `messages`:
   - Rimuovere il rendering di `KnowledgeBaseWizard`
   - Mostrare sempre la textarea del system prompt (per tutti i piani)
   - Aggiungere banner con link a `/dashboard/knowledge-base` per piani paganti
   - Rimuovere import di `KnowledgeBaseWizard`

2. **Nessuna modifica** a `ClientRAGKnowledgeBase.tsx` — resta il punto unico per RAG

3. **Pulizia**: I file `KnowledgeBaseWizard.tsx`, `KnowledgeBaseBuilder.tsx`, `GuidedWizard.tsx`, `IndustryTemplates.tsx`, `SystemPromptPreview.tsx`, `buildSystemPrompt.ts` possono essere rimossi se non usati altrove (verificheremo i riferimenti)


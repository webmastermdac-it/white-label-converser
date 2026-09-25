# Preset tono nelle Istruzioni libere

## Intervento
- Ripristinare in `ClientRAGKnowledgeBase.tsx` l’unica area di testo libera per le Istruzioni, rimuovendo il collegamento a `StructuredSections`.
- Inserire sopra l’area le sei scorciatoie di tono e sotto il confronto richiudibile, mantenendo contenuti e resa adattiva già verificati.
- Al click, sostituire soltanto il blocco `## Tono di voce` fino alla prossima intestazione `## `; se assente, aggiungerlo in fondo senza alterare il resto.
- Salvare immediatamente tramite la funzione esistente `saveInstructions`.
- Lasciare `StructuredSections.tsx` invariato e aggiornare la regola architetturale ormai superata.

## Verifica
- Aprire un bot reale nella tab Conoscenza → Istruzioni.
- Verificare chip, inserimento e sostituzione non distruttivi, salvataggio immediato e confronto aperto.
- Acquisire uno screenshot e ripristinare i dati originali del bot dopo il test.

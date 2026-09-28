# Hub configurazione bot e pagina tono

## Obiettivo
Sostituire le tab della configurazione bot con un hub di riquadri e pagine interne nello stesso indirizzo, sincronizzate tramite `?section=`. Separare completamente “Personalità e tono” dalla pagina Conoscenza.

## Implementazione
- Trasformare `ClientChatbotSettings` in navigazione a stato/query param:
  - nessun parametro mostra intestazione, token compatto, checklist e griglia delle sezioni;
  - ogni riquadro apre una pagina a tutta larghezza con ritorno al hub;
  - mantenere `adminMode`, `botIdOverride`, `hideHeader` e il contenuto Concierge per il bot corrente.
- Separare i salvataggi:
  - Generale aggiorna solo nome, URL e stato;
  - Lead e notifiche aggiorna solo timeout e modalità/numero messaggi del form;
  - messaggi, aspetto, notifiche, integrazioni, conoscenza e anteprima continuano a usare i componenti e la logica esistenti.
- Spostare l’installazione completa nella pagina dedicata e lasciare nel hub una card token compatta con copia e collegamento alle istruzioni.
- Creare il registro bilingue dei sei preset in `src/lib/tonePresets.ts`.
- Creare `ToneOfVoiceCard` autonomo:
  - carica e salva `tone_of_voice` e `tone_preset_id` per il bot;
  - mantiene chip, testo libero e confronto adattivo;
  - riallinea automaticamente un preset non personalizzato quando cambia la lingua globale, senza toast e senza cicli.
- Rimuovere esclusivamente la UI e lo stato del tono da `ClientRAGKnowledgeBase`, lasciando invariati FAQ, documenti e istruzioni.

## Dettagli tecnici
- Sezioni ammesse: `install`, `general`, `appearance`, `tone`, `knowledge`, `leads`, `integrations`, `preview`, `concierge`; valori non validi tornano al hub.
- `useSearchParams` aggiorna la cronologia del browser senza nuove route.
- I badge del hub derivano dai dati già caricati del bot secondo le regole richieste.
- Nessuna modifica a database, funzioni, widget o routing.

## Verifica
- Controllare compilazione e diagnostica.
- Verificare su un bot reale:
  - hub completo;
  - pagina Personalità e tono in italiano;
  - stessa pagina in inglese tramite selettore globale;
  - pagina Lead e notifiche.
- Acquisire i quattro screenshot richiesti senza alterare permanentemente i dati del bot.

# Landing Concierge Hotel arricchita

## Obiettivo
Trasformare `/concierge-hotel` in una pagina completa, bilingue e orientata al valore per l'hotel, mantenendo identiche le landing Ecommerce e Appuntamenti e senza modificare home, dashboard o widget.

## Interventi
1. **Contenuti verticali opzionali**
   - Estendere `VerticalContent` con blocchi opzionali per statistiche, problema, percorso ospite, funzionalità, calcolatore ROI, servizio MDAC, demo estesa e CTA finale.
   - Aggiungere `DEMO_URL` e tutti i testi Hotel in italiano e inglese, incluse le 8 FAQ e i metadata aggiornati.
   - Lasciare invariati i dati Ecommerce e Appuntamenti.

2. **Componenti Hotel dedicati**
   - Creare componenti sotto `src/components/landing/hotel/` per demo chat estesa, statistiche, problema, percorso, cinque sezioni funzionalità con mockup HTML/CSS, calcolatore ROI e servizio MDAC.
   - Rendere il calcolatore accessibile con slider e input numerici sincronizzati, risultati live e valori iniziali richiesti.
   - Usare animazioni leggere disattivate con `prefers-reduced-motion`; nessuna immagine stock.

3. **Rendering condizionale condiviso**
   - Aggiornare `VerticalLanding.tsx` affinché mostri i nuovi blocchi solo quando presenti, nell'ordine: hero, statistiche, problema, percorso, funzionalità, ROI, servizio, integrazioni, FAQ, prezzi, CTA finale.
   - Per Hotel usare hero, seconda CTA demo e chat estesa dedicate; per gli altri verticali conservare markup, contenuti e comportamento correnti.
   - Conservare stile scuro, oro, font, navigazione, pricing e footer esistenti.

4. **Verifica**
   - Controllare `/concierge-hotel` su desktop e mobile con screenshot, inclusi calcolatore e assenza di sovrapposizioni.
   - Confrontare `/chatbot-ecommerce` e `/chatbot-appuntamenti` prima/dopo per confermare che restino invariate.
   - Controllare metadata IT/EN, link registrazione/demo, accessibilità essenziale e stato della build.

## Dettagli tecnici
- I nuovi tipi resteranno opzionali per non cambiare il rendering degli altri verticali.
- I mockup saranno presentazionali e isolati nei componenti Hotel; nessuna chiamata a servizi o modifica dei flussi applicativi.
- Le cifre della sezione Risultati saranno marcate visivamente come esempio.
- Il calcolo ROI userà: richieste fuori orario = richieste × percentuale fuori orario; prenotazioni dirette = richieste fuori orario × conversione; fatturato = prenotazioni × valore soggiorno; commissioni risparmiate = fatturato × commissione portali.

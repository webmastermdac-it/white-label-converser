# Landing con tre soluzioni verticali

## Obiettivo
Trasformare l’apertura della landing in un selettore chiaro tra Ecommerce, Appuntamenti e Hotel, ciascuno con demo chat e pagina dedicata, mantenendo identità visiva, prezzi, navigazione e footer attuali.

## Interventi
- Creare `src/content/verticals.ts` come fonte unica bilingue per nomi, promesse, benefici, passi, integrazioni, FAQ, demo chat, percorsi e metadati delle tre soluzioni.
- Rifattorizzare gli elementi pubblici condivisi della landing (navigazione, footer, prezzi e demo chat) così possano essere riutilizzati senza duplicare contenuti o stile.
- Sostituire l’attuale apertura di `LandingPage.tsx` con:
  - titolo e sottotitolo richiesti;
  - tre grandi selettori, presentati come tab su mobile;
  - mini-chat animata e accessibile che cambia con la soluzione selezionata;
  - pulsanti “Scopri” e “Prova gratis” con i percorsi corretti;
  - rimozione della vecchia sezione `#verticals`.
- Aggiungere “Soluzioni” alla navigazione: menu a discesa su desktop e tre collegamenti nel menu mobile.
- Creare `VerticalLanding.tsx`, unico modello per `/chatbot-ecommerce`, `/chatbot-appuntamenti` e `/concierge-hotel`, con demo, benefici, tre passi, integrazioni, FAQ, prezzi condivisi e invito finale alla registrazione.
- Impostare titolo e descrizione della pagina in base alla soluzione e alla lingua attiva, ripristinandoli correttamente durante la navigazione interna.
- Aggiornare `App.tsx` con le tre nuove pagine pubbliche.
- Aggiornare `Register.tsx`: un parametro `vertical` valido apre direttamente il modulo di registrazione; la scelta manuale “Ristorazione & Hotel” diventa “Hotel & Ospitalità”.

## Accessibilità e movimento
- Stati focus visibili, controlli con ruoli/etichette corretti e contrasto coerente con la landing attuale.
- Animazioni leggere per digitazione e cambio demo, disattivate quando il dispositivo richiede movimento ridotto.
- Verifica su viewport mobile e desktop dei menu, dei tab, delle FAQ e dei collegamenti di registrazione.

## Vincoli
- Nessuna modifica a dashboard, widget o logica backend.
- Testi completi in italiano e inglese tramite `t()`.
- Prezzi riutilizzati dall’implementazione esistente, senza modificare piani o logica di acquisto.

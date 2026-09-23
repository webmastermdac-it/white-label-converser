# Concierge in soggiorno

## Obiettivo
Aggiungere il concierge pubblico da QR per gli ospiti in struttura, le richieste di servizio e la gestione reception, senza cambiare il widget standard.

## Implementazione
- Aggiungere piano, dati e permessi per richieste ospiti, con limite di 10 richieste/ora per camera, aggiornamenti in tempo reale ed email alla reception.
- Creare la pagina pubblica `/c/:embed_token`, che apre il widget a tutto schermo e passa opzionalmente il numero camera.
- Estendere la chat hotel con la modalità in soggiorno; mostrare azioni rapide solo quando il piano le include.
- Aggiungere la scheda QR al Profilo struttura con configurazione azioni rapide, QR generale/per camera, PNG e PDF A4.
- Sostituire il segnaposto Richieste ospiti con gestione per stato, filtro camera, contatore, suono opzionale e tempo medio di risoluzione.
- Rendere automatico il passo QR della checklist dopo il primo download.

## Dettagli tecnici
- `concierge_requests` sarà letto esclusivamente da `plan_configs` e configurabile in Admin Piani.
- `service_requests` avrà RLS per cliente/super admin, grant espliciti e pubblicazione Realtime.
- La function pubblica convaliderà token, hotel attivo, piano, payload e rate limit prima di inserire.
- I nuovi comportamenti di `widget.js` saranno tutti condizionati agli attributi opzionali e al modulo hotel.
- URL QR da `APP_URL` lato function/configurazione quando disponibile, con fallback all’origine pubblica lato browser.

## Verifica
- Test reale su bot hotel con dati temporanei e pulizia finale.
- Confronto del widget non-hotel senza attributi per confermare comportamento invariato.

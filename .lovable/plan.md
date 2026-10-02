# Integrazioni Ecommerce e pagina Setup professionale

## Obiettivo
Rendere più chiara la compatibilità Ecommerce nella landing dedicata e aggiungere una pagina pubblica bilingue per il servizio Setup professionale già acquistabile dalla pagina Upgrade.

## Interventi
- Installare `simple-icons` e creare `EcommerceIntegrations` con:
  - connettori dedicati WooCommerce, Shopify e PrestaShop;
  - compatibilità via feed/API per Magento, BigCommerce, Wix, Shopware, OpenCart e cataloghi personalizzati;
  - loghi inline, nota marchi e richiamo al Setup professionale.
- Usare il nuovo blocco soltanto in `/chatbot-ecommerce`; Appuntamenti e Hotel manterranno l’attuale sezione Integrazioni.
- Aggiornare esclusivamente le FAQ Ecommerce indicate in `verticals.ts`.
- Creare `/setup-assistito` con intestazione, contenuti, checklist, vantaggi, processo, FAQ, invito finale e footer coerenti con le landing esistenti.
- Collegare le CTA alla pagina Upgrade per utenti autenticati e alla registrazione Ecommerce per i visitatori.
- Aggiungere l’ancora `#setup` alla scheda esistente e lo scorrimento automatico quando viene aperta tramite link.
- Aggiungere nella pagina Integrazioni cliente il collegamento discreto al Setup professionale.

## Dettagli tecnici
- Nessuna modifica a pagamenti, funzioni server, database, sicurezza, hook o logica della scheda Setup esistente.
- Testi IT/EN tramite `t(en, it)` e stile allineato a `VerticalLanding`.
- I loghi mancanti nella versione installata avranno un fallback testuale senza interrompere la compilazione.

## Verifica
- Controllare la compilazione e i log della preview.
- Verificare desktop e mobile su `/chatbot-ecommerce` e `/setup-assistito`.
- Verificare che `/chatbot-appuntamenti` e `/concierge-hotel` mantengano le integrazioni esistenti.
- Verificare il collegamento pubblico alla registrazione senza avviare pagamenti o creare dati.

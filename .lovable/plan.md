# Uniformare i prezzi come IVA inclusa

## Modifiche
- Aggiungere una nota bilingue discreta “Prezzi IVA inclusa” / “Prices include VAT” in ogni scheda dei piani della landing e della dashboard cliente; la stessa `PricingGrid` coprirà anche tutte le landing di settore.
- Uniformare il Setup professionale a “€570 una tantum · IVA inclusa” / “€570 one-off · VAT included” in landing, pagina dedicata, dashboard, collegamenti di assistenza e FAQ ecommerce.
- Aggiornare Termini e contenuti esportati del sito dichiarando esplicitamente che tutti i prezzi includono IVA, senza cambiare importi o caratteristiche dei piani.
- Aggiungere `valueAddedTaxIncluded: true` alle offerte e alle specifiche di prezzo nei dati strutturati della landing.
- Aggiornare la descrizione SEO della pagina Setup, l’unica descrizione che cita un prezzo, includendo IVA/VAT.
- Lasciare invariati prezzi dimostrativi dei clienti, limiti numerici, dati aziendali P.IVA e schermate amministrative non rivolte al cliente.

## Verifica
- Cercare nuovamente in `src/` tutti i prezzi del prodotto e le diciture IVA/VAT per eliminare formulazioni mancanti o contraddittorie.
- Eseguire i controlli automatici e verificare nel browser la griglia prezzi e la pagina Setup in italiano e inglese.
- Controllare separatamente eventuali punti che calcolano o mostrano imposte, senza modificare checkout o webhook.

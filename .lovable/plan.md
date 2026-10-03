# Allineamento piani e contenuti pubblici

## Modifiche
- Allineare le liste Free, Starter e Pro della landing alla pagina Upgrade, mantenendo un solo chatbot per piano e i footer di branding richiesti.
- Rimuovere i riferimenti commerciali a white label dai testi visibili e dai contenuti esportati, senza modificare domini o identificatori tecnici.
- Aggiornare i Termini IT/EN con data, prezzi, limiti e funzioni esatti della pagina Upgrade, oltre alle condizioni richieste per Free, rinnovo, disdetta e pagamenti.
- Eliminare testimonianze fittizie e claim sociali o prestazionali non verificabili dalla landing, sostituendo hero e CTA con testo neutro.

## Verifica
- Confermare che il limite configurato sia 1 per tutti i piani e che la creazione di chatbot venga bloccata al raggiungimento del limite.
- Cercare residui white-label e social proof, controllare la compilazione e verificare landing e Termini nel browser.

## Dato verificato
- Non esistono clienti Pro con più di un chatbot; il database ha già `max_chatbots = 1` per Free, Starter e Pro, quindi non serve modificarlo.

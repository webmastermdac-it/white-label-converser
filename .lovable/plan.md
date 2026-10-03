# Allineamento demo, piani, disdetta e controlli pubblici

## Interventi
- Nascondere tutti i trigger pubblici del video demo e rimuovere l'URL YouTube segnaposto, conservando il player inattivo per un futuro URL reale.
- Allineare le descrizioni dei piani: Calendly solo nel Pro e limite Starter di 500 prodotti, aggiornando landing, pagine settore, Termini, export contenuti, dashboard Upgrade e dizionari pubblici.
- Sostituire nei Termini i riferimenti a portale/dashboard per la disdetta con la richiesta via email, dato che non risulta un flusso self-service.
- Rafforzare il controllo traduzioni per preservare codici locale, URL, email, importi/numeri, marchi, segnaposto e tag tecnici.
- Verificare e correggere solo se necessario la comparsa delle card prezzi e la griglia settori su desktop/mobile in italiano, francese e tedesco.

## Dati verificati (sola lettura)
- Starter: `calendly_integration = true` nel database; il dato resterà invariato come richiesto.
- Clienti Starter con URL Calendly configurato: 0.
- Limite prodotti Starter: 500; Pro: 10.000.
- Non risulta una funzione self-service di disdetta nella dashboard: i Termini indicheranno `mdac@mdac.it`.

## Verifica
- Eseguire controllo TypeScript/build e `npm run i18n:check`.
- Controllare nel browser landing e card settori con scroll reale a 1280 px e 390 px, includendo italiano, francese e tedesco.

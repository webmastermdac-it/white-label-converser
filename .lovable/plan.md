# Settore Sito aziendale / Altro

## Obiettivo
Aggiungere il settore `general` ai punti di scelta pubblici e renderlo utilizzabile senza integrazioni obbligatorie, riusando il modulo generico già presente.

## Interventi
- **Registrazione:** aggiungere la quarta card bilingue e riconoscere `?vertical=general`; mantenere `general` nel payload di registrazione.
- **Landing:** aggiungere una card dedicata “Sito aziendale / Altro” con collegamento alla registrazione e adattare la griglia a quattro card.
- **Creazione account:** confermare e completare la gestione di `general`, salvando valori compatibili con i vincoli esistenti di `business_vertical` e `vertical`, senza migrazione se il database lo consente già.
- **Integrazioni:** per il modulo generico mostrare Calendly e le integrazioni ecommerce come opzioni, con il banner richiesto e senza evidenziare inviti all’upgrade nella vista principale.
- **Template e onboarding:** per `general` mostrare tutti i template di settore e non richiedere integrazioni nella checklist.

## Verifica
- Controllare registrazione diretta con `?vertical=general` e la card in landing.
- Verificare che la pagina Integrazioni del modulo generico mostri le opzioni previste.
- Confermare compilazione pulita; nessuna modifica a piani, prezzi o relativi testi.

## Nota tecnica
Il registry contiene già il modulo `general` e `register-client` lo accetta già. Prima delle modifiche verranno verificati i vincoli effettivi del database; una migrazione sarà evitata se `general` è già valido.

# Completare le traduzioni del widget

## Modifiche
- Uniformare `formLabels` per italiano, inglese, francese, tedesco, spagnolo e portoghese: nome obbligatorio, email/telefono alternativi e tutte le chiavi previste.
- Aggiungere le etichette hotel mancanti nelle quattro lingue e una mappa `serviceLabels` completa con ripiego inglese.
- Sostituire esclusivamente i testi condizionali della richiesta alla reception con la nuova mappa, senza cambiare flussi o comportamento.

## Verifiche
- Confermare che i codici regionali continuino a usare le prime due lettere e che le lingue non supportate ripieghino sull'inglese.
- Eseguire `node --check public/widget.js`.
- Riportare, senza modifiche backend, il supporto effettivo di `widget-config`, `chat` e della generazione di `messages_i18n` per francese, tedesco, spagnolo e portoghese.

## Dettagli tecnici
L'intervento resta confinato a stringhe e mappe testuali ES5 in `public/widget.js`; nessuna modifica a stile, layout, API, token o logica.

# Sidebar cliente scalabile per settore

## Intervento
- Separare le voci universali dalle voci del modulo attivo nella sidebar desktop.
- Mostrare le voci verticali esistenti dentro un gruppo richiudibile con icona, nome bilingue del modulo e chevron.
- Aprire inizialmente il gruppo quando il modulo ha voci; ricordare poi la scelta in `localStorage`, separatamente per modulo.
- Conservare link attivo, badge delle richieste e tooltip quando la sidebar è ridotta a icone.
- Applicare lo stesso raggruppamento al menu mobile, senza cambiare il menu amministratore.

## Dettagli tecnici
- `ClientSidebar.tsx`: userà `activeModule.menu` come gruppo verticale invece di unirlo alla lista Dati.
- `MobileNav.tsx`: riceverà opzionalmente un gruppo verticale e ne renderà il controllo richiudibile.
- `ClientLayout.tsx`: passerà al menu mobile le voci universali e il gruppo del modulo separatamente; è una dipendenza necessaria per evitare che mobile continui a mostrare la lista piatta.
- Nessuna modifica a destinazioni, route o registro dei moduli.

## Verifica
- Controllare build e tipi.
- Verificare con screenshot desktop e mobile un bot hotel con gruppo aperto.
- Verificare un bot generico o ecommerce con gruppo assente e sidebar corta.

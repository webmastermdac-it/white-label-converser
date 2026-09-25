# Pulizia componenti legacy e preset tono nella sezione attiva

## Obiettivo
- Confermare che `KnowledgeBaseWizard` e `IndustryTemplateSelector` non siano usati dall’app reale.
- Eliminare entrambi solo se risultano privi di import effettivi.
- Portare i sei preset e il confronto dei toni nella sezione `Tono di Voce` realmente usata.

## Intervento
1. Rimuovere i due componenti legacy non importati e l’eventuale anteprima temporanea che dipende dal wizard.
2. In `StructuredSections`, riusare gli stessi contenuti italiani dei sei preset e lo stesso confronto adattivo già verificato.
3. Mostrare chip prima della Textarea solo per `tone_of_voice`; al clic aggiornare il testo e invocare subito il salvataggio.
4. Mostrare il confronto richiudibile dopo la Textarea; lasciare identiche tutte le altre sezioni e le FAQ.
5. Verificare compilazione e flusso reale nella tab Conoscenza di un bot, con screenshot della sezione aperta, preset applicato e confronto visibile.

## Dettagli tecnici
- Il layout del confronto continuerà a scegliere tabella o righe impilate dalla larghezza reale del contenitore.
- Nessuna nuova logica bilingue verrà aggiunta a `StructuredSections`; testi e intestazioni resteranno in italiano.
- Il salvataggio della chip userà `updateField("tone_of_voice", preset.text)` seguito da `onBlurSave()` come richiesto.

# Rilascio 1.4.1 · Curling e aggiornamenti pronti

## Ambito autorizzato

Il 16 novembre 2026 l’utente ha chiesto di pubblicare il curling approvato, i fix e gli altri aggiornamenti pronti. Il curling mantiene le regole dell’anteprima: sei tiri alternati, urti fra pacchi, punti ricalcolati dopo gli spostamenti, rivincita con primo giocatore alternato. Si gioca in due sullo stesso dispositivo oppure contro il computer. La partita è amichevole, senza classifica dell’evento.

Il rilascio comprende il catalogo completo e il tris della 1.4.0, i collegamenti Sfide/Nome e i fix già preparati per accesso da inviti chiusi, creazione di eventi e apertura della lettera. Le altre sette demo rimangono nel laboratorio locale: non entrano nella build del portale.

## Piano di integrazione e pubblicazione

- [x] Integrare il curling nella sezione Giochi, con caricamento separato del motore Matter.js 0.20.0 e arresto delle risorse quando si lascia il gioco.
- [x] Aggiungere la migrazione 0015, che attiva una volta l’email per tutti gli account esistenti, come richiesto. Le successive disattivazioni restano possibili; Telegram mantiene lo stato scelto dalla persona.
- [x] Correggere la pulizia delle notifiche: conservare la traccia degli avvisi di estrazione per impedirne il reinvio dopo 32 giorni.
- [x] Eseguire test unitari, test browser sull’istanza locale isolata, build e controllo del pacchetto Cloudflare.
- [x] Verificare account Cloudflare, Worker e database; registrare il bookmark Time Travel e conteggi aggregati prima delle migrazioni.
- [x] Applicare soltanto le migrazioni mancanti e verificare che iscrizioni, abbinamenti, allenamenti e punteggi siano conservati.
- [x] Pubblicare la versione e verificare manifest, pagine, cache, asset e traffico attivo.
- [x] Registrare commit, esiti e identificativo della versione effettivamente pubblicata.

## Database e notifiche

La 0013 conserva gli allenamenti prima di ampliare il catalogo; la 0014 crea i duelli del tris. La 0015 modifica soltanto `users.notify_email` dove vale zero. Non cambia Telegram, membri, abbinamenti o punteggi. Il curling non richiede una nuova tabella né invia risultati alle API.

Le notifiche di estrazione restano uniche per evento, versione, destinatario e canale. La pulizia può eliminare gli altri vecchi invii, ma conserva le righe di estrazione che impediscono duplicati. Il test riproduce il passaggio di 33 giorni e un ulteriore giro dello scheduler, per entrambi i canali.

## Cache e limiti di verifica

Ogni build ha un `buildId` nel manifest e nel JavaScript. HTML e manifest non vengono conservati in cache; gli asset hanno nomi derivati dal contenuto. Il controllo di versione esistente aggiorna le pagine inattive e propone l’aggiornamento quando ci sono modifiche o giochi in corso. La verifica del rilascio deve confrontare il manifest online con quello della build effettivamente caricata.

I test locali usano account fittizi e touch emulato. Non dimostrano un collaudo su iPhone fisico, la consegna reale dei messaggi o il gradimento dei giochi.

## Evidenze locali

- 134 test unitari/integrati e 33 test browser superati; il curling comprende partita completa, urti, rivincita, computer, annullamento e uscita durante la simulazione.
- Gesti touch CDP a 320 pixel: annullamento senza tiro, lancio effettivo e scorrimento della pagina fuori dal pacco. Layout controllato anche a 390, 430 e 1440 pixel.
- Build e pacchetto Cloudflare di prova riusciti; 54 asset, senza le altre sette demo. Nessuna vulnerabilità rilevata da `npm audit --audit-level=high`.
- Revisione indipendente del controller e dei fix a inviti, ruoli, lettera e notifiche completata. Corretto il conflitto fra il messaggio del curling e lo stile globale dei badge.

## Pubblicazione verificata

- Sito: https://sottolalbero.gifts · attivazione: 16 novembre 2026, 20:38 UTC, al 100% del traffico.
- Commit del codice: `81d5d2f16835fecc38e8ff1875fa6b7e805adcf3`; PR #1 integrata su `main` con merge `bf30b7d15b7335a1df6895bcdc6cb8e020691ed6`.
- Manifest online: versione `1.4.1`, build `5ea85801-e0ec-48ad-a8dc-ed29fbaf12c5`.
- Versione Worker: `997d2e57-6d7d-487a-ac27-f5d89f940ebe`; deployment `c02b86e4-9bdd-472c-96ff-11a9b99885da`.
- Applicate soltanto le migrazioni 0013, 0014 e 0015; nessuna migrazione remota residua. Bookmark e confronti aggregati conservati nella cartella privata `.wrangler`, esclusa da Git.
- Confronti prima/dopo migrazione e dopo deploy: conteggi di undici tabelle, stati dei membri, versioni degli abbinamenti, numero/completamento/dimensione degli allenamenti e totali dei punteggi invariati; stato di Telegram invariato ed email attive per tutti gli account presenti.
- Dieci percorsi pubblici verificati con `Cache-Control: no-store`; JavaScript principale e asset del curling identici alla build locale tramite SHA-256, con cache immutabile sui nomi derivati dal contenuto. API anonima in modalità produzione, servizio email configurato, nessun codice di sviluppo esposto.
- GitHub non ha restituito esecuzioni CI per il rilascio: le evidenze dei test sopra indicate sono locali, separate dalla pubblicazione e dalla verifica remota.

## English

Release 1.4.1 promotes only the approved curling game alongside the ready catalog, tic-tac-toe and event fixes. Curling is a local friendly match or computer practice, loaded separately and excluded from event rankings. Migration 0015 enables email once for existing accounts while preserving Telegram and later opt-outs. Durable draw-notification records prevent duplicate messages after cleanup. Live deployment, migration preservation and cache verification must be recorded separately from local tests.

Published and independently checked on 16 November 2026 at 20:38 UTC with 100% traffic. Remote build matches the exact local manifest and asset hashes. All three pending migrations were applied; before/after aggregate checks preserved membership, assignments, practice state and scores. All ten checked HTML/manifest routes return `no-store`. GitHub returned no CI runs; the 134 unit/integration and 33 browser checks were run locally.

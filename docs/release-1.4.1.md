# Rilascio 1.4.1 · Curling e aggiornamenti pronti

## Ambito autorizzato

Il 16 novembre 2026 l’utente ha chiesto di pubblicare il curling approvato, i fix e gli altri aggiornamenti pronti. Il curling mantiene le regole dell’anteprima: sei tiri alternati, urti fra pacchi, punti ricalcolati dopo gli spostamenti, rivincita con primo giocatore alternato. Si gioca in due sullo stesso dispositivo oppure contro il computer. La partita è amichevole, senza classifica dell’evento.

Il rilascio comprende il catalogo completo e il tris della 1.4.0, i collegamenti Sfide/Nome e i fix già preparati per accesso da inviti chiusi, creazione di eventi e apertura della lettera. Le altre sette demo rimangono nel laboratorio locale: non entrano nella build del portale.

## Piano di integrazione e pubblicazione

- [x] Integrare il curling nella sezione Giochi, con caricamento separato del motore Matter.js 0.20.0 e arresto delle risorse quando si lascia il gioco.
- [x] Aggiungere la migrazione 0015, che attiva una volta l’email per tutti gli account esistenti, come richiesto. Le successive disattivazioni restano possibili; Telegram mantiene lo stato scelto dalla persona.
- [x] Correggere la pulizia delle notifiche: conservare la traccia degli avvisi di estrazione per impedirne il reinvio dopo 32 giorni.
- [x] Eseguire test unitari, test browser sull’istanza locale isolata, build e controllo del pacchetto Cloudflare.
- [ ] Verificare account Cloudflare, Worker e database; registrare il bookmark Time Travel e conteggi aggregati prima delle migrazioni.
- [ ] Applicare soltanto le migrazioni mancanti e verificare che iscrizioni, abbinamenti, allenamenti e punteggi siano conservati.
- [ ] Pubblicare la versione e verificare manifest, pagine, cache, asset e traffico attivo.
- [ ] Registrare commit, esiti e identificativo della versione effettivamente pubblicata.

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

## English

Release 1.4.1 promotes only the approved curling game alongside the ready catalog, tic-tac-toe and event fixes. Curling is a local friendly match or computer practice, loaded separately and excluded from event rankings. Migration 0015 enables email once for existing accounts while preserving Telegram and later opt-outs. Durable draw-notification records prevent duplicate messages after cleanup. Live deployment, migration preservation and cache verification must be recorded separately from local tests.

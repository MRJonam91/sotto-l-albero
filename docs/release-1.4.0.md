# Verifica del rilascio 1.4.0

## Comportamento implementato

- Menu principale con Eventi, Desideri, Giochi, Sfide, Nome segreto e Archivio; accessi diretti `/sfide` e `/nome`, con scelta dello scambio quando necessario.
- Catalogo condiviso con sei giochi a punti, tutti disponibili anche in allenamento, e tris amichevole. L’allenamento scrive soltanto le proprie partite e non consuma tentativi competitivi.
- Tris tra due membri approvati dello stesso evento: griglia sul server, turno e revisione verificati in modo atomico, scadenza di due giorni, nessun punto in classifica. Il computer è disponibile soltanto in allenamento.
- Le cinque avventure conoscitive sono anteprime in `docs/prototypes/2026-11-avventure/`, separate dal prodotto.

## Evidenze locali

- `npm test`: **125 test superati**, otto file. Comprendono migrazione degli allenamenti esistenti, separazione dalla classifica, mosse simultanee, isolamento tra utenti/eventi, rimozione dei partecipanti, scadenza e archivio.
- `npm run test:e2e`: **30 prove superate** sulla build 1.4.0 e sul database locale isolato. Coprono recupero da invito chiuso, creazione da account normale, estrazione programmata, apertura del nome, aggiornamenti senza perdita dei campi, catalogo, menu e tris con due utenti del browser.
- Navigazione verificata a 320, 390, 430 e 1440 pixel; tris verificato anche a 320 pixel, senza scorrimento orizzontale e con caselle di almeno 44 pixel.
- Build Vite e `wrangler deploy --dry-run` riusciti; formattazione dei file applicativi verificata con Prettier.
- Raccolta delle anteprime verificata a 736, 390 e 320 pixel: cinque scene, quattro rotte del treno, tre meccanismi della bottega, ritorno alla scena precedente con stato locale conservato, nessun errore JavaScript o overflow. Ponte e casa hanno anche prove indipendenti dei tre percorsi.

Il test dello scheduler invoca il simulatore Local Explorer di Wrangler e controlla `outcome: ok`. Il vecchio URL poteva rispondere con la pagina HTML e stato 200 senza eseguire il cron: il test ora verifica la risposta effettiva del simulatore.

Queste verifiche usano Chromium e dati fittizi. Non attestano un collaudo su iPhone fisico o il gradimento delle avventure da parte di persone reali. La pubblicazione Cloudflare deve essere verificata separatamente da questi risultati.

## Dati e ripristino

La migrazione 0013 amplia il catalogo degli allenamenti copiando le righe prima di ricostruire la tabella; la 0014 crea la tabella dei duelli. Nessuna delle due modifica partecipanti, abbinamenti o punteggi. Prima dell’applicazione remota va conservato un bookmark D1 Time Travel aggiornato e vanno confrontati i conteggi aggregati prima/dopo. Il bookmark e gli eventuali dati reali restano fuori da Git.

## English

Version 1.4.0 adds direct Challenges/Secret Name navigation, practice for all six ranked games, and friendly shared-board snow tic-tac-toe with separate computer practice. Local verification passed 125 unit/integration tests and 30 browser tests, plus responsive prototype checks. Database migrations preserve existing practice rows and add a separate duel table without changing members, assignments or rankings. Cloudflare publication is a separate step; these local results do not claim a deployment or physical iPhone validation.

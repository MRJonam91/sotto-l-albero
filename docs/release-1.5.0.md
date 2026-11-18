# Rilascio 1.5.0 · Profili natalizi, avatar e film

Il 18 novembre 2026 l’utente ha autorizzato la revisione delle modifiche di Gemini, l’integrazione sul ramo principale e la pubblicazione online. Il ramo principale effettivo del repository è `main`.

## Integrazione

- La base pubblicata è `7f00bb8`, versione 1.4.1. Le modifiche locali non committate sono state conservate in `6707122` sul ramo di rilascio.
- `avatar/mode-2-illustrated` comprende l’ultima variante con dieci scene illustrate e le sette scene originali. I branch procedurale, Workers AI e comparativo sono alternative dello stesso renderer: restano conservati, senza sovrascrivere la variante illustrata né attivare un servizio AI aggiuntivo.
- `feat/indovina-il-film` aggiunge un gioco distinto: cento film, indizi a icone, quattro risposte, curiosità, allenamento e sfide a punti. I conflitti sono risolti conservando sia il riepilogo dei quiz sia il componente dedicato ai film.
- Le novità locali comprendono nickname e distintivi, ritratto di Natale e percorso guidato quotidiano, indovinelli e messaggi nel gruppo, duecento domande del quiz, riepiloghi dei tentativi e dei duelli e controlli degli effetti natalizi.

## Correzioni della revisione

- Il fallimento di un template non lascia in attesa il salvataggio o il download dell’avatar. Il ripiego mantiene la dimensione richiesta; una richiesta illustrata precedente non può sovrascrivere l’anteprima classica scelta in seguito.
- Ogni email delle interazioni usa il proprio identificativo. La versione nulla distingue questi avvisi dalle estrazioni (versione non negativa) e dagli inviti (versione negativa); la deduplicazione per identificativo resta attiva senza scartare messaggi successivi con lo stesso oggetto.
- Prima dell’invio, il server verifica nuovamente evento, iscrizione confermata, email e preferenza di ricezione. Disattivazione degli avvisi e revoca dell’iscrizione annullano l’email in coda.
- Sei casi di regressione hanno riprodotto i difetti prima delle correzioni: tre per l’avatar, uno per i messaggi ripetuti e due per l’idoneità all’invio.
- Il riepilogo dei film conserva anche le icone e il suggerimento, verificati da un’ulteriore regressione.
- Il test del cron invoca direttamente il server QA e controlla il formato JSON della risposta. Il precedente comando Explorer instradava per nome attraverso un registro condiviso: con più anteprime aperte poteva eseguire il cron su un altro database locale. La CI abilita esplicitamente `--test-scheduled`.

## Migrazioni e conservazione

Le migrazioni 0016 e 0017 aggiungono campi del profilo e interazioni. La migrazione del branch film è rinumerata 0018 per evitare il doppio numero 0016; amplia il vincolo dei giochi di allenamento copiando le righe prima della sostituzione della tabella. Nessuna migrazione riattiva email o Telegram, né azzera abbinamenti o punteggi.

Prima delle modifiche remote è stato conservato il bookmark D1 in `.wrangler/`. Il comando iniziale con file SQL ha restituito un riepilogo di esecuzione, anziché i risultati delle singole query: prima e dopo le migrazioni indica 293 righe lette e zero scritte dalle sei query, ma non permette un confronto puntuale dei valori immediatamente prima/dopo le migrazioni. Questo è un limite della verifica, non un confronto completo certificato.

I sei insiemi aggregati sono stati poi acquisiti correttamente con query dirette e confrontati prima/dopo il deploy: nessuna differenza per account, gruppi, eventi, iscrizioni e relativi stati, versioni degli abbinamenti, storico, regole, allenamenti e dimensione dello stato, tentativi, punteggi, timbri e preferenze degli avvisi. Lo snapshot della 1.4.1 è stato consultato separatamente: contiene meno account e attività, quindi non è stato usato come baseline immediata di questo rilascio.

## Verifiche e pubblicazione

- 155 test unitari/integrati e tutti i 36 test browser superati nella copia isolata del rilascio. Build e pacchetto Cloudflare di prova riusciti; audit npm senza vulnerabilità rilevate.
- La verifica comprende accesso, inviti, estrazioni e cron, profilo e percorso quotidiano, avatar fotografico e download, film, quiz, duelli, curling, tris, cache e aggiornamenti. I layout includono 320, 390, 430 e 1440 pixel; i controlli accessibilità sono inclusi nei percorsi previsti dalla suite.
- 174 file di sorgenti, test, migrazioni, configurazione e risorse confrontati tramite SHA-256 con la copia isolata: nessuna differenza. Le ricompilazioni delle altre anteprime non possono alterare il pacchetto verificato.
- Manifest della build verificata: versione `1.5.0`, build `5bb6034d-1150-4835-8e5c-d082904debd3`.

I test browser usano esclusivamente account fittizi su un database locale separato. Non attestano un collaudo su telefono fisico o la consegna effettiva delle notifiche.

## Pubblicazione verificata

- Sito: https://sottolalbero.gifts · attivazione il 18 novembre 2026 alle 20:55, ora italiana (19:55 UTC), al 100% del traffico.
- Commit del codice integrato: `ee9b0be`; merge sul ramo principale `main`: `0d1cc2f`. Il contenuto del merge coincide con quello verificato nella copia isolata.
- Versione Worker: `0a0a8185-ee72-4e33-a880-9e15571a09e3`; deployment: `233ffac0-d750-4c76-8ab4-3ca2182818c9`.
- Applicate soltanto le migrazioni 0016, 0017 e 0018; nessuna migrazione remota residua.
- Manifest online: versione `1.5.0`, build `5bb6034d-1150-4835-8e5c-d082904debd3`, identico al pacchetto collaudato.
- Dodici percorsi pubblici verificati con `Cache-Control: no-store`; 35 asset confrontati tramite SHA-256, comprese risorse dell’avatar e dei personaggi. Gli asset con nome derivato dal contenuto hanno cache immutabile. Il primo confronto CSS durante la propagazione differiva; il controllo completo successivo è riuscito senza modificare la build.
- API anonima in modalità produzione, servizio email configurato e nessun codice di accesso locale esposto.
- Controllo browser pubblico a 320 pixel: titolo, versione visibile, assenza di scorrimento orizzontale, apertura/chiusura dei controlli dell’atmosfera e nessun errore JavaScript.
- I sei insiemi aggregati effettivi risultano invariati fra la fine delle migrazioni e il deploy. Bookmark, risultati e log sono privati e restano esclusi da Git.
- GitHub non ha restituito nuove esecuzioni CI per il merge: i 155 test unitari/integrati e 36 test browser sono evidenze locali, distinte dalla verifica online.

## English

Release 1.5.0 integrates Gemini’s latest illustrated portraits and uncommitted profile, holiday portrait, quiz review and ambient-effect work, plus the separate movie game branch. Alternative renderer experiments remain preserved. Review fixes cover avatar loading/export and distinct, preference-aware interaction emails. Migrations preserve existing data and notification choices; local tests and live deployment evidence are recorded separately.

Published on 18 November 2026 at 19:55 UTC with 100% traffic. The live build matches the tested manifest and 35 checked asset hashes; 12 public routes and a 320px browser smoke test passed. All 155 unit/integration tests and 36 local browser tests passed. Six aggregate result sets match before/after deployment. The initial pre-migration SQL command returned execution summaries rather than query values, so an exact immediate pre/post-migration aggregate comparison is unavailable. No new GitHub CI run was reported.

# Versione 1.6.0 · Profili, giochi e desideri

## Novità

- Ritratto, stato, cinque tratti e tre affinità subito visibili. Catalogo di 52 personaggi, al massimo tre per film. Domande facoltative e stato quotidiano in una sola scelta.
- Ritratti condivisi apribili dal gruppo. Giochi, timbri, interazioni, desideri salvati e partecipazione ai gruppi contribuiscono con pesi limitati, senza interpretare contenuti privati.
- Foto avatar con proporzioni corrette, centraggio del viso e regolazioni vicine all’anteprima da telefono.
- Risultati di quiz, film e duelli consultabili di nuovo, anche nelle edizioni archiviate. I tentativi storici privi delle scelte per domanda sono segnalati senza ricostruire risposte mancanti.
- Curling contro il computer: partecipazione al profilo, senza punti in classifica.
- Ricerca esterna di prodotti e negozi, aggiunta del collegamento alla lettera e città esplicita per il ritiro locale.
- Dodici timbri originali e dieci nuovi oggetti con storie e riferimenti. Uscite automatiche in giorni italiani prima dello scambio: un giorno disponibile, dieci subito; dieci giorni, uno al giorno; venti giorni, uno ogni due giorni.

## Verifica del pacchetto

260 test unitari/integrati e 44 scenari browser finali superati. Build riuscita. Verificati layout da 320 a 1440 pixel, contrasto e accessibilità dei nuovi flussi, autorizzazioni server, risultati storici e rispetto della visibilità dei ritratti. La qualità del ritaglio automatico su selfie reali inclinati rimane da valutare; il centraggio manuale è disponibile.

Le migrazioni 0019 e 0020 creano due tabelle aggiuntive. Non modificano account, iscrizioni, abbinamenti, risultati, timbri o preferenze degli avvisi esistenti. Baseline aggregata e bookmark D1 sono conservati privatamente. Demo, account fittizi, sessioni, immagini di verifica e configurazioni private sono esclusi dal pacchetto e dal repository.

## Pubblicazione

Pubblicata il 18 novembre 2026 alle 23:49, ora italiana, su https://sottolalbero.gifts, al 100% del traffico.

- Codice integrato su `main`: `29567c9`.
- Build: `2b56cda8-2b1f-4adb-88a8-140d4d6e4ed5`.
- Versione Worker attiva: `d9c81a40-9abc-4e2e-b78d-127099f712d1`; deployment `678009f7-92ce-4137-8c93-155c284fa957`.
- Le sole migrazioni pendenti 0019 e 0020 sono applicate; nessuna migrazione residua.
- Sei insiemi aggregati confrontati prima delle migrazioni, dopo le migrazioni e dopo il deploy: invariati account, gruppi, eventi, iscrizioni e stati, abbinamenti, storico, regole, allenamenti, tentativi, punteggi, timbri e preferenze degli avvisi.
- Dodici percorsi pubblici verificati; manifest identico e 36 asset confrontati tramite SHA-256. Cache HTML senza memorizzazione, asset con nome derivato dal contenuto immutabili.
- API anonima in modalità produzione, invio email configurato e nessun codice di accesso locale esposto. Controllo pubblico a 320 pixel senza overflow o errori JavaScript; apertura e chiusura dell’atmosfera riuscite.
- Audit dipendenze senza vulnerabilità rilevate. Le evidenze locali e i controlli online sono distinti; le prove non hanno creato account o dati dimostrativi in produzione.

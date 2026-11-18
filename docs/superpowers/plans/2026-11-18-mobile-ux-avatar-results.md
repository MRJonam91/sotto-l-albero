# Revisione mobile, avatar e risultati — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correggere proporzioni e interazioni da telefono, migliorare il centraggio dei volti, rendere consultabili risultati e profilo natalizio, e mostrare l’anteprima prima della pubblicazione.

**Architecture:** Riparazioni dei flussi React/Worker esistenti. Il ritratto fotografico resta elaborato sul dispositivo; i risultati si rileggono dagli stati già salvati, con autorizzazione del server. Nessuna pubblicazione o migrazione remota in questa attività.

**Tech Stack:** React 19, Canvas/MediaPipe, Worker/D1, Vitest e Playwright.

**Spec:** Richiesta utente del 18 novembre 2026: mobile UX/UI, foto profilo deformata, volto decentrato, slider lontani, risultati delle sfide precedenti e stato/descrizione natalizi visibili; aggiornamenti da mostrare prima di pubblicare.

**Precisazione successiva:** Il profilo deve formarsi dall’attività reale anche senza domande. Le domande sono un approfondimento facoltativo. Il giornaliero è soltanto “Oggi mi sento come…” con una scelta rapida; niente percorso completo quotidiano. Ampliare il catalogo, mostrare tre personaggi e spiegare affinità indipendenti e pesi, mantenendo l’interfaccia leggera.

## Global Constraints

- Conservare palette verde/oro/carta, tipografia e tono del progetto.
- Anteprima locale; non eseguire deploy, push o migrazioni remote.
- Non modificare punteggi, tentativi e preferenze; le risposte degli altri restano private finché il duello non è concluso.
- Nessuna nuova dipendenza o generazione di immagini necessaria.

## Review Focus

- 320/390/430 pixel, testo lungo, tastiera e ingrandimento: niente overflow o controlli tagliati.
- Foto fuori centro o con capelli asimmetrici: allineare il viso, non il rettangolo dell’immagine; ripiego manuale chiaro.
- Gestione dei tocchi: regolazioni vicine all’anteprima, interazioni sulla foto senza spostare involontariamente la pagina.
- Partite vecchie senza risposte per domanda: riepilogo disponibile con indicazione precisa del dettaglio mancante.
- Profilo incompleto o privato: descrizione personale visibile al proprietario senza pubblicarla automaticamente al gruppo.

### Task 1: Mobile e profilo natalizio

**Files:** `src/profile.css`, `src/styles.css`, `src/ProfileSettings.jsx`, `src/HolidayPortrait.jsx`, `tests/e2e/mobile-ux.spec.js`.

**Interfaces:** Consumes profilo e ritratto già restituiti da `/api/profile`; produces riepilogo persistente del proprio Natale e avatar quadrati.

- [x] Riprodurre deformazione dell’avatar e assenza di un riepilogo sempre visibile, con Playwright su database fittizio.
- [x] Eliminare regole CSS in conflitto sulle dimensioni; rendere controlli e immagini non deformabili.
- [x] Mostrare stato, frase e descrizione salvata all’inizio del profilo, con accesso al percorso di modifica.
- [x] Verificare layout, focus, contenuti lunghi e accessibilità alle quattro larghezze previste.

### Task 2: Editor fotografico

**Files:** `src/ProfileSettings.jsx`, `src/avatarCanvas.js`, `src/avatarSegmenter.js`, eventuale helper geometrico, `src/profile.css`, test geometria e mobile.

**Interfaces:** Consumes foto e `faceBox`; produces trasformazione uniforme con centro e scala coerenti tra anteprima, salvataggio e download.

- [x] Riprodurre gli scostamenti della geometria e la distanza tra preview e slider prima di correggere.
- [x] Allineare la scatola del viso all’apertura della scena, conservando l’aspetto; non usare capelli o collo come centro facciale.
- [x] Raggruppare anteprima e regolazioni in una superficie compatta; selezione foto/scena e azioni devono restare comprensibili da mobile.
- [x] Aggiungere regolazione diretta del volto con puntatore/tastiera e ripristino del centraggio, se utile alla correzione.
- [x] Verificare foto fuori centro, selezione rapida di foto successive, modifica durante il ritaglio automatico ed esportazione.

### Task 3: Risultati consultabili

**Files:** `worker/competition.js`, `src/Competition.jsx`, `src/QuizReview.jsx`, `src/competition.css`, `tests/competition.test.js`, test browser.

**Interfaces:** Consumes tentativi completati già presenti in D1; produces cronologia con identificativo e API autorizzata per riaprire il riepilogo.

- [x] Test ROSSO: riaprire lo stesso risultato dopo ricarica, anche se già visto, senza consumare tentativi.
- [x] Consentire lettura soltanto del proprio tentativo completato; duelli rispettano lo stato dell’avversario.
- [x] Rendere cliccabili tentativi di quiz e film e risultati dei duelli, anche nelle edizioni chiuse accessibili.
- [x] Gestire partite precedenti prive del dettaglio per domanda mostrando punteggio e limite dei dati.
- [x] Verificare autorizzazioni, tentativo incompleto, archivio, doppia apertura e punteggi invariati.

### Task 4: Verifica e anteprima

- [x] Eseguire test unitari/integrati, build e suite browser su istanza QA dedicata.
- [x] Revisione indipendente delle modifiche e correzione dei problemi importanti.
- [x] Catturare schermate mobile prima/dopo ed esporre l’anteprima locale.
- [x] Consegnare aggiornamenti e limiti; attendere approvazione prima di pubblicare.

### Task 5: Ritratto automatico e stato del giorno leggero

**Files:** `shared/holidayPortrait.js`, helper per segnali dell’attività in `worker/`, `worker/profile.js`, integrazione del ritratto in `worker/events.js`, `src/HolidayPortrait.jsx`, `src/HolidayProfileSummary.jsx`, `src/App.jsx`, nuovo selettore quotidiano, relativi test.

- [x] Rimuovere penalità per domande saltate/check-in ignorati; niente inferenze dall’assenza di risposta.
- [x] Usare attività verificata sul server: tipi di giochi completati, risultati aggregati, timbri e partecipazione; saturare i conteggi per evitare che ripetere lo stesso gioco domini il profilo.
- [x] Separare segnali dell’attività, stato/gusti espressi e domande facoltative. Pesi base 60/25/15, ridistribuiti solo fra fonti disponibili e descritti con i pesi effettivi.
- [x] Affinità di ogni personaggio da 0 a 100: confronti indipendenti, non probabilità né quote di un totale. Catalogo ampliato, solo tre risultati mostrati.
- [x] Se mancano segnali sufficienti, indicare chiaramente il carattere iniziale/provvisorio; nessuna attendibilità psicologica o statistica dichiarata.
- [x] Nel giornaliero salvare una sola scelta d’umore/personaggio/oggetto, preservando risposte e campi precedenti. Ignorare non peggiora il ritratto.
- [x] Riepilogo e tre personaggi sempre raggiungibili nel profilo; grafici, dettagli dei pesi e domande si aprono su richiesta.
- [x] Test di diversità dei personaggi fra attività diverse, assenza di penalità, pesi normalizzati, soglia di saturazione, compatibilità con profili esistenti e scelta del giorno in una sola schermata.

### Task 6: Catalogo e visibilità iniziale richiesti nella revisione

- [x] Ampliare a 52 personaggi di 19 film, massimo tre per film e nessuna incarnazione di Babbo/Mamma Natale; conservare gli ID compatibili e i tre soli risultati.
- [x] Misurare la diversità su combinazioni di attività/stati/risposte senza presentarla come previsione sugli utenti.
- [x] Mostrare sempre ritratto e descrizione, separare il messaggio di stato vuoto, sostituire il link con un bottone mobile e riquadrare le personalizzazioni.
- [x] Verificare casi iniziali, mobile, accessibilità e revisione indipendente.

### Task 7: Dieci oggetti natalizi e uscite distribuite

**Intento aggiuntivo dell’utente:** conservare una base di timbri e aggiungerne dieci con riferimenti a film/cartoni, citazioni e link; distribuirli sui giorni disponibili prima dell’apertura dei pacchi (1 giorno: tutti; 10 giorni: uno al giorno; 20 giorni: uno ogni due giorni).

- [x] Aggiungere dieci oggetti e icone SVG locali, con fonti primarie attribuite e sole citazioni testuali verificate.
- [x] Calcolare in giorni civili italiani gli sblocchi a partire dall’abilitazione o dalla creazione dell’evento, con date server e prove 1/10/20 giorni, cambio d’ora e lancio futuro.
- [x] Unire le prime date utili fra iscrizioni approvate non archiviate; escludere vecchie edizioni anteriori al lancio e mantenere leggibili i timbri già raccolti.
- [x] Bloccare raccolte anticipate sul server e conservare idempotenza e punteggi storici.
- [x] Mostrare nell’album solo timbri usciti/raccolti e la prossima data, al massimo un nuovo oggetto per sezione.
- [x] Configurare l’anteprima; lasciare la produzione disabilitata fino al rilascio approvato.
- [x] Completare prova browser e schermate finali.

## Execution ledger

### Estensione finale e rilascio 1.6.0

- [x] Mostrare sempre tratti su 100 e tre affinità numeriche, con nota iniziale quando mancano segnali. Accorciare le etichette e rendere evidente il ritratto dei partecipanti.
- [x] Considerare tutti i giochi attivi, compreso curling contro il computer, e gli usi effettivi salvati; mantenere contributi limitati e privacy dei contenuti.
- [x] Aggiungere ricerca esterna multiprovider, inserimento del prodotto, città esplicita per il ritiro e controlli server. Configurazioni personali escluse dal repository.
- [x] Correggere i problemi delle revisioni indipendenti: contrasto dei nuovi controlli e rimozione del tag gestito quando deselezionato sul singolo prodotto, preservando i collegamenti manuali.
- [x] 260 test unitari/integrati; suite browser finale44/44; build e pacchetto Cloudflare riusciti; audit dipendenze senza vulnerabilità.
- [x] Demo completa esclusivamente locale e visibile nel browser: profili, gruppo, wishlist, curling e quiz attuali/archiviati. Script, sessioni e immagini sono esclusi da Git.
- [ ] Integrare su main, applicare le sole due migrazioni additive, pubblicare e verificare dati/manifest online.

L’ultima istruzione dell’utente autorizza esplicitamente pubblicazione e aggiornamento repository, omettendo dati dimostrativi e configurazioni personali. Supera il precedente vincolo di attendere una revisione prima di pubblicare. Baseline remota: sei insiemi aggregati e bookmark acquisiti prima delle modifiche.

- Stato iniziale: ramo di rilascio pulito a `771e643`; versione online 1.5.0. Il precedente vincolo di riepilogo quiz monouso è esplicitamente superato dalla nuova richiesta.
- Validazione browser: Browser plugin non disponibile; si usa Playwright installato nel progetto.
- Task 1: riprodotti tre difetti da browser; avatar e riepilogo passati ROSSO→VERDE, incluse quattro larghezze. Aggiunti casi di descrizione libera senza domande e indovinello senza soluzione visibile.
- Task 2: geometria e cache in correzione separata; integrazione del nuovo editor compatto.
- Task 3: 37 test mirati passati, risultati consultabili ripetutamente e compatibilità dei vecchi stati verificata.

- Task 1: complete — avatar quadrato, riepilogo salvato e privacy esplicita; 4 test SSR su casi limite, test browser a quattro larghezze.
- Task 2: complete — 20 test avatar mirati, geometria comune, pan panoramico, cache e corse asincrone; editor compatto e download verificati da browser. La segmentazione su selfie reale resta un limite dichiarato, non una prova eseguita.
- Task 3: complete — 37 test competition; cronologia quiz/film e duelli riapribili, risultato storico parziale esplicito, archivio e focus verificati da browser.
- Task 5: complete — catalogo10/top3, fonti60/25/15 rinormalizzate, segnali server, nessuna penalità, stato singolo, data server. Correzioni di revisione: stato vecchio non rietichettato come odierno; salvataggio facoltativo non conclude lo stato del giorno.
- Final review: indipendente su autorizzazioni, dati storici, geometria, concorrenza, pesi e privacy. Tutti i problemi importanti corretti con regressioni ROSSO→VERDE. Nessun problema importante aperto.
- Verifica finale: npm test →196/196; build →successo; 40/41 browser superati nella suite completa e restante test aggiornato al nuovo requisito e passato separatamente (1/1). Il primo fallimento era un’aspettativa obsoleta di riepilogo monouso.
- Anteprima: http://127.0.0.1:8795; schermate con dati e foto illustrata fittizi. Nessun push, merge su main o deploy autorizzato/eseguito per questa revisione.
- Estensione Task 6: catalogo52/top3; 450 combinazioni sintetiche producono 27 primi classificati e 42 personaggi nei primi tre. Stato, ritratto e descrizione sempre visibili; modifica come bottone; personalizzazione riquadrata. Nuovo test browser ROSSO→VERDE e revisione indipendente senza problemi concreti.
- Ruling Task 7: data di abilitazione configurata sul server, anziché cron esterni — rende le uscite automatiche e verificabili per ogni evento senza toccare dati di produzione — alla pubblicazione va impostata la data effettiva.
- Ruling Task 7: con più gruppi vale il primo sblocco utile per ciascun timbro — evita di ribloccare gli oggetti dopo uno scambio — la raccolta resta globale come l’album esistente.
- Task 7: 12 timbri base preservati, 10 oggetti nuovi con storie e fonti; due citazioni testuali controllate, altre otto schede con riferimenti narrativi. Calendario in ora italiana, vincoli server e refresh del client implementati. Revisione indipendente senza problemi concreti.
- Verifica estensione: npm test →231/231 in24file; build →successo. Suite completa browser: 41/43 superati; due aspettative aggiornate (totale12→22 e raccolta già automatica al tocco). Rilanciati i due file interessati: 5/5 superati. Non è una singola esecuzione completa 43/43 verde.
- Schermate finali controllate visivamente: profilo con stato/ritratto/descrizione e bottoni, primo accesso senza domande, pannello personalizzazione riquadrato, prossima uscita e storia Office, tavola dei dieci timbri. Salvate nella cartella degli artefatti dell’anteprima. Nessun push, merge su main, deploy o abilitazione remota.

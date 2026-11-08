# Sotto l’Albero · Avatar, sfide e classifica annuale

Questo documento conserva la proposta iniziale. Per il flusso implementato e la configurazione di Telegram, consulta [il README](../../README.md#account-classifica-e-telegram).

Proposta di prodotto. Sotto l’Albero ha già un profilo, un album, una scheda Giochi e la lista dei partecipanti. Il profilo ospiterà l’editor dell’avatar. Ogni gruppo avrà una scheda Sfide con il calendario delle prove e la classifica della propria edizione.

## Avatar nel gruppo

Dal profilo, **Modifica avatar** apre due scelte. Con **Scegli un personaggio** si seleziona un’illustrazione pronta. Con **Usa una foto** si sceglie un effetto, si ritocca l’inquadratura e si controlla il risultato prima di salvarlo. Il nome e l’avatar compaiono insieme nella lista dei partecipanti, nelle sfide e in classifica. Chi non ha ancora scelto vede le proprie iniziali.

Ogni persona gestisce il proprio avatar. L’anteprima mostra sia il ritratto grande sia come apparirà nel gruppo. Su telefono si può trascinare la foto oppure usare comandi per spostarla, ingrandirla e ruotarla. Gli stessi comandi funzionano da tastiera. Il nome resta leggibile anche se l’immagine è disattivata o non si carica.

| Effetto | Cosa si vede | Come si realizza |
| --- | --- | --- |
| Elfo di bottega | Cappello verde, orecchie a punta e grembiule, con gli scaffali della bottega sullo sfondo | Corpo illustrato, viso ritagliato e accessori allineati ai punti del volto |
| Babbo Natale | Cappello con pompon, barba e mantello rosso. La barba si può togliere | Cappello e barba su livelli distinti, abito e sfondo illustrati |
| Renna dal naso rosso | Palchi, orecchie e naso rosso con una luce calda | Accessori ancorati a fronte e naso, con correzione manuale |
| Volo in slitta | Ritratto alla guida della slitta sopra un villaggio innevato | Corpo seduto e scenario pronti. Il bordo della slitta passa davanti al busto |
| Dentro il camino | Il viso spunta tra mattoni, fuliggine e scintille | Finestra per il viso e strato di mattoni in primo piano |
| Sfera di neve | Ritratto dentro il vetro, con riflessi e neve sul bordo | Maschera tonda, riflessi e fiocchi davanti alla foto |
| Ritratto di ghiaccio | Cornice di brina e cristalli, con una luce fredda sul volto | Cornice illustrata e filtro colore leggero |
| Omino di pan di zenzero | Il viso compare in un biscotto decorato con glassa | Apertura sagomata e decorazioni in primo piano |

Per la prima uscita propongo dodici avatar pronti. Oltre ai personaggi della tabella, il set comprende un pupazzo di neve, uno schiaccianoci, un orso polare e un pinguino. Gli effetti fotografici iniziali sono **Elfo, Babbo Natale, Volo in slitta, Dentro il camino e Sfera di neve**. Ogni scena mantiene il viso abbastanza grande da essere riconoscibile nella lista del gruppo.

## Effetti fotografici senza API a pagamento

| Opzione | Risultato | Scelta |
| --- | --- | --- |
| Canvas 2D con scene illustrate | Inserisce il volto ritagliato fra sfondo, costume ed elementi in primo piano. Funziona con il ritaglio manuale | Base per tutte le scene. [Canvas ed esportazione](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) |
| MediaPipe Face Landmarker | Trova i punti del volto nel browser per stimare posizione, scala e inclinazione di cappello, barba e orecchie | Centraggio automatico facoltativo. Caricare modello e runtime solo nell’editor e verificare la licenza degli asset esatti prima di distribuirli. [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker?tab=Web) |
| MediaPipe Image Segmenter | Separa persona e sfondo per conservare anche capelli e spalle | Seconda fase per gli effetti che beneficiano del contorno intero. Valutare la qualità sui telefoni prima di adottarlo. [MediaPipe Image Segmenter](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter?tab=Web) |
| Generazione locale di immagini | Potrebbe ridisegnare anche il volto e il costume. Richiede un modello e un dispositivo in grado di eseguirlo con tempi accettabili | Per questa app scelgo scene illustrate. Il risultato resta prevedibile e le versioni di partenza funzionano senza modello |

La composizione usa tre livelli principali. Si disegna lo scenario con il costume, si inserisce il volto della foto e si aggiungono gli oggetti in primo piano. L’effetto sembra una trasformazione perché la foto entra nella scena, per esempio dietro i mattoni del camino. Se il centraggio automatico non funziona o la foto contiene più volti, la persona può selezionare e posizionare il ritaglio. Il risultato è un fotomontaggio illustrato che conserva il volto originale.

La foto di partenza e i punti del volto restano sul dispositivo. Dopo **Salva avatar** parte solo il ritratto finale, esportato come immagine quadrata di 256 × 256 pixel con un limite di 64 KiB. Il server accetta WebP o JPEG, verifica formato e dimensioni e autorizza ogni lettura per profilo o evento. Non pubblica URL delle foto accessibili a chiunque. La persona può sostituire o rimuovere l’immagine dal profilo. Gli avatar pronti si salvano con il solo identificatore del personaggio. [Decodifica e orientamento della foto](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap) · [Esportazione dal browser](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)

Per i gruppi attuali partirei da D1 con una sola miniatura per account in una tabella separata. Mille immagini al limite occuperebbero circa 62,5 MiB di immagini, prima dell’overhead del database. R2 diventa un’alternativa se crescono volumi o risoluzione e comporta l’attivazione di un altro servizio. La creazione dell’avatar non richiede una chiave AI né un costo per immagine. Lo spazio e le richieste rientrano nelle quote dell’hosting scelto. [Limiti D1](https://developers.cloudflare.com/d1/platform/limits/) · [Prezzi R2](https://developers.cloudflare.com/r2/pricing/)

## Mini sfide del gruppo

Ogni edizione propone quattro sfide ufficiali accessibili a tutti gli iscritti alla classifica. L’organizzatore sceglie calendario e prove prima dell’apertura. Le sfide possono rimanere aperte più giorni, così ciascuno gioca quando può. I duelli a invito sono asincroni. Entrambi ricevono la stessa prova e vedono il confronto quando hanno concluso o quando scade l’invito. I duelli amichevoli si possono rigiocare liberamente e assegnano distintivi senza aggiungere punti alla classifica.

| Sfida | Obiettivo |
| --- | --- |
| Pacchi smarriti | Usare gli indizi per ricostruire quale pacco va a quale personaggio della storia |
| Sacco della slitta | Scegliere i regali che riempiono meglio la slitta rispettando il peso massimo |
| Cartolina cifrata | Ricostruire un augurio con le lettere e gli indizi disponibili |
| Addobbi in ordine | Ricreare la sequenza di decorazioni con una serie di vincoli |
| Duello di ritornelli | Associare ritornelli a figure natalizie. Variante amichevole per sfidare una persona del gruppo |
| Sfera a due | Comporre una scena insieme. Un giocatore riceve gli indizi e l’altro sceglie gli elementi. Variante cooperativa con distintivo |

La valutazione delle prove ufficiali si basa su risposte o soluzioni verificabili. La velocità resta fuori dal punteggio. Gli indizi e i puzzle usano personaggi e oggetti fittizi, separati dagli abbinamenti e dalle liste desideri dell’evento.

## Classifica «Babbo Natale segreto dell’anno»

La classifica appartiene a un gruppo e a un anno. La finestra proposta va dal 1º dicembre alla fine del 31 dicembre, ora italiana. L’organizzatore può impostare date diverse prima dell’apertura. Accedono gli iscritti approvati. Chi vuole giocare per la classifica aderisce dalla scheda Sfide. Il profilo mostra il totale, il contributo di ogni prova e i tentativi rimasti. A fine stagione si archiviano i risultati. Un pari merito vale anche per il primo posto.

| Fonte | Prove | Massimo |
| --- | --- | --- |
| Giochi | Quiz e memory | 300 punti ciascuno, 600 in totale |
| Mini sfide ufficiali | Quattro prove comuni | 100 punti ciascuna, 400 in totale |
| Timbri e duelli amichevoli | Premi da collezionare | 0 punti in classifica |

Il quiz può assegnare una quota dei 300 punti per risposta corretta. Il memory parte da 300 e sottrae 20 punti per coppia errata fino a un minimo di zero. Ogni mini sfida converte la qualità della soluzione in un punteggio da 0 a 100. A ogni gioco e sfida ufficiale si applicano al massimo tre tentativi per edizione. Il primo vale il 100% del risultato, il secondo il 95% e il terzo il 90%, con arrotondamento al punto più vicino. In classifica entra il migliore dei tre punteggi già corretti. A parità si conserva il risultato ottenuto prima. Da lì in avanti resta disponibile l’allenamento.

| Tentativo | Risultato grezzo | Valore per la classifica |
| --- | --- | --- |
| 1 | 240 | 240 |
| 2 | 280 | 266 |
| 3 | 290 | 261 |

Il gioco dell’esempio vale **266 punti**. La terza partita ha più risposte corrette o meno errori, ma il secondo tentativo resta quello che contribuisce al totale. Un nuovo tentativo può migliorare il punteggio già valido.

## Integrazione e verifiche

- Il quiz e il memory attuali calcolano il risultato nel browser. Diventano la modalità allenamento. Nella partita a punti il Worker seleziona il set da una banca separata e verifica le risposte. Nel memory rivela le carte quando vengono girate e conta le coppie errate. Il browser riceve le azioni consentite e il risultato. La banca delle domande competitive rimane sul server.
- Il tentativo parte quando il server mostra la prima domanda o carta. Ricaricare la pagina o aprire una seconda scheda riprende il tentativo attivo. Un tentativo abbandonato occupa il proprio posto e scade entro 24 ore o alla chiusura della prova. Il risultato si registra una volta sola anche con invii ripetuti. Usare chiavi uniche per edizione, persona, prova e numero di tentativo, con aggiornamenti condizionali per le azioni concorrenti. [Transazioni D1](https://developers.cloudflare.com/d1/observability/find-expensive-queries/)
- Collegare l’edizione al gruppo già esistente e all’anno. Ripetere un evento dello stesso gruppo nell’anno rimanda gli iscritti autorizzati alla stessa classifica, con tentativi e stato già registrati. Congelare il calendario e le regole dopo la prima partita ufficiale. Tenere il risultato finale separato dall’avatar, così rimuovere una foto la toglie anche dalle classifiche in archivio.
- Verificare le scene con foto frontali, inclinate, con occhiali, più volti e orientamento da smartphone. Provare l’editor a 320 px, con tastiera e senza il modello automatico. Per il gioco verificare quarto tentativo, invii doppi da due schede, ripresa dopo una disconnessione, scadenza della prova, pari merito e accesso da un account esterno al gruppo.

Realizzerei prima gli avatar pronti e l’editor Canvas. Poi aggiungerei quiz e memory a punti con classifica e storico. Le sfide ufficiali e i duelli userebbero lo stesso sistema di iscrizione e risultato. Il centraggio MediaPipe entrerebbe dopo una prova con foto reali su iPhone e Android. I valori, le date e il catalogo qui descritti sono proposte di partenza.

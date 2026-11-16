# Seconda implementazione: interagire con la scena

La revisione nasce dal feedback sulla prima realizzazione: le idee erano interessanti, ma molti giochi si comandavano attraverso selettori e pulsanti lontani dall’azione. Questa versione conserva gli otto concetti e sposta le operazioni principali sugli oggetti. Si tratta di implementazioni front-end locali, con regole funzionanti e contenuti limitati; non sono collegate agli eventi di produzione.

## Librerie e responsabilità

| Libreria inclusa | Uso effettivo | Fonte |
| --- | --- | --- |
| Matter.js 0.20.0 | Corpi, velocità, collisioni e pareti del curling; gravità nulla, aggiornamento a 120 passi/s | [API ufficiali](https://brm.io/matter-js/docs/) |
| interact.js 1.10.27 | Trascinamento di pezzi, oggetti, indizi, attività e fotogrammi; dropzone e gesti touch | [Documentazione](https://interactjs.io/docs/) |
| Anime.js 3.2.2 | Trasmissione, effetti del congegno, movimento degli attori e riproduzione del film | [Sorgente della versione](https://github.com/juliangarnier/anime/tree/v3.2.2) |

Le versioni sono fissate nel `package-lock.json` di questa cartella. Le dipendenze dell’app principale restano invariate. Il generatore incorpora i tre file di distribuzione nel documento finale: aprire il gioco non richiede CDN o rete. Licenze e attribuzioni sono in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Non viene dichiarato che queste siano le versioni più recenti disponibili: sono le versioni selezionate e collaudate per questa realizzazione.

## Cambiamenti nei giochi

| Gioco | Interazione implementata | Regole e limiti |
| --- | --- | --- |
| Curling | Pacco afferrabile, tiro di mira, rilascio, traiettoria e urti fisici | Sei tiri, rivincita alternata, computer semplice; modalità a due sullo stesso dispositivo |
| Banda | Pezzi trascinati dalla scatola alla griglia e spostabili dopo il montaggio; giocattoli illustrati e impulso animato | Grafo discreto verificato, tre uscite, ciclo chiuso interrotto; ruota simmetrica non finge una rotazione funzionale |
| Folletto | Lente sugli indizi, etichette sui pacchi, carte nei posti della sequenza | Otto prove, caso completo, contraddizioni e aiuti; un solo caso scritto |
| Officina | Oggetti sul banco, prese collegate, direzione e tettoia direttamente nella scena | Tre famiglie di effetti e correzione del vento; combinazioni supportate, non fisica universale |
| Mercatino | Idee nella slitta, confronto prima della sostituzione, varianti con swipe/tap, rilegatura/telescopio/timbri manipolabili | Sei idee; possesso e rifiuto distinti; nessun negozio reale |
| Palla di neve | Attività sulla linea della giornata, personaggio in movimento e gesti sui luoghi | Due momenti, trasferimenti e imprevisto; alternative senza trascinamento |
| Regalo quasi giusto | Base sul banco, forma e dettagli sull’oggetto; reazione e seconda versione effettiva | Due ruoli locali, limiti espliciti, cronologia; nessun acquisto o invio a un altro account |
| Cinepanettone | Oggetti nei fotogrammi, verbi selezionabili sulla scena e riproduzione animata | Due finali supportati; gli oggetti trasformati non riappaiono come originali; avanzamento manuale con movimento ridotto |

I comandi alternativi restano disponibili per tastiera e per chi preferisce selezionare e toccare la destinazione. I controlli tecnici e le istruzioni estese sono raccolti in pannelli richiudibili. Il trascinamento non deve diventare un requisito di abilità motoria.

## Ritratto locale funzionante

Le cinque attività conoscitive possono aggiungere una carta al ritratto della sessione. Si scrive una frase, si sceglie esplicitamente il significato e si conferma. Nessuna scelta di gioco produce da sola un tratto o un gusto. Modificare la frase o cambiare la creazione invalida la conferma dove previsto dal gioco; le carte possono essere rimosse dal pannello comune o cancellate tutte.

`profile.js` contiene un modello in memoria con `save`, `remove`, `clear` e `list`; il testo viene reso con `textContent`. Non usa localStorage, cookie, rete o scritture di account. “Solo fantasia” resta indicato come tale e non diventa una raccomandazione regalo. Ricaricare o chiudere la pagina elimina il ritratto. L’unico stato che la conversazione può ricordare è quale gioco è aperto.

## Verifiche mobili effettuate

Browser plugin non disponibile: collaudo con Playwright e Chromium, viewport mobili e input touch inviati con `Input.dispatchTouchEvent`. Non si tratta di test su un iPhone o un telefono Android fisico.

Sulla raccolta effettiva `index.html` sono passati:

- trascinamenti e tocchi, rilascio fuori bersaglio, `touchCancel`, recupero e alternative da tastiera;
- scorrimento verticale nativo iniziato fuori dalle maniglie, senza bloccare tutta la pagina;
- cicli completi, stato finale e casi negativi degli otto giochi;
- aggiornamenti Matter realmente eseguiti a `1000/120` ms con gravità nulla e collisioni tra pacchi; prova anche con animazione normale;
- riproduzione Anime.js e percorsi con movimento ridotto;
- 320×844, 390×844, 430×844 e 844×390 per tutte le otto scene: nessun overflow orizzontale, pulsanti visibili di almeno 44×44, zero errori JavaScript e zero richieste HTTP;
- cinque conferme attraverso l’interfaccia dei giochi, testo letterale con markup non eseguito, rimozione, invalidazione dopo modifica e svuotamento del ritratto.

La verifica visiva della raccolta assemblata ha individuato e corretto un conflitto CSS: l’altezza generica della scena copriva i bersagli dell’officina e la slitta del mercatino. Le scene mobili ora riservano spazi distinti a istruzione, oggetti di partenza e bersagli. Un altro errore corretto permetteva a un rilascio annullato di completare comunque un drop.

È stata collaudata anche l’anteprima incorporata nella conversazione. Il ritratto usa un pannello nel flusso della pagina: un dialogo modale centrato nel frame poteva finire fuori dalla porzione visibile sul telefono. Apertura e chiusura a tocco, caricamento delle tre librerie e tiro Matter passano anche in questo contesto.

Restano da verificare Safari su dispositivo, prestazioni su hardware di fascia bassa, tecnologie assistive reali e gradimento delle persone. Le illustrazioni panoramiche di Regalo e Cinepanettone conservano margini su alcuni formati: una regia mobile dedicata potrà migliorarle ulteriormente.

## Ricostruzione e QA

Aprire direttamente `index.html` non richiede installazione. Per modificare e ricostruire, dalla radice della repository:

```sh
npm ci --prefix docs/prototypes/2026-11-minigiochi --ignore-scripts
node docs/prototypes/2026-11-minigiochi/build.cjs
node docs/prototypes/2026-11-minigiochi/games/qa-v2-fun.cjs
node docs/prototypes/2026-11-minigiochi/games/qa-v2-stories.cjs --built
```

Per il collaudo maker integrato in PowerShell:

```powershell
$env:MAKERS_INTEGRATED='1'
node docs/prototypes/2026-11-minigiochi/games/qa-v2-makers.cjs
```

Gli script usano il Playwright del progetto e il browser locale configurato nei percorsi di test. Gli script `qa-*` senza `v2` documentano la prima realizzazione e non sono il collaudo di questa versione. Non è necessario eseguirli per aprire la raccolta.

## English

The second local implementation replaces form-led controls with direct manipulation. Pinned Matter.js, interact.js and Anime.js are bundled offline in the standalone output and isolated from production dependencies. All eight game flows, actual emulated touch input, cancellation, native scrolling, keyboard alternatives and the explicit in-memory profile were checked. Mobile emulation is not physical-device or user-enjoyment validation. Production game code and deployment configuration remain unchanged.

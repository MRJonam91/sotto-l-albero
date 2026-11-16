# Minigiochi natalizi: interazioni che cambiano davvero la scena

**Stato del 16 novembre 2026:** l’utente non considera convincenti neppure le anteprime rielaborate. Questo documento resta come ricerca e diagnosi; la nuova proposta dettagliata è [Un Natale da giocare insieme](2026-11-16-minigiochi/README.md). Le vecchie scene non sono la base approvata da implementare.

Ricerca del 15 novembre 2026: dal [catalogo FreeFrontend](https://freefrontend.com/javascript-games/) ai sorgenti originali degli autori. Analisi di istruzioni e codice, senza playtest né copia di codice o asset.

## Perché il ponte precedente non convince

Nel prototipo locale `natalizie-ponte-piazza.js`, `build` registra l’oggetto e `deliver` imposta sempre `delivered=true`. Cambiano forme e colori, ma non costruzione o trasporto. Il problema è meccanico: nessuna scelta richiede azioni successive diverse. Anche la piazza accesa da due collocazioni rende intercambiabili intenzioni differenti.

Sono state ricostruite **cinque anteprime giocabili**, conservate in `docs/prototypes/2026-11-avventure/`. Servono a verificare comprensione e coinvolgimento prima di attivarle negli eventi. Il **tris innevato è una sfida separata**: l’utente ha scelto duelli tra membri del gruppo e allenamento contro il computer.

## Sette riferimenti degli autori

Le adattabilità nell’ultima colonna sono nostre proposte, non funzioni certificate delle demo.

| Riferimento primario | Controllo → feedback → conseguenza osservata nel sorgente | Cosa trasferire e adattare |
| --- | --- | --- |
| [Stick Hero — Hunor Marton](https://codepen.io/HunorMarton/pen/xxOMQKg) | Pressione prolungata allunga l’asta; rilascio la ruota; lunghezza e piattaforma determinano attraversamento o caduta. | Anticipazione e causa leggibile. Nell’avventura sostituire precisione e caduta con regolazione reversibile; touch e pulsanti per aumentare/confermare. |
| [Path Finder — blazicke](https://codepen.io/blazicke/pen/MEvZRR) | Clic su un nodo traccia il collegamento; il controllo della distanza accetta il più vicino ancora disponibile, altrimenti termina la partita. | Percorso visibile e conseguenza di ogni tappa. Per esprimersi eliminare il vincolo del “più vicino”; nodi grandi e selezionabili da tastiera. |
| [Tilt It! — Kit Jenson](https://codepen.io/kitjenson/pen/LYRVKOQ) | Frecce inclinano il piano; pallina e collisioni rispondono; raggiungere l’uscita cambia livello. | Oggetti che reagiscono allo spazio. Su telefono proporre comandi direzionali, senza dipendere dal giroscopio; movimento ridotto disponibile. |
| [PINK ICE — Pedro Ondiviela](https://codepen.io/Pedro-Ondiviela/pen/poYeQVx) | Frecce o controlli visibili fanno scivolare il personaggio fino a un ostacolo; tipo di casella modifica arresto, ripartenza o arrivo. | Una proprietà comprensibile produce strategie. Conservare comandi equivalenti touch/tastiera; distinguere graficamente i materiali. |
| [Sliding Puzzle — Jorge Cheevers](https://codepen.io/jorgecheevers/pen/mdjrXJN) | Solo tessere adiacenti al vuoto sono spostabili; trascinamento e aggancio alla griglia aggiornano le mosse disponibili. | Ogni mossa trasforma le possibilità successive. Aggiungere selezione e comando “sposta” per evitare trascinamento obbligatorio. |
| [Wildfire — Carson Ford](https://codepen.io/carsonf92/pen/poOQPZv) | Azioni sulle caselle consumano turni e cambiano le barriere; il fuoco si propaga diversamente; la casa può essere salvata o persa. | Relazioni spaziali e reazioni concatenate. Nell’avventura togliere punizione e contagio distruttivo; mostrare cosa influenza cosa. |
| [Tic-tac-toe — nonsalant / Stefan Matei](https://codepen.io/nonsalant/pen/GgpmBEQ) | Clic, Invio o Spazio piazzano un simbolo; frecce/WASD spostano il focus; occupazione e turno limitano le mosse. | Chiarezza di turno ed esito. È un riferimento per tastiera, non una certificazione di accessibilità: progettare pulsanti, nomi delle celle e annunci propri. |

## Tre ricostruzioni meccaniche concrete

### 1. Ponte: tre sistemi di trasporto, tre gesti differenti

**Corda:** fissare ancoraggi, regolare l’argano, agganciare una cesta; i pacchi attraversano sospesi. **Libri:** collocare piattaforme, scegliere la sequenza e accompagnare il corriere con passi successivi. **Stelle:** disegnare una rotta, assegnare i pacchi e liberare la flottiglia. Tutte funzionano, ma producono strutture e movimenti differenti. Percorso anticipabile e modificabile; nessuna soluzione premiata come “giusta”. Da Stick Hero prendiamo la causalità, senza prova di precisione.

### 2. Piazza: piccola simulazione di una festa

La musica attira abitanti al palco; sedute e tavola cambiano dove si fermano e con chi; le riparazioni rimettono in moto un carretto di decorazioni. Si colloca, collega e avvia; persone e oggetti reagiscono. La festa dipende dalla disposizione, non dal numero degli oggetti: piazza raccolta, sfilata o angoli indipendenti. Da Wildfire prendiamo la propagazione degli effetti, senza vittoria/sconfitta.

### 3. Tris: una sfida con regole dichiarate

Griglia nella neve, impronte e palline distinguibili per forma. Una mossa aggiorna simbolo e turno; al termine compaiono linea vincente o pareggio. Neve senza coprire caselle/focus, tastiera completa e annunci. La versione 1.4.0 implementa una griglia conservata dal server tra due membri approvati dello stesso evento, con scadenza di due giorni; il computer resta nell’allenamento. Il tris non assegna punti alla classifica.

## Le cinque avventure: identità operative

1. **Ponte dei pacchi:** costruire sistemi di trasporto, come sopra; atmosfera di castello magico.
2. **Piazza senza Natale:** disporre attività e osservare relazioni tra abitanti; borgo eccentrico.
3. **Vagone inatteso:** comporre binari e azionare scambi; soste diverse fanno salire personaggi e cambiano il viaggio, invece di cambiare soltanto lo sfondo.
4. **Casa che accoglie:** trasformare coperte in rifugi, riparare un piccolo elevatore oppure collegare giocattoli musicali; ogni intervento apre un uso diverso della stanza.
5. **Bottega impossibile:** combinare base, meccanismo e incanto; un dono può muoversi, proiettare ricordi o produrre neve, con un comando concreto per provarlo.

Nelle avventure si condividono facoltativamente opera e motivazione: nessuna etichetta di carattere o gusto dedotto. Nei desideri entra solo ciò che l’autore conferma. Le sfide competitive ammettono invece vittoria, sconfitta e regole verificabili.

Prima di estendere, far prevedere e provare due percorsi, anche a 320 px e senza mouse. Verificare comprensione e voglia di sperimentare. Licenze di codice, dipendenze e risorse non verificate: “free” non autorizza automaticamente il riuso. Personaggi, musica e immagini dei film esclusi.

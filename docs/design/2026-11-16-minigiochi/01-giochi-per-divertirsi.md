# Tre giochi che devono funzionare come svago

Specifica proposta, revisione A. Regole numeriche iniziali da tarare con le preview. I punteggi restano interni al gioco: l’eventuale ingresso nella classifica dell’evento richiederà una decisione successiva, dopo la verifica del bilanciamento.

## F1 · Curling dei regali

### Promessa e scena

“Fai arrivare il tuo pacchetto vicino alla lanterna. Puoi anche spostare quelli già sul ghiaccio.” Un tavolo innevato nel cortile di una baita diventa una pista vista dall’alto. I regali hanno fiocchi e sagome diverse, ma identiche proprietà fisiche nella modalità base: l’aspetto non compra un vantaggio.

Il piacere atteso è la combinazione tra controllo delicato e piccole collisioni sorprendenti. Deve essere comprensibile anche senza conoscere il curling.

### Regole e ciclo di gioco

Due giocatori, tre pacchi ciascuno, sei tiri alternati. Chi comincia viene alternato nella rivincita. La zona di lancio è nella parte bassa; il bersaglio è una lanterna con tre anelli, da 3, 2 e 1 punti. Il centro del pacco determina l’anello; sulla linea vale quello esterno. Alla fine si sommano tutti i propri pacchi rimasti negli anelli. Un pacco fuori dalla pista vale zero e resta sul bordo come decorazione. Parità: pareggio, con rivincita facoltativa.

Il giocatore orienta una freccia, trascina indietro il pacco per caricare e rilascia. Prima di rilasciare può annullare. Per tastiera o touch senza trascinamento: due pulsanti di direzione, un controllo di forza e “Lancia”. Il percorso indicativo mostra soltanto la direzione iniziale e la zona approssimativa di arresto senza collisioni, non una soluzione perfetta.

Il pacco scivola, rallenta, può ruotare e urtare gli altri. I bordi laterali rimbalzano una volta con energia attenuata; il bordo superiore è aperto. Il risultato si stabilizza prima del turno successivo. Un massimo di quattro secondi di simulazione conclude il tiro, azzerando velocità residue troppo piccole. Mentre aspetta, il compagno può ispezionare la pista ma non modificarla.

### Esempio concreto

Ada piazza un pacco nell’anello da tre. Bruno potrebbe cercare un proprio tre, ma tira più forte e urta quello di Ada: il suo resta a due, quello di Ada scivola a uno. Ada ha ancora due pacchi; può proteggere la lanterna con un tiro corto oppure provare a spingere il proprio pacco di nuovo verso il centro. Il secondo tiro nasce dal primo: non è una ripetizione con risultato già deciso.

### Varianti e rigiocabilità

Prima preview: pista piana, nessuna abilità speciale. Dopo la verifica: tavolo con una curva di ghiaccio più scivoloso o due biscotti come ostacoli fissi, con disposizione identica per entrambi. Un solo modificatore per partita. L’allenamento usa un computer con errore di mira dichiarato, senza conoscere risultati futuri per scegliere il tiro perfetto. Le partite umane possono essere asincrone, con scadenza di 48 ore e risultato “incompleta” se qualcuno non termina.

### Feedback, dati e rischi

La scia si accorcia quando il regalo rallenta; il fiocco vibra all’urto; il numero provvisorio di punti compare solo a oggetti fermi. Con movimento ridotto mostrare traiettoria e posizione finale, mantenendo le stesse regole. Nessuna vibrazione o audio necessari. Il profilo non deduce “competitività” dalla scelta di urtare un avversario.

Il server dovrà ricevere mira e forza, simulare un passo fisso deterministico e validare turno/revisione; il client anima l’esito autorevole. Nessun punteggio inviato dal browser è affidabile. Fuori ambito iniziale: spin manuale, vento casuale, potenziamenti, scommesse.

**Preview minima:** una pista, sei tiri, collisioni, computer semplice, tastiera, finale. **Prova decisiva:** il giocatore deve riuscire a spiegare perché il secondo tiro gli conviene e desiderare almeno una rivincita. Scartare o cambiare la meccanica se la mira sembra arbitraria o la traiettoria dipende dalla frequenza dello schermo.

## F2 · La banda dei giocattoli

### Promessa e scena

“La vetrina deve suonare quando passa l’ultimo treno. Fai arrivare il movimento a tre giocattoli.” Una scatola musicale aperta contiene ruote, cinghie e leve. Un orsetto batte un tamburo, un soldatino accende lampadine, un pinguino fa un inchino. Il giocatore monta una piccola macchina, la osserva e corregge ciò che non funziona.

Il senso è costruire qualcosa che funzioni e abbia un ritmo personale. Il suono valorizza il risultato; luci, movimenti e battute numerate rendono possibile giocare senza sentirlo.

### Oggetti e regole

Griglia di 4 × 4 alloggiamenti, un motore sul bordo sinistro e tre giocattoli su quello destro. Dodici battute costituiscono un giro di esibizione. La prima scatola dispone di quattro ruote, due cinghie e una camma. Ogni pezzo ha ingressi e uscite visibili; la rotazione di 90° cambia le connessioni. Le ruote trasmettono un impulso ogni battuta; una camma lascia passare un impulso ogni due; una cinghia collega due celle allineate con un solo spazio vuoto fra loro. Le connessioni sono discrete, non una simulazione meccanica realistica.

Seleziona un pezzo, colloca, ruota, prova per un giro, osserva, modifica. Ogni mossa è annullabile. L’impulso percorre il circuito una cella per battuta; un ingresso non collegato produce un piccolo “puff” e resta evidenziato. Un ciclo non blocca il gioco: un impulso che incontra una cella già visitata nello stesso giro si spegne e il circuito indica il punto di ritorno.

Obiettivo base: far agire tutti e tre i giocattoli almeno una volta in dodici battute. Obiettivi facoltativi: farli rispondere uno dopo l’altro, oppure creare un finale simultaneo. Il primo è un problema di collegamento; gli altri sono possibilità espressive, senza voto sul risultato musicale.

### Partita di esempio e sorpresa

Il giocatore collega subito orso e pinguino. Il soldatino resta fermo: il percorso si interrompe in una cella. Sposta una cinghia e tutti partono, ma insieme. Inserisce la camma davanti all’orso: ora il tamburo risponde ogni due battute, mentre il pinguino continua a inchinarsi. Nel finale il soldatino alza per errore un cartello al contrario: un dettaglio comico prevedibile dopo averlo visto, non una penalità casuale.

### Modalità e finale

Solo: scatole con disposizione diversa e soluzione di base verificata. In coppia asincrona: “Io preparo il movimento, tu scegli il finale”; il secondo riceve una copia modificabile e l’originale resta disponibile. Nessuno deve restare in attesa per poter giocare. Il finale produce una breve esibizione ripetibile su richiesta; niente audio automatico quando un compagno apre la creazione.

Risultato: “I tre giocattoli hanno suonato”, numero di revisioni solo personale e facoltativo. Nessuna classifica di creatività e nessun dato di profilo. Eventuali reazioni dei compagni sono “Mi ha fatto sorridere” o “Voglio provarla”, senza conteggio pubblico della popolarità.

**Preview minima:** una scatola, tre pezzi funzionali, un collegamento rotto, un giro di dodici battute. **Contenuti successivi:** sei scatole e tre finali originali. **Da scartare se:** il giocatore deve leggere un manuale per collegare due pezzi, il circuito diventa trial-and-error senza spiegazioni, oppure togliendo l’audio sparisce il gioco.

## F3 · Il folletto ha scambiato tutto

### Promessa e scena

“Tre consegne, tre pasticci. Ricostruisci cosa è successo prima che il postino riparta.” Piccolo giallo comico in un ufficio postale natalizio: il folletto scambia etichette, il gatto sposta un timbro, una finestra aperta lascia neve su un solo pacco. Si ricostruiscono azioni, non gusti di persone reali.

### Interazioni e struttura di un caso

Tre pacchi, tre destinazioni fantastiche, otto osservazioni utili e una sequenza di tre eventi. La scena permette tre operazioni: avvicinare la lente a un dettaglio, sovrapporre una traccia a un oggetto, spostare le carte sulla linea temporale. Il doppio tap “seleziona / applica” sostituisce ogni trascinamento. Ogni indizio ha anche una descrizione testuale equivalente.

La prima osservazione modifica la scena: scuotendo un pacco si sente un sonaglio e compare la sua rappresentazione visiva; confrontandolo con una richiesta si identifica una possibile destinazione. Il taccuino non risolve da solo: conserva prove e contraddizioni specifiche. “Verifica la ricostruzione” segnala una sola contraddizione, collegata alla prova, e permette un nuovo tentativo.

Fine: destinazioni e ordine sono coerenti con tutti gli indizi obbligatori. Niente cronometro. Tre aiuti progressivi: dove guardare, quale relazione usare, spiegazione completa. Chiedere aiuto non impedisce di terminare.

### Caso completo per la prima preview

Pacchi A, B e C; destinazioni Serra, Osservatorio e Teatro. A contiene un sonaglio (rivelato scuotendo), B ha una custodia per una lente (apribile con la linguetta), C contiene tre bulbi illustrati. Un manifesto del Teatro chiede un suono per la scena finale, una lettera dell’Osservatorio parla di un telescopio e la Serra aspetta nuovi fiori: assegnazione univoca A→Teatro, B→Osservatorio, C→Serra.

Seconda domanda: quando sono avvenuti neve, timbro e nastro? La neve è sotto l’inchiostro; il nastro copre una parte del timbro. L’ordine è neve→timbro→nastro. Il folletto viene mostrato mentre compie le tre azioni, nell’ordine proposto; se errato, la sovrapposizione non coincide con la prova. Il finale corretto fa partire un postino su pattini che riesce comunque a dimenticare il proprio cappello.

### Rigiocabilità e limiti

È un gioco a casi: dopo aver saputo la soluzione, ripetere lo stesso caso non è una nuova sfida. Sei casi scritti e verificati sono preferibili a centinaia di enigmi generati con ambiguità. Varianti cambiano relazioni e prove, non soltanto nomi e colori. La futura cooperativa permette di lasciare un’ipotesi a un compagno, ma tutte le prove restano accessibili anche da soli.

Il risultato non alimenta il profilo: usare molti aiuti non significa essere poco intuitivi. Eventuali punti futuri dovranno separare prima soluzione e rigiocate e tenere conto dei casi già noti.

**Preview minima:** il caso descritto, otto osservazioni accessibili (tre contenuti, tre richieste, due sovrapposizioni), verifica e tre aiuti. **Prova decisiva:** chi risolve sa citare le prove senza affidarsi a un’intuizione del progettista. Ogni caso deve avere una soluzione unica rispetto agli indizi dichiarati. Se due interpretazioni ragionevoli funzionano, va riscritto prima di illustrarlo.

## English summary

The entertainment set contains a six-shot gift-curling duel, a discrete mechanical rhythm toy and a short evidence-based Christmas mystery. Each specification defines controls, rules, endings, replay limits and a minimum prototype. These games do not infer player traits. Competitive integration is deliberately a later product decision; local scores and results have no effect on existing event rankings.

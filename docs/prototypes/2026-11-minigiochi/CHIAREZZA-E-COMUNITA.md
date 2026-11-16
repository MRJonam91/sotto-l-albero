# Prima capire, poi giocare insieme

Revisione del 16 novembre 2026, dopo la prova delle demo. Il curling è approvato e il suo frammento resta invariato. Gli altri sette giochi vengono rivisti nelle istruzioni, nei primi gesti e nei riscontri della scena. I giochi pubblicati nel portale restano fuori da questa modifica.

## Criterio editoriale

Ogni introduzione deve dire, in quest’ordine: che cosa vuoi ottenere, qual è la prima azione e come riconosci che sta funzionando. I nomi natalizi danno atmosfera; i verbi spiegano il comando. «Tocca la carta e poi il riquadro Mattino» è un’istruzione; «lascia che la magia ti guidi» non lo è.

Il messaggio dopo un tentativo descrive una causa e una possibilità concreta: quale collegamento manca, quale prova leggere, quale oggetto serve ancora. Nessun complimento generico per un clic. Gli esempi già pronti vengono dichiarati; una dimostrazione non viene presentata come una soluzione del giocatore.

Le domande sociali devono nascere da qualcosa appena fatto. Non chiediamo «che persona sei?» dopo un movimento del mouse: chiediamo quale esperienza vorresti ricevere, quale condizione la renderebbe piacevole o quale dettaglio preferiresti evitare. Le risposte sono facoltative, scritte e confermate dall’autore. Le scelte di fantasia non diventano automaticamente desideri reali.

## Perché questi giochi stanno in Babbo Natale Segreto

| Gioco | Cosa deve capire chi comincia | Utilità per il gruppo o il regalo |
| --- | --- | --- |
| Banda dei giocattoli | Due giocattoli sono già collegati. Scegli una cinghia, montala nella casella indicata, prevedi chi suonerà e prova. Il movimento mostra il percorso. | Due persone possono alternare chi spiega il percorso e chi monta. Il risultato è un’occasione per collaborare, senza attribuire gusti o tratti personali. |
| Il folletto ha scambiato tutto | Prima osservi i pacchi e le richieste, poi assegni le consegne; solo dopo ricostruisci l’ordine usando le tracce. | Confrontare le prove dà un motivo per ascoltarsi. Si può passare il telefono a chi deve spiegare la prossima deduzione. |
| Officina dei rimedi | Scegli luce, suono o movimento. La guida indica pezzi, collegamento e prova; ogni gesto mostra il suo effetto. Il vento è annunciato prima del tentativo. | Dopo l’invenzione puoi dire quale attività creativa vorresti provare davvero e a quali condizioni. Il congegno riuscito non è un test della personalità. |
| Mercatino di mezzanotte | Provi un’idea al banco, decidi se sceglierla e componi una slitta di tre idee. «Ce l’ho già» e «non mi interessa» sono scelte diverse. | Un indizio scritto spiega cosa ricevere e come sceglierlo: più utile di una selezione senza contesto. |
| Palla di neve | Scegli mattino e pomeriggio, prova le attività e decidi cosa cambiare quando arriva l’imprevisto. | Raccontare un’esperienza desiderata, la compagnia e una condizione pratica aiuta a scegliere un regalo da vivere. |
| Il regalo quasi giusto | In due sullo stesso telefono: incarico, proposta, reazione, revisione. Il telefono passa a chi deve decidere. | Esercitarsi a dire «questo dettaglio non fa per me» con una richiesta concreta, ascoltare e correggere una proposta. |
| Cinepanettone impossibile | Costruisci una breve scena con gli oggetti disponibili. Le azioni ammesse e gli oggetti trasformati devono mantenere continuità fino al finale. | Inventare insieme e passarsi la regia. Solo la persona può collegare la fantasia a un interesse reale, per esempio raccontare storie o creare qualcosa insieme. |

## I miei indizi

La raccolta comune si chiama **I miei indizi**, con il titolo «Un aiuto per chi ti farà il regalo». Conserva soltanto le frasi confermate, con il significato scelto dall’autore. Un esempio esplicito mostra il livello di concretezza: «Mi piacerebbe un laboratorio da fare insieme, purché non serva esperienza».

Nella demo tutto resta in memoria. Nessun indizio viene inviato al gruppo, salvato nell’account o trasformato in punteggio. Si può mostrarlo sul proprio schermo, modificarlo o eliminarlo. Il gioco in due usa un dispositivo condiviso: non simula persone collegate online.

## Verifica e prossima prova con le persone

Le verifiche automatiche controllano regole, tentativi incompleti, gesti touch, cancellazione dei gesti, tastiera, conferma e rimozione degli indizi. Non dimostrano da sole che il gioco sia intuitivo o divertente.

Verifica locale del 16 novembre, sulla raccolta ricostruita: tutti e tre gli script `qa-clarity-*.cjs --built` passano. Le prove coprono le tre strade dell’Officina e l’allineamento del segnale alla stella visibile, le due fasi del Folletto con le otto osservazioni, la distinzione fra dimostrazione e riparazione nella Banda, la revisione effettiva della giornata, il passaggio dei ruoli e i due finali del teatrino. Controlli aggiuntivi sulla raccolta a 320, 390, 430 e 844 pixel: nessuno scorrimento orizzontale, pulsanti visibili di almeno 44 pixel, nessuna richiesta di rete o errore JavaScript. La conferma, modifica e rimozione degli indizi sono state provate con tutti e cinque i giochi. Verificata anche l’anteprima incorporata a 320, 390 e 736 pixel. Si tratta di Chromium con touch emulato, non di Safari su iPhone fisico.

Il frammento del curling mantiene il medesimo SHA-256 prima e dopo questa revisione: `9906f53ca5414adf398482f016750a671ad211f2dc1201e3a6ef64b865c43b7c`.

Per la prossima prova basta osservare una persona che non conosce le demo, senza darle istruzioni a voce:

1. Sa dire cosa sta cercando di ottenere e compiere la prima mossa?
2. Dopo un tentativo sa spiegare perché è riuscito o cosa manca?
3. Ha un motivo per coinvolgere un’altra persona, oltre a mostrarle il punteggio?
4. Se lascia un indizio, chi lo legge capisce meglio quale regalo scegliere o evitare?

Se serve spiegare il gioco fuori dallo schermo, la guida va ancora corretta. Se l’indizio è vago, si rivede la domanda che lo ha generato.

## English

This revision makes the first action, goal and cause of each result explicit in seven local demos; the approved curling fragment is unchanged. Shared-device collaboration gives players a reason to talk, while optional gift clues contain only statements written and confirmed by their author. Fantasy actions never become inferred gift preferences. Automated interaction checks do not replace a first-time comprehension and enjoyment playtest.

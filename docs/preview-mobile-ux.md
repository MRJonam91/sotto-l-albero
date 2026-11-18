# Anteprima mobile e profilo natalizio

Stato: **in revisione locale, non pubblicata**. Base: versione 1.5.0, commit `771e643`. Ramo: `codex/mobile-ux-avatar-results`. Nessun deploy, push o intervento sui dati remoti eseguito durante questa revisione.

## Uso da telefono

L’avatar nell’intestazione mantiene una forma quadrata/circolare senza deformare la foto. Il profilo apre con lo stato salvato, la descrizione e tre personaggi; domande, grafici, targhettine e altre personalizzazioni si aprono su richiesta. I controlli principali conservano una superficie di tocco di almeno 44 pixel. Layout verificati a 320, 390, 430 e 1440 pixel.

Nell’editor la foto e i cursori stanno nello stesso blocco. Si può trascinare direttamente il volto o usare tastiera e cursori. Il centraggio usa il rettangolo del viso anche nelle scene classiche, senza trattare capelli e collo come centro facciale. I limiti del movimento manuale si adattano anche alle foto panoramiche. Il filtro della foto viene riusato fra anteprime ed esportazione; una vecchia elaborazione non può sovrascrivere una foto o una regolazione successiva.

La geometria, le corse asincrone, il tocco emulato e il download sono coperti da test. La segmentazione su una foto reale, soprattutto inclinata, con occhiali o con capelli che coprono il volto, resta da provare: non viene dichiarato un rilevamento preciso degli occhi. Il centraggio manuale rimane disponibile.

## Ritratto automatico e domande facoltative

Il ritratto può formarsi senza rispondere al questionario. Usa segnali registrati sul server: tipi di giochi completati e risultati normalizzati, timbri raccolti e interazioni. Le risposte corrette del quiz indicano attività/conoscenze nel gioco: non vengono reinterpretate come gusti personali. Gli allenamenti conservano già soltanto l’ultima partita di ciascun gioco; non vengono inventati conteggi delle ripetizioni passate.

Le domande hanno formulazioni più neutrali e non indirizzano esplicitamente verso un personaggio. Ogni risposta viene normalizzata e mediata con le altre: rispondere a tutte non gonfia automaticamente i valori. Saltare domande o lo stato del giorno, così come scegliere una targhettina, non modifica il profilo per penalità o inferenze sull’assenza di risposta.

Le tre fonti hanno pesi base:

| Fonte | Peso base |
| --- | ---: |
| Attività nel tool | 60% |
| Stato e preferenze espresse | 25% |
| Domande facoltative | 15% |

I pesi vengono ridistribuiti fra le sole fonti disponibili. Attività e stato senza domande, per esempio, pesano circa 71% e 29%. Le ripetizioni dello stesso gioco contano al massimo tre volte; anche timbri e interazioni hanno contributi limitati. La schermata spiega i pesi effettivi e i segnali usati. Nel gruppo vengono mostrati gli stessi personaggi, senza esporre il dettaglio delle attività personali.

Il catalogo comprende dieci personaggi, ma ne vengono mostrati **solo tre**. Le affinità sono indipendenti, non probabilità né quote di un totale: non devono sommare 100%. Ogni personaggio viene confrontato sui cinque tratti del ritratto con la formula `100 − √(media degli scarti²)`, arrotondata all’intero. Il confronto è un gioco, non una valutazione psicologica. Con pochi segnali il risultato è indicato come provvisorio, senza dichiarazioni di attendibilità statistica.

## Stato del giorno

Il giornaliero richiede soltanto una scelta: “Oggi mi sento come…” un personaggio o un oggetto natalizio. Si può ignorare per la giornata o cambiarlo dal profilo. Non apre più l’intero percorso. La data è assegnata dal server in ora italiana; aggiornare risposte facoltative non trasforma lo stato di ieri in quello di oggi e non cancella le preferenze già salvate.

## Risultati dei quiz

Quiz, film e duelli completati si possono riaprire, anche nelle edizioni archiviate accessibili. La lettura non modifica punti o tentativi. Il server autorizza il proprio risultato e tutela le risposte dell’avversario finché il confronto non è pronto. Nei vecchi tentativi che non conservano la scelta per domanda, l’interfaccia dice “Risposta non registrata”, mantenendo il punteggio salvato senza inventare esiti.

## Verifica

196 test unitari/integrati superati; build riuscita. La suite browser copre 41 casi, inclusi accessibilità, layout mobile, stato leggero, foto, riapertura dei risultati e restituzione del focus. Gli esiti finali sono registrati nel piano di lavoro. Tutte le prove usano account fittizi e un database locale separato.

Le schermate dell’editor usano una foto illustrata di prova. L’anteprima resta attiva su `http://127.0.0.1:8795`; l’accesso locale mostra il codice nella pagina e non invia email reali.

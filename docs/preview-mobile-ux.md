# Profilo natalizio e uso da mobile · versione 1.6.0

Revisione sviluppata dalla versione 1.5.0, commit `771e643`, e preparata per il rilascio 1.6.0 autorizzato dall’utente. Per l’esito della pubblicazione si veda il [registro del rilascio](release-1.6.0.md).

## Uso da telefono

L’avatar nell’intestazione mantiene una forma quadrata/circolare senza deformare la foto. Il profilo apre con stato, ritratto, descrizione, cinque tratti e tre personaggi, anche senza risposte facoltative. I tratti sono valori su 100; le affinità dei personaggi sono percentuali indipendenti, indicate come iniziali quando mancano segnali. “Modifica stato e ritratto” è un bottone; domande e personalizzazioni si aprono in un pannello riquadrato. Le targhettine restano facoltative. I controlli principali conservano una superficie di tocco di almeno 44 pixel. Layout verificati a 320, 390, 430 e 1440 pixel. Nel gruppo il bottone “Vedi stato e ritratto” apre i valori condivisi della persona, rispettando la scelta di visibilità.

Nell’editor la foto e i cursori stanno nello stesso blocco. Si può trascinare direttamente il volto o usare tastiera e cursori. Il centraggio usa il rettangolo del viso anche nelle scene classiche, senza trattare capelli e collo come centro facciale. I limiti del movimento manuale si adattano anche alle foto panoramiche. Il filtro della foto viene riusato fra anteprime ed esportazione; una vecchia elaborazione non può sovrascrivere una foto o una regolazione successiva.

La geometria, le corse asincrone, il tocco emulato e il download sono coperti da test. La segmentazione su una foto reale, soprattutto inclinata, con occhiali o con capelli che coprono il volto, resta da provare: non viene dichiarato un rilevamento preciso degli occhi. Il centraggio manuale rimane disponibile.

## Ritratto automatico e domande facoltative

Il ritratto può formarsi senza rispondere al questionario. Usa segnali registrati sul server: tipi di giochi completati e risultati normalizzati, timbri raccolti e interazioni. Le risposte corrette del quiz indicano attività/conoscenze nel gioco: non vengono reinterpretate come gusti personali. Gli allenamenti conservano già soltanto l’ultima partita di ciascun gioco; non vengono inventati conteggi delle ripetizioni passate.

Le domande hanno formulazioni più neutrali e non indirizzano esplicitamente verso un personaggio. Ogni risposta viene normalizzata e mediata con le altre: rispondere a tutte non gonfia automaticamente i valori. Saltare domande o lo stato del giorno, così come scegliere una targhettina, non modifica il profilo per penalità o inferenze sull’assenza di risposta.

Le tre fonti hanno pesi base:

| Fonte                       | Peso base |
| --------------------------- | --------: |
| Attività nel tool           |       60% |
| Stato e preferenze espresse |       25% |
| Domande facoltative         |       15% |

I pesi vengono ridistribuiti fra le sole fonti disponibili. Attività e stato senza domande, per esempio, pesano circa 71% e 29%. Le ripetizioni dello stesso gioco contano al massimo tre volte; anche timbri e interazioni hanno contributi limitati. La schermata spiega i pesi effettivi e i segnali usati. Nel gruppo vengono mostrati gli stessi personaggi, senza esporre il dettaglio delle attività personali.

Il [catalogo](catalogo-personaggi-natale.md) comprende **52 personaggi di 19 film**, al massimo tre per film e senza incarnazioni di Babbo o Mamma Natale. Ne vengono mostrati **solo tre**. Le affinità sono indipendenti, non probabilità né quote di un totale: non devono sommare 100%. Ogni personaggio viene confrontato sui cinque tratti del ritratto con la formula `100 − √(media degli scarti²)`, arrotondata all’intero. Il confronto è un gioco, non una valutazione psicologica. Con pochi segnali il risultato è indicato come provvisorio, senza dichiarazioni di attendibilità statistica.

## Stato del giorno

Il giornaliero richiede soltanto una scelta: “Oggi mi sento come…” un personaggio o un oggetto natalizio. Si può ignorare per la giornata o cambiarlo dal profilo. Non apre più l’intero percorso. La data è assegnata dal server in ora italiana; aggiornare risposte facoltative non trasforma lo stato di ieri in quello di oggi e non cancella le preferenze già salvate.

## Risultati dei quiz

Quiz, film e duelli completati si possono riaprire, anche nelle edizioni archiviate accessibili. La lettura non modifica punti o tentativi. Il server autorizza il proprio risultato e tutela le risposte dell’avversario finché il confronto non è pronto. Nei vecchi tentativi che non conservano la scelta per domanda, l’interfaccia dice “Risposta non registrata”, mantenendo il punteggio salvato senza inventare esiti.

## Dieci timbri prima dello scambio

La base di dodici timbri rimane disponibile con le regole precedenti. Dieci nuovi oggetti, con storie e [fonti attribuite](stamp-content-sources.md), arrivano gradualmente. Il server usa la data italiana e una data di abilitazione configurata (`STAMP_ROLLOUT_START`, `YYYY-MM-DD`), da impostare alla pubblicazione; senza configurazione la nuova serie resta disabilitata. L’anteprima usa il 18 novembre 2026. Non serve un’automazione esterna o un cron per ogni timbro.

Per ogni evento con iscrizione approvata e non archiviato, l’inizio è il giorno più recente fra abilitazione e creazione dell’evento. Contano i giorni di calendario prima della data di scambio: il timbro con indice da 0 a 9 esce dopo `floor(indice × giorni / 10)` giorni. Un giorno disponibile: tutti subito; dieci: uno al giorno; venti: uno ogni due giorni. Anche se lo scambio è oggi, i dieci escono subito. Le edizioni precedenti all’abilitazione non sbloccano la nuova serie.

Con più eventi vale la prima data utile per ciascun timbro; passare la data di uno scambio non li riblocca mentre l’iscrizione rimane valida. I timbri già raccolti restano nell’album anche dopo cambi di iscrizione. La raccolta dei nuovi oggetti è verificata sul server, senza fidarsi della data inviata dal telefono. Valgono cinque punti per ogni nuovo timbro unico, secondo le regole esistenti della classifica; gli archivi conservano i punti già congelati.

L’album mostra gli oggetti già usciti e soltanto la prossima data, senza dieci riquadri bloccati. Nelle sezioni del sito appare al massimo un nuovo oggetto alla volta; dopo la raccolta compare il successivo disponibile. La disponibilità si aggiorna al ritorno nella pagina e durante l’uso.

## Verifica

260 test unitari/integrati superati; build riuscita e 44 scenari browser superati nella suite completa finale. Coperti accessibilità, layout mobile, stato leggero, foto, risultati anche archiviati, ritorno del focus, ricerca prodotti, ritratti del gruppo, curling contro il computer e calendario dei timbri. Le prove e la demo usano esclusivamente un database locale separato e non vengono trasferite online.

Le schermate dell’editor usano una foto illustrata di prova. L’anteprima resta attiva su `http://127.0.0.1:8795`; l’accesso locale mostra il codice nella pagina e non invia email reali.

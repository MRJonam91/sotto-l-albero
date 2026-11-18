# Attività usate nel ritratto · versione 1.6.0

Il ritratto è un confronto ludico, non una valutazione psicologica. Mantiene i cinque assi e mostra le tre affinità maggiori su 52 personaggi. I pesi di partenza restano attività 60%, scelte espresse 25%, domande facoltative 15%; vengono ridistribuiti tra le fonti presenti. Nessun segnale viene dedotto dal saltare una domanda o dal non usare una funzione.

## Giochi attivi

- Quiz di Natale e duello quiz: tentativi competitivi conclusi e allenamento salvato.
- Memory di Natale: partite competitive e allenamento conclusi.
- Indovina il film: partite competitive e allenamento conclusi.
- Pacchi smarriti, Sacco della slitta, La cartolina scomparsa e Prendi i pacchi: partite competitive e allenamento conclusi.
- Tris sulla neve: allenamento contro il computer e duelli conclusi tra amici.
- Curling dei regali: una partita completa contro il computer segnala la partecipazione attraverso `POST /api/profile/activity`. Sei tiri totali, tre per ciascuno; nessuna modalità con due persone sullo stesso schermo.

Le ripetizioni dello stesso gioco contribuiscono al massimo tre volte. I risultati disponibili dei giochi gestiti dal server vengono normalizzati sulla scala del singolo gioco e modificano di poco l’asse ludico dell’ingegno; le risposte di conoscenza non vengono interpretate come gusti personali.

Il curling usa una simulazione locale: la conclusione è dichiarata dal dispositivo, **non è un punteggio verificato dal server**. La registrazione richiede un’iscrizione approvata, è deduplicata per giorno di Roma e limitata a tre partecipazioni complessive. Non riceve punti né modifica la classifica. Annullare la mira, uscire o ricominciare una partita incompleta non registra partecipazione. Il client permette di riprovare se il salvataggio non riesce. La nuova tabella non elimina né converte record precedenti.

## Usi effettivi salvati

- Timbri raccolti: massimo 12 nel calcolo.
- Interazioni natalizie inviate al gruppo, comprese risposte agli indovinelli: massimo 5 nel calcolo. Sono conteggiate senza interpretare il testo.
- Desideri salvati nelle iscrizioni approvate: massimo 5 nel calcolo.
- Eventi con iscrizione approvata: massimo 3 nel calcolo.
- Eventi organizzati: massimo 3 nel calcolo.

Gli ultimi tre segnali pesano ciascuno al massimo 0,25 all’interno della componente attività: insieme restano inferiori a una singola partita completata. Sono aggregati dai record esistenti; il contenuto dei desideri, i link, i destinatari, i messaggi e i dettagli degli eventi non escono dall’aggregatore. Le liste dei desideri riflettono ciò che è attualmente salvato; gli allenamenti riflettono l’ultimo stato persistito per ciascun gioco. Non viene ricostruita una cronologia mancante.

Le tabelle attuali non contengono domande anonime con risposta né prenotazioni di regali: non vengono inventati segnali per queste funzioni. Le risposte alle domande facoltative del profilo mantengono la propria componente separata.

Il profilo continua a considerare stato scelto, icone, attività dichiarate tra quelle proposte e risposte facoltative. Non viene analizzato il testo libero per dedurre tratti. Nessun tracciamento di visite, scorrimento, posizione o assenze. Nei gruppi i dettagli dei segnali restano privati; le normali regole di visibilità del ritratto restano applicate.

Le demo di laboratorio non pubblicate non vengono presentate come giochi attivi. Il [registro della versione 1.6.0](release-1.6.0.md) riporta l’esito del rilascio.

# Dal progetto a una preview che meriti di diventare un gioco

Piano di validazione proposto. La richiesta successiva al dossier ha autorizzato revisione e realizzazione delle otto demo: la raccolta è in [Otto nuove demo natalizie](../../prototypes/2026-11-minigiochi/README.md). Le soglie restano criteri decisionali iniziali, non misure di gradimento già ottenute né significatività statistica. La raccomandazione sotto descrive l’ordine del futuro playtest, non un limite alle preview ora autorizzate.

## Ordine suggerito

| Passaggio | Prototipo | Domanda da risolvere | Perché prima/dopo |
| --- | --- | --- | --- |
| 1 | C1 Officina | È divertente inventare, provare e rivedere una soluzione? | Risponde direttamente alla richiesta originaria “cosa useresti?” |
| 2 | F1 Curling | Il gesto è piacevole e la scelta tattica invita alla rivincita? | Verifica uno svago che non dipende dal profilo |
| 3 | C2 Mercatino | L’esplorazione fa emergere preferenze utili senza sembrare un modulo? | Collega il gioco al senso pratico del Secret Santa |
| 4 | C4 Regalo quasi giusto | La revisione tra amici è piacevole e chiarisce un gusto? | Verifica la relazione prima di costruire il multiplayer completo |
| 5 | F2 Banda e C5 Film | Creare un risultato da mostrare genera curiosità nei compagni? | Entrambi richiedono più contenuti e composizione |
| 6 | C3 Palla di neve e F3 Folletto | L’esperienza e la deduzione mantengono interesse oltre la prima scena? | Richiedono transizioni e casi accuratamente scritti |

Non avviare otto implementazioni contemporaneamente. Una proposta può essere scartata senza perdere il lavoro sulle altre. Prima delle preview conviene scegliere un rappresentante del divertimento e uno della conoscenza, usando le schede per correggere il senso del gioco.

## Cosa deve contenere ogni preview

Una sessione completa: istruzione breve, prima azione, feedback, seconda decisione influenzata dalla prima, risultato, possibilità di cambiare strada. Per i C aggiungere una sola carta di profilo simulata, con “solo fantasia” e modifica. Nessuna API di produzione, conto reale, acquisto o assegnazione Secret Santa.

L’inizio deve mostrare subito una cosa da fare. Una mano dimostrativa può compiere un solo esempio quando richiesta; non devono comparire tutorial a cinque schermate. Copia iniziale suggerita per C1: “Fai arrivare suono, luce o movimento alla stella. Prova due oggetti sul banco”. Dopo il primo gesto, si scopre il resto attraverso la risposta degli oggetti.

Ogni preview include almeno una variazione non cosmetica. Per curling: una collisione che cambia il prossimo tiro; per officina: un imprevisto che richiede una revisione; per mercato: sostituire un’idea in una slitta piena; per film: due finali con fatti e conseguenze differenti. Il pulsante “Avvia” da solo non è una meccanica sufficiente.

## Requisiti di interazione comuni

- Funzionamento a 320, 390, 768 e 1440 pixel. Scena importante visibile insieme all’azione corrente, senza costringere a salire e scendere continuamente.
- Bersagli di almeno 44 × 44 pixel sui telefoni; nessun gesto basato soltanto su hover, colore, audio o precisione al pixel.
- Trascinamento facoltativo: seleziona oggetto → seleziona destinazione; rotazione tramite pulsante. Curling offre mira e forza esplicite. Tastiera completa, focus visibile e ordine prevedibile.
- Un canvas può disegnare la scena ma non essere l’unico luogo in cui esistono istruzioni, azioni e stato. Controlli semantici e riepiloghi testuali equivalenti rimangono accessibili.
- Movimento ridotto mantiene cause ed esiti con passaggi statici. Nessun autoplay musicale, flash, scuotimento della pagina o animazione infinita necessaria per capire il gioco.
- Annulla per le azioni di costruzione; “Prova ancora” dopo il risultato. L’uscita non cancella una partita salvata senza avviso.
- Nei giochi espressivi nessun timer. Le animazioni di risultato sono interrompibili; quelle di transizione non ritardano l’azione successiva oltre quanto serve a leggere l’effetto.
- Una vista spiega se si sta giocando da soli, con il computer o con una persona. Le demo a due ruoli dicono chiaramente che simulano entrambi.

Budget tecnici proposti per il primo prodotto: nessun asset individuale indispensabile oltre 300 KB, caricamento differito delle scene, pacchetto iniziale del singolo gioco sotto 1,5 MB esclusi font già presenti; verificare sul dispositivo di prova, non solo sul computer di sviluppo. Target di risposta visiva all’input sotto 100 ms; animazione stabile almeno a 30 fotogrammi/s su telefono di fascia media. Sono obiettivi da misurare, non promesse già verificate. Le animazioni decorative vengono sospese con la scheda nascosta.

## Sessione con persone: protocollo operativo

Primo giro: 6–8 volontari con diversa familiarità con videogiochi, di cui almeno tre su telefono. Per C4 includere due coppie che si conoscono. Evitare di presentare un gioco come “il migliore”: le persone devono poter dire che non diverte. Prima prova senza suggerimenti del progettista; si interviene solo se la persona chiede aiuto o resta bloccata. Un singolo playtest non dimostra che piacerà a tutti.

Sequenza di 15–20 minuti:

1. Mostrare la schermata iniziale e chiedere “Che cosa pensi di poter fare?”. Annotare la risposta, senza correggerla subito.
2. Lasciare compiere una partita. Annotare primo gesto utile, errori recuperabili, momenti d’attesa, richieste d’aiuto e comprensione dell’esito. Non raccogliere tempi o registrazioni in modo nascosto.
3. Chiedere di provare una seconda strada. Osservare se nasce una decisione diversa o se si ripetono click per vedere un’altra animazione.
4. Per un C: mostrare il riepilogo, chiedere che cosa rappresenta davvero e che cosa è fantasia. Contare quante frasi richiedono una correzione sostanziale.
5. Offrire liberamente un’altra partita, un altro gioco oppure la fine della prova. Non premiare chi resta più a lungo.
6. Chiedere “Quale momento terresti?” e “Quale toglieresti?”. Evitare il solo “Ti è piaciuto?”, che produce risposte poco azionabili.

Note minime, senza dati personali superflui: ID fittizio, dispositivo, esperienza dichiarata con giochi, azione attesa, difficoltà incontrata, scelta di rigiocare, frase sulla motivazione, correzioni alla carta. L’opera e il racconto personale non devono essere allegati automaticamente alla documentazione pubblica.

## Soglie per la decisione dopo il primo giro

| Segnale | Soglia iniziale proposta | Se non raggiunta |
| --- | --- | --- |
| Comprensione dell’obiettivo | Almeno 6 persone su 8 lo descrivono senza spiegazione orale | Riscrivere scena e primo gesto |
| Causalità | Almeno 6 su 8 spiegano un cambiamento causato da un’azione | Rifare feedback o regola, non aggiungere solo testo |
| Autonomia | Almeno 6 su 8 terminano una sessione con al massimo un suggerimento | Ridurre comandi e passaggi |
| Voglia di riprovare | Almeno 4 su 8 scelgono spontaneamente una seconda partita o variazione | Indagare ripetitività; possibile scarto |
| Fedeltà delle carte C | Almeno 6 su 8 riconoscono il senso della bozza; ogni errore resta correggibile | Rivedere domanda e modello di sintesi |
| Nessuna condivisione involontaria | Zero casi | Bloccare il passaggio al prodotto |
| Accessibilità essenziale | Tutte le azioni possibili senza trascinare e senza audio | Correggere prima del secondo giro |

I numeri aiutano a prendere decisioni in un piccolo campione; non sono una statistica di mercato. Una persona che non si riconosce non viene considerata “outlier” da ignorare. Un problema grave di comprensione o visibilità può fermare una proposta anche con gli altri indicatori positivi.

## Verificare l’utilità per i regali

Usare un esercizio separato con esempi fittizi, senza svelare gli abbinamenti reali. Un compagno propone due idee prima di leggere le carte confermate e due dopo. Il destinatario indica per ciascuna “sì”, “forse con questa modifica”, “no”, aggiungendo il motivo se vuole. Cercare se migliorano pertinenza e dettagli; non attribuire il miglioramento al gioco quando dipende soltanto da una spiegazione orale aggiunta dal facilitatore.

Non misurare il successo contando acquisti, link o quantità di informazioni intime. Una sola indicazione come “oggetti piccoli senza profumo” può essere più utile di venti preferenze generiche. Il risultato importante è capire meglio una persona conservando spazio per la sorpresa.

## Passaggio al prodotto dopo una decisione esplicita

1. Consolidare regole e contenuti della preview scelta, con versione della specifica e casi limite.
2. Definire azioni, stato, salvataggio e regole d’accesso; verificare il confine con `worker/practice.js`, competizioni e desideri esistenti.
3. Scrivere il piano tecnico limitato al gioco scelto: file, migrazioni necessarie, contratti API, prove di autorizzazione e rollback. Non creare ora tabelle per otto giochi ipotetici.
4. Integrare prima il gioco solitario o l’allenamento; aggiungere il multiplayer dove serve, con revisione atomica e ripresa.
5. Collegare le carte di profilo solo dopo aver verificato conferma, visibilità, revoca e conflitti.
6. Provare in un evento di test isolato; solo dopo pubblicare. Nessuna migrazione deve modificare gli abbinamenti dell’evento o rendere obbligatorio giocare.

## Questioni da decidere sul dossier

Queste domande orientano la prossima revisione, non bloccano la completezza della proposta:

- Il primo confronto deve privilegiare **Officina + Curling** (inventiva e svago) oppure **Officina + Mercatino** (inventiva e utilità per i regali)? La raccomandazione iniziale è Officina + Curling, poi Mercatino.
- Il profilo deve essere soprattutto un aiuto per i regali o anche una galleria sociale stabile? La proposta tiene entrambe le possibilità con condivisione distinta.
- Quale intensità narrativa piace: oggetti quasi realistici, magia quotidiana oppure assurdo comico? Ogni gioco può conservarne una prevalente senza cambiare le regole.

## English summary

Build and evaluate one entertainment prototype and one self-expression prototype first. Each preview must include a complete loop, a meaningful second decision, an ending and a non-cosmetic alternative. Proposed small-sample playtests assess comprehension, causal understanding, voluntary replay and profile fidelity. Accessibility and unintended disclosure are release gates. Production planning begins only after a concept is selected; this dossier does not authorize implementing all eight games.

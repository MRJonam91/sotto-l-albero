# Revisione della proposta e confini delle demo

**Aggiornamento:** la realizzazione corrente è la [seconda implementazione con librerie JS](IMPLEMENTAZIONE-V2.md). I risultati e gli script della prima versione descritti sotto restano uno storico; per il collaudo corrente usare `qa-v2-*`.

La richiesta successiva al dossier autorizza la realizzazione delle otto preview. Sostituisce la precedente raccomandazione di fermarsi a due prototipi iniziali. Le specifiche complete restano una direzione; ogni demo deve rendere verificabile la propria meccanica senza promettere il sistema completo.

## Correzioni di progetto applicate nella revisione

- **Curling:** la scena deve eseguire una simulazione a passo fisso, con forza e mira visibili. Il lancio non può essere una sequenza decorativa che sceglie il punteggio a priori.
- **Banda:** le connessioni devono stabilire quali giocattoli ricevono l’impulso. La prima preview deve poter mostrare sia un circuito interrotto sia uno funzionante; cicli e ritorni non devono congelare l’interfaccia.
- **Folletto:** il caso scritto ha otto osservazioni — tre contenuti, tre richieste, due sovrapposizioni — e una soluzione verificabile. Si possono chiedere aiuti e riprovare. La ripetizione dello stesso caso non viene spacciata per nuova sfida.
- **Officina:** tre posti sul banco rendono necessaria una scelta. Aggiungere un oggetto a una ricetta completa richiede una sostituzione, non un quarto posto invisibile. Vento, orientamento e riparo devono influenzare la prova.
- **Mercatino:** una selezione nella slitta, una cosa non gradita e una già posseduta sono stati distinti. I motivi non si deducono da quanto tempo si resta davanti a un oggetto.
- **Palla di neve:** il primo ciclo usa due momenti della giornata per verificare trasferimenti e imprevisto; non serve costruire tutte e quattro le fasce prima di capire se il gioco interessa.
- **Regalo quasi giusto:** i due ruoli sono dichiarati come simulazione sullo stesso schermo. Il destinatario può cambiare un dettaglio o rifiutare la base; il sistema non deve far passare una bozza per regalo promesso o acquistato.
- **Cinepanettone:** i fotogrammi mantengono proprietà e posizione degli oggetti. Le azioni disponibili devono essere supportate; una didascalia non può essere l’unica cosa che differenzia due finali.

## Criteri comuni di verifica

Aprire la raccolta, scegliere una demo, compiere almeno un ciclo completo, modificare una decisione e osservare una conseguenza differente. Verificare anche ritorno da un’altra scheda, riavvio e varianti di errore recuperabile. Per le carte di profilo verificare modifica, conferma e scelta “solo fantasia”, senza richieste di rete o persistenza.

Browser plugin non disponibile in questa sessione: verifiche locali eseguite con Playwright sui file autonomi. Nessuna prova locale equivale a verifica su iPhone fisico o a un playtest di gradimento.

## Copertura realizzata e riduzioni dichiarate

| Gioco | Verificato nella demo | Confine rispetto al progetto completo |
| --- | --- | --- |
| F1 | Tiro centrale da tre punti, urti, sei turni, rivincita, computer semplice | Due persone sullo stesso dispositivo; nessun multiplayer remoto o classifica |
| F2 | Circuito iniziale con due giocattoli attivi, riparazione per tutti e tre, cicli spenti senza blocco | Ruote a quattro connessioni e tre guide di uscita fisse; rotazione utile solo a cinghia e camma; ritmo visivo |
| F3 | Otto osservazioni, consegne, sequenza, soluzione e contraddizioni | Un solo caso scritto; ripeterlo non equivale a un nuovo caso |
| C1 | Tre famiglie di soluzione, effetto del vento, riparo/rotazione, collegamenti non validi, sostituzione e annulla | Combinazioni supportate dal motore, senza simulazione fisica universale o interpretazione automatica di testo libero |
| C2 | Tre microprove collaudate, modifica dettaglio, slitta piena con confronto e sostituzione, possesso distinto da rifiuto | Sei idee; cassetto deterministico; nessun negozio reale, ricerca o acquisto |
| C3 | Conflitto di tragitto, variante meteo, due punti di rilegatura e scelte con effetti sulla scena | Due fasce, luoghi immaginari; nessun calcolo di percorsi reali |
| C4 | Limite che blocca una proposta, rifiuto di revisione identica, seconda versione, cronologia | Due ruoli locali dichiarati; nessuna persona remota contattata |
| C5 | Due finali, oggetti mancanti e oggetti originali consumati dalle trasformazioni | Riproduzione manuale dei tre fotogrammi; due combinazioni con esito supportato |

Profili: note inizialmente vuote, conferma esplicita, significato scelto dall’autore e invalidazione della conferma dopo modifica. Il risultato resta in memoria della pagina; non è aggiunto al profilo reale. Il testo libero è mostrato come testo, non eseguito come markup.

## Esiti del collaudo locale

- I tre script `qa-fun.cjs`, `qa-c1c2.mjs` e `qa-social.cjs` in `games/` superano i flussi completi e i principali casi negativi descritti sopra.
- `qa-f1-determinism.cjs` verifica posizioni finali identiche a 30 e 144 Hz, compreso lo spostamento di un pacco già fermo dopo un urto.
- La raccolta è stata aperta a 320, 390, 768 e 1440 pixel: tutte le otto demo visibili, nessun overflow, pulsanti visibili di almeno 44 pixel, nessun errore JavaScript e nessuna richiesta HTTP.
- Ispezionate schermate delle scene e corretti contrasto del punteggio, disposizione della macchina musicale su telefono e scala del globo; restano da verificare gradimento, facilità d’apprendimento e accessibilità con tecnologie assistive reali.
- Nessun file dei giochi di produzione (`src`, `worker`, `public`, `shared`), migrazione, pacchetto o configurazione Cloudflare è stato modificato per queste demo.

Per eseguire gli script QA serve il Playwright già installato nel progetto e il browser locale indicato dagli script; non serve per aprire o giocare `index.html`.

## English

The review turns the specification into limited playable slices, checks causal behavior rather than cosmetic outcome switches, and keeps profile interpretation explicit. The subsequent user request authorizes all eight previews. Same-device interaction, limited content and absent production integration are intentional boundaries. Validation results must distinguish functional browser checks from actual human enjoyment testing.

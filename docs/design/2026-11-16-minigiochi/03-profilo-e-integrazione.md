# Il profilo che nasce dai giochi

Proposta funzionale e tecnica, revisione A. Le strutture descritte sono future: non sono migrazioni applicate, API esistenti o funzionalità già disponibili.

## Cosa significa “profilo delle persone”

Un ritratto leggibile fatto di gusti dichiarati, curiosità, condizioni pratiche ed esempi di inventiva. Deve aiutare a dire “questa cosa potrebbe piacerti, perché…” e offrire argomenti di conversazione. Non è un test psicologico né un indice di valore del partecipante.

Il carattere può emergere nel racconto: “Mi riconosco nel cercare un uso nuovo alle cose” è una descrizione che l’autore può scegliere. Il gioco non trasforma una sequenza di click in “sei creativo al 78%”. Anche una scelta insolita può dipendere dal voler vedere un’animazione o dal caso. Se il giocatore non conferma nulla, il profilo resta senza nuove informazioni.

Sei sezioni, mostrate soltanto quando hanno contenuto:

1. **Mi piace fare:** attività abituali e contesti.
2. **Vorrei provare:** curiosità distinte da abitudini.
3. **Nelle mie corde:** atmosfere, stili, umorismo, generi confermati.
4. **Mi rappresenta:** modi di creare e stare insieme espressi con parole proprie.
5. **Per scegliere un regalo:** misure, durata, spazio, possesso, esempi approvati.
6. **Preferisco evitare:** esclusioni esplicite, senza obbligo di spiegarle.

Le opere condivise formano una piccola galleria accanto alle carte; sono esempi da guardare, non prove oggettive di un tratto. Il profilo non mostra una percentuale di completamento né blocca chi non gioca.

## Dal gesto alla carta: contratto di prodotto

Il gioco produce un **fatto di partita**, ad esempio “hai sostituito l’oggetto pronto con un kit”. Il sistema può proporre una domanda pertinente, non una conclusione: “Ti interessa costruirlo anche fuori dal gioco?”. Soltanto la risposta consente di comporre una **bozza di carta**. Le bozze non sono leggibili da altri e non entrano nelle ricerche di regali.

Alla fine: prima la soddisfazione del risultato, poi un invito facoltativo “Vuoi tenere qualcosa di questa partita?”. Massimo due carte per sessione; un solo pannello di rilettura, senza un secondo quiz. Ogni carta permette modifica, conferma, “solo fantasia” e scarto. Il testo libero è facoltativo: frasi guidate e specificazioni aiutano chi non ama scrivere.

Esempio completo:

| Passaggio | Contenuto |
| --- | --- |
| Fatto | Nel mercatino hai tenuto il kit di rilegatura e lasciato il quaderno pronto |
| Domanda | Ti interessa farlo davvero, o ti piaceva la prova? |
| Risposta | Vorrei provarlo, con un progetto breve |
| Bozza modificabile | Vorrei provare la rilegatura con un piccolo kit per principianti |
| Visibilità scelta | Solo chi mi fa il regalo in questo evento |
| Conferma | Carta attiva, con gioco e data di origine |
| Applicazione | Possibile kit breve, verificando spazio, materiali e budget |

Un fatto non confermato non viene usato come fallback se mancano preferenze. Un rifiuto di salvare non viene interpretato come rifiuto del contenuto.

## Visibilità e controllo

La bozza nasce privata. Prima di confermare si sceglie esplicitamente uno dei tre ambiti; nessuna casella di condivisione preselezionata alla prima volta:

- **Solo io:** diario personale; nessun uso nei suggerimenti per altri.
- **Il gruppo di questo evento:** membri approvati; utile per conversazioni e giochi collaborativi.
- **Chi mi fa il regalo in questo evento:** accesso determinato dal server usando l’abbinamento corrente, senza mostrare all’autore chi abbia letto la carta.

Per passare da un ambito all’altro basta modificare la carta. Le bozze, i “no” non condivisi e le risposte private non devono essere presenti nelle risposte API del gruppo, nemmeno come campi nascosti. Chi organizza non riceve automaticamente una vista di tutte le carte riservate: questa proposta richiede una verifica esplicita rispetto ai privilegi già presenti nel portale.

Il profilo personale può diventare una base riutilizzabile. Ogni nuovo evento chiede quali carte copiare e a chi mostrarle; nessuna propagazione automatica tra amici, colleghi e famiglia. Le copie mantengono l’origine ma hanno revisione e visibilità indipendenti. Se una carta di account cambia, le copie propongono un aggiornamento, senza sovrascrivere note adattate al gruppo.

Revoca: non disponibile dal server alla richiesta successiva e rimossa dalle viste client al successivo aggiornamento o rientro in primo piano; le viste collaborative verificano le autorizzazioni almeno ogni 30 secondi mentre visibili. Non promettere di cancellare screenshot o ciò che qualcuno ha già letto. A fine evento l’archivio personale rimane accessibile all’autore; la lettura altrui delle carte riservate termina, salvo una nuova condivisione esplicita prevista da una successiva decisione di prodotto.

La scadenza di un invito non è la scadenza di una partecipazione già approvata. Nessuna regola nuova deve reintrodurre il problema degli eventi scomparsi dopo la chiusura delle iscrizioni.

## Contraddizioni, aggiornamenti ed esclusioni

“Amo le sorprese” e “non regalarmi vestiti” possono convivere. “Preferisco attività in compagnia” può avere il contesto “durante le feste”, mentre una giornata nella neve è stata immaginata da soli. Il sistema mantiene contesto e formulazione; non calcola una media di risposte incompatibili.

Se una nuova carta contraddice una precedente nello stesso contesto, mostrare entrambe: “È cambiata una preferenza oppure valgono in occasioni diverse?”. L’autore può sostituire, precisare o tenere entrambe. La carta sostituita non viene suggerita ad altri. Non trattare la risposta più recente come più vera senza conferma.

Ordine per suggerire un regalo: esclusione esplicita pertinente → dettaglio pratico confermato → preferenza confermata nel contesto → curiosità confermata. Le opere di fantasia non autorizzano suggerimenti da sole. “Ce l’ho già” esclude quel prodotto o quell’edizione, non tutta la categoria. Testi come “niente profumi” vanno conservati nella forma scelta senza dedurre condizioni sanitarie.

Ogni suggerimento mostra da quali carte deriva e che cosa resta da chiarire: “Hai detto che vuoi provare rilegatura e preferisci progetti brevi. Non sappiamo quali strumenti possiedi”. Niente stima nascosta della personalità o della disponibilità economica. I collegamenti a negozi sono un’estensione distinta: questa specifica non assume API commerciali già disponibili e non invia automaticamente carte private a motori di ricerca.

## Informazioni e conservazione proposte

| Entità futura | Campi essenziali | Regola |
| --- | --- | --- |
| Sessione | ID, autore, gioco/versione, seed, stato, revisione, scadenza | Privata o condivisa secondo modalità; nessun replay completo necessario per il profilo |
| Creazione | Autore, dati strutturati della scena, versione, eventuale titolo | Visibilità separata dalle preferenze che ne derivano |
| Bozza | Autore, sessione origine, testo candidato, risposta esplicita, data | Mai usata per suggerimenti; eliminazione dopo 30 giorni se non salvata |
| Carta | Autore, contesto evento/account, tipo, testo, relazione “abitudine/curiosità/immaginazione”, ambito, revisione, stato | Conferma registrata; leggibilità calcolata a ogni richiesta |
| Revisione collaborativa | Sessione, autore della proposta, destinatario, modifica, stato | Non diventa carta del destinatario senza sua conferma |

Durate proposte: sessioni non salvate 30 giorni, proposte collaborative aperte 7 giorni, carte confermate fino a cancellazione dell’autore con invito a rivederle all’inizio di un nuovo evento. Nessuna cancellazione dei desideri esistenti dovuta a queste durate. La conservazione dei backup deve essere definita separatamente in fase d’implementazione; cancellazione nell’app non equivale a sparizione immediata da ogni backup.

Nella preview le risposte restano in memoria e si azzerano quando si chiude, salvo selezione del gioco o opzioni di presentazione. Per il prodotto è invece necessaria una scelta esplicita di salvataggio. Le misurazioni di playtest raccolgono osservazioni con consenso; non richiedono registrazione automatica di tutte le interazioni.

## Integrazione con l’app esistente

Il catalogo attuale è in `shared/gameCatalog.js`; allenamenti e classifica hanno responsabilità diverse. Proposta: arricchire il catalogo con `mode`, `goal`, `durationHint`, `profileEligible`, `multiplayer`, `rulesVersion`; ogni gioco dichiara le sue possibilità. Un unico catalogo alimenta Giochi e i collegamenti dalle Sfide, evitando due liste divergenti.

La pagina Giochi permette “Mi va di giocare” e “Conosciamoci”, mostrando comunque tutti i titoli. In Sfide compaiono solo le modalità effettivamente disponibili per quel gruppo. Il nome estratto resta direttamente raggiungibile. Giocare o completare il profilo non è mai prerequisito per vedere l’evento, ricevere un nome o creare uno scambio.

Separare quattro responsabilità future:

1. Motore del singolo gioco: regole, stato e azioni valide; nessuna scrittura diretta nel profilo.
2. Sessioni: autorizzazione, turni, salvataggio, revisione, ripresa.
3. Creazioni e collaborazione: copie, proposte e consenso alla visibilità.
4. Carte di profilo: bozza, conferma, accesso, revisione e revoca.

Schema logico: `azione → nuovo stato di gioco → risultato → rilettura facoltativa → carta confermata`. Salvare il risultato non deve implicare confermare una carta.

API indicative, da definire dopo le preview: creazione sessione; lettura sessione autorizzata; invio azione con `expectedRevision` e chiave d’idempotenza; salvataggio creazione; creazione bozza da risposta esplicita; conferma/aggiornamento/revoca carta. Le operazioni di gioco non accettano `userId` come prova d’identità; usano la sessione autenticata. Turno, appartenenza al gruppo, scadenza e versione vengono verificati dal server. Una risposta `409` ricarica lo stato autorevole e spiega che cosa è cambiato; non ripete silenziosamente una mossa.

La prima versione non richiede un modello generativo: combinazioni e domande sono scritte, le carte sono composizioni trasparenti di frasi confermate. L’eventuale AI successiva può proporre formulazioni, ma non confermarle né dedurre tratti dai tempi di risposta. Ogni estensione dovrà dichiarare quali dati lascia il servizio e a chi.

## Casi da verificare prima del prodotto

- Un utente che sceglie “solo fantasia” non riceve nuove preferenze né esclusioni.
- Due utenti inviano una mossa alla stessa revisione: ne viene accettata una sola.
- Un partecipante rimosso non legge nuove carte o partite condivise; una notifica vecchia non concede accesso.
- Una carta “solo chi mi fa il regalo” cambia lettore dopo un nuovo abbinamento valido; non conserva l’autorizzazione precedente.
- Un autore può correggere una preferenza senza che la versione vecchia ricompaia nei suggerimenti.
- Una carta pubblicata nel gruppo A resta illeggibile nel gruppo B.
- L’organizzatore non eredita contenuti riservati per il solo ruolo.
- Le esclusioni prevalgono su una proposta di gioco incompatibile; le preferenze non sono usate fuori dal contesto dichiarato.
- Una disconnessione conserva la bozza locale in corso per la sessione aperta, offre ripresa e non conferma nulla in automatico.

## English summary

The proposed profile is a contextual collection of confirmed preferences, interests, practical constraints and examples of self-expression. Game actions produce facts, not personality diagnoses. A player may keep the outcome as fantasy, save it privately, share it with an approved event group or make a card readable only by their current gift giver. Proposed game engines, session management, shared creations and profile cards are separate responsibilities. Authorization, revisions and visibility must be enforced server-side; speculative schemas and endpoints here are not implemented APIs.

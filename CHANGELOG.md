# Sotto l’Albero

## 1.4.0

- Sfide e Nome segreto sono raggiungibili dal menu principale, con selezione dello scambio e percorsi diretti che funzionano anche dopo un aggiornamento della pagina.
- Giochi riunisce l’allenamento per tutti i sei giochi a punti, senza consumare tentativi o modificare la classifica.
- Tris sulla neve: una griglia condivisa tra due partecipanti confermati, turni e mosse verificati dal server, partite amichevoli di due giorni. Allenamento separato contro il computer.
- I sei menu restano utilizzabili anche a 320 pixel; le iscrizioni in attesa non aprono le sfide o il nome segreto.
- Main-menu shortcuts, a unified practice catalog and shared-board snow tic-tac-toe with separate computer practice. Existing ranked scores and attempts are preserved.

## 1.3.3

- Le email degli scambi sono attive per i nuovi account, anche quando preparati da chi organizza. Una successiva disattivazione viene conservata.
- Dopo la richiesta di partecipazione compare un riepilogo degli avvisi, con accesso diretto alle preferenze per collegare e attivare Telegram facoltativamente.
- I collegamenti diretti agli eventi propongono subito l’accesso con un account esistente.

## 1.3.2

- Chi è già iscritto ritrova l’evento dal vecchio invito anche dopo la chiusura delle iscrizioni e dopo l’estrazione. Se la sessione è scaduta, il sito invita ad accedere con la stessa email senza perdere il posto.
- Ogni account autenticato può creare i propri eventi; la gestione degli eventi altrui resta riservata al rispettivo proprietario.
- La prima apertura della lettera conserva la cerimonia. Le visite successive mostrano direttamente il nome, verificato nuovamente dal server; l’animazione si può rivedere su richiesta.
- Gli avvisi dell’estrazione aprono direttamente la lettera. Lo scheduler recupera gli avvisi mancanti nei canali abilitati, senza duplicare quelli già inviati.

## 1.3.1

- I menu restano visibili dopo il cambio di sezione anche sui browser mobili.
- Ogni build ha un identificativo univoco. Il sito verifica gli aggiornamenti all’apertura, ogni minuto mentre è visibile e quando si torna alla scheda.
- Le pagine di riepilogo si aggiornano automaticamente; durante un accesso, una modifica, un gioco o un dialogo compare un avviso per aggiornare dopo aver salvato.
- HTML e manifest della versione non vengono conservati in cache. Gli asset con nome derivato dal contenuto possono restare in cache senza nascondere i nuovi rilasci.
- Registrate le proposte su desideri, esclusioni e cinque sfide per conoscere i gusti del gruppo, senza attivarle.

## 1.3.0

- I partecipanti confermati vedono la classifica completa e possono sfidarsi da subito.
- Quiz, Memory, quattro prove ufficiali e timbri della caccia compaiono nel dettaglio dei punti.
- La cartolina scomparsa si gioca in due stanze illustrate. Prendi i pacchi porta otto consegne a tempo sul nastro.
- La lettera emerge dalla busta tra la neve e le due metà del sigillo. Le scene scoperte restano nell’album.
- Confirmed members can play without a second signup. The group standings list puzzle, quiz, Memory and treasure-hunt points.

## 1.2.0

- Il nome estratto si legge solo aprendo la propria lettera. L’organizzatore deve confermare per consultare tutti gli abbinamenti.
- Telegram raggruppa le richieste di partecipazione per l’organizzatore e collega gli avvisi alle sezioni da usare. I promemoria sulle iscrizioni arrivano solo a chi organizza.
- Draw results stay inside private letters. Telegram batches join requests and links organizers to the relevant settings.

## 1.1.1 · edizione privata

- Corretto il collegamento a Telegram dal Worker Cloudflare per l’invio delle foto e degli avvisi.

## 1.1.0 · edizione privata

- Scatti e foto valide selezionate nell’editor inviano automaticamente una copia al bot immagini dedicato, quando configurato. L’invio non blocca ritaglio, download o salvataggio.
- Il limite per ogni originale è 25 MiB. Il ritratto salvato nel profilo resta una sola miniatura.

## 1.0.0

- Prima versione stabile del portale Secret Santa. Il numero di versione è visibile nel piè di pagina.
- Editor avatar con fotocamera o galleria, ritaglio del volto sul dispositivo e scene natalizie disegnate con Canvas.
- Download PNG da 1024 × 1024 pixel e salvataggio di una sola miniatura per profilo, anche senza un bucket R2.
- Accesso via email e collegamento Telegram per gli avvisi degli scambi.
- Registrazione e aggiunta di partecipanti con nome ed email. Il telefono resta facoltativo nel profilo.

Le prossime correzioni compatibili usano il numero **patch** (`1.0.1`). Le nuove funzioni compatibili incrementano il **minor** (`1.1.0`). Una modifica incompatibile ai dati o alle API del portale richiede una nuova **major** (`2.0.0`) e istruzioni di aggiornamento.

## English

Version `1.0.0` is the first stable release. The portal footer shows the installed version. It includes the browser avatar editor, camera and gallery inputs, PNG download and a single saved avatar per account. Compatible fixes use patch releases, compatible features use minor releases and incompatible changes use major releases.

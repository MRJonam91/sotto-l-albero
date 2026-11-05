# Sotto l’Albero — progetto della web app

Data: 5 novembre 2026. Stato: proposta di prodotto e architettura, da revisionare; applicazione non implementata né pubblicata.

## 1. Obiettivo e perimetro

Un’installazione privata per i gruppi dell’utente, con più organizzatori autorizzati e più Secret Santa indipendenti. Deve essere piacevole da usare da telefono, sorprendente durante la rivelazione e semplice da mantenere su hosting gratuito o economico.

L’utente ha confermato l’uso privato. Sono richiesti: eventi multipli, data di estrazione, desideri e indizi, gestione degli abbinamenti da parte dell’admin, esclusione degli anni precedenti, inviti via link, email e testo copiabile, immagini, icone e riferimenti natalizi a cinema e serie TV.

Proposte progettuali, modificabili: nome Sotto l’Albero; interfaccia italiana; valuta EUR e fuso Europe/Rome predefiniti; prima versione per eventi da 3 a 50 partecipanti; un regalo dato e uno ricevuto per persona. Il limite è una scelta iniziale da validare con benchmark, non un limite teorico del prodotto. Due partecipanti non costituiscono un’estrazione segreta significativa e non sono ammessi nella prima versione.

Successo: un organizzatore crea un evento e prepara gli inviti in pochi minuti; una persona si iscrive e lascia desideri dal telefono; l’estrazione rispetta tutti i vincoli e sopravvive a refresh, retry e accessi simultanei; il destinatario rimane riservato agli utenti autorizzati.

## 2. Direzione creativa

**Il regalo inizia con un segreto.** Una bottega di corrispondenza natalizia: carta, ceralacca, vetro, neve e luce calda. Le immagini danno atmosfera, mentre testi e controlli restano leggibili e realmente interattivi.

Il concept principale è [l’anteprima della dashboard](sotto-l-albero-dashboard-concept.png). È un mockup generato con ImageGen, con eventi illustrativi: non rappresenta una schermata funzionante o dati già presenti.

| Elemento | Scelta |
| --- | --- |
| Sfondo | Verde abete profondo `#0B201D`, con leggere variazioni luminose |
| Testo e carta | Avorio `#F5EFE2`; carta materica solo per lettere e inviti |
| Accenti | Oro tenue `#D6BA7B`, ceralacca `#A73943` |
| Titoli | Serif editoriale; proposta Cormorant Garamond |
| Interfaccia | Sans leggibile; proposta Manrope, font ospitati localmente |
| Icone | Un’unica famiglia lineare, tratto coerente: lettera, regalo, calendario, stella, lucchetto |
| Immagini | Composizioni originali con sfera di neve, lettere, albero e pacchi; formati web ottimizzati |
| Movimento | Luci lente, parallasse leggera, carta che si apre; scene più ricche solo nella rivelazione |

Le superfici operative usano elenchi, moduli e tabelle chiare. L’admin vede prima partecipanti, scadenze e azioni; gli effetti non coprono né rallentano questi strumenti.

Su telefono: navigazione compatta, eventi in righe impilate, riepilogo e azione primaria immediatamente visibili, estrazione a tutto schermo. Le tabelle dei vincoli hanno una vista alternativa per partecipante.

## 3. Schermate e flussi

| Schermata | Contenuti e azione principale |
| --- | --- |
| Accesso | Nome dell’installazione, accesso via email verificata, invito richiesto |
| I miei eventi | Eventi creati e partecipazioni, stato e prossima scadenza; Crea un Secret Santa agli organizzatori |
| Nuovo evento | Nome, copertina, gruppo, budget, scadenza iscrizioni, data/ora estrazione, data regalo, regole |
| Pagina evento | Countdown, budget, istruzioni, partecipanti, inviti e desideri personali |
| Iscrizione | Invito, regole, identificazione, consenso a partecipare; richiesta approvazione se prevista |
| La mia lettera | Oggetti, temi, preferenze, indizi e indovinelli |
| Sala dell’estrazione | Stato reale dell’estrazione, lettera privata e rivelazione |
| Il mio destinatario | Nome, lista e indizi; promemoria privato sul regalo |
| Gestione evento | Partecipanti, inviti, vincoli, storico, coppie fissate e registro modifiche |
| Archivio | Eventi conclusi, duplicazione per l’anno seguente e storico riservato all’organizzatore |

### Organizzatore

1. Crea l’evento in un percorso breve: dettagli, date e budget, regole e inviti.
2. Può organizzare senza partecipare; per entrare nell’estrazione si iscrive esplicitamente.
3. Condivide un link revocabile, prepara il testo copiabile o incolla un elenco di email.
4. Approva gli ingressi quando attivo il controllo; vede chi è iscritto e chi ha compilato la lista.
5. Configura esclusioni, storico e coppie fissate; controlla la fattibilità prima di programmare.
6. Alla data prevista il server esegue l’estrazione, anche senza browser aperti. Esiste anche l’avvio manuale.
7. Verifica esito, problemi di consegna email e, con un’azione esplicita, consulta gli abbinamenti.

### Partecipante

1. Apre l’invito, vede evento, budget, date e chi lo organizza.
2. Verifica la propria email e conferma l’iscrizione. Nessuno viene iscritto automaticamente perché invitato.
3. Scrive la propria lettera; può partire da una lista personale e copiarne gli elementi nell’evento.
4. Dopo l’estrazione apre la lettera sigillata e scopre il destinatario.
5. Consulta desideri e indizi; può segnare privatamente Idea scelta, Acquistato, Incartato.
6. Può rivedere il nome senza ripetere l’animazione. Nessun cambio di destinatario al refresh.

## 4. Desideri: una lettera, non soltanto una lista di prodotti

Tipi di contenuto combinabili:

- **Oggetto:** titolo, descrizione, link facoltativo, fascia di prezzo, priorità. Il link viene mostrato senza acquisire automaticamente dati dal sito del negozio.
- **Tema:** libri gialli, cucina, trekking, giochi da tavolo, esperienze, oggetti fatti a mano.
- **Preferenze:** colori, gusti, formati e taglie solo se la persona desidera indicarli.
- **Da evitare:** doppioni già posseduti e categorie non gradite.
- **Indizio:** un suggerimento diretto o poetico, con progressione facoltativa.
- **Indovinello:** testo, soluzione e fino a tre aiuti scritti dalla persona; soluzione disponibile su richiesta.
- **Sorprendimi:** libertà di scelta accompagnata da alcuni interessi utili.

Esempio originale: «Non ho un motore, ma mi porto sempre in viaggio. Tra le mie pagine finisco spesso molto lontano.» Tema associato: libri. L’indovinello suggerisce cosa regalare, non nasconde l’identità del destinatario.

Default: la lista dell’evento è visibile all’autore e alla persona assegnata dopo l’estrazione. L’organizzatore vede lo stato di compilazione, non riceve automaticamente accesso ai desideri. Un’eventuale lista visibile a tutto il gruppo richiede una scelta esplicita dell’autore.

Le copie tra eventi sono indipendenti: modificare una lista non cambia silenziosamente quelle di altri gruppi. Dopo l’estrazione i desideri sono ancora modificabili, con data dell’ultimo aggiornamento e indicazione delle novità al proprio Santa.

## 5. Abbinamenti e ruolo dell’admin

Ogni evento ha un solo organizzatore proprietario nella prima versione. Il gestore dell’installazione autorizza gli organizzatori. Il ruolo di organizzatore non concede accesso agli altri eventi.

L’invito spiega con chiarezza che l’organizzatore può conoscere e gestire gli abbinamenti. La segretezza vale tra partecipanti; non viene promessa segretezza rispetto a chi amministra evento, server o database.

Vincoli:

- Nessuno regala a sé stesso.
- Ogni persona regala a una sola persona e riceve da una sola persona.
- Esclusioni direzionali A → B; opzione esplicita per vietare anche B → A.
- Esclusioni reciproche per coppie o nuclei familiari, tramite selezione di entrambe le direzioni.
- Esclusione dei destinatari dei precedenti N eventi dello stesso gruppo: valore iniziale proposto, un anno.
- Coppie fissate dall’admin, mantenendo i vincoli di unicità; il resto viene estratto.

Lo storico usa identità stabili, non somiglianza tra nomi. La duplicazione di un evento conserva il gruppo e i riferimenti ai partecipanti; non iscrive automaticamente persone alla nuova edizione. Lo storico precedente all’app può essere inserito a mano o importato come CSV con anteprima e associazione esplicita dei nominativi. Nessuna unione automatica di omonimi.

Un controllo di fattibilità precede l’estrazione. Se non esiste soluzione, l’interfaccia mostra un conflitto concreto e permette all’admin di correggerlo. Nessuna esclusione viene ignorata in silenzio. Per esempio, con tre partecipanti A, B e C, vietare sia A → B sia B → A lascia A e B entrambi dipendenti da C come destinatario: il conflitto va spiegato chiaramente.

### Casualità

Il motore gira sul server e usa un generatore crittograficamente sicuro. Dopo le coppie fissate, un algoritmo di matching perfetto esplora il grafo degli abbinamenti consentiti con ordine casuale di partecipanti e candidati. La fonte casuale è Web Crypto; non l’orologio, il movimento del mouse o `Math.random()`.

Questa scelta produce un’estrazione imprevedibile rispettando i vincoli, ma non promette equiprobabilità matematica tra tutte le soluzioni. Una distribuzione rigorosamente uniforme richiederebbe un diverso motore e una valutazione delle prestazioni; non va dichiarata per il matching randomizzato. Se i vincoli ammettono una sola soluzione, l’app avverte l’admin che non rimane una scelta casuale.

La dicitura di prodotto proposta è «Estrazione casuale protetta, nel rispetto delle regole», evitando promesse non dimostrabili come «più casuale del caso».

### Cambiamenti e ritiri

- Prima dell’estrazione: iscritti, vincoli e date sono modificabili; ogni modifica invalida la precedente verifica.
- Estrazione e pubblicazione sono un’unica operazione logica. Non esiste un pulsante per provare segretamente risultati successivi finché ne compare uno gradito.
- Dopo l’estrazione: il risultato è immutabile; nessun trascinamento cambia una coppia già comunicata.
- Per un ritiro o un errore l’admin annulla esplicitamente la versione corrente, comunica che non è più valida e crea una nuova estrazione. La UI distingue vecchia e nuova versione. Se qualcuno ha già acquistato, l’avviso invita a concordare la soluzione con il gruppo.
- L’admin può consultare la tabella degli abbinamenti dietro una schermata di conferma anti-spoiler. La consultazione e gli interventi sono registrati.

## 6. La rivelazione

Sequenza principale «La lettera nella neve», durata obiettivo 5–7 secondi:

1. Il server conferma che l’estrazione esiste ed è pubblicata; prima di allora appare il countdown.
2. La sfera di neve si illumina; una breve corrente porta una lettera al centro.
3. Il partecipante tocca o clicca il sigillo. Un pulsante equivalente è utilizzabile da tastiera.
4. Il sigillo si spezza; la lettera si apre, il nome compare insieme a una breve scia dorata.
5. Azione immediata: «Scopri i suoi desideri». Secondaria: «Rivedi la magia».

La schermata non mostra nomi fittizi in una roulette che potrebbe essere scambiata per l’algoritmo reale. Gli oggetti che si mescolano sono lettere e stelle. L’effetto è la rivelazione di un risultato persistito, non un secondo sorteggio.

Audio originale discreto e disattivato finché l’utente non lo abilita. Sempre presenti Salta animazione e Riduci effetti. Con movimento ridotto: dissolvenza breve e nome immediatamente accessibile. In caso di rete interrotta: ripresa della stessa versione, senza duplicazione dell’estrazione.

Eventuale modalità tutti insieme: un countdown comune, ma ogni dispositivo rivela solo il proprio destinatario. Per la prima versione bastano aggiornamenti periodici finché la pagina è aperta; nessuna infrastruttura di streaming obbligatoria.

## 7. Dettagli nascosti e cultura natalizia

I segreti sono piccoli premi facoltativi. Nessun invito, desiderio o controllo essenziale dipende dal trovarli.

| Scoperta | Effetto proposto |
| --- | --- |
| Toccare la stella nella sfera | Una costellazione breve e un francobollo da collezionare |
| Aprire il timbro della lettera | Una microcitazione e la sua fonte |
| Accendere una finestrella dell’Avvento | Un dettaglio illustrato o una curiosità, disponibile anche in un elenco accessibile |
| Trovare una piccola teiera | Riferimento al regalo di Jim a Pam in The Office, con titolo dell’episodio |
| Scoprire l’armadillo nascosto | Scheda dedicata a Friends e al suo episodio delle feste |
| Aprire la busta dell’anno precedente | Ricordo dell’evento, senza svelare pubblicamente vecchi abbinamenti |

Prima selezione editoriale:

- **Elf:** breve frammento «I know him!», associato alla gioia della rivelazione. [Riscontro della battuta](https://clip.cafe/elf-2003/and-i-said-i-know-im-gonna-call/).
- **Seinfeld, The Strike:** frammento «for the rest of us», attribuito al riferimento a Festivus; contenuto disponibile nella raccolta della [Television Academy](https://www.televisionacademy.com/news/tv-holiday-episodes-the-office-friends).
- **Friends, The One with the Holiday Armadillo:** piccolo riferimento illustrato originale e scheda sull’episodio. Non confondere il richiamo a Hanukkah con una tradizione esclusivamente natalizia. [Fonte](https://www.televisionacademy.com/news/tv-holiday-episodes-the-office-friends).
- **The Office, Christmas Party:** teiera e scheda sul Secret Santa dell’episodio. [Fonte](https://www.televisionacademy.com/features/news/online-originals/holiday-episodes-simpsons-the-oc-friends).

Le citazioni restano brevi, attribuite e separabili dal resto del prodotto. Ogni voce conserva opera, episodio quando presente, lingua, testo esatto e fonte; un’eventuale traduzione originale è etichettata come tale, senza attribuirla al doppiaggio. Immagini e suoni principali sono originali; poster, clip, colonne sonore e fotogrammi non sono asset necessari. La pubblicazione di contenuti di terzi richiede una verifica editoriale degli usi consentiti: la sola attribuzione non è una licenza.

## 8. Inviti, email e accesso privato

Tre modalità nello stesso pannello:

1. **Link:** link di iscrizione casuale, revocabile, con scadenza e numero massimo di adesioni opzionale. Richiede verifica email; approvazione dell’organizzatore attiva per default. Il link permette di chiedere l’ingresso, non di leggere i dati dell’evento.
2. **Email:** incolla indirizzi separati da righe, virgole o punto e virgola; validazione, eliminazione duplicati, anteprima destinatari e testo. Inviti individuali, mai elenco di indirizzi esposto agli altri. Il pulsante Invia è l’azione esplicita dell’organizzatore.
3. **Copia invito:** testo pronto per chat o invio manuale, con titolo, budget, date e link. Nessun requisito di integrazione con WhatsApp o altre piattaforme.

Gli inviti individuali sono vincolati all’indirizzo verificato, hanno scadenza e uso limitato. Reinviarli non crea una seconda partecipazione. L’interfaccia distingue In coda, Inviato al servizio, Consegnato quando attestato, Non recapitato, Accettato, Scaduto, Revocato. L’apertura di una email non viene usata come prova di iscrizione.

L’autenticazione proposta è via link o codice monouso email, con sessione in cookie HttpOnly/Secure. Gli organizzatori sono abilitati dal gestore dell’installazione; non c’è registrazione pubblica per creare eventi. Il primo gestore è configurato durante il deploy tramite una email autorizzata. Nessun segreto amministrativo è inserito nel bundle frontend.

Il servizio email è un componente necessario in questa proposta anche per l’accesso. Gli inviti copiabili riducono il volume di invio, ma non eliminano questo requisito. Per un’installazione completamente senza email servirà una variante di autenticazione da progettare esplicitamente.

## 9. Architetture considerate

| Opzione | Vantaggi | Compromessi |
| --- | --- | --- |
| **React + Vite, Cloudflare Worker, D1, email transazionali** | Frontend e API sullo stesso dominio, database e scheduler gestiti, pochi servizi da mantenere; prima scelta |
| Frontend statico + Supabase | Autenticazione e database già integrati, buona base se il progetto cresce | Più servizi da coordinare; il piano gratuito può mettere in pausa progetti poco attivi, rilevante per un’app stagionale |
| Node + SQLite in un container | Distribuzione portabile su VPS economici, controllo completo dei dati | Aggiornamenti, backup, TLS e scheduler diventano responsabilità del gestore; non promette hosting gratuito |

La prima opzione è raccomandata per l’installazione privata. Il codice di dominio non dipende da Cloudflare: storage, email e scheduler hanno interfacce separate. Una versione Docker rimane un’alternativa di distribuzione futura, non un secondo backend da mantenere nella prima release. Un hosting esclusivamente statico non basta per custodire abbinamenti e gestire estrazioni automatiche.

### Componenti

- **Web:** React, TypeScript e Vite, con CSS per componenti e animazioni; caricamento differito della scena di rivelazione. Nessun motore 3D obbligatorio.
- **API:** un Worker per sessioni, inviti, eventi, liste, regole, estrazioni e lettura autorizzata del destinatario.
- **Persistenza:** D1, con migrazioni SQL versionate e vincoli di unicità.
- **Scheduler:** un Cron Trigger condiviso controlla gli eventi in scadenza e la coda email. Cron usa UTC; ogni evento conserva anche il proprio fuso IANA. [Documentazione](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
- **Email:** adapter iniziale Resend; l’invio passa da una outbox persistente con retry e limiti, separata dalla transazione dell’estrazione.
- **Asset:** immagini originali e icone incluse nel deploy. Nella prima versione niente caricamento di file dagli utenti; i desideri ammettono link testuali e icone, evitando storage aggiuntivo.

### Modello dei dati

| Entità | Responsabilità |
| --- | --- |
| Utente e sessione | Identità verificata e accesso |
| Organizzatore autorizzato | Permesso di creare eventi nell’installazione privata |
| Gruppo | Continuità tra edizioni e ambito dello storico |
| Evento | Proprietario, date, budget, regole, stato, versione |
| Partecipazione | Utente, evento, stato di iscrizione e adesione esplicita |
| Invito | Tipo, destinatario opzionale, digest token, scadenza, revoca |
| Desiderio | Autore, evento, tipo, testo, link, priorità e visibilità |
| Indizio | Desiderio associato, ordine, suggerimento e soluzione facoltativa |
| Vincolo | Coppia vietata o fissata, fonte manuale o storico |
| Estrazione e abbinamento | Versione, snapshot iscritti/vincoli, donatore, destinatario |
| Storico importato | Edizione, identità riconciliate e coppie pregresse |
| Outbox email | Tipo, destinatario, versione evento, tentativi e stato |
| Registro amministrativo | Autore, azione, data, versione coinvolta |

### Stati e concorrenza

Percorso ordinario: Bozza → Iscrizioni aperte → Iscrizioni chiuse → Estrazione in corso → Estratto → Archiviato. Stati aggiuntivi: Da correggere per vincoli impossibili; Annullato per una versione invalidata. Stato della lista desideri separato da quello dell’iscrizione.

Le date devono rispettare chiusura iscrizioni ≤ estrazione ≤ scambio regali. L’estrazione include solo iscrizioni approvate e confermate alla chiusura. Una lista vuota non esclude qualcuno: appare un promemoria, senza alterare il sorteggio.

Un worker prende in carico un evento con aggiornamento condizionale e lease a scadenza. Il risultato viene validato e scritto in modo atomico, con unicità per donatore e destinatario nella stessa versione. Un processo concorrente non può pubblicare una seconda estrazione. Il commit verifica anche la versione degli iscritti e dei vincoli; se cambiata, il risultato calcolato viene scartato.

Gli avvisi entrano nell’outbox soltanto insieme al risultato valido. Un’interruzione dopo il salvataggio provoca il recupero dell’invio, non un nuovo sorteggio. Una lease scaduta permette il recupero dopo crash. Le email di versioni annullate non ancora inviate vengono invalidate. I retry al provider usano chiavi di idempotenza dove supportate; i rari casi di consegna incerta restano visibili all’admin.

Il cron è periodico: la data impostata è il primo momento utile, non una promessa al secondo. Obiettivo operativo: avvio entro pochi minuti, stato di ritardo visibile e retry; il caricamento di una pagina può anche richiedere il controllo di un evento già scaduto attraverso la stessa procedura idempotente.

## 10. Riservatezza, accessibilità e prestazioni

- L’API verifica identità, ruolo e appartenenza per ogni risorsa; un ID indovinato non concede accesso.
- La risposta per il partecipante contiene soltanto il suo destinatario e i desideri autorizzati. Nessuna tabella completa nascosta nel JavaScript.
- Risposte personali non memorizzate in cache condivise; nessun abbinamento in query string, notifiche sulla schermata bloccata o log applicativi.
- Token salvati come digest, scadenza e revoca; controllo tentativi su accesso, inviti e invio email. Protezione CSRF e validazione degli input.
- Indirizzi email visibili solo a chi deve amministrare inviti e accessi. Esportazioni protette; wishlist eliminabili senza obbligare a cancellare lo storico delle coppie.
- Politica iniziale proposta: desideri cancellabili a evento concluso; storico abbinamenti mantenuto per le edizioni selezionate dall’organizzatore. Esportazione e cancellazione del gruppo disponibili al proprietario.
- Backup esportabile e procedura di ripristino documentata; nessuna promessa di backup derivata solo dall’esistenza di un piano gratuito.
- Navigazione da tastiera, focus evidente, nomi accessibili, errori vicino ai campi e annunci di stato. Obiettivo WCAG 2.2 AA da verificare in implementazione.
- Movimento ridotto, neve disattivabile, audio facoltativo; nessun effetto lampeggiante o gesto indispensabile.
- Immagini responsive, font locali ridotti e scena animata caricata su richiesta. Niente video automatici, polling in schede nascoste o WebGL sempre attivo.

## 11. Hosting e costi

Condizioni consultate il 5 novembre 2026; sono limiti dei fornitori, non una garanzia di costo futuro.

| Servizio | Piano iniziale e vincoli rilevanti |
| --- | --- |
| Cloudflare Workers | Free: 100.000 richieste dinamiche/giorno e 10 ms CPU per invocazione; asset statici gratuiti. Paid da 5 USD/mese più eventuali consumi. [Prezzi](https://developers.cloudflare.com/workers/platform/pricing/) e [limiti](https://developers.cloudflare.com/workers/platform/limits/) |
| Cloudflare D1 | Free: 5 milioni di righe lette/giorno, 100.000 scritte/giorno e 5 GB complessivi. Le query devono usare indici; righe lette non equivale a numero di utenti. [Prezzi](https://developers.cloudflare.com/d1/platform/pricing/) |
| Resend | Free: 3.000 email/mese, massimo 100/giorno, includendo inviti, accessi e notifiche. [Prezzi](https://resend.com/pricing) |
| Dominio per email | Per scrivere a destinatari reali con Resend serve un dominio proprio verificato. Il dominio di prova invia solo al proprio indirizzo. [Requisito](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) |
| Alternativa Supabase | Il piano Free può sospendere progetti poco attivi dopo una settimana: prevedere riattivazione prima della stagione o piano a pagamento. [Documentazione](https://supabase.com/docs/guides/platform/free-project-pausing) |

Stima progettuale: per pochi gruppi, infrastruttura potenzialmente a 0 USD/mese entro le quote, con dominio email già disponibile oppure acquistato a parte. Per maggiore margine CPU, valutare Workers Paid da 5 USD/mese. Non promettere costo totale zero o capienza illimitata.

Il vincolo CPU di Workers Free deve essere misurato sul matching e sull’autenticazione con il gruppo massimo previsto. Se i benchmark non rispettano il limite, diminuire il limite documentato o scegliere il piano a pagamento; non indebolire le regole dell’estrazione.

La coda email riserva capacità alle richieste di accesso e spalma gli inviti massivi. Una saturazione mostra il ritardo e la possibilità di copiare gli inviti; non dichiara consegne avvenute. Il mittente e gli strumenti DNS si configurano una volta, non per ogni evento.

Deploy previsto: clonare il repository, installare dipendenze e costruire il frontend, creare D1, applicare migrazioni, impostare segreti e prima email amministrativa, verificare il mittente, pubblicare Worker e asset. Lo scheduler è parte della configurazione versionata. La guida futura includerà verifica finale di accesso, invito, estrazione e ripristino.

## 12. Prima versione e crescita

La prima versione comprende tutte le funzioni centrali richieste: eventi multipli privati, accessi e inviti, date, desideri di più tipi, esclusioni e storico, coppie fissate, estrazione programmata/manuale, rivelazione animata, anteprima email, archivio e un piccolo insieme curato di segreti natalizi.

Ordine di costruzione proposto: prima accessi ed evento completo; poi desideri e inviti; quindi motore e gestione dello storico; infine rivelazione, dettagli visivi e verifica del deploy. Sono fasi del prodotto, non un piano di implementazione già approvato.

Espansioni possibili dopo la prima versione: più rituali di rivelazione, domande anonime tra Santa e destinatario, modalità locale senza email, immagini caricate dagli utenti e distribuzione Docker. Nessuna dipendenza da AI a pagamento per scrivere desideri o indovinelli.

## 13. Criteri di accettazione

1. Un organizzatore crea più eventi; un partecipante non può crearne senza abilitazione né accedere a eventi altrui.
2. Tutte le tre modalità d’invito funzionano; scadenza, revoca, duplicati e destinatario errato sono gestiti.
3. Oggetti, temi, indizi e indovinelli si salvano; visibilità e copia tra eventi rispettano le scelte.
4. Ogni estrazione assegna esattamente un destinatario valido a ogni partecipante e rispetta storico, esclusioni e coppie fissate.
5. Vincoli impossibili non generano risultati parziali; limiti di esecuzione non vengono confusi con impossibilità matematica.
6. Chiamate contemporanee, retry e crash non producono versioni attive duplicate o abbinamenti differenti.
7. Programmazione verificata su UTC, Europe/Rome, date passate e cambio dell’ora; nessuna dipendenza dal browser aperto.
8. Dopo refresh e riaccesso compare lo stesso destinatario; annullamenti rendono chiaramente invalida la vecchia versione.
9. Errori email non annullano l’estrazione; quote esaurite e consegne incerte rimangono visibili e recuperabili.
10. API e risposte di rete non espongono abbinamenti, email e desideri a utenti non autorizzati.
11. Rivelazione completa anche da tastiera, con movimento ridotto, audio spento e rete interrotta.
12. Verifica visuale su desktop e telefono, confronto con il concept, contrasto, overflow, prestazioni e carico degli asset.
13. Procedura documentata di deploy da checkout pulito e ripristino di un backup di prova.

La verifica tecnica richiederà test di proprietà del motore, test di isolamento degli accessi, prove di concorrenza e un percorso completo in browser. Questo documento e il mockup non costituiscono evidenza di tali test: saranno eseguiti sull’applicazione durante lo sviluppo.

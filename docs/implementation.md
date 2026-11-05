# Realizzazione — 5 novembre 2026

Obiettivo: app privata funzionante con testi italiani rivisti, test automatici e browser, repository privata e deploy se le credenziali del servizio sono disponibili.

Il progetto segue docs/design/2026-11-05-sotto-l-albero-design.md. L’istruzione dell’utente autorizza ora implementazione e pubblicazione. La revisione dei testi sostituisce i testi del mockup quando risultano costruiti. Scegliamo React/Vite, Worker e D1, con simulazione locale ufficiale Wrangler.

## Contratto API

Tutte le API sotto /api; JSON in ingresso e uscita; errori {error:string}; cookie di sessione HttpOnly. Date ISO UTC; tutti i record id stringa.

- GET /api/me -> {user:null|{id,name,email,organizer},mailConfigured:boolean,local:boolean}
- POST /api/auth/request {email,name?} -> {ok:true,devCode?:string} (codice esposto soltanto su loopback in sviluppo)
- POST /api/auth/verify {email,code} -> {user}; POST /api/auth/logout -> {ok:true}
- GET /api/events -> {events:[{id,name,budget,drawAt,giftAt,closeAt,status,isAdmin,memberCount}]}
- POST /api/events {name,budget,drawAt,giftAt,closeAt,description,groupName} -> {event}
- GET /api/events/:id -> {event:{id,name,budget,drawAt,giftAt,closeAt,description,status,isAdmin,inviteToken,groupName},members:[{id,name,status,hasWishlist}],rules:[{giverId,receiverId,type}],wishlist:[],recipient:null|{name,wishlist:[]},assignments?:[{giverId,receiverId}],invites:[]}
- POST /api/events/:id/join {token} -> {ok:true} (utente autenticato, richiede approvazione)
- GET /api/invite/:token -> {event:{id,name,budget,drawAt,giftAt,description},organizerName}
- POST /api/events/:id/members/:memberId {status:'approved'|'removed'} -> {ok:true}
- PUT /api/events/:id/wishlist {items:[{id?,type,title,description,url,hint,answer}]} -> {ok:true}
- PUT /api/events/:id/rules {rules:[{giverId,receiverId,type:'exclude'|'fixed'}]} -> {ok:true}
- PUT /api/events/:id {version,name,budget,description,closeAt,drawAt,giftAt,historyDepth} -> {ok:true}
- POST /api/events/:id/draw -> {ok:true}; POST /api/events/:id/cancel {reason,version} -> {ok:true}; POST /api/events/:id/archive -> {ok:true}
- POST /api/events/:id/invites {emails:[string]} -> {ok:true,queued:number}; POST /api/events/:id/rotate-invite -> {token}
- POST /api/events/:id/duplicate {name} -> {event} (riusa gruppo e storico, non iscritti)
- POST /api/events/:id/history {pairs:[{giverEmail,receiverEmail}]} -> {ok:true}
- POST /api/events/:id/clear-history {} -> {ok:true}; event espone version e historyDepth.

Admin incluso nei membri solo con adesione esplicita. Non-admin non riceve inviteToken, email altrui, rules o assignments. Gli abbinamenti sono visibili all’admin soltanto con GET /api/events/:id?reveal=1. Cron esegue estrazioni scadute e outbox. Email tramite Resend quando configurato; localhost usa un codice di sviluppo, produzione rifiuta accessi senza servizio configurato.

## Compiti e verifica

- [x] Backend: migrazioni, OTP/sessioni, isolamento eventi, adesioni e inviti, desideri, vincoli, storico, matching, estrazione atomica e cron. Test prima del codice per matching e autorizzazioni.
- [x] Frontend: schermate accesso, home, evento, creazione, desideri, admin, rivelazione e invito; testi colloquiali; movimento ridotto e mobile.
- [x] Integrazione: build, migrazione locale, test API reali e percorso browser con utenti distinti, asset e confronto visuale.
- [x] Pubblicazione del codice: controllo segreti, README, commit e push nella repository GitHub privata MRJonam91/sotto-l-albero.
- [x] Deploy Cloudflare: database, quattro migrazioni, Worker e scheduler attivi; HTTPS e API verificati; modalità locale disattivata.
- [ ] Attivazione email: configurare RESEND_API_KEY e MAIL_FROM con mittente verificato, poi provare consegna e accesso sul dominio pubblicato.

## Punti da verificare

Inviti revocati; omonimi nello storico; esclusioni impossibili; retry concorrenti dell’estrazione; quote email o servizio mancante devono restituire messaggi chiari senza alterare gli abbinamenti.

## Esito delle verifiche

Il 5 novembre 2026: 19 test di codice e 4 prove sulla vera istanza Wrangler locale superati. Build, formattazione e audit passati, nessuna vulnerabilità segnalata. Anche il workflow GitHub della prima pubblicazione è terminato con successo: https://github.com/MRJonam91/sotto-l-albero/actions/runs/42066365732.

Le prove locali coprono accessi separati, isolamento dei desideri, approvazione, coppia fissata, estrazione concorrente, link revocati, URL pericolosi, scheduler senza browser e annullamento con versione obsoleta. Il browser verifica creazione, rivelazione, aiuti e soluzione dell’indovinello, salvataggio dopo reload, console senza errori e assenza di overflow a 390 px. La stella della home apre la citazione attribuita.

La revisione indipendente ha segnalato cinque problemi: reinvio degli inviti revocati, pagine ferme su destinatari vecchi, annullamenti senza versione, storico cumulativo e date non modificabili. Corretti e sottoposti a seconda revisione: nessun problema bloccante residuo nelle modifiche esaminate.

### Confronto visivo

Confrontati il mockup iniziale e gli screenshot Playwright del rendering reale, aperti con view_image. Desktop 1536×1024 e telefono 390×844; screenshot completi acquisiti fuori dalla repository.

| Aspetto | Concept e risultato |
| --- | --- |
| Palette | Conservati verde abete, avorio, oro tenue e rosso ceralacca |
| Tipografia | Titoli serif e comandi sans, font locali; verificati anche tab e moduli |
| Struttura | Navigazione orizzontale, immagine a destra, eventi in righe e lettera avorio conservati |
| Immagini | Still life originale separato dalla UI; WebP da 167 KB al posto del PNG da 2,17 MB |
| Testi | Titolo e inviti riscritti su richiesta dell’utente; differenze intenzionali dal mockup, niente dati dimostrativi nell’app |
| Icone | Famiglia lineare coerente, con albero, lettera, regalo e calendario |
| Mobile | Navigazione su seconda riga, hero e righe adattati; nessun contenuto tagliato |
| Accessibilità | Corretto il link salta-contenuto che appariva senza focus; movimento ridotto e rivelazione saltabile |

La direzione visiva è stata verificata rispetto al concept; le differenze intenzionali riguardano la revisione dei testi, dati reali e l’adattamento delle schermate operative. Non si dichiara una riproduzione identica del mockup.

### Produzione

URL: https://sotto-l-albero.sotto-l-albero.workers.dev. Homepage HTTP 200; /api/me HTTP 200 con user:null, local:false e mailConfigured:false. L’organizzatore richiesto è configurato come segreto, fuori dal codice. I dati fittizi dei test restano sul PC.

Il servizio email manca: accessi e consegne reali in produzione non sono verificati né attivi. Il sito lo indica e non espone codici di sviluppo sul dominio pubblico.

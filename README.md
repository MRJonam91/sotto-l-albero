# Sotto l’Albero

Una web app privata per organizzare il Secret Santa con amici, colleghi e famiglia. Eventi separati, desideri e indovinelli, inviti, esclusioni tra partecipanti e una lettera da aprire per scoprire a chi fare il regalo.

## Avvio sul proprio computer

Richiede Node.js 24 e npm.

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run build
npm run db:local
npm start
```

Aprire http://127.0.0.1:8787. Nella configurazione di esempio l’organizzatore accede con `admin@example.test`. Il codice mostrato nella schermata di accesso serve per le prove locali. Per altre persone usare email diverse; il primo utente configurato come admin può creare gli eventi e approvare le iscrizioni.

Durante lo sviluppo dell’interfaccia, `npm run dev` avvia Vite con le API inoltrate al Worker locale già avviato.

I dati locali sono in `.wrangler/`, esclusa da Git. Il database di produzione è separato. Non caricare dati personali, credenziali o codici di accesso nella repository.

## Test

```sh
npm test
npm run build
npx playwright install chromium
npm run db:local
npm start
# In un altro terminale, con il server attivo:
npm run test:e2e
```

Le prove end-to-end usano indirizzi fittizi e aggiungono eventi nel database locale. Richiedono `.dev.vars` con `LOCAL_DEV=true` e `ADMIN_EMAILS=admin@example.test,browser@example.test`, come nel file di esempio. Usare un database locale di prova. Gli screenshot vengono salvati nella cartella temporanea del sistema, oppure nella cartella indicata da `ARTIFACT_DIR`.

## Pubblicazione su Cloudflare

1. Accedere con `npx wrangler login`.
2. Creare il database: `npx wrangler d1 create sotto-l-albero`.
3. Copiare il `database_id` restituito in `wrangler.jsonc`, al posto dell’ID composto da zeri.
4. Salvare l’indirizzo del gestore con `npx wrangler secret put ADMIN_EMAILS` e configurare `APP_URL` con l’URL definitivo HTTPS. Per più organizzatori separare le email con una virgola.
5. Configurare il mittente verificato secondo le indicazioni del servizio email. Salvare la chiave con `npx wrangler secret put RESEND_API_KEY`; configurare `MAIL_FROM` con il mittente autorizzato.
6. Applicare lo schema: `npx wrangler d1 migrations apply DB --remote`.
7. Pubblicare: `npm run deploy`.
8. Verificare accesso email, invito con un altro account, approvazione e una prima estrazione di prova.

Non impostare `LOCAL_DEV=true` in produzione. Senza il servizio email l’app non apre sessioni di produzione. Gli inviti copiabili funzionano insieme all’accesso verificato via email.

Lo scheduler di Cloudflare controlla ogni minuto gli eventi in scadenza e gli invii in coda. La consegna dei messaggi dipende dal provider; lo stato non va confuso con l’accettazione dell’invito.

## Dati e riservatezza

L’organizzatore può consultare gli abbinamenti del proprio evento. I partecipanti vedono il proprio destinatario e i suoi desideri. L’estrazione usa casualità crittografica e rispetta esclusioni e coppie fissate; con vincoli arbitrari non si promette che tutte le soluzioni abbiano la stessa probabilità.

La repository è destinata a restare privata. Il sito usa inviti e accessi verificati anche quando il suo URL è raggiungibile. Un URL conosciuto non concede accesso agli eventi.

## Prima pubblicazione

L’app è distribuita su https://sotto-l-albero.sotto-l-albero.workers.dev, con database e scheduler attivi. L’organizzatore è configurato come segreto. Per attivare accessi e messaggi mancano `RESEND_API_KEY` e `MAIL_FROM`: fino a quel momento l’accesso online rimane chiuso. Le email reali non sono state inviate durante i test.

Verifica locale del 5 novembre 2026: 19 test di codice e 4 prove end-to-end passate; build e audit dipendenze superati. La suite include controlli desktop 1536×1024 e mobile 390×844, estrazione concorrente e programmata. Restano da provare la consegna delle email con mittente reale e il percorso autenticato sul dominio di produzione.

Per esportare il database: `npx wrangler d1 export DB --remote --output backup.sql`. Conservare il backup fuori dalla repository in uno spazio riservato. Provare il ripristino su un database separato prima di usarlo per recuperare dati reali.

## Progetto e immagini

Il progetto iniziale è in `docs/design/`; il piano di realizzazione è in `docs/implementation.md`. Il mockup documenta la direzione visiva. I testi finali seguono la revisione editoriale richiesta: italiano colloquiale, indicazioni dirette e piccoli richiami al Natale.

L’immagine originale della home è generata con ImageGen. Titoli delle opere e brevi riferimenti a film ed episodi sono attribuiti nelle schermate dedicate. Nessun poster, fotogramma o brano musicale fa parte della distribuzione.

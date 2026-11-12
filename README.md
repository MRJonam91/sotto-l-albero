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
npx wrangler d1 migrations apply DB --local --persist-to .wrangler/e2e
npx wrangler dev --ip 127.0.0.1 --port 8790 --persist-to .wrangler/e2e --env-file .dev.vars.example --var APP_URL:http://127.0.0.1:8790
# In un altro terminale, con il server attivo:
npm run test:e2e
```

Le prove end-to-end creano gruppi fittizi nel database isolato `.wrangler/e2e`. Il server di test usa gli account del file di esempio, senza credenziali di invio. Il runner rifiuta la porta 8787 dell’anteprima e gli URL remoti. Per usare un’altra porta locale di test, imposta `QA_BASE_URL`. Gli screenshot finiscono nella cartella temporanea o in quella indicata da `ARTIFACT_DIR`.

## Pubblicazione su Cloudflare

1. Accedere con `npx wrangler login`.
2. Creare il database: `npx wrangler d1 create sotto-l-albero`.
3. Verificare che il `database_id` in `wrangler.jsonc` corrisponda al database di destinazione. Per un primo deploy, inserire l’ID restituito dal comando precedente.
4. Salvare l’indirizzo del gestore con `npx wrangler secret put ADMIN_EMAILS` e configurare `APP_URL` con l’URL definitivo HTTPS. Per più organizzatori separare le email con una virgola.
5. Configurare il mittente verificato secondo le indicazioni del servizio email. Salvare la chiave con `npx wrangler secret put RESEND_API_KEY`; configurare `MAIL_FROM` con il mittente autorizzato.
6. Preparare e verificare il pacchetto con `npm run build` e `npx wrangler deploy --dry-run --outdir .wrangler/deploy-check`.
7. Dopo aver verificato il database di destinazione, esportarne una copia e applicare lo schema con `npx wrangler d1 migrations apply DB --remote`.
8. Pubblicare con `npm run deploy`.
9. Verificare accesso via email, invito con un altro account, approvazione, accesso ai giochi e una prima estrazione.

Non impostare `LOCAL_DEV=true` in produzione. Senza il servizio email l’app non apre sessioni di produzione. Gli inviti copiabili funzionano insieme all’accesso verificato via email.

Lo scheduler di Cloudflare controlla ogni minuto gli eventi in scadenza e gli invii in coda. La consegna dei messaggi dipende dal provider; lo stato non va confuso con l’accettazione dell’invito.

### Aggiornamenti e browser mobili

Ogni build produce `version.json` con un identificativo univoco, incorporato anche nel JavaScript. HTML e manifest usano `Cache-Control: no-store`; solo gli asset con nome basato sul contenuto hanno cache lunga. La scheda controlla il manifest senza cache all’apertura, ogni 60 secondi mentre è visibile e quando torna attiva, torna online o viene ripristinata dalla cronologia. Un controllo fallito non interrompe l’app.

Le pagine di riepilogo si ricaricano automaticamente con un URL che evita le vecchie copie HTML. Durante accesso, modifiche, giochi e dialoghi, compare **Aggiorna ora**: salvare prima di usarlo. Il controllo non svuota cookie, sessioni o dati del sito. Una scheda rimasta aperta con una versione precedente all’introduzione di questo controllo richiede un primo aggiornamento manuale. Il browser deve essere online e la scheda attiva per ricevere una nuova versione.

Le idee non ancora implementate sono in [Desideri e sfide](docs/design/2026-11-12-desideri-e-sfide.md).

## Account, classifica e Telegram

Ci si registra dalla home o da un invito con nome ed email. Chi organizza può aggiungere una persona usando gli stessi due dati. La persona entra con il codice ricevuto via email e il suo profilo resta invariato se ha già un account. Il telefono è facoltativo nel profilo. Gli avvisi Telegram usano la chat privata collegata dal profilo.

La sezione **Giochi** è dedicata all’allenamento. Nel tuo Secret Santa, apri **Sfide e classifica** per fare punti con Quiz, Memory 4×4 e quattro prove ufficiali (Pacchi smarriti, Sacco della slitta, La cartolina scomparsa e Prendi i pacchi). Ogni prova ammette tre tentativi, con pesi del 100%, 95% e 90%. Conta il risultato pesato migliore. Puoi invitare a un duello amichevole chiunque abbia un posto confermato nel tuo scambio.

La classifica mostra ogni partecipante confermato, anche a zero. I timbri personali della caccia valgono 5 punti ciascuno in ogni gruppo a cui partecipi, una sola volta per timbro. Quelli trovati dopo la chiusura non cambiano il risultato dell’edizione. I timbri di Quiz e Memory sono ricordi della partita. Chi organizza può correggere i punti, indicando il motivo. L’azzeramento mantiene i tentativi usati. Da telefono puoi scorrere le clessidre o scegliere la lista. L’album conserva le sorprese già scoperte.

1. Crea un bot con [@BotFather](https://t.me/BotFather), poi apri una chat privata con il bot e premi **Avvia** dal tuo account Telegram.
2. Su Cloudflare imposta `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` senza `@` e `TELEGRAM_WEBHOOK_SECRET` casuale con `npx wrangler secret put NOME`. Per una prova locale con un bot di test usa `.dev.vars`.
3. Con il metodo Telegram `setWebhook`, configura il percorso HTTPS `/api/telegram/webhook`, lo stesso `secret_token` e `allowed_updates: ["message"]`. Dal profilo apri il bot e premi **Avvia** per associare il tuo account, poi attiva gli avvisi.

Chi attiva gli avvisi Telegram riceve i promemoria del proprio gruppo, gli inviti alle sfide dirette e il riepilogo dei propri punti se ha giocato. L’organizzatore riceve le nuove richieste di partecipazione raggruppate, un promemoria prima della chiusura e, se manca, un invito a scrivere il messaggio di benvenuto. Email e Telegram segnalano che la lettera è pronta e rimandano al sito. Su WhatsApp il link dell’evento si può condividere a mano. [Telegram Bot API](https://core.telegram.org/bots/api#setwebhook)

Puoi scegliere una foto o scattare un selfie. Il browser ritaglia il volto con MediaPipe e compone il ritratto con Canvas. Se il ritaglio automatico non riesce, puoi centrare il viso a mano. Il PNG scaricabile misura 1024 × 1024 pixel. Quando salvi l’avatar, l’app invia solo la miniatura da 256 × 256 pixel, al massimo 64 KiB. D1 conserva una sola miniatura corrente per persona. Se configuri il binding facoltativo `AVATAR_BUCKET`, le nuove miniature vanno nel bucket R2 privato. Applica le migrazioni D1 prima del deploy. [Binding R2 per Workers](https://developers.cloudflare.com/r2/get-started/workers-api/)

La migrazione della classifica assegna i vecchi punteggi al primo scambio idoneo, senza duplicarli. Conserva separatamente i dati che non può attribuire. Gli avatar fotografici della versione precedente tornano alle iniziali, mentre i personaggi scelti restano visibili.

### Accounts, scores and Telegram

Register from the home page or an invitation with a name and email address. Event owners can add participants with the same two fields. The phone number is optional in the profile. Telegram notifications use the private chat linked from the profile.

Confirmed members can play the quiz, 4×4 Memory and four official puzzles in their exchange. The group leaderboard lists every confirmed member, including zero scores. Ranked games count the best of three attempts weighted at 100%, 95% and 90%. Each distinct treasure-hunt stamp adds five points to the group leaderboard. The practice page, game stamps and friendly duels are separate from ranked scores. Owners can adjust scores with an audit reason. The mobile hourglass view scrolls horizontally and has a list option. Discovered stories can be reopened from the stamp album.

Create a bot with BotFather. Configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` and `TELEGRAM_WEBHOOK_SECRET` as secrets. Set the HTTPS webhook to `/api/telegram/webhook` with the matching secret. Participants link their own private chat from the profile. The organizer gets batched join requests and setup reminders. Draw notices link to the event. WhatsApp sharing uses copied invitation links.

Choose a photo or take a selfie. MediaPipe cuts out the face and Canvas composes the portrait in the browser, with a manual crop when automatic cutout is unavailable. Download the 1024 × 1024 PNG or save a 256 × 256 thumbnail of up to 64 KiB. D1 keeps one current thumbnail per person. When the optional private R2 binding `AVATAR_BUCKET` is set, new thumbnails are stored in that bucket. Apply the D1 migrations before deploying.

## Dati e riservatezza

Chi è in attesa di conferma non ha accesso agli abbinamenti. Ogni partecipante confermato può aprire la propria lettera per scoprire il destinatario e leggere i suoi desideri. L’organizzatore può chiedere di vedere tutti gli abbinamenti e deve confermare prima di aprire l’elenco. Il nome estratto resta nella lettera sul sito. L’estrazione usa casualità crittografica e rispetta esclusioni e coppie fissate. Con vincoli arbitrari, le soluzioni possono avere probabilità diverse.

Pending invitees have no access to pairings. Confirmed members open their own private letter to see their recipient. Event owners must explicitly confirm before opening the full list. Draw notices never include a recipient’s name.

Il portale usa inviti e accessi verificati. Conoscere l’indirizzo del sito non concede accesso agli eventi.

## Ambiente di produzione

Il Worker di riferimento è `sotto-l-albero`. Prima della pubblicazione, verifica che nell’ambiente di destinazione siano configurati `ADMIN_EMAILS`, `RESEND_API_KEY` e `MAIL_FROM`. Gli ultimi due servono anche per ricevere il codice di accesso.

Il collaudo locale copre desktop e mobile, estrazione concorrente e programmata, iscrizioni e accesso ai giochi. Per verificare la consegna effettiva dei messaggi, usa un mittente configurato e account di prova autorizzati nell’ambiente di destinazione.

Per esportare il database: `npx wrangler d1 export DB --remote --output backup.sql`. Conservare il backup fuori dalla repository in uno spazio riservato. Provare il ripristino su un database separato prima di usarlo per recuperare dati reali.

## Progetto e immagini

Il progetto iniziale è in `docs/design/`; il piano di realizzazione è in `docs/implementation.md`. Il mockup documenta la direzione visiva. I testi finali seguono la revisione editoriale richiesta: italiano colloquiale, indicazioni dirette e piccoli richiami al Natale.

L’immagine della home e le otto illustrazioni del Memory sono state generate con ImageGen. Titoli delle opere e brevi riferimenti a film ed episodi sono attribuiti nelle schermate dedicate. Nessun poster, fotogramma o brano musicale fa parte della distribuzione.

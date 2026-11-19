# Catalogo idee regalo

La lettera mostra schede di prodotti reali prima dei collegamenti di ricerca esterna. Ogni scheda riporta nome, foto del negozio, prezzo in euro, commerciante, collegamento al prodotto e pulsante per inserirlo nella propria bozza. La fascia iniziale va da zero al budget salvato dello scambio. Le categorie sono ricerche tematiche del catalogo, non una classificazione inventata dei prodotti. Su telefono le schede scorrono orizzontalmente; altri risultati si caricano solo premendo “Mostra altri prodotti”.

## Fonte e permessi

Si usa esclusivamente l’interfaccia ufficiale [Shopify Global Catalog MCP](https://shopify.dev/docs/agents/catalog/global-catalog), tramite `https://catalog.shopify.com/api/ucp/mcp`. La documentazione corrente [About Catalogs](https://shopify.dev/docs/agents/catalog) indica accesso tramite profilo agente senza chiave API e consente di presentare risultati agli acquirenti nella propria applicazione. Si rispettano i limiti delle [Usage guidelines](https://shopify.dev/docs/agents/catalog#usage-guidelines): prezzi e disponibilità al massimo dieci minuti, immagini soltanto accanto al prodotto corrispondente, attribuzioni e parametri dei collegamenti conservati, nessuna raccolta massiva né database di prodotti. L’accesso senza chiave resta soggetto ai limiti del fornitore e non permette di chiederne un aumento.

Non si interrogano cataloghi privati o endpoint di Drawnames. Amazon ed Etsy non vengono presentati come fonti integrate senza credenziali o accordi. I cataloghi diretti dei negozi richiedono una verifica separata delle loro condizioni: un JSON tecnicamente pubblico non costituisce da solo un permesso di riutilizzo.

La verifica del 19 novembre 2026 ha confermato risposte reali HTTP 200 del fornitore, con offerte EUR, immagini Shopify CDN, commerciante e URL del prodotto, filtri Italia e prezzo e paginazione. Questa verifica non è un impegno sulla futura disponibilità o sul prezzo dei prodotti. I test usano soltanto prodotti fittizi dichiarati come fixture, mai un catalogo dimostrativo pubblicato.

## API e profilo

`GET /api/gifts/profile` espone un profilo UCP pubblico e minimo con versione `2026-08-25`, ricerca, lookup e l’estensione Global Catalog. Non contiene email, account, profili personali, checkout o credenziali. La struttura segue la [documentazione dei profili](https://shopify.dev/docs/agents/profiles).

Il solo documento statico di discovery usa `Cache-Control: public, max-age=300`, come richiesto dalle [regole di hosting UCP](https://ucp.dev/latest/specification/overview/#profile-requirements). Espone il servizio MCP e un registro vuoto dei gestori di pagamento. Le risposte dei prodotti e tutte le API personali mantengono `no-store`.

`GET /api/gifts?eventId=…` richiede autenticazione e accesso al gruppo. Il server recupera il budget dell’evento e limita sempre il massimo a quel valore, anche se il browser invia un prezzo più alto. Parametri facoltativi: `category` (`all`, `home`, `games`, `creative`, `stationery`, `care`), `q` (massimo 100 caratteri), `min`, `max` e `cursor`. Il fornitore riceve solo ricerca commerciale esplicita o generica, prezzo e contesto Italia/euro/italiano: nessun ritratto, gusto privato, indirizzo email o assegnazione dello scambio.

In produzione l’URL del profilo è ricavato da `APP_URL` e termina con `/api/gifts/profile`. Soltanto con richiesta locale verificata e `LOCAL_DEV=true` si usa il profilo di esempio ospitato da Shopify e [documentato per le prove](https://shopify.dev/docs/agents/get-started/search-catalog).

Ogni azione di navigazione richiede fino a 12 prodotti. Il server non conserva risposte del catalogo nel database. Il browser nasconde le schede dopo dieci minuti e propone un aggiornamento; prezzi e fotografie non vengono persistiti nella lettera. Le risposte indicano `checkedAt`, `provider`, fascia, prodotti normalizzati e cursore. Si escludono offerte senza prezzo EUR valido, oltre il budget, non disponibili secondo il segnale del catalogo, prive di immagine ammessa o con URL non sicuro. Le immagini sono soltanto HTTPS sul dominio esatto `cdn.shopify.com`; il criterio richiede di includere quel dominio nella CSP dell’applicazione.

La selezione inserisce solo titolo e URL originale nella bozza già aperta, mantenendo gli altri desideri e il limite di 30. Occorre salvare la lettera per conservarli. Il prezzo non include la spedizione e va verificato nel negozio, insieme a disponibilità e consegna. In caso di indisponibilità del fornitore si mostra un errore con riprova; resta possibile inserire manualmente il link di qualsiasi negozio.

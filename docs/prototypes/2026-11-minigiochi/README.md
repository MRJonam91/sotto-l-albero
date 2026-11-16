# Otto nuove demo natalizie

Questa raccolta sostituisce come direzione di sviluppo le precedenti cinque avventure. I giochi già pubblicati nel portale non fanno parte di questa modifica. Le demo sono locali, senza account, richieste API, salvataggio del profilo o punti negli eventi.

Il 16 novembre è stata autorizzata la pubblicazione del solo **Curling dei regali**: l’integrazione è in `src/CurlingGame.jsx` e mantiene la fisica dell’anteprima. Le altre sette demo di questa raccolta restano fuori dalla build del portale. / Only gift curling has been approved for production; this offline collection still contains all eight review demos.

**Seconda implementazione:** interazioni dirette nella scena con Matter.js, interact.js e Anime.js incluse localmente; una raccolta temporanea di indizi che conserva soltanto frasi confermate. Leggere [cambiamenti, librerie e collaudo mobile](IMPLEMENTAZIONE-V2.md). Gli indizi non vengono salvati nell’account.

**Revisione di chiarezza e comunità:** obiettivi concreti, prime mosse guidate e spiegazione degli effetti in sette demo; curling invariato. La raccolta «I miei indizi» aiuta a formulare gusti e condizioni utili a chi sceglie il regalo, soltanto con parole confermate dall’autore. Leggere [criteri editoriali e scopo sociale di ogni gioco](CHIAREZZA-E-COMUNITA.md).

## Aprire

Aprire [index.html](index.html) nel browser, anche senza connessione. Per ricostruire la raccolta dopo una modifica ai frammenti:

```sh
npm ci --prefix docs/prototypes/2026-11-minigiochi --ignore-scripts
node docs/prototypes/2026-11-minigiochi/build.cjs
```

`index.html` è autonomo; `preview.html` è lo stesso contenuto come frammento per la conversazione. I singoli giochi sono in `games/`; `shell.html` contiene catalogo e stile comune. Nessuno di questi file entra nella build Vite o nel Worker Cloudflare.

## Che cosa valutare

| Demo | Domanda principale |
| --- | --- |
| Curling dei regali | Posso imparare dalla traiettoria e scegliere il prossimo tiro in base agli urti? |
| Banda dei giocattoli | Capisco perché un collegamento aziona un giocattolo e un altro no? |
| Il folletto ha scambiato tutto | Riesco a citare prove che giustificano consegne e sequenza? |
| Officina dei rimedi | Posso costruire, provare e correggere un’invenzione usando proprietà riconoscibili? |
| Mercatino di mezzanotte | Le prove e le sostituzioni chiariscono che cosa mi interessa davvero? |
| Palla di neve | Modificare la giornata cambia i suoi passaggi e mi aiuta a confrontare due esperienze? |
| Il regalo quasi giusto | Un feedback concreto cambia la seconda proposta e si può rifiutare senza disagio? |
| Cinepanettone impossibile | Le azioni raccontano due finali diversi e mantengono coerenza tra i fotogrammi? |

Le modalità a due persone usano lo stesso dispositivo: non simulano una connessione remota. Gli indizi sono privati della demo, modificabili e conservati soltanto in memoria; chiudere o ricaricare elimina il contenuto. La fantasia non diventa automaticamente una preferenza reale. Il suono, quando rappresentato visivamente, non richiede audio.

Le demo riducono i contenuti e le possibilità al primo ciclo giocabile. La [revisione e copertura](REVISIONE.md) descrive quali regole sono state concretizzate e quali aspetti restano da verificare. “Giocabile” non significa ancora “validato come divertente”: il prossimo passo è provarle con le persone e scegliere quali approfondire.

## Verifiche della revisione di chiarezza

Dopo il build, dalla radice del repository:

```sh
node docs/prototypes/2026-11-minigiochi/games/qa-clarity-fun.cjs --built
node docs/prototypes/2026-11-minigiochi/games/qa-clarity-makers.cjs --built
node docs/prototypes/2026-11-minigiochi/games/qa-clarity-stories.cjs --built
```

Gli script usano Playwright e il Chromium locale disponibile in `.wrangler/browsers/`; sono controlli delle demo, separati dai test dell’applicazione pubblicata. Coprono anche mosse incomplete o incoerenti, gesti touch interrotti, tastiera e indizi scritti dall’autore. L’emulazione mobile non sostituisce una prova su iPhone fisico o con persone che vedono i giochi per la prima volta.

## English

Eight standalone offline Christmas game demos replace the previous prototypes as the current development direction. Open `index.html`, or rebuild it with the Node command above. Production game files, API routes and deployments are untouched. Multiplayer is same-device role play; profile confirmation is an in-memory demonstration only. These are limited playable slices for design review, not production-ready or user-validated games.

Version two uses bundled Matter.js physics, interact.js touch manipulation and Anime.js animation, plus an explicit session-only profile. See the V2 implementation note for actual touch-emulation coverage and remaining device-testing limits.

The clarity revision adds concrete goals, guided first moves and causal feedback to seven demos, leaving curling unchanged. “I miei indizi” gathers author-confirmed gift clues; same-device cooperation supports conversation without inferring preferences from gameplay. See the clarity and community note for the rationale and first-time playtest questions.

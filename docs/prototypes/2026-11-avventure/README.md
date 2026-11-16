# Cinque avventure natalizie da provare

**Archivio:** questa direzione è stata sostituita dalle [otto nuove demo natalizie](../2026-11-minigiochi/README.md). I sorgenti restano per confronto; non sono più le anteprime da portare avanti. Nessun gioco pubblicato viene sostituito da questa archiviazione.

Queste anteprime rispondono alla critica delle prime scene: scegliere corde o stelle cambiava l’aspetto, mentre il pulsante finale consegnava comunque i libri. Qui cambia il modo di agire e ciò che succede sullo schermo. Non sono attivate negli eventi né collegate alle API del portale.

| Avventura | Cosa fai | Cosa cambia davvero |
| --- | --- | --- |
| Ponte delle tre vie | Fissi due ancoraggi e azioni un argano; oppure disponi tre libri e accompagni il corriere; oppure scegli tre stelle in sequenza. | Cesta sospesa con pausa e ripresa, cammino sulle piattaforme scelte, oppure flottiglia lungo la propria costellazione. |
| Piazza senza Natale | Disponi tavola, palco e lanterne su nove punti, poi apri la festa. | Gli abitanti percorrono strade e formano gruppi diversi. La luce permette a un abitante più esitante di uscire e raggiungere le attività vicine. |
| Vagone degli incontri | Muovi due scambi e fai partire il treno. | Quattro rotte, fermate e passeggeri diversi. Il convoglio segue i binari selezionati. |
| Casa che accoglie | Agganci una coperta e prepari posti; oppure monti una carrucola e giri la manovella; oppure colleghi tre giocattoli in ordine. | Rifugio abitato, pedana che sale in soffitta, oppure orchestra visiva che segue il collegamento scelto. |
| Bottega delle meraviglie | Combini base, meccanismo ed effetto, poi provi l’invenzione. | Cambiano geometria e azione: il dono attraversa il banco, mette in moto il cilindro musicale oppure proietta sulla parete. Le note sono rappresentate visivamente. |

I racconti si possono modificare e confermare nella prova. Nessuna scelta diventa automaticamente un gusto, un tratto caratteriale o un desiderio. Nessun testo libero viene salvato dal widget o inviato a un server. La sola scelta dell’anteprima può essere ricordata dall’interfaccia della conversazione.

Le scene e il codice sono originali. I riferimenti meccanici, con i collegamenti agli autori, sono nella [ricerca](../../design/2026-11-15-riferimenti-minigiochi.md). Il bosco magico, il borgo eccentrico e il treno nella neve richiamano generi cinematografici; non usano personaggi, musica o immagini dei film.

## Ricomporre la raccolta

```sh
node docs/prototypes/2026-11-avventure/build-avventure-riviste.cjs
```

`cinque-avventure-riviste.html` è un frammento per l’anteprima nella conversazione, con le cinque scene indipendenti e i loro controlli. Non è incluso nella build Vite o nel deploy Cloudflare. I vecchi prototipi non vengono sostituiti nel prodotto.

Per decidere la prossima versione, chiedere a chi gioca di prevedere cosa succederà prima di premere il comando, provare un’altra strada e raccontare quale preferisce. Le prove automatiche verificano esecuzione e impaginazione; l’interesse delle persone va ancora verificato con un playtest.

## English

Five original playable Christmas prototypes replace cosmetic choices with different actions and visible consequences: transport systems, a reactive village, railway switches, room transformations and working inventions. They are review previews, separate from the deployed app and ranked games. Stories stay editable and local; no personality or gift preferences are inferred or saved. Only the selected preview may be remembered by the conversation UI. Rebuild the collection with the Node command above. Automated checks do not establish that people find the games engaging; a human playtest is still needed.

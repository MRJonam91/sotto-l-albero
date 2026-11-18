# Coinvolgimento natalizio

Il livello racconta quanta partecipazione è stata registrata nel gioco. Non misura il carattere, l’umore, la generosità o quanto una persona tenga al Natale. I cinque tratti del ritratto restano separati: all’inizio sono neutri, poi usano le attività e le scelte disponibili. L’iscrizione a un gruppo da sola non modifica né i tratti né il livello.

Il percorso parte dai personaggi che nelle storie guardano il Natale con distacco: con dati neutri i primi tre sono Grinch, Scrooge e Marv. È una convenzione narrativa dichiarata, senza assegnare questi atteggiamenti alla persona. Il catalogo conserva 52 personaggi e mostra sempre tre affinità indipendenti, che non devono sommare cento.

## Punti e livelli

| Attività registrata                                     |                   Contributo massimo |
| ------------------------------------------------------- | -----------------------------------: |
| Prima partita completata in ciascuna famiglia di giochi |                              8 punti |
| Seconda e terza partita della stessa famiglia           |                     1 punto ciascuna |
| Timbri raccolti                                         |         1 punto ciascuno, massimo 12 |
| Interazioni inviate al gruppo                           |          1 punto ciascuna, massimo 5 |
| Desideri salvati nelle iscrizioni approvate             |          1 punto ciascuno, massimo 5 |
| Eventi organizzati                                      |          1 punto ciascuno, massimo 2 |
| Uno stato esplicitamente scelto                         |       1 punto, qualunque sia l’umore |
| Preferenze facoltative                                  | 1 punto ogni tre risposte, massimo 2 |

Quiz e duello quiz appartengono alla stessa famiglia. Le altre sono Memory, Film, Pacchi, Slitta, Cartolina, Addobbi, Tris e Curling. I punteggi ottenuti non modificano il coinvolgimento: completare un gioco conta anche con un risultato basso. Dove Curling è ancora registrato dal dispositivo, il contributo descrive una partecipazione dichiarata, senza attestare il risultato.

| Punti  | Livello                 |
| ------ | ----------------------- |
| 0–19   | Natale da scoprire      |
| 20–44  | La curiosità si accende |
| 45–74  | Nel vivo delle feste    |
| 75–100 | Spirito di Natale       |

Tutti i livelli, compresi cento punti, sono raggiungibili senza rispondere alle domande o scegliere uno stato. La varietà conta più della ripetizione di un solo gioco. Saltare un aggiornamento, cambiare umore o non rispondere non toglie punti.

## Come cambiano le affinità

Ogni personaggio ha due dati editoriali distinti: un profilo nei cinque tratti e una fase di coinvolgimento natalizio da 0 a 100. Per i personaggi che cambiano nel corso del film è stata scelta una fase della storia: per esempio Grinch parte da 0, Scrooge da 6, Kevin da 55, Buddy, Frosty e Arthur da 100. Non è una graduatoria morale né un dato ufficiale delle opere.

L’affinità è la somma di **65% somiglianza personale** e **35% vicinanza del coinvolgimento**. La somiglianza personale vale `100 × (1 − distanza quadratica media normalizzata)` fra i cinque tratti. La vicinanza del coinvolgimento vale `100 − |punti della persona − fase del personaggio|`. Il risultato viene arrotondato all’intero; i tre valori sono confronti indipendenti, non probabilità.

Per costruire i soli tratti personali restano i pesi base 60% attività reale, 25% stato e gusti espressi, 15% domande facoltative. Le fonti mancanti redistribuiscono il peso fra quelle disponibili. Il profilo mostra entrambi i passaggi nel dettaglio richiudibile: i pesi delle fonti dei tratti e la combinazione finale 65/35.

## Conservazione e limiti

La migrazione additiva `0021_festive_progress.sql` introduce `users.festive_progress_score`. Il server calcola il valore dai dati salvati e aggiorna soltanto i massimi superiori, in lotti di utenti. Un reset dell’allenamento o la rimozione di un desiderio non riduce il livello già acquisito. Un valore passato nel payload del profilo non può assegnare punti.

Il massimo viene consolidato alla conclusione di un allenamento sul server, prima di azzerare una partita già completata e quando aumenta o diminuisce il numero dei desideri salvati. Le letture del profilo o del gruppo consolidano anche le altre attività disponibili. Partita completata e subito azzerata, oppure desiderio salvato e subito rimosso, conservano quindi i punti anche senza aprire il profilo fra le due operazioni.

Le attività precedenti a questo aggiornamento, già sovrascritte e assenti dal database, non possono essere ricostruite: il sistema non inventa uno storico che non conserva. La continuità storica riguarda il livello; i tratti personali possono cambiare con le attività e gli stati attualmente disponibili.

Nel proprio profilo si vedono livello, barra e indicazioni per avanzare. Nel gruppo si mostra soltanto il nome del livello nel ritratto condiviso, senza elenco delle azioni o delle risposte private che lo hanno alimentato.

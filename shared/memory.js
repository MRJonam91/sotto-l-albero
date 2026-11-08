export const memorySymbols = Object.freeze([
  "Stella",
  "Albero",
  "Regalo",
  "Campanella",
  "Renna",
  "Pupazzo di neve",
  "Biscotto",
  "Slitta",
]);

export const memoryCardCount = memorySymbols.length * 2;

export function createMemoryDeck() {
  const deck = [...memorySymbols, ...memorySymbols];
  const draws = crypto.getRandomValues(new Uint32Array(memoryCardCount));
  for (let index = deck.length - 1; index > 0; index--) {
    const other = draws[index] % (index + 1);
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

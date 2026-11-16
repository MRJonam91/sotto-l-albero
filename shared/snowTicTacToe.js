const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function evaluateBoard(board) {
  if (
    !Array.isArray(board) ||
    board.length !== 9 ||
    board.some((cell) => ![null, "X", "O"].includes(cell))
  )
    throw new TypeError("Griglia non valida.");
  const x = board.filter((cell) => cell === "X").length;
  const o = board.filter((cell) => cell === "O").length;
  if (x < o || x > o + 1) throw new TypeError("Turni non validi.");
  const wins = lines.filter(
    ([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c],
  );
  const winner = wins.length ? board[wins[0][0]] : null;
  if (
    wins.some((line) => board[line[0]] !== winner) ||
    (winner === "X" && x !== o + 1) ||
    (winner === "O" && x !== o)
  )
    throw new TypeError("Risultato non valido.");
  const draw = !winner && board.every(Boolean);
  return {
    winner,
    line: wins[0] ?? [],
    draw,
    done: !!winner || draw,
    turn: winner || draw ? null : x === o ? "X" : "O",
  };
}

export function playMove(board, position, mark) {
  const result = evaluateBoard(board);
  if (result.done) throw new RangeError("Questa partita è conclusa.");
  if (mark !== result.turn) throw new RangeError("Aspetta il tuo turno.");
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position > 8 ||
    board[position]
  )
    throw new RangeError("Scegli una casella libera nella neve.");
  const next = [...board];
  next[position] = mark;
  return next;
}

// Normal opponent: take a win, block an immediate loss, then vary the play.
// It does not use minimax, so a well-planned fork can still win.
export function chooseBotMove(board, shuffle) {
  const result = evaluateBoard(board);
  if (result.done) return null;
  if (result.turn !== "O") throw new RangeError("Il turno non è del pupazzo.");
  const legal = board.flatMap((cell, index) => (cell ? [] : [index]));
  for (const mark of ["O", "X"]) {
    const winning = legal.find((position) =>
      lines.some(
        (line) =>
          line.includes(position) &&
          line.every((index) => index === position || board[index] === mark),
      ),
    );
    if (winning !== undefined) return winning;
  }
  if (!board[4]) return 4;
  return shuffle(legal)[0];
}

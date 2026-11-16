import { Circle, PawPrint, Snowflake, TreePine } from "lucide-react";
import { evaluateBoard } from "../shared/snowTicTacToe.js";
import "./snow-tris.css";

export default function SnowTicTacToe({
  challenge,
  onMove,
  busy,
  opponentName = "il pupazzo di neve",
}) {
  const { board, myMark = "X", status } = challenge;
  const result = evaluateBoard(board);
  const expired = status === "expired";
  const myTurn = challenge.myTurn ?? result.turn === myMark;
  const finished = result.done || expired;
  const message = expired
    ? "Il tempo per questa partita è scaduto."
    : result.draw
      ? "Pareggio! La neve è piena di impronte."
      : result.winner
        ? result.winner === myMark
          ? "Hai fatto tris!"
          : `Ha fatto tris ${opponentName}.`
        : busy
          ? "Posiamo il segno sulla neve…"
          : myTurn
            ? "Tocca a te: scegli una casella libera."
            : `Aspettiamo la mossa di ${opponentName}.`;
  return (
    <div className="snow-tris">
      <div className="snow-tris-scene" aria-hidden="true">
        <TreePine className="snow-tris-tree" />
        <Snowflake />
        <span>Una piccola radura, tre segni in fila.</span>
        <TreePine />
      </div>
      <p className="snow-tris-legend">
        Tu: {myMark === "X" ? "impronte (X)" : "palline (O)"} · Tre in fila, in
        colonna o in diagonale.
      </p>
      <div
        className="snow-tris-board"
        role="group"
        aria-label="Tris sulla neve, nove caselle"
      >
        {board.map((mark, position) => (
          <button
            key={position}
            type="button"
            className="snow-tris-cell"
            data-winning={result.line.includes(position)}
            aria-label={`Riga ${Math.floor(position / 3) + 1}, colonna ${(position % 3) + 1}: ${mark === "X" ? "impronta X" : mark === "O" ? "pallina O" : "libera"}`}
            disabled={busy || finished || !myTurn || !!mark}
            onClick={() => onMove({ position })}
          >
            {mark ? (
              <span className="snow-tris-piece" key={mark} data-mark={mark}>
                {mark === "X" ? (
                  <PawPrint aria-hidden="true" />
                ) : (
                  <Circle aria-hidden="true" />
                )}
                <span className="snow-tris-symbol-label" aria-hidden="true">
                  {mark}
                </span>
                <span className="snow-tris-flurry" aria-hidden="true">
                  ✦
                </span>
              </span>
            ) : (
              <span className="snow-tris-empty" aria-hidden="true">
                {position + 1}
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="snow-tris-status" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

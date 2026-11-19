import { t } from "./i18n.js";
import { Circle, PawPrint, Snowflake, TreePine } from "lucide-react";
import { evaluateBoard } from "../shared/snowTicTacToe.js";
import "./snow-tris.css";

export default function SnowTicTacToe({
  challenge,
  onMove,
  busy,
  opponentName = t("il pupazzo di neve"),
}) {
  const { board, myMark = "X", status } = challenge;
  const result = evaluateBoard(board);
  const expired = status === "expired";
  const myTurn = challenge.myTurn ?? result.turn === myMark;
  const finished = result.done || expired;
  const message = expired
    ? t("Il tempo per questa partita è scaduto.")
    : result.draw
      ? t("Pareggio! La neve è piena di impronte.")
      : result.winner
        ? result.winner === myMark
          ? t("Hai fatto tris!")
          : t("Ha fatto tris {opponentName}.", { opponentName })
        : busy
          ? t("Posiamo il segno sulla neve…")
          : myTurn
            ? t("Tocca a te: scegli una casella libera.")
            : t("Aspettiamo la mossa di {opponentName}.", { opponentName });
  return (
    <div className="snow-tris">
      <div className="snow-tris-scene" aria-hidden="true">
        <TreePine className="snow-tris-tree" />
        <Snowflake />
        <span>{t("Una piccola radura, tre segni in fila.")}</span>
        <TreePine />
      </div>
      <p className="snow-tris-legend">
        {t("Tu: {state} · Tre in fila, in colonna o in diagonale.", {
          state: myMark === "X" ? t("impronte (X)") : t("palline (O)"),
        })}
      </p>
      <div
        className="snow-tris-board"
        role="group"
        aria-label={t("Tris sulla neve, nove caselle")}
      >
        {board.map((mark, position) => (
          <button
            key={position}
            type="button"
            className="snow-tris-cell"
            data-winning={result.line.includes(position)}
            aria-label={t("Riga {row}, colonna {column}: {state}", {
              row: Math.floor(position / 3) + 1,
              column: (position % 3) + 1,
              state:
                mark === "X"
                  ? t("impronta X")
                  : mark === "O"
                    ? t("pallina O")
                    : t("libera"),
            })}
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

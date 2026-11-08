import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  Cookie,
  Gift,
  Snowflake,
  Star,
  TreePine,
} from "lucide-react";
import HolidayFigure from "./HolidayFigure.jsx";
import { Button } from "./ui.jsx";
import "./memory.css";

const cardArt = {
  Stella: ["stella", Star],
  Albero: ["albero", TreePine],
  Regalo: ["regalo", Gift],
  Campanella: ["campanella", Bell],
  Renna: ["renna", null],
  "Pupazzo di neve": ["pupazzo", Snowflake],
  Biscotto: ["biscotto", Cookie],
  Slitta: ["slitta", null],
};

function CardArt({ name }) {
  const [failed, setFailed] = useState(false);
  const [file, Fallback] = cardArt[name] ?? [null, Star];
  if (file && !failed) {
    return (
      <img
        src={`/memory/${file}.webp`}
        alt=""
        width="128"
        height="128"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="memory-fallback" aria-hidden="true">
      {Fallback ? (
        <Fallback size={29} />
      ) : (
        <HolidayFigure
          id={name === "Renna" ? "reindeer" : "sleigh"}
          size={29}
        />
      )}
    </span>
  );
}

function CardFaces({ name, paired, position }) {
  const [lastFace, setLastFace] = useState(null);
  useEffect(() => {
    if (name) setLastFace(name);
  }, [name]);
  const face = name || lastFace;
  return (
    <span className="memory-turner" aria-hidden="true">
      <span className="memory-face memory-back">
        <span className="memory-seal">
          <Star size={21} strokeWidth={1.4} />
          <span>{position}</span>
        </span>
      </span>
      <span className="memory-face memory-front">
        {face && (
          <>
            <CardArt key={face} name={face} />
            <span className="memory-symbol">{face}</span>
          </>
        )}
        {paired && (
          <span className="memory-pair">
            <Check size={13} />
          </span>
        )}
      </span>
    </span>
  );
}

export default function MemoryBoard({
  cards,
  revision,
  needsCover,
  done,
  busy,
  onMove,
}) {
  const moveCallback = useRef(onMove);
  const inFlight = useRef(false);
  const attemptedCover = useRef(null);
  const buttons = useRef([]);
  const [coverFailure, setCoverFailure] = useState(null);

  useEffect(() => {
    moveCallback.current = onMove;
  }, [onMove]);

  const sendMove = useCallback(async (move) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    try {
      return await moveCallback.current(move);
    } catch {
      return false;
    } finally {
      inFlight.current = false;
    }
  }, []);

  const coverCards = useCallback(async () => {
    attemptedCover.current = revision;
    const success = await sendMove({ cover: true });
    if (success === false) setCoverFailure(revision);
    else setCoverFailure(null);
  }, [revision, sendMove]);

  useEffect(() => {
    if (!needsCover || done || busy || attemptedCover.current === revision)
      return;
    const timer = setTimeout(coverCards, 1100);
    return () => clearTimeout(timer);
  }, [busy, coverCards, done, needsCover, revision]);

  function moveFocus(event, index) {
    const atRowStart = index % 4 === 0;
    const atRowEnd = index % 4 === 3;
    let target;
    if (event.key === "ArrowLeft" && !atRowStart) target = index - 1;
    if (event.key === "ArrowRight" && !atRowEnd) target = index + 1;
    if (event.key === "ArrowUp") target = index - 4;
    if (event.key === "ArrowDown") target = index + 4;
    if (!buttons.current[target]) return;
    event.preventDefault();
    buttons.current[target].focus();
  }

  const symbols = cards.map((card) => card.name ?? card.symbol);
  const visible = symbols.filter((name, index) => name && !cards[index].paired);
  const pairCount = cards.filter((card) => card.paired).length / 2;
  const count = `${pairCount} ${pairCount === 1 ? "coppia trovata" : "coppie trovate"} su ${cards.length / 2}.`;
  const retry = needsCover && coverFailure === revision;
  let feedback = count;
  if (done) feedback = "Hai trovato tutte le coppie!";
  else if (retry)
    feedback = "Le carte sono ancora scoperte. Riprova a coprirle.";
  else if (needsCover)
    feedback = `${visible.join(" e ")}. Le carte si ricoprono tra poco.`;
  else if (visible.length) feedback = `${visible[0]}. Gira un’altra carta.`;

  return (
    <div className="memory-board" role="group" aria-label="Tavolo del Memory">
      <ol className="memory-grid">
        {cards.map(({ paired }, index) => {
          const name = symbols[index];
          const state = paired
            ? "matched"
            : name
              ? needsCover
                ? "mismatch"
                : "visible"
              : "covered";
          const description = name
            ? `${name.toLocaleLowerCase("it")}${paired ? ", coppia trovata" : ""}`
            : "coperta";
          const unavailable = !!name || needsCover || busy || done;
          return (
            <li key={index}>
              <button
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                className={`memory-card ${state}`}
                type="button"
                aria-label={`Carta ${index + 1}, ${description}`}
                aria-disabled={unavailable}
                onKeyDown={(event) => moveFocus(event, index)}
                onClick={() => {
                  if (!unavailable) void sendMove({ position: index });
                }}
              >
                <CardFaces name={name} paired={paired} position={index + 1} />
              </button>
            </li>
          );
        })}
      </ol>
      <p
        className="memory-feedback"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback}
      </p>
      {retry ? (
        <Button
          type="button"
          variant="outline"
          busy={busy}
          onClick={coverCards}
        >
          Copri le carte
        </Button>
      ) : null}
    </div>
  );
}

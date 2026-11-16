import { useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Gift,
  Lamp,
  Package,
  Puzzle,
  Ribbon,
  Scale,
  Snowflake,
  Sparkles,
  Star,
  TreePine,
} from "lucide-react";
import { Button, Field, Notice } from "./ui.jsx";
import { EscapeRoom, ParcelBelt } from "./InteractiveChallenges.jsx";
import SnowTicTacToe from "./SnowTicTacToe.jsx";
import "./challenge-board.css";

const art = {
  libro: BookOpen,
  tazza: Coffee,
  puzzle: Puzzle,
  gioco: Puzzle,
  sciarpa: Ribbon,
  coperta: Package,
  lanterna: Lamp,
  pigna: TreePine,
  fiocco: Ribbon,
};
const pictures = {
  biscotti: "biscotto",
  biscotto: "biscotto",
  pupazzo: "pupazzo",
  campanella: "campanella",
  stella: "stella",
  renna: "renna",
};

function Illustration({ item }) {
  const picture = pictures[item.id];
  const Icon = art[item.id] ?? Gift;
  return (
    <span className="puzzle-art" data-item={item.id} aria-hidden="true">
      {picture ? (
        <img src={`/memory/${picture}.webp`} alt="" draggable="false" />
      ) : (
        <>
          <Sparkles className="puzzle-art-spark" size={16} />
          <Icon className="puzzle-art-icon" strokeWidth={1.4} />
          <Snowflake className="puzzle-art-snow" size={13} />
        </>
      )}
    </span>
  );
}

function SolutionForm({ children, onMove, solution, ready, busy }) {
  return (
    <form
      className="challenge-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) onMove({ solution });
      }}
    >
      {children}
      <Button type="submit" busy={busy} disabled={!ready}>
        Conferma la soluzione
      </Button>
    </form>
  );
}

function Match({ challenge, onMove, busy }) {
  const detailId = useId();
  const [pairs, setPairs] = useState({});
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");
  const assigned = Object.keys(pairs).length;
  const parcels = Object.fromEntries(
    challenge.parcels.map((item) => [item.id, item]),
  );

  function assign(person) {
    const previous = pairs[person.id];
    const next = Object.fromEntries(
      Object.entries(pairs).filter(
        ([id, parcel]) => id !== person.id && parcel !== selected,
      ),
    );
    if (selected && selected !== previous) {
      next[person.id] = selected;
      setStatus(`${parcels[selected].label} per ${person.label}.`);
    } else {
      setStatus(`Posto di ${person.label} liberato.`);
    }
    setPairs(next);
    setSelected(null);
  }

  return (
    <SolutionForm
      onMove={onMove}
      solution={pairs}
      ready={assigned === challenge.people.length}
      busy={busy}
    >
      <p>
        Scegli un pacco, poi il posto a cui assegnarlo. Tocca un posto occupato
        per liberarlo.
      </p>
      <div className="puzzle-tray">
        <h4>Pacchi sul tavolo</h4>
        <div className="puzzle-grid parcel-grid">
          {challenge.parcels.map((item) => {
            const seat = challenge.people.find(
              (person) => pairs[person.id] === item.id,
            );
            return (
              <button
                type="button"
                key={item.id}
                className="puzzle-tile"
                aria-label={item.label}
                aria-describedby={`${detailId}-parcel-${item.id}`}
                aria-pressed={selected === item.id}
                disabled={busy}
                onClick={() =>
                  setSelected(selected === item.id ? null : item.id)
                }
              >
                <Illustration item={item} />
                <strong>{item.label}</strong>
                <small id={`${detailId}-parcel-${item.id}`}>
                  {seat ? `Al posto di ${seat.label}` : "Da assegnare"}
                </small>
              </button>
            );
          })}
        </div>
      </div>
      <div className="puzzle-tray">
        <h4>Posti a tavola, da sinistra a destra</h4>
        <div className="puzzle-grid seat-grid">
          {challenge.people.map((person, index) => (
            <button
              type="button"
              key={person.id}
              className="puzzle-tile puzzle-seat"
              aria-label={`Posto di ${person.label}`}
              aria-describedby={`${detailId}-seat-${person.id}`}
              data-filled={Boolean(pairs[person.id])}
              disabled={busy || (!selected && !pairs[person.id])}
              onClick={() => assign(person)}
            >
              <span className="seat-medallion" aria-hidden="true">
                {index + 1}
              </span>
              <strong>{person.label}</strong>
              <small id={`${detailId}-seat-${person.id}`}>
                {parcels[pairs[person.id]]?.label ?? "Posto vuoto"}
              </small>
            </button>
          ))}
        </div>
      </div>
      <p className="challenge-progress" role="status">
        {assigned} di {challenge.people.length} pacchi assegnati. {status}
      </p>
    </SolutionForm>
  );
}

function Pack({ challenge, onMove, busy }) {
  const [picked, setPicked] = useState([]);
  const cargo = challenge.items.filter(({ id }) => picked.includes(id));
  const total = (field) =>
    cargo.reduce((sum, item) => sum + (item[field] ?? 0), 0);
  const weight = total("weight");
  const space = total("space");
  const overLimit = weight > challenge.limit || space > challenge.capacity;
  return (
    <SolutionForm
      onMove={onMove}
      solution={picked}
      ready={picked.length > 0 && !overLimit}
      busy={busy}
    >
      <div className="puzzle-cargo" data-over={overLimit}>
        <img className="cargo-sleigh" src="/memory/slitta.webp" alt="" />
        <div className="cargo-stats" role="status">
          <span>
            <Scale size={19} aria-hidden="true" /> {weight} / {challenge.limit}{" "}
            kg
          </span>
          {challenge.capacity != null && (
            <>
              <span>
                <Package size={19} aria-hidden="true" /> {space} /{" "}
                {challenge.capacity} spazi
              </span>
              <span>
                <Star size={19} aria-hidden="true" /> {total("stars")} stelle
              </span>
            </>
          )}
          {overLimit && (
            <strong>Il carico supera un limite. Togli almeno un pacco.</strong>
          )}
        </div>
        {cargo.length > 0 && (
          <ul className="cargo-load" aria-label="Pacchi caricati sulla slitta">
            {cargo.map((item) => (
              <li key={item.id}>
                <Illustration item={item} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="puzzle-tray">
        <h4>Scaffale dei pacchi</h4>
        <div className="puzzle-grid cargo-grid">
          {challenge.items.map((item) => (
            <button
              type="button"
              className="puzzle-tile"
              key={item.id}
              aria-label={`${item.label}, ${item.weight} kg${item.space ? `, ${item.space} spazi, ${item.stars} stelle` : ""}`}
              aria-pressed={picked.includes(item.id)}
              disabled={busy}
              onClick={() =>
                setPicked((current) =>
                  current.includes(item.id)
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id],
                )
              }
            >
              <Illustration item={item} />
              <strong>{item.label}</strong>
              <small>
                {item.weight} kg{item.space ? ` · ${item.space} spazi` : ""}
              </small>
              {item.stars != null && (
                <small className="tile-stars">
                  <Star size={13} aria-hidden="true" /> {item.stars} stelle
                </small>
              )}
            </button>
          ))}
        </div>
      </div>
    </SolutionForm>
  );
}

function LegacyCipher({ challenge, onMove, busy }) {
  const [message, setMessage] = useState("");
  return (
    <SolutionForm
      onMove={onMove}
      solution={message.trim()}
      ready={message.trim().length > 0}
      busy={busy}
    >
      <p className="puzzle-postcard">{challenge.ciphertext}</p>
      <Field
        label="Messaggio decifrato"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        maxLength={120}
        disabled={busy}
        required
      />
    </SolutionForm>
  );
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const wheelNames = ["verde", "rossa"];
const turn = (shift) => (shift + 26) % 26;

function Cipher({ challenge, onMove, busy }) {
  const [shifts, setShifts] = useState([0, 0]);
  const [touched, setTouched] = useState([false, false]);
  const words = challenge.ciphertext.split(" ");
  function rotate(wheel, step) {
    setShifts((values) =>
      values.map((value, index) =>
        index === wheel ? turn(value + step) : value,
      ),
    );
    setTouched((values) =>
      values.map((value, index) => index === wheel || value),
    );
  }
  return (
    <SolutionForm
      onMove={onMove}
      solution={shifts}
      ready={touched.every(Boolean)}
      busy={busy}
    >
      <div className="puzzle-postcard">
        <span className="postmark" aria-hidden="true">
          <Snowflake size={22} />
        </span>
        <h4>Cartolina intercettata</h4>
        <p className="cipher-words">
          {words.map((word, index) => (
            <span key={index} data-wheel={index % 2}>
              <small aria-hidden="true">{word}</small>
              <strong>
                {[...word]
                  .map(
                    (letter) =>
                      alphabet[
                        turn(alphabet.indexOf(letter) - shifts[index % 2])
                      ],
                  )
                  .join("")}
              </strong>
            </span>
          ))}
        </p>
      </div>
      <div className="cipher-wheels">
        {wheelNames.map((name, index) => (
          <div className="cipher-dial" key={name} data-wheel={index}>
            <h4>Ruota {name}</h4>
            <div className="cipher-controls">
              <button
                type="button"
                className="puzzle-arrow"
                aria-label={`Gira indietro la ruota ${name}`}
                disabled={busy}
                onClick={() => rotate(index, -1)}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <div className="dial-body" style={{ "--shift": shifts[index] }}>
                <span className="dial-rotor" aria-hidden="true" />
                <strong role="status" aria-label={`Posizione ruota ${name}`}>
                  {shifts[index]}
                </strong>
              </div>
              <button
                type="button"
                className="puzzle-arrow"
                aria-label={`Gira avanti la ruota ${name}`}
                disabled={busy}
                onClick={() => rotate(index, 1)}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </SolutionForm>
  );
}

function Ordering({ challenge, onMove, busy }) {
  const [items, setItems] = useState(challenge.items);
  const [selected, setSelected] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  function swap(from, to) {
    if (from < 0 || to < 0 || to >= items.length) return;
    const reordered = [...items];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setItems(reordered);
    setSelected(null);
    setAnnouncement(
      `${items[from].label}, posizione ${to + 1} di ${items.length}.`,
    );
  }
  return (
    <SolutionForm
      onMove={onMove}
      solution={items.map(({ id }) => id)}
      ready={items.length > 0}
      busy={busy}
    >
      <p>
        Tocca due addobbi per scambiarli, oppure usa le frecce sotto le carte.
      </p>
      <ol
        className="puzzle-garland"
        role="list"
        aria-label="Ordine degli addobbi"
      >
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className="puzzle-tile"
              aria-pressed={selected === item.id}
              aria-label={`${item.label}, posizione ${index + 1}`}
              disabled={busy}
              onClick={() => {
                if (selected && selected !== item.id)
                  swap(
                    items.findIndex(({ id }) => id === selected),
                    index,
                  );
                else setSelected(selected ? null : item.id);
              }}
            >
              <Illustration item={item} />
              <strong>{item.label}</strong>
            </button>
            <div className="ornament-arrows">
              <button
                type="button"
                className="puzzle-arrow"
                aria-label={`Sposta ${item.label} a sinistra`}
                disabled={busy || index === 0}
                onClick={() => swap(index, index - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="puzzle-arrow"
                aria-label={`Sposta ${item.label} a destra`}
                disabled={busy || index === items.length - 1}
                onClick={() => swap(index, index + 1)}
              >
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <p className="challenge-progress" role="status">
        {announcement}
      </p>
    </SolutionForm>
  );
}

const games = { match: Match, pack: Pack, cipher: Cipher, order: Ordering };

export default function CompetitionChallenge({ challenge, onMove, busy }) {
  if (challenge.type === "tris")
    return <SnowTicTacToe challenge={challenge} onMove={onMove} busy={busy} />;
  if (challenge.type === "escape")
    return <EscapeRoom challenge={challenge} onMove={onMove} busy={busy} />;
  if (challenge.type === "catch")
    return <ParcelBelt challenge={challenge} onMove={onMove} busy={busy} />;
  const Game =
    challenge.type === "cipher" && challenge.edition !== 2
      ? LegacyCipher
      : Object.hasOwn(games, challenge.type)
        ? games[challenge.type]
        : null;
  if (!Game)
    return <Notice error>Questa prova è momentaneamente indisponibile.</Notice>;
  return (
    <div className="challenge-play" data-game={challenge.type}>
      <div className="challenge-brief">
        <p>{challenge.prompt}</p>
        {challenge.clues?.length > 0 && (
          <ol className="challenge-clues" aria-label="Indizi">
            {challenge.clues.map((clue) => (
              <li key={clue}>{clue}</li>
            ))}
          </ol>
        )}
      </div>
      <Game challenge={challenge} onMove={onMove} busy={busy} />
    </div>
  );
}

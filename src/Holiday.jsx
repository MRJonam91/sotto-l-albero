import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Check,
  Coffee,
  Cookie,
  Gift,
  HelpCircle,
  LockKeyhole,
  Puzzle,
  Snowflake,
  Stamp,
  Star,
} from "lucide-react";
import { isStampAvailable, stamps } from "../shared/stamps.js";
import HolidayFigure from "./HolidayFigure.jsx";
import MemoryBoard from "./MemoryBoard.jsx";
import { Button, Notice } from "./ui.jsx";
import { api } from "./api.js";
import "./holiday.css";

const stampIcons = {
  star: Star,
  teapot: Coffee,
  gift: Gift,
  bell: Bell,
  quiz: BookOpen,
  memory: Puzzle,
  ice: Snowflake,
  cookie: Cookie,
};
const timedStamps = Object.entries(stamps).filter(([, stamp]) => stamp.window);

export function StampIcon({ id, size = 26 }) {
  const Icon = stampIcons[id];
  return Icon ? (
    <Icon size={size} aria-hidden="true" />
  ) : (
    <HolidayFigure id={id} size={size} />
  );
}

export function TimedTreasures({ section, onDiscover }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer;
    function update() {
      clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      timer = setTimeout(update, 60_000 - (current % 60_000));
    }
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const visible = timedStamps.filter(
    ([, stamp]) => stamp.section === section && isStampAvailable(stamp, now),
  );
  if (!visible.length) return null;
  return (
    <div className="timed-treasures">
      {visible.map(([id, stamp]) => (
        <button
          key={id}
          type="button"
          className="hunt-sighting"
          data-stamp={id}
          aria-label={`Scopri ${stamp.name}`}
          onClick={() => onDiscover(id)}
        >
          <StampIcon id={id} size={30} />
        </button>
      ))}
    </div>
  );
}

export function StampReward({ id, collection }) {
  const collected = collection.ids.includes(id);
  return (
    <div className="stamp-reward">
      <p role="status">
        {collected
          ? `Timbro raccolto: ${stamps[id].name}.`
          : collection.saving
            ? "Stiamo salvando il timbro…"
            : "C’è un timbro per il tuo album."}
      </p>
      <Notice error>{collection.error}</Notice>
      {!collected && (
        <Button
          type="button"
          onClick={() => collection.collect(id)}
          disabled={collection.saving}
        >
          <Stamp size={18} aria-hidden="true" /> Raccogli il timbro
        </Button>
      )}
    </div>
  );
}

export function StampAlbum({ user, collection, onLogout, children }) {
  return (
    <section className="holiday-page" aria-labelledby="profile-heading">
      <div className="holiday-heading">
        <div>
          <h1 id="profile-heading">Il mio profilo</h1>
          <p>Ciao, {user.name}. Qui trovi i timbri delle tue feste.</p>
        </div>
        <Button type="button" variant="ghost" onClick={onLogout}>
          Esci
        </Button>
      </div>
      {children}
      <div className="stamp-album paper">
        <div className="holiday-heading">
          <div>
            <h2>Album dei timbri</h2>
            <p>
              Segui i ritornelli per trovare le figure nascoste e i timbri dei
              giochi. Le apparizioni a orario si ripetono ogni giorno, secondo
              l’ora italiana.
            </p>
          </div>
          <span className="stamp-count" role="status">
            {collection.loaded
              ? `${collection.ids.length} di ${Object.keys(stamps).length} timbri`
              : collection.error
                ? "Album non disponibile"
                : "Caricamento album…"}
          </span>
        </div>
        <Notice error>{collection.error}</Notice>
        <ul className="stamp-grid">
          {Object.entries(stamps).map(([id, stamp]) => {
            const collected = collection.ids.includes(id);
            return (
              <li
                key={id}
                className={collected ? "stamp-tile collected" : "stamp-tile"}
              >
                <div className="stamp-mark">
                  {collected ? (
                    <StampIcon id={id} />
                  ) : (
                    <HelpCircle size={26} aria-hidden="true" />
                  )}
                </div>
                <h3>{collected ? stamp.name : "Timbro da scoprire"}</h3>
                {!collected && stamp.window && (
                  <span className="stamp-time">A orario</span>
                )}
                {collected ? (
                  <p>Raccolto</p>
                ) : (
                  <details>
                    <summary>Mostra il ritornello</summary>
                    <p className="stamp-verse">{stamp.hint}</p>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function usePractice(game) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const path = `/practice/${game}/`;
  useEffect(() => {
    let active = true;
    api(path + "start", "POST").then(
      (result) => {
        if (active) setState(result);
      },
      (err) => {
        if (active) setError(err.message);
      },
    );
    return () => {
      active = false;
    };
  }, [path]);

  async function submit(action, input, display = setState) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api(path + action, "POST", input);
      display(result);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    state,
    setState,
    error,
    busy,
    resume: () => submit("start"),
    reset: () => submit("start", { reset: true, revision: state.revision }),
    step: (action, display) =>
      submit("step", { ...action, revision: state.revision }, display),
  };
}

function PracticeNotice({ game }) {
  return game.error ? (
    <>
      <Notice error>{game.error}</Notice>
      <Button
        type="button"
        variant="outline"
        busy={game.busy}
        onClick={game.resume}
      >
        Riprendi la partita
      </Button>
    </>
  ) : null;
}

function Quiz({ collection }) {
  const game = usePractice("quiz");
  const [next, setNext] = useState(null);
  const heading = useRef(null);
  const { state } = game;
  useEffect(() => {
    heading.current?.focus();
  }, [state?.index]);
  const question = state?.question,
    answer = next?.feedback;
  return (
    <div className="holiday-game paper">
      <PracticeNotice game={game} />
      {!state ? (
        <p role="status">Prepariamo le domande…</p>
      ) : question ? (
        <>
          <p className="game-progress">
            Domanda {state.index + 1} di {state.total}
          </p>
          <h2 ref={heading} tabIndex={-1}>
            {question.title}
          </h2>
          <div className="quiz-options">
            {question.options.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={answer?.choice === i}
                aria-disabled={!!next || game.busy}
                onClick={() => {
                  if (!next && !game.busy) game.step({ choice: i }, setNext);
                }}
              >
                {label}
                {answer?.answer === i && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p className="game-feedback" role="status">
            {answer?.text || "Scegli una risposta."}
          </p>
          {next && (
            <Button
              type="button"
              onClick={() => {
                game.setState(next);
                setNext(null);
              }}
            >
              {next.done ? "Vedi il risultato" : "Prossima domanda"}
            </Button>
          )}
        </>
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Quiz completato
          </h2>
          <p>
            Hai indovinato {state.score} risposte su {state.total}.
          </p>
          <StampReward id="quiz" collection={collection} />
          <Button
            type="button"
            variant="ghost"
            busy={game.busy}
            onClick={game.reset}
          >
            Rigioca
          </Button>
        </>
      )}
    </div>
  );
}

function Memory({ collection }) {
  const game = usePractice("memory");
  const { state } = game;

  return (
    <div className="holiday-game paper" aria-busy={game.busy}>
      <h2>Memory di Natale</h2>
      <p>
        Gira due carte alla volta. Quando trovi una coppia, le carte restano
        scoperte.
      </p>
      <PracticeNotice game={game} />
      {!state ? (
        <p role="status">Mescoliamo le carte…</p>
      ) : (
        <>
          {state.done && state.cards.length !== 16 ? (
            <p role="status">Hai trovato tutte le coppie!</p>
          ) : (
            <MemoryBoard
              cards={state.cards}
              revision={state.revision}
              needsCover={state.cover}
              done={state.done}
              busy={game.busy}
              onMove={game.step}
            />
          )}
          {state.done && <StampReward id="memory" collection={collection} />}
          <Button
            type="button"
            variant="ghost"
            busy={game.busy}
            onClick={game.reset}
          >
            Nuova partita
          </Button>
        </>
      )}
    </div>
  );
}

export function HolidayGames({ collection, onAlbum, onDiscover }) {
  const [access, setAccess] = useState("checking");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let pending = false;
    async function check() {
      if (pending) return;
      pending = true;
      try {
        const { allowed } = await api("/practice/access");
        if (active) setAccess(allowed ? "allowed" : "denied");
      } catch {
        if (active) setAccess("error");
      } finally {
        pending = false;
      }
    }
    check();
    window.addEventListener("focus", check);
    return () => {
      active = false;
      window.removeEventListener("focus", check);
    };
  }, [attempt]);

  if (access === "allowed")
    return (
      <Games
        collection={collection}
        onAlbum={onAlbum}
        onDiscover={onDiscover}
      />
    );
  return (
    <section className="holiday-page" aria-labelledby="games-heading">
      <div className="holiday-heading">
        <h1 id="games-heading">Giochi di Natale</h1>
      </div>
      <div className="holiday-game paper games-access">
        {access === "checking" ? (
          <p role="status">Controlliamo se puoi giocare…</p>
        ) : (
          <>
            <LockKeyhole size={26} aria-hidden="true" />
            <h2>
              {access === "denied"
                ? "Ci vediamo dopo l’iscrizione"
                : "I giochi sono momentaneamente indisponibili"}
            </h2>
            <p>
              {access === "denied"
                ? "Per giocare serve un’iscrizione approvata a un Secret Santa. Se hai già accettato l’invito, aspetta che l’organizzatore ti confermi."
                : "Non siamo riusciti a verificare la tua iscrizione. Riprova tra poco."}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAccess("checking");
                setAttempt((current) => current + 1);
              }}
            >
              Verifica di nuovo
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function Games({ collection, onAlbum, onDiscover }) {
  const [game, setGame] = useState(null);
  const playArea = useRef(null);
  useEffect(() => {
    if (game === "memory") playArea.current?.focus();
  }, [game]);
  return (
    <section className="holiday-page" aria-labelledby="games-heading">
      <div className="holiday-heading">
        <div>
          <h1 id="games-heading">Giochi di Natale</h1>
          <p>
            Un quiz sulle feste e un Memory da giocare con calma. Qui puoi
            allenarti e raccogliere timbri.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onAlbum}>
          <Stamp size={18} aria-hidden="true" /> Il mio album
        </Button>
      </div>
      <div className="game-choices">
        <Button
          type="button"
          variant="outline"
          aria-pressed={game === "quiz"}
          onClick={() => setGame("quiz")}
        >
          <BookOpen size={20} aria-hidden="true" /> Quiz di Natale
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-pressed={game === "memory"}
          onClick={() => setGame("memory")}
        >
          <Puzzle size={20} aria-hidden="true" /> Memory di Natale
        </Button>
        <TimedTreasures section="games" onDiscover={onDiscover} />
      </div>
      <div ref={playArea} tabIndex={-1}>
        {game === "quiz" && <Quiz collection={collection} />}
        {game === "memory" && <Memory collection={collection} />}
        {!game && (
          <p className="quiet">
            Cinque domande o otto coppie di carte. Da dove cominciamo?
          </p>
        )}
      </div>
    </section>
  );
}

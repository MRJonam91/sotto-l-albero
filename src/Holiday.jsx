import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
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
import SeasonalStampIcon from "./SeasonalStampIcon.jsx";
import MemoryBoard from "./MemoryBoard.jsx";
import MovieClueStage from "./MovieClueStage.jsx";
import { Button, Notice } from "./ui.jsx";
import { api } from "./api.js";
import { treasureStories } from "./treasureStories.js";
import { gameCatalog } from "../shared/gameCatalog.js";
import "./holiday.css";
import "./game-catalog.css";
const PracticeGameChallenge = lazy(() => import("./CompetitionChallenge.jsx"));
const CurlingGame = lazy(() => import("./CurlingGame.jsx"));

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
  if (stamps[id]?.seasonal) return <SeasonalStampIcon id={id} size={size} />;
  const Icon = stampIcons[id];
  return Icon ? (
    <Icon size={size} aria-hidden="true" />
  ) : (
    <HolidayFigure id={id} size={size} />
  );
}

export function TimedTreasures({ section, onDiscover, collection }) {
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

  const seasonal = (collection?.release?.availableIds || [])
    .filter(
      (id) => stamps[id]?.section === section && !collection.ids.includes(id),
    )
    .slice(0, 1)
    .map((id) => [id, stamps[id]]);
  const visible = [
    ...timedStamps.filter(
      ([, stamp]) => stamp.section === section && isStampAvailable(stamp, now),
    ),
    ...seasonal,
  ];
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

export function StampAlbum({ user, collection, onLogout, onStory, children }) {
  const baseIds = Object.keys(stamps).filter((id) => !stamps[id].seasonal);
  const seasonalIds = Object.keys(stamps).filter(
    (id) =>
      stamps[id].seasonal &&
      (collection.ids.includes(id) ||
        collection.release?.availableIds?.includes(id)),
  );
  const showSeries = collection.release?.enabled || seasonalIds.length > 0;
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
              Segui i ritornelli. Alcune figure sbucano solo a certe ore
              (seguiamo l’ora italiana). Se trovi una citazione o una scena,
              puoi rileggerla da qui.
            </p>
          </div>
          <span className="stamp-count" role="status">
            {collection.loaded
              ? `${collection.ids.length} di ${baseIds.length + (showSeries ? 10 : 0)} timbri`
              : collection.error
                ? "Album non disponibile"
                : "Caricamento album…"}
          </span>
        </div>
        <Notice error>{collection.error}</Notice>
        <StampGrid ids={baseIds} collection={collection} onStory={onStory} />
        {showSeries && (
          <section
            className="stamp-release"
            aria-labelledby="stamp-release-heading"
          >
            <h3 id="stamp-release-heading">Aspettando i pacchi</h3>
            {collection.release?.eventName ? (
              <>
                <p>
                  {collection.release.availableCount} di 10 nuove sorprese
                  disponibili. Film e cartoni ti accompagnano fino all’apertura
                  dei pacchi.
                </p>
                {collection.release.nextDate ? (
                  <p className="stamp-release-next">
                    Prossima uscita: {stampDate(collection.release.nextDate)} ·
                    ora italiana.
                  </p>
                ) : (
                  <p>
                    La serie è tutta disponibile. I timbri sbloccati restano da
                    scoprire.
                  </p>
                )}
              </>
            ) : (
              <p>
                Dieci nuove sorprese si sbloccano nei giorni prima dello
                scambio. Appariranno quando partecipi a un evento con iscrizione
                approvata.
              </p>
            )}
            {seasonalIds.length > 0 && (
              <StampGrid
                ids={seasonalIds}
                collection={collection}
                onStory={onStory}
              />
            )}
          </section>
        )}
      </div>
    </section>
  );
}

function stampDate(value) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function StampGrid({ ids, collection, onStory }) {
  return (
    <ul className="stamp-grid">
      {ids.map((id) => {
        const stamp = stamps[id];
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
              <>
                <p>
                  {["quiz", "memory"].includes(id)
                    ? "Raccolto"
                    : "Raccolto · 5 punti"}
                </p>
                {(treasureStories[id] || stamp.story) && (
                  <button
                    type="button"
                    className="text-button"
                    aria-label={`Rileggi la sorpresa: ${stamp.name}`}
                    onClick={() => onStory(id)}
                  >
                    Rileggi la sorpresa
                  </button>
                )}
              </>
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
  );
}

function withDeadline(state) {
  return Number.isFinite(state.timeRemaining)
    ? { ...state, deadline: performance.now() + state.timeRemaining }
    : state;
}

function usePractice(game) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const path = `/practice/${game}/`;
  useEffect(() => {
    let active = true;
    api(path + "start", "POST").then(
      (result) => {
        if (active) setState(withDeadline(result));
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
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api(path + action, "POST", input);
      display(withDeadline(result));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      inFlight.current = false;
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
  const question = state?.question,
    answer = next?.feedback;
  const timeLimit = state?.timeLimit;
  const deadline = state?.deadline;
  const [timeLeft, setTimeLeft] = useState(0);
  const expire = useEffectEvent(() => game.step({ timeout: true }, setNext));

  useEffect(() => {
    heading.current?.focus();
  }, [state?.index]);

  useEffect(() => {
    if (deadline === undefined || next || game.busy || game.error) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline - performance.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        expire();
      }
    };
    const interval = setInterval(tick, 200);
    tick();
    return () => clearInterval(interval);
  }, [deadline, next, game.busy, game.error]);

  return (
    <div className="holiday-game paper">
      <PracticeNotice game={game} />
      {!state ? (
        <p role="status">Prepariamo le domande…</p>
      ) : question ? (
        <>
          <div className="quiz-timer-wrap">
            <div className="quiz-timer-header">
              <span className="game-progress">
                Domanda {state.index + 1} di {state.total}
              </span>
              <span
                role="timer"
                className={`quiz-timer-count ${timeLeft <= 5 ? "urgent" : ""}`}
              >
                ⏱️ {timeLeft}s
              </span>
            </div>
            <div className="quiz-timer-track" aria-hidden="true">
              <div
                className={`quiz-timer-fill ${timeLeft <= 5 ? "urgent" : ""}`}
                style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
              />
            </div>
          </div>
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
              busy={game.busy}
              onClick={async () => {
                if (next.done) {
                  game.setState(next);
                  setNext(null);
                } else if (await game.resume()) {
                  setNext(null);
                }
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

const optionLetters = ["A", "B", "C", "D"];

function FilmQuiz() {
  const game = usePractice("film");
  const [next, setNext] = useState(null);
  const heading = useRef(null);
  const { state } = game;
  const question = state?.question,
    answer = next?.feedback;
  const timeLimit = state?.timeLimit;
  const deadline = state?.deadline;
  const [timeLeft, setTimeLeft] = useState(0);
  const expire = useEffectEvent(() => game.step({ timeout: true }, setNext));

  useEffect(() => {
    heading.current?.focus();
  }, [state?.index]);

  useEffect(() => {
    if (deadline === undefined || next || game.busy || game.error) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline - performance.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        expire();
      }
    };
    const interval = setInterval(tick, 200);
    tick();
    return () => clearInterval(interval);
  }, [deadline, next, game.busy, game.error]);

  return (
    <div className="holiday-game paper">
      <PracticeNotice game={game} />
      {!state ? (
        <p role="status">Prepariamo la pellicola…</p>
      ) : question ? (
        <>
          <div className="quiz-timer-wrap">
            <div className="quiz-timer-header">
              <span className="game-progress">
                Film {state.index + 1} di {state.total}
              </span>
              <span
                role="timer"
                className={`quiz-timer-count ${timeLeft <= 5 ? "urgent" : ""}`}
              >
                ⏱️ {timeLeft}s
              </span>
            </div>
            <div className="quiz-timer-track" aria-hidden="true">
              <div
                className={`quiz-timer-fill ${timeLeft <= 5 ? "urgent" : ""}`}
                style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
              />
            </div>
          </div>
          <h2 ref={heading} tabIndex={-1}>
            {question.title}
          </h2>
          <MovieClueStage
            index={state.index}
            prompt={question.prompt}
            icons={question.icons}
          />
          <div className="quiz-options movie-options">
            {question.options.map((label, i) => {
              const optionState = answer
                ? answer.answer === i
                  ? "is-correct"
                  : answer.choice === i
                    ? "is-wrong"
                    : ""
                : "";
              return (
                <button
                  key={label}
                  type="button"
                  className={`movie-option ${optionState}`}
                  data-letter={optionLetters[i]}
                  aria-pressed={answer?.choice === i}
                  aria-disabled={!!next || game.busy}
                  onClick={() => {
                    if (!next && !game.busy) game.step({ choice: i }, setNext);
                  }}
                >
                  {label}
                  {answer?.answer === i && (
                    <Check size={18} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          {answer ? (
            <div
              className="movie-trivia-box"
              role="status"
              data-result={
                answer.correct
                  ? "correct"
                  : answer.choice === -1
                    ? "timeout"
                    : "wrong"
              }
            >
              <strong className="movie-trivia-status">
                {answer.correct
                  ? `Esatto! È proprio ${answer.title} (${answer.year}).`
                  : answer.choice === -1
                    ? `Tempo scaduto! Il film era ${answer.title} (${answer.year}).`
                    : `Risposta esatta: ${answer.title} (${answer.year}).`}
              </strong>
              <p>{answer.note}</p>
            </div>
          ) : (
            <p className="game-feedback" role="status">
              Osserva le icone e scegli uno dei quattro film.
            </p>
          )}
          {next && (
            <Button
              type="button"
              busy={game.busy}
              onClick={async () => {
                if (next.done) {
                  game.setState(next);
                  setNext(null);
                } else if (await game.resume()) {
                  setNext(null);
                }
              }}
            >
              {next.done ? "Vedi il risultato" : "Prossimo film"}
            </Button>
          )}
        </>
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1}>
            Partita completata
          </h2>
          <div className="movie-score-card">
            <span className="movie-score-badge">
              {state.score} / {state.total}
            </span>
            <p>
              Hai indovinato {state.score} film su {state.total} dal catalogo
              dei 100 film di Natale.
            </p>
          </div>
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

export function HolidayGames({
  collection,
  onAlbum,
  onDiscover,
  onGroups,
  onCompete,
}) {
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
        onGroups={onGroups}
        onCompete={onCompete}
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

function PracticeChallenge({ gameId }) {
  const game = usePractice(gameId);
  const { state } = game;
  const definition = gameCatalog.find((entry) => entry.id === gameId);
  return (
    <section
      className="practice-challenge holiday-game paper"
      aria-label={`Allenamento: ${definition.name}`}
      aria-busy={game.busy}
    >
      <h2>{definition.name}</h2>
      <p>Allenamento libero: non usa tentativi e non modifica la classifica.</p>
      <PracticeNotice game={game} />
      {!state ? (
        <p role="status">Prepariamo la partita…</p>
      ) : (
        <>
          {state.challenge && (!state.done || gameId === "tris") ? (
            <Suspense fallback={<p role="status">Carichiamo il gioco…</p>}>
              <PracticeGameChallenge
                key={gameId}
                challenge={state.challenge}
                onMove={game.step}
                busy={game.busy || state.done}
              />
            </Suspense>
          ) : null}
          {state.done ? (
            <p role="status">
              {gameId === "tris"
                ? "Partita conclusa."
                : "Allenamento completato."}{" "}
              {gameId !== "tris" && Number.isFinite(state.score)
                ? `Risultato: ${state.score}/100. La classifica non cambia.`
                : "Puoi riprovare liberamente."}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            busy={game.busy}
            onClick={game.reset}
          >
            Nuovo allenamento
          </Button>
        </>
      )}
    </section>
  );
}

function Games({ collection, onAlbum, onDiscover, onGroups, onCompete }) {
  const [game, setGame] = useState(null);
  const playArea = useRef(null);
  useEffect(() => {
    if (game) playArea.current?.focus({ preventScroll: true });
  }, [game]);
  return (
    <section className="holiday-page" aria-labelledby="games-heading">
      <div className="holiday-heading">
        <div>
          <h1 id="games-heading">Giochi di Natale</h1>
          <p>
            Scegli un gioco per allenarti liberamente. Per i punti, apri le
            sfide del tuo gruppo: gli allenamenti non consumano i tre tentativi
            dell’edizione.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onAlbum}>
          <Stamp size={18} aria-hidden="true" /> Il mio album
        </Button>
      </div>
      <Button type="button" variant="ghost" onClick={onGroups}>
        Vai ai miei gruppi
      </Button>
      <div className="game-choices game-catalog">
        {gameCatalog.map((entry) => (
          <article
            className="game-catalog-item"
            key={entry.id}
            aria-label={entry.name}
          >
            <Button
              type="button"
              variant="outline"
              aria-pressed={game === entry.id}
              onClick={() => setGame(entry.id)}
            >
              {entry.name}
            </Button>
            <p>{entry.description}</p>
            <small>
              {entry.ranked === false
                ? "Allenamento contro il computer · duello tra amici"
                : `Allenamento libero · fino a ${entry.points} punti nelle sfide`}
            </small>
            <Button
              type="button"
              variant="ghost"
              aria-label={
                entry.ranked === false
                  ? "Sfida un amico a Tris sulla neve"
                  : `Gioca per punti: ${entry.name}`
              }
              onClick={() => (onCompete || onGroups)(entry.id)}
            >
              {entry.ranked === false ? "Sfida un amico" : "Gioca per punti"}
            </Button>
          </article>
        ))}
        <article className="game-catalog-item" aria-label="Curling dei regali">
          <Button
            type="button"
            variant="outline"
            aria-pressed={game === "curling"}
            onClick={() => setGame("curling")}
          >
            Curling dei regali
          </Button>
          <p>
            Fai scivolare i regali vicino alla lanterna. Gli urti possono
            cambiare la partita.
          </p>
          <small>
            Due persone sullo stesso schermo · oppure contro il computer · senza
            classifica
          </small>
        </article>
        <TimedTreasures
          section="games"
          collection={collection}
          onDiscover={onDiscover}
        />
      </div>
      <div ref={playArea} tabIndex={-1}>
        {game === "quiz" && <Quiz collection={collection} />}
        {game === "memory" && <Memory collection={collection} />}
        {game === "film" && <FilmQuiz />}
        {game === "curling" && (
          <Suspense fallback={<p role="status">Prepariamo il ghiaccio…</p>}>
            <CurlingGame onClose={() => setGame(null)} />
          </Suspense>
        )}
        {game && !["quiz", "memory", "curling", "film"].includes(game) && (
          <PracticeChallenge key={game} gameId={game} />
        )}
        {!game && (
          <p className="quiet">
            Nove giochi, un solo posto per trovarli. Da dove cominciamo?
          </p>
        )}
      </div>
    </section>
  );
}

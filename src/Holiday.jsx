import { gameT, t, getLocale } from "./i18n.js";
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
import {
  baseStampIds,
  isStampAvailable,
  stampAwards,
  stamps,
} from "../shared/stamps.js";
import { releaseStampIds } from "../shared/stampRollout.js";
import HolidayFigure from "./HolidayFigure.jsx";
import SeasonalStampIcon from "./SeasonalStampIcon.jsx";
import MemoryBoard from "./MemoryBoard.jsx";
import MovieClueStage from "./MovieClueStage.jsx";
import { Button, Field, Notice } from "./ui.jsx";
import { api } from "./api.js";
import { treasureStories } from "./treasureStories.js";
import { gameCatalog, gameModeLabels } from "../shared/gameCatalog.js";
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
          aria-label={t("Scopri {stamp}", { stamp: t(stamp.name) })}
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
          ? t("Timbro raccolto: {stamp}.", { stamp: t(stamps[id].name) })
          : collection.saving
            ? t("Stiamo salvando il timbro…")
            : t("C’è un timbro per il tuo album.")}
      </p>
      <Notice error>{collection.error}</Notice>
      {!collected && (
        <Button
          type="button"
          onClick={() => collection.collect(id)}
          disabled={collection.saving}
        >
          <Stamp size={18} aria-hidden="true" />
          {t("Raccogli il timbro")}
        </Button>
      )}
    </div>
  );
}

export function StampAlbum({ collection, onStory }) {
  const collected = new Set(collection.ids);
  const baseCount = baseStampIds.filter((id) => collected.has(id)).length;
  const seasonalCount = releaseStampIds.filter((id) =>
    collected.has(id),
  ).length;
  const seasonalIds = releaseStampIds.filter(
    (id) => collected.has(id) || collection.release?.availableIds?.includes(id),
  );
  const showSeries = collection.release?.enabled || seasonalIds.length > 0;
  const fullCount = baseCount + seasonalCount;
  const fullTotal = baseStampIds.length + releaseStampIds.length;
  return (
    <section className="stamp-album paper" aria-labelledby="stamp-album-title">
      <div className="holiday-heading">
        <div>
          <h2 id="stamp-album-title">{t("Album dei timbri")}</h2>
          <p>
            {t(
              "Segui i ritornelli. Alcune figure sbucano solo a certe ore (seguiamo l’ora italiana). Se trovi una citazione o una scena, puoi rileggerla da qui.",
            )}
          </p>
        </div>
        <span className="stamp-count" role="status">
          {collection.loaded
            ? t("{count} di {total} timbri", {
                count: fullCount,
                total: showSeries ? fullTotal : baseStampIds.length,
              })
            : collection.error
              ? t("Album non disponibile")
              : t("Caricamento album…")}
        </span>
      </div>
      <Notice error>{collection.error}</Notice>
      {collection.loaded && (
        <div className="stamp-milestones">
          <h3>{t("Bonus raccolta")}</h3>
          <ul role="list">
            {[
              [
                "Raccolta base",
                baseCount,
                baseStampIds.length,
                stampAwards.base,
              ],
              ...(showSeries
                ? [
                    [
                      "Timbri giornalieri",
                      seasonalCount,
                      releaseStampIds.length,
                      stampAwards.seasonal,
                    ],
                    ["Album completo", fullCount, fullTotal, stampAwards.all],
                  ]
                : []),
            ].map(([label, count, total, points]) => (
              <li
                key={label}
                className={count === total ? "stamp-milestone-complete" : ""}
              >
                <strong>{t(label)}</strong>
                <span>
                  {count === total
                    ? t("Bonus ottenuto · +{points} punti", { points })
                    : t("{count} su {total} · bonus +{points}", {
                        count,
                        total,
                        points,
                      })}
                </span>
              </li>
            ))}
          </ul>
          <p>
            {t(
              "I bonus valgono per le classifiche delle edizioni aperte. Il coinvolgimento del ritratto usa un conteggio separato, con un massimo di 12 timbri.",
            )}
          </p>
        </div>
      )}
      <h3>{t("Raccolta base")}</h3>
      <StampGrid ids={baseStampIds} collection={collection} onStory={onStory} />
      {showSeries && (
        <section
          className="stamp-release"
          aria-labelledby="stamp-release-heading"
        >
          <h3 id="stamp-release-heading">{t("Aspettando i pacchi")}</h3>
          {collection.release?.eventName ? (
            <>
              <p>
                {t(
                  "{availableCount} di 10 nuove sorprese disponibili. Film e cartoni ti accompagnano fino all’apertura dei pacchi.",
                  { availableCount: collection.release.availableCount },
                )}
              </p>
              {collection.release.nextDate ? (
                <p className="stamp-release-next">
                  {t("Prossima uscita: {date} · ora italiana.", {
                    date: stampDate(collection.release.nextDate),
                  })}
                </p>
              ) : (
                <p>
                  {t(
                    "La serie è tutta disponibile. I timbri sbloccati restano da scoprire.",
                  )}
                </p>
              )}
            </>
          ) : (
            <p>
              {t(
                "Dieci nuove sorprese si sbloccano nei giorni prima dello scambio. Appariranno quando partecipi a un evento con iscrizione approvata.",
              )}
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
    </section>
  );
}

function stampDate(value) {
  return new Intl.DateTimeFormat(getLocale(), {
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
            <h3>{collected ? t(stamp.name) : t("Timbro da scoprire")}</h3>
            {!collected && stamp.window && (
              <span className="stamp-time">{t("A orario")}</span>
            )}
            {collected ? (
              <>
                <p>
                  {["quiz", "memory"].includes(id)
                    ? t("Raccolto")
                    : t("Raccolto · 5 punti")}
                </p>
                {(treasureStories[id] || stamp.story) && (
                  <button
                    type="button"
                    className="text-button"
                    aria-label={t("Rileggi la sorpresa: {stamp}", {
                      stamp: t(stamp.name),
                    })}
                    onClick={() => onStory(id)}
                  >
                    {t("Rileggi la sorpresa")}
                  </button>
                )}
              </>
            ) : (
              <details>
                <summary>{t("Mostra il ritornello")}</summary>
                <p className="stamp-verse">{t(stamp.hint)}</p>
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
        {t("Riprendi la partita")}
      </Button>
    </>
  ) : null;
}

function quizFeedback(answer) {
  if (!answer) return t("Scegli una risposta.");
  if (answer.note == null) return t(answer.text);
  const values = { title: gameT(answer.title), note: gameT(answer.note) };
  if (answer.choice === -1)
    return t("Tempo scaduto! La risposta era {title}. {note}", values);
  if (answer.choice === answer.answer) return t("Esatto! {note}", values);
  return t("La risposta è {title}. {note}", values);
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
        <p role="status">{t("Prepariamo le domande…")}</p>
      ) : question ? (
        <>
          <div className="quiz-timer-wrap">
            <div className="quiz-timer-header">
              <span className="game-progress">
                {t("Domanda {number} di {total}", {
                  number: state.index + 1,
                  total: state.total,
                })}
              </span>
              <span
                role="timer"
                className={`quiz-timer-count ${timeLeft <= 5 ? "urgent" : ""}`}
              >
                {t("⏱️ {timeLeft}s", { timeLeft })}
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
            {gameT(question.title)}
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
                {gameT(label)}
                {answer?.answer === i && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p className="game-feedback" role="status">
            {quizFeedback(answer)}
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
              {next.done ? t("Vedi il risultato") : t("Prossima domanda")}
            </Button>
          )}
        </>
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1}>
            {t("Quiz completato")}
          </h2>
          <p>
            {t("Hai indovinato {score} risposte su {total}.", {
              score: state.score,
              total: state.total,
            })}
          </p>
          <StampReward id="quiz" collection={collection} />
          <Button
            type="button"
            variant="ghost"
            busy={game.busy}
            onClick={game.reset}
          >
            {t("Rigioca")}
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
        <p role="status">{t("Prepariamo la pellicola…")}</p>
      ) : question ? (
        <>
          <div className="quiz-timer-wrap">
            <div className="quiz-timer-header">
              <span className="game-progress">
                {t("Film {number} di {total}", {
                  number: state.index + 1,
                  total: state.total,
                })}
              </span>
              <span
                role="timer"
                className={`quiz-timer-count ${timeLeft <= 5 ? "urgent" : ""}`}
              >
                {t("⏱️ {timeLeft}s", { timeLeft })}
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
            {gameT(question.title)}
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
                  {gameT(label)}
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
                  ? t("Esatto! È proprio {title} ({year}).", {
                      title: gameT(answer.title),
                      year: answer.year,
                    })
                  : answer.choice === -1
                    ? t("Tempo scaduto! Il film era {title} ({year}).", {
                        title: gameT(answer.title),
                        year: answer.year,
                      })
                    : t("Risposta esatta: {title} ({year}).", {
                        title: gameT(answer.title),
                        year: answer.year,
                      })}
              </strong>
              <p>{gameT(answer.note)}</p>
            </div>
          ) : (
            <p className="game-feedback" role="status">
              {t("Osserva le icone e scegli uno dei quattro film.")}
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
              {next.done ? t("Vedi il risultato") : t("Prossimo film")}
            </Button>
          )}
        </>
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1}>
            {t("Partita completata")}
          </h2>
          <div className="movie-score-card">
            <span className="movie-score-badge">
              {state.score} / {state.total}
            </span>
            <p>
              {t(
                "Hai indovinato {score} film su {total} dal catalogo dei 100 film di Natale.",
                { score: state.score, total: state.total },
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            busy={game.busy}
            onClick={game.reset}
          >
            {t("Rigioca")}
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
      <h2>{t("Memory di Natale")}</h2>
      <p>
        {t(
          "Gira due carte alla volta. Quando trovi una coppia, le carte restano scoperte.",
        )}
      </p>
      <PracticeNotice game={game} />
      {!state ? (
        <p role="status">{t("Mescoliamo le carte…")}</p>
      ) : (
        <>
          {state.done && state.cards.length !== 16 ? (
            <p role="status">{t("Hai trovato tutte le coppie!")}</p>
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
            {t("Nuova partita")}
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
        <h1 id="games-heading">{t("Giochi di Natale")}</h1>
      </div>
      <div className="holiday-game paper games-access">
        {access === "checking" ? (
          <p role="status">{t("Controlliamo se puoi giocare…")}</p>
        ) : (
          <>
            <LockKeyhole size={26} aria-hidden="true" />
            <h2>
              {access === "denied"
                ? t("Ci vediamo dopo l’iscrizione")
                : t("I giochi sono momentaneamente indisponibili")}
            </h2>
            <p>
              {access === "denied"
                ? t(
                    "Per giocare serve un’iscrizione approvata a un Secret Santa. Se hai già accettato l’invito, aspetta che l’organizzatore ti confermi.",
                  )
                : t(
                    "Non siamo riusciti a verificare la tua iscrizione. Riprova tra poco.",
                  )}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAccess("checking");
                setAttempt((current) => current + 1);
              }}
            >
              {t("Verifica di nuovo")}
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
      aria-label={t("Allenamento: {name}", { name: t(definition.name) })}
      aria-busy={game.busy}
    >
      <h2>{t(definition.name)}</h2>
      <p>
        {t(
          "Allenamento libero: non usa tentativi e non modifica la classifica.",
        )}
      </p>
      <PracticeNotice game={game} />
      {!state ? (
        <p role="status">{t("Prepariamo la partita…")}</p>
      ) : (
        <>
          {state.challenge && (!state.done || gameId === "tris") ? (
            <Suspense
              fallback={<p role="status">{t("Carichiamo il gioco…")}</p>}
            >
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
                ? t("Partita conclusa.")
                : t("Allenamento completato.")}{" "}
              {gameId !== "tris" && Number.isFinite(state.score)
                ? t("Risultato: {score}/100. La classifica non cambia.", {
                    score: state.score,
                  })
                : t("Puoi riprovare liberamente.")}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            busy={game.busy}
            onClick={game.reset}
          >
            {t("Nuovo allenamento")}
          </Button>
        </>
      )}
    </section>
  );
}

function Games({ collection, onAlbum, onDiscover, onGroups, onCompete }) {
  const [game, setGame] = useState(() => {
    const requested = new URLSearchParams(location.search).get("game");
    return gameCatalog.some((entry) => entry.id === requested)
      ? requested
      : null;
  });
  const [mode, setMode] = useState("");
  const playArea = useRef(null);
  const opener = useRef(null);
  const filter = useRef(null);
  function closeGame() {
    setGame(null);
    const target = opener.current?.isConnected
      ? opener.current
      : filter.current;
    target?.focus();
  }
  const choices = mode
    ? gameCatalog.filter((entry) => entry.modes.includes(mode))
    : gameCatalog;
  useEffect(() => {
    if (game) {
      playArea.current?.focus({ preventScroll: true });
      playArea.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [game]);
  return (
    <section className="holiday-page" aria-labelledby="games-heading">
      <div className="holiday-heading">
        <div>
          <h1 id="games-heading">{t("Giochi di Natale")}</h1>
          <p>
            {t(
              "Allenati, gioca con un amico o fai punti per la classifica del gruppo.",
            )}
          </p>
        </div>
        <div className="games-heading-actions">
          <Button type="button" variant="outline" onClick={onAlbum}>
            <Stamp size={18} aria-hidden="true" />
            {t("Il mio album")}
          </Button>
          <Button type="button" variant="ghost" onClick={onGroups}>
            {t("Vai ai miei gruppi")}
          </Button>
        </div>
      </div>
      <div
        ref={playArea}
        tabIndex={-1}
        hidden={!game}
        className="games-play-area"
      >
        {game === "quiz" && <Quiz collection={collection} />}
        {game === "memory" && <Memory collection={collection} />}
        {game === "film" && <FilmQuiz />}
        {game === "curling" && (
          <Suspense
            fallback={<p role="status">{t("Prepariamo il ghiaccio…")}</p>}
          >
            <CurlingGame onClose={closeGame} />
          </Suspense>
        )}
        {game && !["quiz", "memory", "curling", "film"].includes(game) && (
          <PracticeChallenge key={game} gameId={game} />
        )}
        {game && game !== "curling" && (
          <Button type="button" variant="ghost" onClick={closeGame}>
            {t("Torna ai giochi")}
          </Button>
        )}
      </div>
      <div className="game-mode-filter">
        <Field label={t("Come vuoi giocare?")}>
          <select
            ref={filter}
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="">{t("Tutte le modalità")}</option>
            {Object.entries(gameModeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="game-choices game-catalog">
        {choices.map((entry) => (
          <article
            className="game-catalog-item"
            key={entry.id}
            data-game-id={entry.id}
            aria-label={t(entry.name)}
          >
            {mode === "ranked" || mode === "friends" ? (
              <h2>{t(entry.name)}</h2>
            ) : (
              <Button
                type="button"
                variant="outline"
                aria-describedby={`mode-${entry.id} description-${entry.id}`}
                aria-pressed={game === entry.id}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setGame(entry.id);
                }}
              >
                {t(entry.name)}
                <span id={`mode-${entry.id}`} hidden>
                  {t(
                    gameModeLabels[
                      entry.modes.includes("computer") ? "computer" : "practice"
                    ],
                  )}
                </span>
              </Button>
            )}
            <p id={`description-${entry.id}`}>{t(entry.description)}</p>
            <small>
              {entry.modes.map((mode) => t(gameModeLabels[mode])).join(" · ")}
              {entry.ranked === false ? t(" · senza classifica") : ""}
            </small>
            {entry.id === "curling" && (
              <p className="game-participation-note">
                {t(
                  "La partita conclusa contribuisce al ritratto, senza punti.",
                )}
              </p>
            )}
            {entry.ranked && (!mode || mode === "ranked") && (
              <Button
                type="button"
                variant="ghost"
                aria-label={t("Gioca per punti: {name}", {
                  name: t(entry.name),
                })}
                onClick={() => (onCompete || onGroups)(entry.id)}
              >
                {t("Sfida a punti")}
              </Button>
            )}
            {entry.modes.includes("friends") &&
              (!mode || mode === "friends") && (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t("Sfida un amico a {name}", {
                    name: t(entry.name),
                  })}
                  onClick={() => (onCompete || onGroups)(entry.id, "friends")}
                >
                  {t("Con un amico")}
                </Button>
              )}
          </article>
        ))}
        <TimedTreasures
          section="games"
          collection={collection}
          onDiscover={onDiscover}
        />
      </div>
    </section>
  );
}

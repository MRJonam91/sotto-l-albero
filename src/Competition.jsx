import { gameT, t, getLocale } from "./i18n.js";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clapperboard,
  Gift,
  Medal,
  Puzzle,
  Swords,
} from "lucide-react";
import { api } from "./api.js";
import CompetitionChallenge from "./CompetitionChallenge.jsx";
import FestivalLeaderboard from "./FestivalLeaderboard.jsx";
import MemoryBoard from "./MemoryBoard.jsx";
import QuizReview, {
  DuelScorecard,
  QuizAttemptHistory,
} from "./QuizReview.jsx";
import MovieClueStage from "./MovieClueStage.jsx";
import SnowDuelPanel from "./SnowDuelPanel.jsx";
import { gameCatalog, gameModeLabels } from "../shared/gameCatalog.js";
import { Button, Field, Modal, Notice } from "./ui.jsx";
import "./competition.css";

const optionLetters = ["A", "B", "C", "D"];

function PlayCard({ attempt, title, onMove, onClose, busy, error }) {
  const heading = useRef(null);
  const board = attempt.cards;
  const isQuestion = !attempt.done && Boolean(attempt.question);
  const { timeLimit, deadline } = attempt;
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const expire = useEffectEvent(() => onMove({ timeout: true }));

  useEffect(() => {
    heading.current?.focus();
  }, [attempt.id, attempt.progress, attempt.done]);

  useEffect(() => {
    if (!isQuestion || deadline === undefined || busy || error) return;
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
  }, [deadline, isQuestion, busy, error]);

  const contextBadge = attempt.duelId
    ? t("Duello")
    : attempt.ordinal
      ? t("Tentativo {ordinal} di 3", { ordinal: attempt.ordinal })
      : t(title);
  const doneBadge = attempt.duelReviewView
    ? t("Confronto del duello")
    : attempt.duelId
      ? t("Duello completato")
      : attempt.game === "quiz"
        ? t("Quiz completato")
        : t("Prova completata");

  return (
    <div className="competition-play paper">
      {!attempt.done && (
        <div className="competition-play-bar">
          <button
            type="button"
            className="competition-back text-button"
            disabled={busy}
            onClick={onClose}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t("Torna alle sfide")}
          </button>
          {contextBadge && (
            <span className="competition-play-badge">{contextBadge}</span>
          )}
        </div>
      )}
      {attempt.done ? (
        <>
          <div className="competition-done-head">
            <span className="competition-done-badge">
              <CheckCircle2 size={16} aria-hidden="true" />
              {doneBadge}
            </span>
            <h3 tabIndex={-1} ref={heading}>
              {attempt.duelReviewView
                ? t("Duello con {name}", {
                    name: attempt.review?.opponent?.name ?? t("avversario"),
                  })
                : t("Partita conclusa")}
            </h3>
          </div>
          {attempt.lost === 3 && (
            <p>{t("Hai perso tre pacchi. Il nastro si è fermato.")}</p>
          )}
          {attempt.duelReviewView ? (
            <p>
              {t("Ecco il confronto domanda per domanda del vostro duello.")}
            </p>
          ) : attempt.duelId ? (
            attempt.review?.opponent ? (
              <p>
                {t(
                  "Duello completato: tu hai totalizzato {score} punti, {name} {otherScore} punti.",
                  {
                    score: attempt.rawScore ?? attempt.review.correctCount * 10,
                    name: attempt.review.opponent.name,
                    otherScore: attempt.review.opponent.score,
                  },
                )}
              </p>
            ) : (
              <p>
                {t(
                  "La tua prova è registrata{state}. Trovi il confronto nei duelli quando avete giocato entrambi.",
                  {
                    state: attempt.review
                      ? t(" ({correctCount} su {total} corrette)", {
                          correctCount: attempt.review.correctCount,
                          total: attempt.review.total,
                        })
                      : "",
                  },
                )}
              </p>
            )
          ) : (
            <p>
              {t(
                "Hai ottenuto {score} punti con questo tentativo. In classifica conta il risultato migliore.",
                { score: attempt.score },
              )}
            </p>
          )}
          {attempt.review && (
            <QuizReview
              review={attempt.review}
              myScore={
                attempt.duelId
                  ? (attempt.rawScore ?? attempt.review.correctCount * 10)
                  : attempt.score
              }
            />
          )}
          <Notice error>{error}</Notice>
          <div className="competition-done-actions">
            <Button
              type="button"
              className="competition-finish-cta"
              disabled={busy}
              onClick={onClose}
            >
              {t("Torna alle sfide")}
            </Button>
          </div>
        </>
      ) : board ? (
        <>
          <h3 ref={heading} tabIndex={-1}>
            {t("Memory di Natale")}
          </h3>
          <p>{t("Trova le coppie, due carte alla volta.")}</p>
          <MemoryBoard
            key={attempt.id}
            cards={board}
            revision={attempt.revision}
            needsCover={attempt.needsCover}
            done={attempt.done}
            busy={busy}
            onMove={onMove}
          />
          <Notice error>{error}</Notice>
        </>
      ) : attempt.challenge ? (
        <>
          <h3 ref={heading} tabIndex={-1}>
            {t(
              { cipher: "Cartolina cifrata", order: "Addobbi in ordine" }[
                attempt.challenge.type
              ] ??
                title ??
                "Mini sfida",
            )}
          </h3>
          <CompetitionChallenge
            key={attempt.id}
            challenge={attempt.challenge}
            onMove={onMove}
            busy={busy}
          />
          <Notice error>{error}</Notice>
        </>
      ) : attempt.question ? (
        <>
          <div className="quiz-timer-wrap">
            <div className="quiz-timer-header">
              <span>
                {t("{state} {number} di {total}", {
                  state: attempt.question.icons ? t("Film") : t("Domanda"),
                  number: attempt.progress + 1,
                  total: attempt.total,
                })}
              </span>
              {timeLimit && (
                <span
                  role="timer"
                  className={`quiz-timer-count ${timeLeft <= 5 ? "urgent" : ""}`}
                >
                  {t("⏱️ {timeLeft}s", { timeLeft })}
                </span>
              )}
            </div>
            {timeLimit && (
              <div className="quiz-timer-track" aria-hidden="true">
                <div
                  className={`quiz-timer-fill ${timeLeft <= 5 ? "urgent" : ""}`}
                  style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                />
              </div>
            )}
          </div>
          <h3 ref={heading} tabIndex={-1} className="quiz-question-text">
            {gameT(attempt.question.text)}
          </h3>
          {attempt.question.icons && (
            <MovieClueStage
              index={attempt.progress}
              prompt={attempt.question.prompt}
              icons={attempt.question.icons}
            />
          )}
          <p className="quiz-options-label">{t("Scegli una risposta:")}</p>
          <div
            className={`competition-options ${attempt.question.icons ? "movie-options" : ""}`}
            role="group"
            aria-label={t("Opzioni di risposta")}
          >
            {attempt.question.options.map((option, index) => (
              <Button
                type="button"
                variant="outline"
                className={`competition-option ${attempt.question.icons ? "movie-option" : ""}`}
                data-letter={
                  attempt.question.icons ? optionLetters[index] : undefined
                }
                key={option}
                disabled={busy}
                onClick={() => onMove({ choice: index })}
              >
                {gameT(option)}
              </Button>
            ))}
          </div>
          <Notice error>{error}</Notice>
        </>
      ) : (
        <>
          <Notice error>
            {t("Questa prova è momentaneamente indisponibile.")}
          </Notice>
          <Notice error>{error}</Notice>
        </>
      )}
    </div>
  );
}

function Adjustment({ row, onSubmit, onClose, busy, error }) {
  const [kind, setKind] = useState("add");
  return (
    <Modal title={t("Punti di {name}", { name: row.name })} onClose={onClose}>
      <form
        className="competition-form"
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          onSubmit({
            userId: row.userId,
            kind,
            points: kind === "reset" ? 0 : Number(fields.get("points")),
            reason: fields.get("reason"),
          });
        }}
      >
        <Field label={t("Modifica")}>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="add">{t("Aggiungi punti")}</option>
            <option value="subtract">{t("Sottrai punti")}</option>
            <option value="reset">{t("Azzera il totale")}</option>
          </select>
        </Field>
        {kind === "reset" ? (
          <p>{t("I tentativi già usati restano registrati.")}</p>
        ) : (
          <Field
            label={t("Punti")}
            name="points"
            type="number"
            min="1"
            max="1000"
            required
          />
        )}
        <Field
          label={t("Motivo della modifica")}
          name="reason"
          maxLength={300}
          required
        />
        <Notice error>{error}</Notice>
        <Button type="submit" busy={busy}>
          {t("Salva la modifica")}
        </Button>
      </form>
    </Modal>
  );
}

function DuelInvitation({ opponents, busy, onInvite }) {
  return (
    <section className="competition-callout competition-duel-invite paper">
      <div className="competition-duel-title">
        <Swords aria-hidden="true" size={25} />
        <div>
          <h3>{t("Sfida un amico")}</h3>
          <p>
            {t(
              "Le stesse domande per entrambi, due giorni per giocare. I punti del duello restano fuori dalla classifica.",
            )}
          </p>
        </div>
      </div>
      {opponents.length ? (
        <form
          className="competition-duel-form"
          onSubmit={async (submission) => {
            submission.preventDefault();
            const form = submission.currentTarget;
            const opponent = new FormData(form).get("opponent");
            if (await onInvite(opponent)) form.reset();
          }}
        >
          <Field label={t("Chi vuoi sfidare?")}>
            <select name="opponent" required defaultValue="" disabled={busy}>
              <option value="" disabled>
                {t("Scegli una persona")}
              </option>
              {opponents.map((row) => (
                <option value={row.userId} key={row.userId}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={busy}>
            <Swords aria-hidden="true" size={18} />
            {t("Lancia un duello")}
          </Button>
        </form>
      ) : (
        <p>
          {t(
            "Potrai lanciare un duello quando ci sarà un’altra iscrizione approvata.",
          )}
        </p>
      )}
    </section>
  );
}

export default function Competition({ event, user, members = [], onStamp }) {
  const headingId = useId();
  const [board, setBoard] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [adjustment, setAdjustment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const boardRequest = useRef(0);
  const reviewOpener = useRef(null);
  const selectedGameFocused = useRef(false);
  const path = `/competition/${event.id}`;
  useEffect(() => {
    let live = true;
    setBoard(null);
    setAttempt(null);
    setError("");
    let pending = false;
    let loaded = false;
    function loadBoard() {
      if (pending) return;
      pending = true;
      const request = ++boardRequest.current;
      api(path)
        .then((data) => {
          if (live && request === boardRequest.current) {
            if (!loaded) setError("");
            loaded = true;
            setBoard(data);
          }
        })
        .catch((failure) => {
          if (!loaded && live && request === boardRequest.current)
            setError(failure.message);
        })
        .finally(() => {
          pending = false;
        });
    }
    function refreshVisibleBoard() {
      if (document.visibilityState === "visible" && !inFlight.current)
        loadBoard();
    }
    loadBoard();
    window.addEventListener("focus", refreshVisibleBoard);
    document.addEventListener("visibilitychange", refreshVisibleBoard);
    return () => {
      live = false;
      window.removeEventListener("focus", refreshVisibleBoard);
      document.removeEventListener("visibilitychange", refreshVisibleBoard);
    };
  }, [path]);
  useEffect(() => {
    if (!attempt && reviewOpener.current) {
      const opener = reviewOpener.current;
      reviewOpener.current = null;
      if (opener.isConnected) opener.focus({ preventScroll: true });
    }
  }, [attempt]);
  useEffect(() => {
    if (!board || selectedGameFocused.current) return;
    const search = new URLSearchParams(location.search);
    const game = gameCatalog.find((entry) => entry.id === search.get("game"));
    if (!game) return;
    const friends =
      search.get("mode") === "friends" && game.modes.includes("friends");
    const target = document.getElementById(
      `${friends ? "friends" : "game"}-${game.id}`,
    );
    if (!target) return;
    selectedGameFocused.current = true;
    const frame = requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [board]);
  function focusFriends(gameId) {
    const target = document.getElementById(`friends-${gameId}`);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  async function refresh() {
    const request = ++boardRequest.current;
    const data = await api(path);
    if (request === boardRequest.current) setBoard(data);
  }
  async function perform(action) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function showAttempt(data) {
    setAttempt({
      ...data,
      ...(data.timeRemaining !== undefined
        ? { deadline: performance.now() + data.timeRemaining }
        : {}),
    });
  }
  const start = (game, duelId, replaceLegacyAttempt) =>
    perform(async () => {
      const data = await api(`${path}/start`, "POST", {
        game,
        duelId,
        replaceLegacyAttempt,
      });
      showAttempt(data.attempt);
    });
  const move = (selection) =>
    perform(async () => {
      const data = await api(`${path}/action`, "POST", {
        attemptId: attempt.id,
        revision: attempt.revision,
        ...selection,
      });
      showAttempt(data.attempt);
      if (data.stamp) onStamp?.(data.stamp);
      if (data.attempt.done) await refresh();
    });
  const closeAttempt = () => {
    const wasReview = attempt?.reviewView;
    setAttempt(null);
    setError("");
    if (!wasReview) perform(refresh);
  };
  async function openReview(opener, load) {
    reviewOpener.current = opener;
    if (!(await perform(load))) {
      reviewOpener.current = null;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
  }
  const openAttemptReview = (saved, opener) =>
    openReview(opener, async () => {
      const data = await api(`${path}/attempts/${saved.id}/review`);
      setAttempt({ ...data.attempt, reviewView: true });
    });
  const openDuelReview = (duel, opener) =>
    openReview(opener, async () => {
      const data = await api(`${path}/duels/${duel.id}/review`, "POST", {});
      setAttempt({
        id: `duel-review-${duel.id}`,
        game: "duel",
        duelId: duel.id,
        duelReviewView: true,
        reviewView: true,

        done: true,
        rawScore: data.myScore,
        score: null,
        review: data.review,
      });
    });
  const memberById = new Map(members.map((member) => [member.userId, member]));
  const reviewTitle = attempt?.duelReviewView
    ? t("Duello con {name}", { name: attempt.review.opponent.name })
    : t(attempt?.name);
  const opponents = (board?.leaderboard ?? [])
    .filter((row) => row.userId !== user.id)
    .sort((a, b) => a.name.localeCompare(b.name, getLocale()));

  return (
    <section className="competition" aria-labelledby={headingId}>
      <div className="competition-header">
        <Medal aria-hidden="true" size={30} />
        <div>
          <h2 id={headingId}>{t("Giochi del gruppo")}</h2>
          {board && (
            <p>
              {t("Edizione {year} · {state}", {
                year: board.year,
                state: board.closed ? t("Conclusa") : t("Sfide aperte"),
              })}
            </p>
          )}
        </div>
      </div>
      {(!attempt || attempt.reviewView) && !adjustment && (
        <Notice error>{error}</Notice>
      )}
      <Notice>{notice}</Notice>
      {!board && !error && (
        <p role="status">{t("Stiamo caricando le sfide…")}</p>
      )}
      {!board && error && (
        <Button
          type="button"
          variant="outline"
          busy={busy}
          onClick={() => perform(refresh)}
        >
          {t("Riprova")}
        </Button>
      )}
      {board && (
        <>
          {(!attempt || attempt.reviewView) && (
            <nav
              className="section-jump-links"
              aria-label={t("Giochi del gruppo")}
            >
              {board.canPlay && (
                <a href="#competition-games">
                  {t(
                    board.closed ? "Risultati delle sfide" : "Scegli il gioco",
                  )}
                </a>
              )}
              {!!board.duels.length && (
                <a href="#competition-duels">{t("I tuoi duelli")}</a>
              )}
              <a href="#competition-ranking">{t("Classifica")}</a>
            </nav>
          )}
          {!board.canPlay && !board.closed && (
            <p>
              {t(
                "Puoi consultare la classifica. Per giocare, devi avere un’iscrizione approvata all’evento.",
              )}
            </p>
          )}
          {attempt && !attempt.reviewView ? (
            <PlayCard
              attempt={attempt}
              title={board.games.find((game) => game.id === attempt.game)?.name}
              onMove={move}
              busy={busy}
              error={error}
              onClose={closeAttempt}
            />
          ) : (
            board.canPlay && (
              <div className="competition-section" id="competition-games">
                <h3>
                  {board.closed
                    ? t("Risultati delle sfide")
                    : t("Scegli il gioco")}
                </h3>
                <p>
                  {board.closed
                    ? t(
                        "Questa edizione è conclusa. Puoi rileggere i risultati delle tue partite.",
                      )
                    : t(
                        "Gli stessi nove giochi della pagina Giochi di Natale. Scegli la modalità: allenamento, computer, sfida a punti o con un amico. Solo le sfide a punti consumano i tre tentativi del gruppo: 100%, 95%, 90%. In classifica resta il migliore.",
                      )}
                </p>
                <ul className="competition-games">
                  {(board.closed
                    ? board.games.map((game) => ({
                        ...gameCatalog.find((entry) => entry.id === game.id),
                        ...game,
                      }))
                    : gameCatalog.map((entry) => ({
                        ...entry,
                        ...board.games.find((game) => game.id === entry.id),
                      }))
                  )
                    .filter((game) => !board.closed || game.history?.length)
                    .map((game) => {
                      const active = board.active.find(
                        (active) => active.game === game.id,
                      );
                      const legacy =
                        active &&
                        game.edition &&
                        (active.challenge?.type !== game.type ||
                          active.challenge?.edition !== game.edition);
                      const playLabel = legacy
                        ? t("Gioca la nuova prova")
                        : active
                          ? t("Riprendi la sfida")
                          : t("Sfida a punti");
                      const remaining = game.limit - game.attempts;
                      const Icon =
                        game.id === "quiz"
                          ? BookOpen
                          : game.id === "memory"
                            ? Puzzle
                            : game.id === "film"
                              ? Clapperboard
                              : Gift;
                      return (
                        <li
                          key={game.id}
                          id={`game-${game.id}`}
                          tabIndex={-1}
                          className="competition-game paper"
                        >
                          <Icon size={22} aria-hidden="true" />
                          <h4>{t(game.name)}</h4>
                          <p className="game-description">
                            {t(game.description)}
                          </p>
                          {!board.closed && (
                            <small className="game-modes">
                              {game.modes
                                .map((mode) => t(gameModeLabels[mode]))
                                .join(" · ")}
                              {game.ranked === false
                                ? t(" · senza classifica")
                                : ""}
                            </small>
                          )}
                          {game.ranked !== false && (
                            <p>
                              {game.best === null
                                ? t("Fino a {points} punti", {
                                    points: game.points,
                                  })
                                : t("Miglior risultato: {best} punti", {
                                    best: game.best,
                                  })}
                            </p>
                          )}
                          {game.ranked !== false && !board.closed && (
                            <p>
                              {remaining === 1
                                ? t("1 tentativo nuovo")
                                : t("{remaining} tentativi nuovi", {
                                    remaining,
                                  })}
                            </p>
                          )}
                          {game.history?.length > 0 && (
                            <QuizAttemptHistory
                              history={game.history}
                              gameName={game.name}
                              onReview={openAttemptReview}
                              busy={busy}
                            />
                          )}
                          {game.ranked !== false && !board.closed && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy || (!active && remaining <= 0)}
                              aria-label={`${playLabel}: ${t(game.name)}`}
                              onClick={() =>
                                start(
                                  game.id,
                                  undefined,
                                  legacy ? active.id : undefined,
                                )
                              }
                            >
                              {playLabel}
                            </Button>
                          )}
                          {!board.closed && (
                            <a
                              className="button outline"
                              href={`/giochi?game=${game.id}`}
                              aria-label={`${game.modes.includes("computer") ? t("Contro il computer") : t("Allenamento libero")}: ${t(game.name)}`}
                            >
                              {game.modes.includes("computer")
                                ? t("Contro il computer")
                                : t("Allenamento libero")}
                            </a>
                          )}
                          {!board.closed && game.modes.includes("friends") && (
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label={t("Con un amico: {name}", {
                                name: t(game.name),
                              })}
                              onClick={() => focusFriends(game.id)}
                            >
                              {t("Con un amico")}
                            </Button>
                          )}
                          {!board.closed && game.id === "curling" && (
                            <small>
                              {t(
                                "La partita conclusa contribuisce al ritratto, senza punti.",
                              )}
                            </small>
                          )}
                          {legacy && !board.closed && (
                            <>
                              <small>
                                {t(
                                  "Passare alla nuova prova usa lo stesso tentativo e sostituisce la partita in corso.",
                                )}
                              </small>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={busy}
                                aria-label={t(
                                  "Riprendi la prova precedente: {name}",
                                  { name: t(game.name) },
                                )}
                                onClick={() => start(game.id)}
                              >
                                {t("Riprendi la prova precedente")}
                              </Button>
                            </>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>
            )
          )}
          {board.canPlay && (!attempt || attempt.reviewView) && (
            <div
              id="friends-tris"
              tabIndex={-1}
              className="competition-friends"
            >
              <SnowDuelPanel
                key={`${user.id}:${event.id}`}
                eventId={event.id}
                userId={user.id}
                opponents={opponents}
                closed={board.closed}
              />
            </div>
          )}
          {board.canPlay &&
            !board.closed &&
            (!attempt || attempt.reviewView) && (
              <div
                id="friends-quiz"
                tabIndex={-1}
                className="competition-friends"
              >
                <DuelInvitation
                  opponents={opponents}
                  busy={busy}
                  onInvite={(userId) =>
                    perform(async () => {
                      await api(`${path}/duels`, "POST", { userId });
                      await refresh();
                      setNotice("Duello lanciato.");
                    })
                  }
                />
              </div>
            )}
          {(!attempt || attempt.reviewView) && !!board.duels.length && (
            <section className="competition-section" id="competition-duels">
              <h3>{t("I tuoi duelli")}</h3>
              <ul className="competition-duels" role="list">
                {board.duels.map((duel) => (
                  <li key={duel.id} className="competition-duel-item">
                    <div className="competition-duel-main">
                      <strong>
                        {t("Duello con {name}", { name: duel.opponent.name })}
                      </strong>
                      {duel.scores ? (
                        <p>
                          {t("Tu: {value} · {name}: {value2}", {
                            value: duel.scores[user.id] ?? t("prova assente"),
                            name: duel.opponent.name,
                            value2:
                              duel.scores[duel.opponent.userId] ??
                              t("prova assente"),
                          })}
                        </p>
                      ) : (
                        <p>
                          {duel.myDone
                            ? t("Aspettiamo l’altra prova.")
                            : duel.fromMe
                              ? t("Hai lanciato il duello.")
                              : t("Hai ricevuto un invito.")}
                        </p>
                      )}
                      <DuelScorecard
                        outcomes={duel.roundOutcomes}
                        opponentName={duel.opponent.name}
                      />
                    </div>
                    <div className="competition-duel-actions">
                      {!duel.expired &&
                        !duel.myDone &&
                        board.canPlay &&
                        !board.closed && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => start("duel", duel.id)}
                          >
                            {board.active.some(
                              (active) => active.duelId === duel.id,
                            )
                              ? t("Riprendi")
                              : t("Gioca il duello")}
                          </Button>
                        )}
                      {duel.reviewAvailable && (
                        <div className="duel-review-cta">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={(event) =>
                              openDuelReview(duel, event.currentTarget)
                            }
                          >
                            {t("Vedi risposte del duello")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div id="competition-ranking">
            <FestivalLeaderboard
              rows={board.leaderboard}
              memberById={memberById}
              userId={user.id}
              busy={busy}
              onAdjust={
                event.isAdmin && event.status !== "archived"
                  ? (row) => {
                      setError("");
                      setAdjustment(row);
                    }
                  : undefined
              }
            />
          </div>
        </>
      )}
      {attempt?.reviewView && (
        <Modal
          title={t("Risultato: {name}", { name: reviewTitle })}
          onClose={closeAttempt}
          wide
        >
          <PlayCard
            attempt={attempt}
            title={reviewTitle}
            onMove={move}
            onClose={closeAttempt}
            busy={busy}
            error={error}
          />
        </Modal>
      )}
      {adjustment && (
        <Adjustment
          row={adjustment}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) {
              setAdjustment(null);
              setError("");
            }
          }}
          onSubmit={(fields) =>
            perform(async () => {
              const data = await api(`${path}/adjust`, "POST", fields);
              setBoard((previous) => ({
                ...previous,
                leaderboard: data.leaderboard,
              }));
              setAdjustment(null);
              setNotice("Punti aggiornati.");
            })
          }
        />
      )}
    </section>
  );
}

export { Competition };

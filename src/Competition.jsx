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
    ? "Duello"
    : attempt.ordinal
      ? `Tentativo ${attempt.ordinal} di 3`
      : title;
  const doneBadge = attempt.duelReviewView
    ? "Confronto del duello"
    : attempt.duelId
      ? "Duello completato"
      : attempt.game === "quiz"
        ? "Quiz completato"
        : "Prova completata";

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
            Torna alle sfide
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
                ? `Duello con ${attempt.review?.opponent?.name ?? "avversario"}`
                : "Partita conclusa"}
            </h3>
          </div>
          {attempt.lost === 3 && (
            <p>Hai perso tre pacchi. Il nastro si è fermato.</p>
          )}
          {attempt.duelReviewView ? (
            <p>Ecco il confronto domanda per domanda del vostro duello.</p>
          ) : attempt.duelId ? (
            attempt.review?.opponent ? (
              <p>
                Duello completato: tu hai totalizzato{" "}
                <strong>
                  {attempt.rawScore ?? attempt.review.correctCount * 10} punti
                </strong>
                , {attempt.review.opponent.name}{" "}
                <strong>{attempt.review.opponent.score} punti</strong>.
              </p>
            ) : (
              <p>
                La tua prova è registrata
                {attempt.review
                  ? ` (${attempt.review.correctCount} su ${attempt.review.total} corrette)`
                  : ""}
                . Trovi il confronto nei duelli quando avete giocato entrambi.
              </p>
            )
          ) : (
            <p>
              Hai ottenuto <strong>{attempt.score} punti</strong> con questo
              tentativo. In classifica conta il risultato migliore.
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
              Torna alle sfide
            </Button>
          </div>
        </>
      ) : board ? (
        <>
          <h3 ref={heading} tabIndex={-1}>
            Memory di Natale
          </h3>
          <p>Trova le coppie, due carte alla volta.</p>
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
            {{ cipher: "Cartolina cifrata", order: "Addobbi in ordine" }[
              attempt.challenge.type
            ] ??
              title ??
              "Mini sfida"}
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
                {attempt.question.icons ? "Film" : "Domanda"}{" "}
                {attempt.progress + 1} di {attempt.total}
              </span>
              {timeLimit && (
                <span
                  role="timer"
                  className={`quiz-timer-count ${timeLeft <= 5 ? "urgent" : ""}`}
                >
                  ⏱️ {timeLeft}s
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
            {attempt.question.text}
          </h3>
          {attempt.question.icons && (
            <MovieClueStage
              index={attempt.progress}
              prompt={attempt.question.prompt}
              icons={attempt.question.icons}
            />
          )}
          <p className="quiz-options-label">Scegli una risposta:</p>
          <div
            className={`competition-options ${attempt.question.icons ? "movie-options" : ""}`}
            role="group"
            aria-label="Opzioni di risposta"
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
                {option}
              </Button>
            ))}
          </div>
          <Notice error>{error}</Notice>
        </>
      ) : (
        <>
          <Notice error>Questa prova è momentaneamente indisponibile.</Notice>
          <Notice error>{error}</Notice>
        </>
      )}
    </div>
  );
}

function Adjustment({ row, onSubmit, onClose, busy, error }) {
  const [kind, setKind] = useState("add");
  return (
    <Modal title={`Punti di ${row.name}`} onClose={onClose}>
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
        <Field label="Modifica">
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="add">Aggiungi punti</option>
            <option value="subtract">Sottrai punti</option>
            <option value="reset">Azzera il totale</option>
          </select>
        </Field>
        {kind === "reset" ? (
          <p>I tentativi già usati restano registrati.</p>
        ) : (
          <Field
            label="Punti"
            name="points"
            type="number"
            min="1"
            max="1000"
            required
          />
        )}
        <Field
          label="Motivo della modifica"
          name="reason"
          maxLength={300}
          required
        />
        <Notice error>{error}</Notice>
        <Button type="submit" busy={busy}>
          Salva la modifica
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
          <h3>Sfida un amico</h3>
          <p>
            Le stesse domande per entrambi, due giorni per giocare. I punti del
            duello restano fuori dalla classifica.
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
          <Field label="Chi vuoi sfidare?">
            <select name="opponent" required defaultValue="" disabled={busy}>
              <option value="" disabled>
                Scegli una persona
              </option>
              {opponents.map((row) => (
                <option value={row.userId} key={row.userId}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={busy}>
            <Swords aria-hidden="true" size={18} /> Lancia un duello
          </Button>
        </form>
      ) : (
        <p>
          Potrai lanciare un duello quando ci sarà un’altra iscrizione
          approvata.
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
  const reviewOpener = useRef(null);
  const selectedGameFocused = useRef(false);
  const path = `/competition/${event.id}`;
  useEffect(() => {
    let live = true;
    setBoard(null);
    setAttempt(null);
    setError("");
    api(path)
      .then((data) => {
        if (live) setBoard(data);
      })
      .catch((failure) => {
        if (live) setError(failure.message);
      });
    return () => {
      live = false;
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
    setBoard(await api(path));
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
        name: `Duello con ${duel.opponent.name}`,
        done: true,
        rawScore: data.myScore,
        score: null,
        review: data.review,
      });
    });
  const memberById = new Map(members.map((member) => [member.userId, member]));
  const opponents = (board?.leaderboard ?? [])
    .filter((row) => row.userId !== user.id)
    .sort((a, b) => a.name.localeCompare(b.name, "it"));

  return (
    <section className="competition" aria-labelledby={headingId}>
      <div className="competition-header">
        <Medal aria-hidden="true" size={30} />
        <div>
          <h2 id={headingId}>Giochi del gruppo</h2>
          {board && (
            <p>
              Edizione {board.year} ·{" "}
              {board.closed ? "Conclusa" : "Sfide aperte"}
            </p>
          )}
        </div>
      </div>
      {(!attempt || attempt.reviewView) && !adjustment && (
        <Notice error>{error}</Notice>
      )}
      <Notice>{notice}</Notice>
      {!board && !error && <p role="status">Stiamo caricando le sfide…</p>}
      {!board && error && (
        <Button
          type="button"
          variant="outline"
          busy={busy}
          onClick={() => perform(refresh)}
        >
          Riprova
        </Button>
      )}
      {board && (
        <>
          {!board.canPlay && !board.closed && (
            <p>
              Puoi consultare la classifica. Per giocare, devi avere
              un’iscrizione approvata all’evento.
            </p>
          )}
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
              <div className="competition-section">
                <h3>
                  {board.closed ? "Risultati delle sfide" : "Scegli il gioco"}
                </h3>
                <p>
                  {board.closed
                    ? "Questa edizione è conclusa. Puoi rileggere i risultati delle tue partite."
                    : "Gli stessi nove giochi della pagina Giochi di Natale. Scegli la modalità: allenamento, computer, sfida a punti o con un amico. Solo le sfide a punti consumano i tre tentativi del gruppo: 100%, 95%, 90%. In classifica resta il migliore."}
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
                        ? "Gioca la nuova prova"
                        : active
                          ? "Riprendi la sfida"
                          : "Sfida a punti";
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
                          <h4>{game.name}</h4>
                          <p className="game-description">{game.description}</p>
                          {!board.closed && (
                            <small className="game-modes">
                              {game.modes
                                .map((mode) => gameModeLabels[mode])
                                .join(" · ")}
                              {game.ranked === false
                                ? " · senza classifica"
                                : ""}
                            </small>
                          )}
                          {game.ranked !== false && (
                            <p>
                              {game.best === null
                                ? `Fino a ${game.points} punti`
                                : `Miglior risultato: ${game.best} punti`}
                            </p>
                          )}
                          {game.ranked !== false && !board.closed && (
                            <p>
                              {remaining === 1
                                ? "1 tentativo nuovo"
                                : `${remaining} tentativi nuovi`}
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
                              aria-label={`${playLabel}: ${game.name}`}
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
                              aria-label={`${game.modes.includes("computer") ? "Contro il computer" : "Allenamento libero"}: ${game.name}`}
                            >
                              {game.modes.includes("computer")
                                ? "Contro il computer"
                                : "Allenamento libero"}
                            </a>
                          )}
                          {!board.closed && game.modes.includes("friends") && (
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label={`Con un amico: ${game.name}`}
                              onClick={() => focusFriends(game.id)}
                            >
                              Con un amico
                            </Button>
                          )}
                          {!board.closed && game.id === "curling" && (
                            <small>
                              La partita conclusa contribuisce al ritratto,
                              senza punti.
                            </small>
                          )}
                          {legacy && !board.closed && (
                            <>
                              <small>
                                Passare alla nuova prova usa lo stesso tentativo
                                e sostituisce la partita in corso.
                              </small>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={busy}
                                aria-label={`Riprendi la prova precedente: ${game.name}`}
                                onClick={() => start(game.id)}
                              >
                                Riprendi la prova precedente
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
            <section className="competition-section">
              <h3>I tuoi duelli</h3>
              <ul className="competition-duels" role="list">
                {board.duels.map((duel) => (
                  <li key={duel.id} className="competition-duel-item">
                    <div className="competition-duel-main">
                      <strong>Duello con {duel.opponent.name}</strong>
                      {duel.scores ? (
                        <p>
                          Tu: {duel.scores[user.id] ?? "prova assente"} ·{" "}
                          {duel.opponent.name}:{" "}
                          {duel.scores[duel.opponent.userId] ?? "prova assente"}
                        </p>
                      ) : (
                        <p>
                          {duel.myDone
                            ? "Aspettiamo l’altra prova."
                            : duel.fromMe
                              ? "Hai lanciato il duello."
                              : "Hai ricevuto un invito."}
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
                              ? "Riprendi"
                              : "Gioca il duello"}
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
                            Vedi risposte del duello
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {attempt?.reviewView && (
        <Modal title={`Risultato: ${attempt.name}`} onClose={closeAttempt} wide>
          <PlayCard
            attempt={attempt}
            title={attempt.name}
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

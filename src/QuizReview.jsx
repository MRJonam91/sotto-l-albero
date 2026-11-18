import { Check, Clock, EyeOff, Sparkles, X } from "lucide-react";
import MovieClueStage from "./MovieClueStage.jsx";

const OUTCOMES = {
  correct: { label: "Esatta", short: "✓", tone: "correct", Icon: Check },
  wrong: { label: "Sbagliata", short: "✗", tone: "wrong", Icon: X },
  timeout: {
    label: "Tempo scaduto",
    short: "⏱",
    tone: "timeout",
    Icon: Clock,
  },
};

function outcomeInfo(outcome) {
  return (
    OUTCOMES[outcome] ?? {
      label: "In attesa",
      short: "·",
      tone: "pending",
      Icon: null,
    }
  );
}

function OutcomeBadge({ outcome, prefix }) {
  const info = outcomeInfo(outcome);
  const { Icon } = info;
  return (
    <span className="quiz-outcome-pill" data-tone={info.tone}>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {prefix ? `${prefix}: ${info.label}` : info.label}
    </span>
  );
}

export function QuizAttemptHistory({ history }) {
  if (!history?.length) return null;
  return (
    <ul className="quiz-attempt-history" aria-label="Esiti dei tentativi quiz">
      {history.map((item) => (
        <li key={item.ordinal} className="quiz-history-row">
          <span>
            Tentativo {item.ordinal}:{" "}
            <strong>
              {item.correct}/{item.total}
            </strong>{" "}
            ({item.score} pt)
          </span>
          {item.outcomes && (
            <span
              className="quiz-history-dots"
              role="group"
              aria-label={`Risposte del tentativo ${item.ordinal}`}
            >
              {item.outcomes.map((outcome, index) => {
                const info = outcomeInfo(outcome);
                return (
                  <span
                    key={index}
                    role="img"
                    className="quiz-history-dot"
                    data-tone={info.tone}
                    title={`Domanda ${index + 1}: ${info.label}`}
                    aria-label={`Domanda ${index + 1}: ${info.label}`}
                  />
                );
              })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DuelScorecard({ outcomes, opponentName }) {
  if (!outcomes?.length) return null;
  const hasOpponent = outcomes.some((round) => round.opponent !== null);
  return (
    <div
      className="duel-scorecard"
      role="group"
      aria-label={`Risultati domanda per domanda contro ${opponentName}`}
    >
      <div
        className="duel-scorecard-row duel-scorecard-head"
        aria-hidden="true"
      >
        <span />
        {outcomes.map((_, index) => (
          <span key={index} className="duel-scorecard-num">
            {index + 1}
          </span>
        ))}
      </div>
      <div className="duel-scorecard-row">
        <span className="duel-scorecard-name">Tu</span>
        {outcomes.map((round, index) => {
          const info = outcomeInfo(round.me);
          return (
            <span
              key={index}
              role="img"
              className="duel-scorecard-cell"
              data-tone={info.tone}
              title={`Domanda ${index + 1} · Tu: ${info.label}`}
              aria-label={`Domanda ${index + 1}, Tu: ${info.label}`}
            >
              {info.short}
            </span>
          );
        })}
      </div>
      {hasOpponent && (
        <div className="duel-scorecard-row">
          <span className="duel-scorecard-name">{opponentName}</span>
          {outcomes.map((round, index) => {
            const info = outcomeInfo(round.opponent);
            return (
              <span
                key={index}
                role="img"
                className="duel-scorecard-cell"
                data-tone={info.tone}
                title={`Domanda ${index + 1} · ${opponentName}: ${info.label}`}
                aria-label={`Domanda ${index + 1}, ${opponentName}: ${info.label}`}
              >
                {info.short}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuizReview({ review, myScore }) {
  if (!review?.items?.length) return null;
  const wrongCount = review.items.filter(
    (item) => item.myOutcome === "wrong",
  ).length;
  const timeoutCount = review.items.filter(
    (item) => item.myOutcome === "timeout",
  ).length;
  const hasOpponent = Boolean(review.opponent);
  const verdict = !hasOpponent
    ? null
    : review.correctCount > review.opponent.correctCount
      ? { label: "Hai vinto il duello!", tone: "win" }
      : review.correctCount < review.opponent.correctCount
        ? { label: `Ha vinto ${review.opponent.name}`, tone: "loss" }
        : { label: "Pareggio!", tone: "tie" };

  return (
    <div className="quiz-review">
      {hasOpponent ? (
        <div className="quiz-duel-banner">
          <div className="quiz-duel-player">
            <strong>Tu</strong>
            <span>
              {review.correctCount} / {review.total} esatte
            </span>
            <small>{myScore ?? review.correctCount * 10} punti</small>
          </div>
          <span className="quiz-duel-verdict" data-tone={verdict.tone}>
            {verdict.label}
          </span>
          <div className="quiz-duel-player">
            <strong>{review.opponent.name}</strong>
            <span>
              {review.opponent.correctCount} / {review.total} esatte
            </span>
            <small>{review.opponent.score} punti</small>
          </div>
        </div>
      ) : (
        <div className="quiz-review-stats">
          <span className="quiz-stat-pill" data-tone="correct">
            {review.correctCount} su {review.total} esatte
          </span>
          <span className="quiz-stat-pill" data-tone="wrong">
            {wrongCount === 1 ? "1 sbagliata" : `${wrongCount} sbagliate`}
          </span>
          {timeoutCount > 0 && (
            <span className="quiz-stat-pill" data-tone="timeout">
              {timeoutCount === 1
                ? "1 tempo scaduto"
                : `${timeoutCount} tempi scaduti`}
            </span>
          )}
        </div>
      )}

      <ol
        className="quiz-review-strip"
        aria-label="Andamento delle dieci domande"
      >
        {review.items.map((item, index) => {
          const mine = outcomeInfo(item.myOutcome);
          const theirs = hasOpponent ? outcomeInfo(item.opponentOutcome) : null;
          return (
            <li
              key={index}
              className="quiz-strip-cell"
              data-tone={mine.tone}
              title={`Domanda ${index + 1}: ${mine.label}`}
            >
              <span className="quiz-strip-num">{index + 1}</span>
              <span className="quiz-strip-mark" data-tone={mine.tone}>
                {mine.short}
              </span>
              {theirs && (
                <span
                  className="quiz-strip-mark quiz-strip-opponent"
                  data-tone={theirs.tone}
                  title={`${review.opponent.name}: ${theirs.label}`}
                >
                  {theirs.short}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <p className="quiz-review-lock-note">
        <EyeOff size={15} aria-hidden="true" />
        <span>
          Riepilogo visibile solo ora al termine della partita: una volta chiuso
          non potrà essere riaperto, per non memorizzare le domande.
        </span>
      </p>

      <ol className="quiz-review-list">
        {review.items.map((item, index) => (
          <li
            key={index}
            className="quiz-review-card"
            data-outcome={item.myOutcome ?? "pending"}
          >
            <div className="quiz-review-card-head">
              <span className="quiz-review-number">Domanda {index + 1}</span>
              <div className="quiz-review-badges">
                <OutcomeBadge
                  outcome={item.myOutcome}
                  prefix={hasOpponent ? "Tu" : undefined}
                />
                {hasOpponent && (
                  <OutcomeBadge
                    outcome={item.opponentOutcome}
                    prefix={review.opponent.name}
                  />
                )}
              </div>
            </div>
            <p className="quiz-review-question">{item.text}</p>
            {item.icons && (
              <MovieClueStage
                index={index}
                prompt={item.prompt}
                icons={item.icons}
              />
            )}
            <ul className="quiz-review-options" role="list">
              {item.options.map((option, optIndex) => {
                const isCorrect = optIndex === item.correctAnswer;
                const isMine = optIndex === item.myChoice;
                const isOpponent =
                  hasOpponent && optIndex === item.opponentChoice;
                const state = isCorrect
                  ? "correct"
                  : isMine
                    ? "wrong"
                    : "neutral";
                return (
                  <li
                    key={option}
                    className="quiz-review-option"
                    data-state={state}
                  >
                    <span className="quiz-review-option-main">
                      {isCorrect ? (
                        <Check size={16} aria-hidden="true" />
                      ) : isMine ? (
                        <X size={16} aria-hidden="true" />
                      ) : (
                        <span
                          className="quiz-review-bullet"
                          aria-hidden="true"
                        />
                      )}
                      <span>{option}</span>
                    </span>
                    <span className="quiz-review-tags">
                      {isCorrect && (
                        <span className="quiz-tag" data-kind="correct">
                          Risposta esatta
                        </span>
                      )}
                      {isMine && (
                        <span
                          className="quiz-tag"
                          data-kind={isCorrect ? "mine-ok" : "mine-bad"}
                        >
                          Tu
                        </span>
                      )}
                      {isOpponent && (
                        <span
                          className="quiz-tag"
                          data-kind={isCorrect ? "opp-ok" : "opp-bad"}
                        >
                          {review.opponent.name}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {item.myOutcome === "timeout" && (
              <p className="quiz-review-timeout">
                Tempo scaduto: nessuna risposta inviata da te.
              </p>
            )}
            {hasOpponent && item.opponentOutcome === "timeout" && (
              <p className="quiz-review-timeout">
                {review.opponent.name}: tempo scaduto.
              </p>
            )}
            {item.note && (
              <p className="quiz-review-note">
                <Sparkles size={15} aria-hidden="true" />
                <span>{item.note}</span>
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

import { gameT, t } from "./i18n.js";
import { Check, Clock, Sparkles, X } from "lucide-react";
import MovieClueStage from "./MovieClueStage.jsx";

const OUTCOMES = {
  correct: { label: "Esatta", short: "✓", tone: "correct", Icon: Check },
  unrecorded: {
    label: "Non registrata",
    short: "?",
    tone: "unrecorded",
    Icon: null,
  },
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
      {prefix ? `${prefix}: ${t(info.label)}` : t(info.label)}
    </span>
  );
}

export function QuizAttemptHistory({
  history,
  gameName = "Quiz di Natale",
  onReview,
  busy,
}) {
  if (!history?.length) return null;
  return (
    <ul
      className="quiz-attempt-history"
      aria-label={t("Esiti dei tentativi: {gameName}", {
        gameName: t(gameName),
      })}
    >
      {history.map((item) => (
        <li key={item.id ?? item.ordinal} className="quiz-history-row">
          <span>
            {t("Tentativo {ordinal}: ", { ordinal: item.ordinal })}
            <strong>
              {item.correct}/{item.total}
            </strong>
            {t(" ({score} pt)", { score: item.score })}
          </span>
          {item.outcomes && (
            <span
              className="quiz-history-dots"
              role="group"
              aria-label={t("Risposte del tentativo {ordinal}", {
                ordinal: item.ordinal,
              })}
            >
              {item.outcomes.map((outcome, index) => {
                const info = outcomeInfo(outcome);
                return (
                  <span
                    key={index}
                    role="img"
                    className="quiz-history-dot"
                    data-tone={info.tone}
                    title={t("Domanda {number}: {label}", {
                      number: index + 1,
                      label: t(info.label),
                    })}
                    aria-label={t("Domanda {number}: {label}", {
                      number: index + 1,
                      label: t(info.label),
                    })}
                  />
                );
              })}
            </span>
          )}
          {item.reviewAvailable && onReview && (
            <button
              type="button"
              className="text-button quiz-history-review"
              disabled={busy}
              aria-label={t(
                "Vedi risposte: tentativo {ordinal} di {gameName}",
                { ordinal: item.ordinal, gameName: t(gameName) },
              )}
              onClick={(event) => onReview(item, event.currentTarget)}
            >
              {t("Vedi risposte")}
            </button>
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
      aria-label={t("Risultati domanda per domanda contro {opponentName}", {
        opponentName,
      })}
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
        <span className="duel-scorecard-name">{t("Tu")}</span>
        {outcomes.map((round, index) => {
          const info = outcomeInfo(round.me);
          return (
            <span
              key={index}
              role="img"
              className="duel-scorecard-cell"
              data-tone={info.tone}
              title={t("Domanda {number} · Tu: {label}", {
                number: index + 1,
                label: t(info.label),
              })}
              aria-label={t("Domanda {number}, Tu: {label}", {
                number: index + 1,
                label: t(info.label),
              })}
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
                title={t("Domanda {number} · {opponentName}: {label}", {
                  number: index + 1,
                  opponentName,
                  label: t(info.label),
                })}
                aria-label={t("Domanda {number}, {opponentName}: {label}", {
                  number: index + 1,
                  opponentName,
                  label: t(info.label),
                })}
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
  const hasMissingAnswers = review.items.some(
    (item) => item.myOutcome === "unrecorded",
  );
  const hasOpponent = Boolean(review.opponent);
  const verdict = !hasOpponent
    ? null
    : review.correctCount > review.opponent.correctCount
      ? { label: t("Hai vinto il duello!"), tone: "win" }
      : review.correctCount < review.opponent.correctCount
        ? {
            label: t("Ha vinto {name}", { name: review.opponent.name }),
            tone: "loss",
          }
        : { label: t("Pareggio!"), tone: "tie" };

  return (
    <div className="quiz-review">
      {hasOpponent ? (
        <div className="quiz-duel-banner">
          <div className="quiz-duel-player">
            <strong>{t("Tu")}</strong>
            <span>
              {t("{correctCount} / {total} esatte", {
                correctCount: review.correctCount,
                total: review.total,
              })}
            </span>
            <small>
              {t("{score} punti", {
                score: myScore ?? review.correctCount * 10,
              })}
            </small>
          </div>
          <span className="quiz-duel-verdict" data-tone={verdict.tone}>
            {verdict.label}
          </span>
          <div className="quiz-duel-player">
            <strong>{review.opponent.name}</strong>
            <span>
              {t("{correctCount} / {total} esatte", {
                correctCount: review.opponent.correctCount,
                total: review.total,
              })}
            </span>
            <small>
              {t("{score} punti", { score: review.opponent.score })}
            </small>
          </div>
        </div>
      ) : (
        <div className="quiz-review-stats">
          <span className="quiz-stat-pill" data-tone="correct">
            {t("{correctCount} su {total} esatte", {
              correctCount: review.correctCount,
              total: review.total,
            })}
          </span>
          {(!hasMissingAnswers || wrongCount > 0) && (
            <span className="quiz-stat-pill" data-tone="wrong">
              {wrongCount === 1
                ? t("1 sbagliata")
                : t("{wrongCount} sbagliate", { wrongCount })}
            </span>
          )}
          {timeoutCount > 0 && (
            <span className="quiz-stat-pill" data-tone="timeout">
              {timeoutCount === 1
                ? t("1 tempo scaduto")
                : t("{timeoutCount} tempi scaduti", { timeoutCount })}
            </span>
          )}
        </div>
      )}

      <ol
        className="quiz-review-strip"
        aria-label={t("Andamento delle dieci domande")}
      >
        {review.items.map((item, index) => {
          const mine = outcomeInfo(item.myOutcome);
          const theirs = hasOpponent ? outcomeInfo(item.opponentOutcome) : null;
          return (
            <li
              key={index}
              className="quiz-strip-cell"
              data-tone={mine.tone}
              title={t("Domanda {number}: {label}", {
                number: index + 1,
                label: t(mine.label),
              })}
            >
              <span className="quiz-strip-num">{index + 1}</span>
              <span className="quiz-strip-mark" data-tone={mine.tone}>
                {mine.short}
              </span>
              {theirs && (
                <span
                  className="quiz-strip-mark quiz-strip-opponent"
                  data-tone={theirs.tone}
                  title={`${review.opponent.name}: ${t(theirs.label)}`}
                >
                  {theirs.short}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {hasMissingAnswers && (
        <p className="quiz-review-note">
          {t(
            "Per questa partita precedente sono disponibili il risultato e le soluzioni. Il dettaglio delle tue risposte non è stato registrato completamente.",
          )}
        </p>
      )}

      <ol className="quiz-review-list">
        {review.items.map((item, index) => (
          <li
            key={index}
            className="quiz-review-card"
            data-outcome={item.myOutcome ?? "pending"}
          >
            <div className="quiz-review-card-head">
              <span className="quiz-review-number">
                {t("Domanda {number}", { number: index + 1 })}
              </span>
              <div className="quiz-review-badges">
                <OutcomeBadge
                  outcome={item.myOutcome}
                  prefix={hasOpponent ? t("Tu") : undefined}
                />
                {hasOpponent && (
                  <OutcomeBadge
                    outcome={item.opponentOutcome}
                    prefix={review.opponent.name}
                  />
                )}
              </div>
            </div>
            <p className="quiz-review-question">{gameT(item.text)}</p>
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
                      <span>{gameT(option)}</span>
                    </span>
                    <span className="quiz-review-tags">
                      {isCorrect && (
                        <span className="quiz-tag" data-kind="correct">
                          {t("Risposta esatta")}
                        </span>
                      )}
                      {isMine && (
                        <span
                          className="quiz-tag"
                          data-kind={isCorrect ? "mine-ok" : "mine-bad"}
                        >
                          {t("Tu")}
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
            {item.myOutcome === "unrecorded" && (
              <p className="quiz-review-missing">
                {t("Risposta non registrata per questa partita precedente.")}
              </p>
            )}
            {hasOpponent && item.opponentOutcome === "unrecorded" && (
              <p className="quiz-review-missing">
                {t(
                  "{name}: risposta non registrata per questa partita precedente.",
                  { name: review.opponent.name },
                )}
              </p>
            )}
            {item.myOutcome === "timeout" && (
              <p className="quiz-review-timeout">
                {t("Tempo scaduto: nessuna risposta inviata da te.")}
              </p>
            )}
            {hasOpponent && item.opponentOutcome === "timeout" && (
              <p className="quiz-review-timeout">
                {t("{name}: tempo scaduto.", { name: review.opponent.name })}
              </p>
            )}
            {item.note && (
              <p className="quiz-review-note">
                <Sparkles size={15} aria-hidden="true" />
                <span>{gameT(item.note)}</span>
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

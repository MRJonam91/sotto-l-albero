import { useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HelpCircle,
  MessageSquareHeart,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import {
  computeHolidayPortrait,
  getDailyQuestion,
  holidayActivities,
  holidayIconMap,
  holidayMoods,
  holidayIcons,
  holidayPhrases,
  holidayQuestions,
  holidayRiddlePresets,
  romeToday,
} from "../shared/holidayPortrait.js";
import Avatar from "./Avatar.jsx";
import NameTag from "./NameTag.jsx";
import { Button, Field, Notice } from "./ui.jsx";

const skyPalettes = {
  choir_classics: {
    top: "#1b2845",
    bottom: "#3b1d38",
    accent: "#ffd166",
    snow: "#fff8e7",
    label: "Notte di Cori e Stelle",
  },
  jazz_fireplace: {
    top: "#2d1b19",
    bottom: "#4a251d",
    accent: "#f4a261",
    snow: "#f9e8d2",
    label: "Calore del Camino",
  },
  rock_jingle: {
    top: "#1d352e",
    bottom: "#4d1927",
    accent: "#ff6b6b",
    snow: "#fff5f5",
    label: "Festa Scintillante",
  },
  snow_silence: {
    top: "#0f2435",
    bottom: "#1e3f52",
    accent: "#90e0ef",
    snow: "#f0faff",
    label: "Silenzio Innevato",
  },
};

export function HolidaySpiritImage({
  name,
  nickname,
  quote,
  activity,
  spiritScene,
  topCharacter,
}) {
  const skyId = useId();
  const palette =
    skyPalettes[spiritScene?.soundtrack] || skyPalettes.jazz_fireplace;
  const icons = spiritScene?.icons?.length
    ? spiritScene.icons
    : ["🎄", "⭐", "🎁"];
  const label = (nickname || name || "Spirito di Natale").slice(0, 26);
  const shortQuote = (
    quote ||
    activity ||
    topCharacter?.tagline ||
    "Buone Feste sotto l’Albero"
  ).slice(0, 62);

  return (
    <div className="spirit-generated-card">
      <svg
        viewBox="0 0 420 230"
        className="spirit-generated-svg"
        role="img"
        aria-label={`Immagine dello spirito natalizio di ${label}`}
      >
        <defs>
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.top} />
            <stop offset="100%" stopColor={palette.bottom} />
          </linearGradient>
        </defs>
        <rect width="420" height="230" rx="14" fill={`url(#${skyId})`} />

        <path
          d="M0 55 Q110 20 220 55 T420 40"
          fill="none"
          stroke={palette.accent}
          strokeWidth="3"
          opacity="0.3"
        />
        <path
          d="M0 75 Q140 40 260 75 T420 65"
          fill="none"
          stroke={palette.snow}
          strokeWidth="1.5"
          opacity="0.22"
        />

        <circle cx="355" cy="48" r="22" fill={palette.accent} opacity="0.88" />
        <circle cx="364" cy="43" r="18" fill={palette.top} opacity="0.35" />
        <g fill={palette.snow} opacity="0.85">
          <circle cx="45" cy="32" r="2" />
          <circle cx="95" cy="24" r="1.6" />
          <circle cx="155" cy="38" r="2.2" />
          <circle cx="235" cy="26" r="1.8" />
          <circle cx="295" cy="35" r="2" />
          <circle cx="72" cy="68" r="1.5" />
          <circle cx="318" cy="74" r="1.5" />
        </g>

        <path
          d="M0 165 Q95 142 195 162 T420 152 L420 230 L0 230 Z"
          fill="#d9ebe9"
          opacity="0.18"
        />
        <path
          d="M0 182 Q130 164 250 180 T420 172 L420 230 L0 230 Z"
          fill="#0b1f1c"
          opacity="0.85"
        />

        <g fill="#234d3c" stroke={palette.accent} strokeWidth="0.8">
          <polygon points="48,112 24,168 72,168" />
          <polygon points="48,94 30,136 66,136" />
          <polygon points="366,118 344,170 388,170" />
          <polygon points="366,100 350,140 382,140" />
        </g>
        <polygon points="48,86 51,93 45,93" fill={palette.accent} />
        <polygon points="366,92 369,99 363,99" fill={palette.accent} />

        <circle
          cx="210"
          cy="106"
          r="46"
          fill="#0d231f"
          stroke={palette.accent}
          strokeWidth="2"
        />
        <circle
          cx="210"
          cy="106"
          r="40"
          fill="none"
          stroke={palette.snow}
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.6"
        />

        {icons.slice(0, 6).map((emoji, index) => {
          const positions = [
            [115, 78],
            [305, 78],
            [102, 130],
            [318, 130],
            [152, 52],
            [268, 52],
          ];
          const [x, y] = positions[index] || [210, 50];
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r="15"
                fill="#102822"
                stroke={palette.accent}
                strokeWidth="1.2"
              />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fontSize="15"
                aria-hidden="true"
              >
                {emoji}
              </text>
            </g>
          );
        })}

        <text x="210" y="102" textAnchor="middle" fontSize="28">
          {icons[0] || "🎄"}
        </text>
        <text
          x="210"
          y="124"
          textAnchor="middle"
          fill={palette.accent}
          fontSize="10.5"
          fontWeight="700"
        >
          {topCharacter ? `Spirito: ${topCharacter.name}` : palette.label}
        </text>

        <rect
          x="24"
          y="168"
          width="372"
          height="48"
          rx="9"
          fill="#0e241f"
          stroke={palette.accent}
          strokeWidth="1.2"
        />
        <text
          x="210"
          y="187"
          textAnchor="middle"
          fill="#fff8eb"
          fontSize="13"
          fontWeight="700"
        >
          {label} · {palette.label}
        </text>
        <text x="210" y="205" textAnchor="middle" fill="#d6ba7b" fontSize="11">
          “{shortQuote}”
        </text>
      </svg>
    </div>
  );
}

export function TasteRadarChart({ tastes = [] }) {
  if (!tastes.length) return null;
  const center = 110;
  const radius = 72;
  const angleFor = (index) =>
    -Math.PI / 2 + (index * 2 * Math.PI) / tastes.length;

  const polygonPoints = tastes
    .map((item, i) => {
      const r = (Math.max(15, item.value) / 100) * radius;
      const angle = angleFor(i);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="portrait-tastes">
      <div className="portrait-radar-wrap" aria-hidden="true">
        <svg viewBox="0 0 220 220" className="portrait-radar-svg">
          {[0.35, 0.68, 1].map((step) => (
            <polygon
              key={step}
              points={tastes
                .map((_, i) => {
                  const angle = angleFor(i);
                  const x = center + radius * step * Math.cos(angle);
                  const y = center + radius * step * Math.sin(angle);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none"
              stroke="rgba(214, 186, 123, 0.25)"
              strokeWidth="1"
            />
          ))}
          {tastes.map((_, i) => {
            const angle = angleFor(i);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={center + radius * Math.cos(angle)}
                y2={center + radius * Math.sin(angle)}
                stroke="rgba(214, 186, 123, 0.22)"
                strokeWidth="1"
              />
            );
          })}
          <polygon
            points={polygonPoints}
            fill="rgba(214, 186, 123, 0.28)"
            stroke="#d6ba7b"
            strokeWidth="2.2"
          />
          {tastes.map((item, i) => {
            const r = (Math.max(15, item.value) / 100) * radius;
            const angle = angleFor(i);
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            return <circle key={item.id} cx={x} cy={y} r="4" fill="#fff6e0" />;
          })}
        </svg>
      </div>
      <div className="portrait-taste-bars" role="list">
        {tastes.map((item) => (
          <div key={item.id} className="portrait-taste-row" role="listitem">
            <div className="portrait-taste-head">
              <span>{item.label}</span>
              <strong>{item.value}%</strong>
            </div>
            <div className="portrait-taste-track" aria-hidden="true">
              <div
                className="portrait-taste-fill"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MovieCharacterComparison({
  characterMatches = [],
  matchingExplanation,
}) {
  const visible = characterMatches.slice(0, 3);
  if (!visible.length) return null;
  return (
    <div className="portrait-characters">
      <div
        className="character-comparison-grid compact-characters"
        role="list"
        aria-label="I tuoi tre personaggi natalizi"
      >
        {visible.map((character, index) => (
          <div
            key={character.id}
            className={`character-comparison-item ${index === 0 ? "closest-character" : ""}`}
            role="listitem"
          >
            {character.image ? (
              <img
                src={character.image}
                alt=""
                width={46}
                height={46}
                loading="lazy"
                className="character-portrait-img"
              />
            ) : (
              <span className="character-symbol" aria-hidden="true">
                {character.symbol || "🎄"}
              </span>
            )}
            <div className="character-comparison-body">
              <div className="character-comparison-head">
                <strong>{character.name}</strong>
                <span>
                  {matchingExplanation?.provisional
                    ? "Provvisorio"
                    : `${character.affinity}%`}
                </span>
              </div>
              <small>{character.movie}</small>
              {index === 0 && (
                <p className="character-match-note">{character.tagline}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="profile-footnote affinity-note">
        Sono affinità indipendenti, non quote di un totale: le percentuali non
        devono sommare 100%.
      </p>
      {matchingExplanation && (
        <details className="portrait-matching-explanation">
          <summary>Come nasce l’associazione?</summary>
          <p>
            È un gioco di somiglianze, non un test della personalità. L’attività
            nel tool forma il ritratto; stato e domande facoltative lo affinano.
          </p>
          {matchingExplanation.provisional && (
            <p>
              È un punto di partenza: si aggiornerà con le attività e le scelte
              che vorrai fare.
            </p>
          )}
          <ul className="matching-weights">
            {matchingExplanation.weights?.map((source) => (
              <li key={source.id}>
                <span>{source.label}</span>
                <strong>
                  {source.available
                    ? `${source.effectiveWeight}%`
                    : "Non usata"}
                </strong>
              </li>
            ))}
          </ul>
          <p>
            Questi sono i pesi usati ora. Se una fonte manca, il suo peso viene
            distribuito fra quelle disponibili. Saltare una domanda o lo stato
            del giorno non dà penalità.
          </p>
          <p>
            Confrontiamo i cinque tratti con quelli di ogni personaggio.
            L’affinità parte da 100 e diminuisce con la distanza tra i tratti,
            poi viene arrotondata. Non è una probabilità né una misura
            psicologica.
          </p>
          {matchingExplanation.signals?.length > 0 && (
            <ul>
              {matchingExplanation.signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          )}
        </details>
      )}
    </div>
  );
}

const wizardSteps = [
  { id: "oggi", short: "Oggi", title: "Attività e frase" },
  { id: "icone", short: "Icone", title: "Messaggio a icone" },
  { id: "indovinello", short: "Indovinello", title: "Indovinello del giorno" },
  { id: "domande", short: "Domande", title: "Preferenze facoltative" },
  { id: "ritratto", short: "Ritratto", title: "Ritratto e personaggi" },
];

export function HolidayGuidedWizard({
  user,
  profile = {},
  value,
  onChange,
  onSave,
  onSkip,
  busy = false,
  mode = "profile",
  today = romeToday(),
  dailyCheckin = null,
  initialStep,
}) {
  const titleId = useId();
  const computed = computeHolidayPortrait(value, {
    name: profile.name || user?.name,
    nickname: profile.nickname || user?.nickname,
    badge: profile.badge || user?.badge,
    stampsCount: profile.stampsCount || 0,
    gamesPlayed: profile.gamesPlayed || 0,
    activity: profile.context?.activity || profile.activity,
    today,
  });

  const [step, setStep] = useState(() => {
    if (Number.isInteger(initialStep))
      return Math.max(0, Math.min(wizardSteps.length - 1, initialStep));
    if (mode === "daily") return 0;
    return computed.completeness >= 35 ? 4 : 0;
  });

  const dailyPlan = getDailyQuestion(today, value?.answers);
  const [questionIndex, setQuestionIndex] = useState(0);
  const currentQuestion =
    dailyPlan.ordered[questionIndex] || dailyPlan.featured;

  function setField(key, nextValue) {
    onChange({ ...value, [key]: nextValue });
  }

  function setAnswer(questionId, optionId) {
    onChange({
      ...value,
      answers: {
        ...(value?.answers || {}),
        [questionId]:
          value?.answers?.[questionId] === optionId ? undefined : optionId,
      },
    });
  }

  function toggleIcon(iconId) {
    const current = value?.iconMessage || [];
    if (current.includes(iconId)) {
      setField(
        "iconMessage",
        current.filter((id) => id !== iconId),
      );
    } else if (current.length < 6) {
      setField("iconMessage", [...current, iconId]);
    }
  }

  const stepDone = [
    Boolean(value?.activity?.trim() || value?.quote?.trim()),
    Boolean(value?.iconMessage?.length),
    Boolean(value?.riddle?.trim()),
    computed.answeredCount > 0,
    Boolean(value?.portraitApproved !== false && computed.completeness >= 20),
  ];

  const isDaily = mode === "daily";
  const currentStep = wizardSteps[step];

  return (
    <section
      className={
        isDaily
          ? "daily-checkin-banner"
          : "profile-panel holiday-portrait-panel"
      }
      aria-labelledby={titleId}
    >
      <div className="guided-header">
        <div className="guided-header-copy">
          <div className="guided-eyebrow-row">
            <span className="eyebrow">
              <Sparkles size={14} aria-hidden="true" />{" "}
              {isDaily
                ? "Momento di Natale · Una volta al giorno"
                : "Domande e dettagli facoltativi"}
            </span>
            <span className="guided-step-badge">
              Passaggio {step + 1} di {wizardSteps.length}
            </span>
          </div>
          <h2 id={titleId}>
            {isDaily
              ? `Bentornato ${profile.nickname || profile.name || user?.name || ""}! Racconta il tuo Natale di oggi`
              : "Personalizza il tuo Natale"}
          </h2>
          <p className="guided-subtitle">
            Scegli cosa raccontare: ogni passaggio è{" "}
            <strong>facoltativo</strong>. Le risposte aiutano a comporre il
            ritratto e i personaggi per gioco. Puoi aggiungerne altre quando
            vuoi.
          </p>
        </div>
        {isDaily && onSkip ? (
          <Button
            type="button"
            variant="ghost"
            className="guided-ignore-btn"
            disabled={busy}
            onClick={onSkip}
          >
            Ignora per oggi
          </Button>
        ) : null}
      </div>

      <nav className="guided-stepper" aria-label="Passaggi guidati">
        {wizardSteps.map((item, idx) => {
          const active = idx === step;
          return (
            <button
              key={item.id}
              type="button"
              className={`guided-step-pill ${active ? "active" : ""} ${stepDone[idx] ? "done" : ""}`}
              aria-current={active ? "step" : undefined}
              disabled={busy}
              onClick={() => setStep(idx)}
            >
              <span className="guided-step-num">
                {stepDone[idx] && !active ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  idx + 1
                )}
              </span>
              <span className="guided-step-label">{item.short}</span>
            </button>
          );
        })}
      </nav>

      <div className="guided-step-body">
        {currentStep.id === "oggi" ? (
          <div className="guided-pane">
            <h3>
              Passo 1 · Cosa stai combinando per le feste?{" "}
              <small>(facoltativo)</small>
            </h3>
            <p className="guided-hint">
              Scegli un’idea pronta o scrivi un pensiero personale per il tuo
              gruppo.
            </p>
            <div className="form-grid">
              <div>
                <Field
                  label="Attività natalizia in corso"
                  name="holidayActivity"
                  maxLength={120}
                  placeholder="Es. Sto impacchettando i regali…"
                  value={value?.activity || ""}
                  onChange={(event) => setField("activity", event.target.value)}
                />
                <div
                  className="chip-suggestions"
                  aria-label="Idee per l’attività in corso"
                >
                  {holidayActivities.slice(0, 4).map((act) => (
                    <button
                      key={act}
                      type="button"
                      className="suggestion-chip"
                      aria-pressed={value?.activity === act}
                      disabled={busy}
                      onClick={() => setField("activity", act)}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Field
                  label="Frase o motto natalizio del momento"
                  name="holidayQuote"
                  maxLength={160}
                  placeholder="Es. Anche il Grinch aveva solo bisogno della compagnia giusta…"
                  value={value?.quote || ""}
                  onChange={(event) => setField("quote", event.target.value)}
                />
                <div
                  className="chip-suggestions"
                  aria-label="Idee per la frase natalizia"
                >
                  {holidayPhrases.slice(0, 3).map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      className="suggestion-chip"
                      aria-pressed={value?.quote === phrase}
                      disabled={busy}
                      onClick={() => setField("quote", phrase)}
                    >
                      “{phrase.slice(0, 38)}…”
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {currentStep.id === "icone" ? (
          <div className="guided-pane">
            <h3>
              Passo 2 · Invia un messaggio via icone natalizie{" "}
              <small>(facoltativo)</small>
            </h3>
            <p className="guided-hint">
              Scegli fino a 6 icone per comporre il tuo messaggio o rebus di
              Natale visibile nel gruppo.
            </p>
            <div
              className="icon-message-picker"
              role="group"
              aria-label="Scegli le icone del tuo messaggio"
            >
              {holidayIcons.map(({ id, emoji, label }) => {
                const selected = (value?.iconMessage || []).includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className="icon-Variables-btn"
                    aria-pressed={selected}
                    aria-label={`${label} (${emoji})`}
                    disabled={busy}
                    onClick={() => toggleIcon(id)}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    <small>{label}</small>
                  </button>
                );
              })}
            </div>
            {(value?.iconMessage || []).length > 0 ? (
              <div className="icon-message-preview-bar">
                <span>Il tuo messaggio:</span>
                <strong className="icon-sequence-display">
                  {value.iconMessage
                    .map((id) => holidayIconMap.get(id)?.emoji)
                    .join(" ")}
                </strong>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => setField("iconMessage", [])}
                >
                  Svuota icone
                </button>
              </div>
            ) : null}
            <Field
              label="Traduzione o indizio del messaggio a icone (facoltativo)"
              name="iconCaption"
              maxLength={120}
              placeholder="Es. Serata perfetta: albero acceso, cioccolata e film!"
              value={value?.iconCaption || ""}
              onChange={(event) => setField("iconCaption", event.target.value)}
            />
          </div>
        ) : null}

        {currentStep.id === "indovinello" ? (
          <div className="guided-pane">
            <h3>
              Passo 3 · Lascia un indovinello del giorno{" "}
              <small>(facoltativo)</small>
            </h3>
            <p className="guided-hint">
              I membri del gruppo potranno provare a indovinare e riceverai una
              notifica via email o Telegram (se attivati nel profilo).
            </p>
            <div
              className="chip-suggestions"
              aria-label="Indovinelli natalizi pronti"
            >
              {holidayRiddlePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="suggestion-chip"
                  aria-pressed={value?.riddle === preset.riddle}
                  disabled={busy}
                  onClick={() =>
                    onChange({
                      ...value,
                      riddle: preset.riddle,
                      riddleHint: preset.hint,
                      riddleAnswer: preset.answer,
                    })
                  }
                >
                  Usa: {preset.title}
                </button>
              ))}
            </div>
            <Field
              label="Il tuo indovinello natalizio"
              name="dailyRiddle"
              maxLength={240}
              placeholder="Scrivi un indovinello per i tuoi compagni di gruppo…"
              value={value?.riddle || ""}
              onChange={(event) => setField("riddle", event.target.value)}
            />
            <div className="form-grid">
              <Field
                label="Piccolo aiuto (facoltativo)"
                name="dailyRiddleHint"
                maxLength={160}
                placeholder="Es. Si appende ai rami dell’albero…"
                value={value?.riddleHint || ""}
                onChange={(event) => setField("riddleHint", event.target.value)}
              />
              <Field
                label="Soluzione segreta (per verificare chi indovina)"
                name="dailyRiddleAnswer"
                maxLength={120}
                placeholder="Es. bastoncino di zucchero"
                value={value?.riddleAnswer || ""}
                onChange={(event) =>
                  setField("riddleAnswer", event.target.value)
                }
                hint="Resta segreta: serve al sistema per verificare le risposte."
              />
            </div>
          </div>
        ) : null}

        {currentStep.id === "domande" ? (
          <div className="guided-pane">
            <h3>
              Passo 4 · Domanda del giorno e gusti delle feste{" "}
              <small>
                ({computed.answeredCount} di {holidayQuestions.length} risposte)
              </small>
            </h3>
            <p className="guided-hint">
              Rispondi alla domanda di oggi e, se ti va, scorri le altre per
              rendere precisi grafico e personaggio dei film.
            </p>

            <div
              className="guided-question-tabs"
              role="tablist"
              aria-label="Domande sulle preferenze natalizie"
            >
              {dailyPlan.ordered.map((q, idx) => {
                const answered = Boolean(value?.answers?.[q.id]);
                const active = idx === questionIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`guided-q-tab ${active ? "active" : ""} ${answered ? "answered" : ""}`}
                    disabled={busy}
                    onClick={() => setQuestionIndex(idx)}
                  >
                    {idx === 0 ? "✨ Oggi: " : `${idx + 1}. `}
                    {q.shortLabel}
                    {answered ? " ✓" : ""}
                  </button>
                );
              })}
            </div>

            <fieldset className="holiday-question-box">
              <legend>
                {questionIndex === 0 ? "✨ Domanda del giorno · " : ""}
                {currentQuestion.title}
              </legend>
              <div className="holiday-question-options">
                {currentQuestion.options.map((opt) => {
                  const selected =
                    value?.answers?.[currentQuestion.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className="holiday-choice-btn"
                      aria-pressed={selected}
                      disabled={busy}
                      onClick={() => setAnswer(currentQuestion.id, opt.id)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="guided-q-nav">
                <span className="quiet">
                  Domanda {questionIndex + 1} di {dailyPlan.ordered.length}
                </span>
                <div className="button-row">
                  {questionIndex > 0 ? (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setQuestionIndex((i) => i - 1)}
                    >
                      ← Domanda precedente
                    </button>
                  ) : null}
                  {questionIndex < dailyPlan.ordered.length - 1 ? (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setQuestionIndex((i) => i + 1)}
                    >
                      Prossima domanda →
                    </button>
                  ) : null}
                </div>
              </div>
            </fieldset>
          </div>
        ) : null}

        {currentStep.id === "ritratto" ? (
          <div className="guided-pane">
            <div className="profile-badge-header">
              <div>
                <h3>Passo 5 · Il tuo Ritratto di Natale</h3>
                <p className="guided-hint">
                  Combina le tue risposte, l’attività, i timbri e i giochi. Puoi
                  modificare il testo e scegliere se mostrarlo al gruppo.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  setField("customDescription", computed.generatedDescription)
                }
              >
                <RefreshCw size={15} aria-hidden="true" />
                Rigenera dalle mie scelte
              </Button>
            </div>

            <div className="guided-confidence-bar">
              <div>
                <strong>
                  Le tue scelte aiutano a personalizzare il ritratto
                </strong>
              </div>
            </div>

            <Field
              label="Descrizione della persona (modificabile)"
              hint="Lascia invariato o riscrivi come preferisci presentarti al gruppo."
            >
              <textarea
                rows={3}
                maxLength={1200}
                value={
                  value?.customDescription ||
                  computed.generatedDescription ||
                  ""
                }
                onChange={(event) =>
                  setField("customDescription", event.target.value)
                }
              />
            </Field>

            <label className="profile-toggle">
              <input
                type="checkbox"
                checked={value?.portraitApproved !== false}
                disabled={busy}
                onChange={(event) =>
                  setField("portraitApproved", event.target.checked)
                }
              />
              <span>
                Approva e rendi visibile il ritratto natalizio (testo, immagine,
                grafico e personaggi) ai miei gruppi
              </span>
            </label>

            <HolidaySpiritImage
              name={profile.name || user?.name}
              nickname={profile.nickname || user?.nickname}
              quote={value?.quote}
              activity={value?.activity}
              spiritScene={computed.spiritScene}
              topCharacter={computed.topCharacter}
            />

            <h4>Grafico tendenze e spirito delle feste</h4>
            <TasteRadarChart tastes={computed.tastes} />

            <h4>A quale personaggio dei film di Natale ti avvicini?</h4>
            <MovieCharacterComparison
              characterMatches={computed.characterMatches}
              matchingExplanation={computed.matchingExplanation}
            />
          </div>
        ) : null}
      </div>

      <div className="guided-footer">
        <div className="button-row">
          {step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Indietro
            </Button>
          ) : null}
          {step < wizardSteps.length - 1 ? (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => setStep((s) => s + 1)}
            >
              Salta questo passo
            </button>
          ) : null}
        </div>

        <div className="button-row">
          {step < wizardSteps.length - 1 ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => setStep((s) => s + 1)}
            >
              Continua
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" busy={busy} disabled={busy} onClick={onSave}>
              <Check size={16} aria-hidden="true" />
              {isDaily
                ? "Approva e salva per oggi"
                : "Salva spirito di Natale e ritratto"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export const HolidayPortraitEditor = HolidayGuidedWizard;

const quickReactions = [
  { icon: "tree", text: "Adoro il tuo spirito natalizio! 🎄" },
  { icon: "cookie", text: "Un biscotto speziato virtuale per te! 🍪" },
  { icon: "star", text: "Bella scelta per le feste! ⭐" },
];

export function GroupMemberPortraitCard({
  member,
  currentUserId,
  interactions = [],
  onInteract,
}) {
  const [guess, setGuess] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteIcon, setNoteIcon] = useState("tree");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const status = member.holidayStatus || {};
  const mood = holidayMoods.find((item) => item.id === status.dailyMood?.id);
  const portrait = member.portrait;
  const isMe = member.userId === currentUserId;
  const memberInteractions = interactions.filter(
    (item) => item.receiverId === member.userId,
  );

  async function submitInteraction(kind, payload) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const res = await onInteract({
        targetUserId: member.userId,
        kind,
        ...payload,
      });
      if (kind === "riddle_guess") {
        setGuess("");
        setFeedback(
          res.correct
            ? "🎉 Risposta esatta! Hai indovinato l’indovinello del giorno!"
            : res.hasAnswer
              ? "Risposta inviata! Non è la parola esatta, ma il tuo tentativo è stato notificato."
              : "La tua risposta all’indovinello è stata inviata!",
        );
      } else {
        setNoteText("");
        setFeedback("🎄 Pensiero natalizio inviato!");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="member-portrait-modal-content">
      {mood && (
        <p className="member-status-pill">
          <span aria-hidden="true">{mood.emoji} </span>
          {status.dailyMood.date === romeToday()
            ? "Oggi mi sento come"
            : "Ultimo stato"}{" "}
          {mood.label}
        </p>
      )}
      <div className="member-portrait-header">
        <Avatar
          userId={member.userId}
          name={member.name}
          avatar={member.avatar}
          size={58}
        />
        <div>
          <div className="guest-identity">
            <h3>{member.name}</h3>
            {member.badge ? (
              <NameTag
                badge={member.badge}
                name={member.name}
                nickname={member.nickname}
                badgeText={member.badgeText}
                size="md"
              />
            ) : member.nickname ? (
              <span className="profile-handle">@{member.nickname}</span>
            ) : null}
          </div>
          {status.activity ? (
            <p className="member-status-pill">
              <strong>In corso:</strong> {status.activity}
            </p>
          ) : null}
          {status.quote ? (
            <p className="member-quote-line">“{status.quote}”</p>
          ) : null}
        </div>
      </div>

      {status.iconMessage?.length ? (
        <div className="member-icon-message-box">
          <span className="eyebrow">Messaggio via icone</span>
          <div className="icon-sequence-display">
            {status.iconMessage
              .map((id) => holidayIconMap.get(id)?.emoji || "🎄")
              .join(" ")}
          </div>
          {status.iconCaption ? <p>{status.iconCaption}</p> : null}
        </div>
      ) : null}

      {Object.keys(status.answers || {}).length > 0 ? (
        <div className="member-daily-answers">
          <span className="eyebrow">Scelte e Domande del giorno</span>
          <dl className="member-answers-grid">
            {holidayQuestions.map((q) => {
              const chosen = q.options.find(
                (opt) => opt.id === status.answers?.[q.id],
              );
              if (!chosen) return null;
              return (
                <div key={q.id}>
                  <dt>{q.shortLabel}</dt>
                  <dd>{chosen.label}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      ) : null}

      {status.riddle ? (
        <div className="member-riddle-box">
          <span className="eyebrow">Indovinello del giorno</span>
          <p className="riddle-question-text">{status.riddle}</p>
          {status.riddleHint ? (
            <div>
              <button
                type="button"
                className="text-button"
                onClick={() => setShowHint(!showHint)}
              >
                <HelpCircle size={15} aria-hidden="true" />
                {showHint ? "Nascondi indizio" : "Mostra un indizio"}
              </button>
              {showHint ? (
                <p className="profile-footnote">{status.riddleHint}</p>
              ) : null}
            </div>
          ) : null}
          {!isMe ? (
            <form
              className="riddle-guess-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (guess.trim()) {
                  submitInteraction("riddle_guess", { message: guess.trim() });
                }
              }}
            >
              <Field label="Prova a indovinare (notifica chi l’ha scritto)">
                <input
                  type="text"
                  maxLength={120}
                  required
                  placeholder="Scrivi la tua soluzione…"
                  value={guess}
                  disabled={busy}
                  onChange={(event) => setGuess(event.target.value)}
                />
              </Field>
              <Button type="submit" busy={busy} disabled={!guess.trim()}>
                <Send size={15} aria-hidden="true" /> Invia risposta
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {portrait ? (
        <>
          <div className="member-portrait-description">
            <div className="profile-badge-header">
              <span className="eyebrow">Ritratto di Natale</span>
              {portrait.matchingExplanation?.provisional && (
                <span className="quiet">
                  Un primo ritratto, ancora in aggiornamento
                </span>
              )}
            </div>
            <p>{portrait.finalDescription}</p>
          </div>

          <HolidaySpiritImage
            name={member.name}
            nickname={member.nickname}
            quote={status.quote}
            activity={status.activity}
            spiritScene={portrait.spiritScene}
            topCharacter={portrait.topCharacter}
          />

          <h4>Tendenze e gusti natalizi</h4>
          <TasteRadarChart tastes={portrait.tastes} />

          <h4>Somiglianza con i personaggi dei film di Natale</h4>
          <MovieCharacterComparison
            characterMatches={portrait.characterMatches}
            matchingExplanation={portrait.matchingExplanation}
          />
        </>
      ) : (
        <p className="quiet">
          Questa persona non ha ancora pubblicato il ritratto completo nel
          profilo.
        </p>
      )}

      {!isMe ? (
        <div className="member-send-note-box">
          <h4>
            <MessageSquareHeart size={18} aria-hidden="true" /> Manda un
            messaggio natalizio con icona
          </h4>
          <p className="profile-footnote">
            Scegli un’icona e lascia un saluto o un indizio: se ha attivato gli
            avvisi, riceverà una notifica via email o Telegram.
          </p>
          <div className="chip-suggestions">
            {quickReactions.map((r) => (
              <button
                key={r.text}
                type="button"
                className="suggestion-chip"
                disabled={busy}
                onClick={() => {
                  setNoteIcon(r.icon);
                  setNoteText(r.text);
                }}
              >
                {r.text}
              </button>
            ))}
          </div>
          <form
            className="icon-note-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (noteText.trim()) {
                submitInteraction("icon_note", {
                  icon: noteIcon,
                  message: noteText.trim(),
                });
              }
            }}
          >
            <div className="form-grid">
              <Field label="Icona natalizia">
                <select
                  value={noteIcon}
                  disabled={busy}
                  onChange={(event) => setNoteIcon(event.target.value)}
                >
                  {holidayIcons.map(({ id, emoji, label }) => (
                    <option key={id} value={id}>
                      {emoji} {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Il tuo messaggio o commento">
                <input
                  type="text"
                  maxLength={200}
                  required
                  placeholder="Es. Bellissimo il maglione con la renna!"
                  value={noteText}
                  disabled={busy}
                  onChange={(event) => setNoteText(event.target.value)}
                />
              </Field>
            </div>
            <Button type="submit" variant="outline" busy={busy}>
              <Send size={15} aria-hidden="true" /> Invia al compagno di gruppo
            </Button>
          </form>
        </div>
      ) : null}

      <Notice error>{error}</Notice>
      <Notice>{feedback}</Notice>

      {memberInteractions.length > 0 ? (
        <div className="member-interactions-feed">
          <h4>Risposte agli indovinelli e pensieri ricevuti</h4>
          <ul className="member-interactions-list">
            {memberInteractions.slice(0, 8).map((item) => (
              <li key={item.id}>
                <span>
                  {item.kind === "riddle_guess"
                    ? item.correct
                      ? "🎉"
                      : "🧩"
                    : holidayIconMap.get(item.icon)?.emoji || "🎄"}{" "}
                  <strong>{item.senderNickname || item.senderName}:</strong>{" "}
                  {item.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

import { t } from "./i18n.js";
import { useId, useState, useEffect, useRef } from "react";
import {
  Gift,
  TreePine,
  Star,
  ArrowRight,
  RotateCcw,
  Mail,
  ExternalLink,
} from "lucide-react";
import { date } from "./api.js";
import { Button, Notice } from "./ui.jsx";
import DrawExplanation from "./DrawExplanation.jsx";
import NameTag from "./NameTag.jsx";
import { hasAmazonAffiliateTag } from "../shared/amazonLinks.js";
import "./amazon-wishlist.css";
import "./reveal.css";

const ceremonyDuration = 3400;
// Retain only the acknowledgement, never the recipient or their private wishes.
const openedLetters = new Set();
function readLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Browser storage can be unavailable; the in-memory acknowledgement remains.
  }
}
function hasOpened(key) {
  return !!key && (openedLetters.has(key) || readLocal(key) === "1");
}
const snow = Array.from({ length: 32 }, (_, i) => ({
  "--x": `${5 + ((i * 31 + 9) % 90)}%`,
  "--y": `${39 + ((i * 23) % 58)}%`,
  "--size": `${2 + (i % 4)}px`,
  "--drift": `${((i * 17) % 91) - 45}px`,
  "--delay": `${(i % 9) * 53}ms`,
}));
export default function Reveal({
  openRecipient,
  drawAt,
  status,
  isMember,
  eventId,
  userId,
}) {
  // eventId includes the current draw version, supplied by Event.
  const acknowledgementKey = userId
    ? `sla-reveal-open:${JSON.stringify([userId, eventId])}`
    : null;
  const available = isMember && ["drawn", "archived"].includes(status);
  const [phase, setPhase] = useState(() =>
      available && hasOpened(acknowledgementKey) ? "restoring" : "sealed",
    ),
    [recipient, setRecipient] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [wishes, setWishes] = useState(false),
    [now, setNow] = useState(Date.now()),
    [step, setStep] = useState(
      () => readLocal(`sla-gift-${eventId}`) || "idea",
    );
  const requestInProgress = useRef(false);
  const currentScope = useRef(null);
  currentScope.current = available ? acknowledgementKey : null;
  const resultHeading = useRef(null);
  const wishesHeading = useRef(null);
  const sealButton = useRef(null);
  useEffect(() => {
    if (wishes) wishesHeading.current?.focus();
  }, [wishes]);
  useEffect(() => {
    if (phase !== "opening") return;
    const t = setTimeout(() => setPhase("open"), ceremonyDuration);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== "open" || !recipient || !available) return;
    resultHeading.current?.focus({ preventScroll: true });
    if (acknowledgementKey) {
      openedLetters.add(acknowledgementKey);
      writeLocal(acknowledgementKey, "1");
    }
  }, [phase, recipient, available, acknowledgementKey]);
  useEffect(() => {
    if (!available) {
      setRecipient(null);
      setWishes(false);
      setPhase("sealed");
    } else if (phase === "restoring") {
      openLetter(false);
    }
  }, [available, phase]);
  useEffect(() => {
    if (recipient || document.visibilityState === "hidden") return;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [recipient]);
  if (!isMember)
    return (
      <div className="empty-state">
        <Gift />
        <h2>{t("Estrazione riservata ai partecipanti")}</h2>
        <p>
          {t(
            "Se organizzi lo scambio senza partecipare, trovi gli abbinamenti in Organizza.",
          )}
        </p>
      </div>
    );
  if (!["drawn", "archived"].includes(status)) {
    const left = Math.max(0, new Date(drawAt) - now);
    const days = Math.floor(left / 86400000),
      hours = Math.floor((left % 86400000) / 3600000);
    return (
      <div className="waiting">
        <span className="waiting-tree">
          <TreePine size={54} />
        </span>
        <h2>{t("I nomi non sono ancora usciti.")}</h2>
        <p>
          {status === "archived"
            ? t("Questo evento è stato archiviato.")
            : status === "cancelled"
              ? t(
                  "Chi organizza ha annullato l’estrazione. Torna qui per quella nuova.",
                )
              : t("L’estrazione è prevista per il {date}.", {
                  date: date(drawAt),
                })}
        </p>
        {left > 0 ? (
          <div className="countdown">
            <span>
              <strong>{days}</strong>
              {days === 1 ? t("giorno") : t("giorni")}
            </span>
            <i>:</i>
            <span>
              <strong>{hours}</strong>
              {hours === 1 ? t("ora") : t("ore")}
            </span>
          </div>
        ) : (
          <p className="quiet">
            {t(
              "L’estrazione è ancora in attesa. Chi organizza può controllare lo stato del gruppo.",
            )}
          </p>
        )}
        <DrawExplanation />
      </div>
    );
  }
  async function openLetter(animate) {
    if (requestInProgress.current) return;
    const requestedScope = currentScope.current;
    requestInProgress.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await openRecipient();
      if (currentScope.current !== requestedScope) return;
      setRecipient(result);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setPhase(animate && !reduced ? "opening" : "open");
    } catch (error) {
      setError(error.message);
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  }
  return (
    <section className="reveal">
      <div
        className={`reveal-stage ${phase}`}
        style={{ "--ceremony-duration": `${ceremonyDuration}ms` }}
      >
        <div className="ceremony-snow" aria-hidden="true">
          {snow.map((style, i) => (
            <span key={i} style={style} />
          ))}
        </div>
        {phase === "restoring" ? (
          <div className="recipient-letter paper">
            <p role="status">{t("Sto cercando la tua lettera…")}</p>
            <Notice error>{error}</Notice>
            {error && (
              <Button busy={loading} onClick={() => openLetter(false)}>
                {t("Riprova")}
              </Button>
            )}
          </div>
        ) : phase !== "open" ? (
          <>
            <span className="eyebrow">{t("L’estrazione è pronta")}</span>
            <h2>{t("Il nome è nella busta.")}</h2>
            <p>{t("Rompi il sigillo e scopri a chi farai il regalo.")}</p>
            <button
              className="sealed-letter"
              ref={sealButton}
              onClick={() => {
                if (phase === "sealed") openLetter(true);
              }}
              aria-disabled={loading || phase === "opening"}
              aria-label={t("Apri il sigillo e scopri il destinatario")}
            >
              <span className="ceremony-envelope" aria-hidden="true">
                <span className="envelope-back" />
                <span className="envelope-flap envelope-flap-back" />
                <span className="envelope-card">
                  <Star size={24} />
                </span>
                <span className="envelope-pocket" />
                <span className="envelope-flap envelope-flap-front" />
                <span className="wax-seal wax-left">
                  <TreePine size={29} />
                </span>
                <span className="wax-seal wax-right">
                  <TreePine size={29} />
                </span>
              </span>
            </button>
            <p className="seal-caption" role="status">
              {loading
                ? t("Sto cercando la tua lettera…")
                : phase === "opening"
                  ? t("La lettera si sta aprendo…")
                  : t("Tocca il sigillo.")}
            </p>
            <button
              className="text-button"
              disabled={loading}
              onClick={() =>
                phase === "opening" ? setPhase("open") : openLetter(false)
              }
            >
              {t("Mostra subito il nome")}
              <ArrowRight size={15} />
            </button>
            <Notice error>{error}</Notice>
          </>
        ) : (
          <div className="recipient-letter paper">
            <span className="eyebrow">{t("Il tuo regalo è per")}</span>
            <h2 ref={resultHeading} tabIndex={-1}>
              {recipient.name}
            </h2>
            {recipient.badge ? (
              <div className="recipient-tag">
                <NameTag
                  badge={recipient.badge}
                  name={recipient.name}
                  nickname={recipient.nickname}
                  badgeText={recipient.badgeText}
                  size="md"
                />
              </div>
            ) : recipient.nickname ? (
              <p className="quiet">@{recipient.nickname}</p>
            ) : null}
            <Star size={26} className="recipient-star" />
            <p>{t("Scegli il regalo con cura e tieni il nome per te.")}</p>
            <Button
              aria-expanded={wishes}
              onClick={() => {
                if (wishes) wishesHeading.current?.focus();
                else setWishes(true);
              }}
            >
              <Mail size={17} />
              {t("Leggi i suoi desideri")}
            </Button>
            <button
              className="text-button"
              onClick={() => {
                setWishes(false);
                setRecipient(null);
                setPhase("sealed");
                requestAnimationFrame(() => sealButton.current?.focus());
              }}
            >
              <RotateCcw size={14} />
              {t("Riapri la lettera")}
            </button>
          </div>
        )}
      </div>
      {phase === "open" && wishes ? (
        <div className="recipient-wishes">
          <div className="section-title">
            <h2 tabIndex={-1} ref={wishesHeading}>
              {t("I desideri di {name}", { name: recipient.name })}
            </h2>
            <span />
          </div>
          {recipient.wishlist?.length ? (
            recipient.wishlist.map((item, i) => (
              <Wish key={item.id || i} item={item} />
            ))
          ) : (
            <div className="empty-state">
              <Mail />
              <p>
                {t(
                  "La lettera è ancora vuota. Intanto puoi pensare a un regalo partendo da quello che sai di questa persona.",
                )}
              </p>
            </div>
          )}
          <div className="gift-progress">
            <h3>{t("A che punto sei?")}</h3>
            <p>{t("Il promemoria resta su questo dispositivo.")}</p>
            <div className="button-row">
              {[
                ["idea", t("Ci sto pensando")],
                ["bought", t("Regalo trovato")],
                ["wrapped", t("Incartato!")],
              ].map(([v, t]) => (
                <button
                  key={v}
                  className={`button ${step === v ? "" : "outline"}`}
                  onClick={() => {
                    setStep(v);
                    writeLocal(`sla-gift-${eventId}`, v);
                  }}
                  aria-pressed={step === v}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <DrawExplanation />
    </section>
  );
}
export function Wish({ item }) {
  const hintId = useId();
  const answerId = useId();
  const [help, setHelp] = useState(false),
    [answer, setAnswer] = useState(false);
  const affiliate = hasAmazonAffiliateTag(item.url);
  const siteAffiliate =
    affiliate && (item.siteAffiliate === true || item.affiliate === true);
  return (
    <article className="recipient-wish paper">
      <span className="eyebrow">
        {{
          object: t("Un desiderio"),
          theme: t("Un interesse"),
          preference: t("Una preferenza"),
          avoid: t("Meglio di no"),
          hint: t("Un indizio"),
          riddle: t("Prova a indovinare"),
        }[item.type] || t("Un desiderio")}
      </span>
      <h3>{item.title}</h3>
      {item.description ? <p>{item.description}</p> : null}
      {item.fulfillment === "pickup" && item.pickupCity ? (
        <p className="wish-pickup-label">
          <strong>{t("Ritiro a {city}", { city: item.pickupCity })}</strong>
          <br />
          <small>
            {t("Verifica negozio, disponibilità e modalità del ritiro.")}
          </small>
        </p>
      ) : null}
      {item.url && /^https?:\/\//i.test(item.url) ? (
        <a
          className="wish-link"
          href={item.url}
          target="_blank"
          data-amazon-affiliate={
            affiliate ? (siteAffiliate ? "site" : "external") : undefined
          }
          aria-describedby={
            affiliate
              ? siteAffiliate
                ? "amazon-site-information"
                : "amazon-external-information"
              : undefined
          }
          rel={
            siteAffiliate
              ? "sponsored noopener"
              : affiliate
                ? "sponsored noopener noreferrer"
                : "noopener noreferrer"
          }
          referrerPolicy={siteAffiliate ? "origin" : undefined}
        >
          {t(affiliate ? "Apri su Amazon" : "Dai un’occhiata")}
          <ExternalLink size={14} />
        </a>
      ) : null}
      {item.hint ? (
        <>
          <button
            type="button"
            className="text-button"
            aria-expanded={help}
            aria-controls={help ? hintId : undefined}
            onClick={() => setHelp(!help)}
          >
            {help ? t("Nascondi l’aiuto") : t("Mi dai un aiuto?")}
          </button>
          {help ? (
            <p id={hintId} className="hint-text">
              {item.hint}
            </p>
          ) : null}
        </>
      ) : null}
      {item.answer ? (
        <>
          <button
            type="button"
            className="text-button"
            aria-expanded={answer}
            aria-controls={answer ? answerId : undefined}
            onClick={() => setAnswer(!answer)}
          >
            {answer ? t("Nascondi la soluzione") : t("Leggi la soluzione")}
          </button>
          {answer ? (
            <p id={answerId} className="hint-text">
              {item.answer}
            </p>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

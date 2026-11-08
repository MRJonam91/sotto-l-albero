import { useState, useEffect } from "react";
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
import { Button } from "./ui.jsx";
export default function Reveal({
  recipient,
  drawAt,
  status,
  isMember,
  eventId,
}) {
  const [phase, setPhase] = useState("sealed"),
    [wishes, setWishes] = useState(false),
    [now, setNow] = useState(Date.now()),
    [step, setStep] = useState(
      () => localStorage.getItem(`sla-gift-${eventId}`) || "idea",
    );
  useEffect(() => {
    if (phase !== "opening") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const t = setTimeout(() => setPhase("open"), reduced ? 100 : 4200);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (recipient || document.visibilityState === "hidden") return;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [recipient]);
  if (!isMember)
    return (
      <div className="empty-state">
        <Gift />
        <h2>Estrazione riservata ai partecipanti</h2>
        <p>
          Se organizzi lo scambio senza partecipare, trovi gli abbinamenti in
          Organizza.
        </p>
      </div>
    );
  if (!recipient) {
    const left = Math.max(0, new Date(drawAt) - now);
    const days = Math.floor(left / 86400000),
      hours = Math.floor((left % 86400000) / 3600000);
    return (
      <div className="waiting">
        <span className="waiting-tree">
          <TreePine size={54} />
        </span>
        <h2>I nomi non sono ancora usciti.</h2>
        <p>
          {status === "archived"
            ? "Questo evento è stato archiviato."
            : status === "cancelled"
              ? "Chi organizza ha annullato l’estrazione. Torna qui per quella nuova."
              : `L’estrazione è prevista per il ${date(drawAt)}.`}
        </p>
        {left > 0 ? (
          <div className="countdown">
            <span>
              <strong>{days}</strong>giorni
            </span>
            <i>:</i>
            <span>
              <strong>{hours}</strong>ore
            </span>
          </div>
        ) : (
          <p className="quiet">
            L’estrazione è ancora in attesa. Chi organizza può controllare lo
            stato del gruppo.
          </p>
        )}
      </div>
    );
  }
  return (
    <section className="reveal">
      <div className={`reveal-stage ${phase}`}>
        <div className="reveal-stars" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ "--i": i }}>
              ✧
            </span>
          ))}
        </div>
        {phase !== "open" ? (
          <>
            <span className="eyebrow">La tua lettera è arrivata</span>
            <h2>Il nome è nella busta.</h2>
            <p>Aprila per scoprire a chi farai il regalo.</p>
            <button
              className="sealed-letter"
              onClick={() => setPhase("opening")}
              disabled={phase === "opening"}
              aria-label="Apri il sigillo e scopri il destinatario"
            >
              <span className="envelope-fold" />
              <span className="wax-seal">
                <TreePine size={30} />
              </span>
            </button>
            {phase === "sealed" ? (
              <p className="seal-caption">Tocca il sigillo.</p>
            ) : (
              <p className="seal-caption" role="status">
                La lettera si sta aprendo…
              </p>
            )}
            <button className="text-button" onClick={() => setPhase("open")}>
              Mostra subito il nome
              <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <div className="recipient-letter paper">
            <span className="eyebrow">Il tuo regalo è per</span>
            <h2>{recipient.name}</h2>
            <Star size={26} className="recipient-star" />
            <p>Scegli il regalo con cura e tieni il nome per te.</p>
            <Button onClick={() => setWishes(true)}>
              <Mail size={17} />
              Leggi i suoi desideri
            </Button>
            <button
              className="text-button"
              onClick={() => {
                setWishes(false);
                setPhase("sealed");
              }}
            >
              <RotateCcw size={14} />
              Riapri la lettera
            </button>
          </div>
        )}
      </div>
      {phase === "open" && wishes ? (
        <div className="recipient-wishes">
          <div className="section-title">
            <h2>I desideri di {recipient.name}</h2>
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
                La lettera è ancora vuota. Intanto puoi pensare a un regalo
                partendo da quello che sai di questa persona.
              </p>
            </div>
          )}
          <div className="gift-progress">
            <h3>A che punto sei?</h3>
            <p>Il promemoria resta su questo dispositivo.</p>
            <div className="button-row">
              {[
                ["idea", "Ci sto pensando"],
                ["bought", "Regalo trovato"],
                ["wrapped", "Incartato!"],
              ].map(([v, t]) => (
                <button
                  key={v}
                  className={`button ${step === v ? "" : "outline"}`}
                  onClick={() => {
                    setStep(v);
                    localStorage.setItem(`sla-gift-${eventId}`, v);
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
    </section>
  );
}
function Wish({ item }) {
  const [help, setHelp] = useState(false),
    [answer, setAnswer] = useState(false);
  return (
    <article className="recipient-wish paper">
      <span className="eyebrow">
        {{
          object: "Un desiderio",
          theme: "Un interesse",
          preference: "Una preferenza",
          avoid: "Meglio di no",
          hint: "Un indizio",
          riddle: "Prova a indovinare",
        }[item.type] || "Un desiderio"}
      </span>
      <h3>{item.title}</h3>
      {item.description ? <p>{item.description}</p> : null}
      {item.url && /^https?:\/\//i.test(item.url) ? (
        <a
          className="wish-link"
          href={item.url}
          target="_blank"
          rel="noreferrer"
        >
          Dai un’occhiata
          <ExternalLink size={14} />
        </a>
      ) : null}
      {item.hint ? (
        <>
          <button className="text-button" onClick={() => setHelp(!help)}>
            {help ? "Nascondi l’aiuto" : "Mi dai un aiuto?"}
          </button>
          {help ? <p className="hint-text">{item.hint}</p> : null}
        </>
      ) : null}
      {item.answer ? (
        <>
          <button className="text-button" onClick={() => setAnswer(!answer)}>
            {answer ? "Nascondi la soluzione" : "Leggi la soluzione"}
          </button>
          {answer ? <p className="hint-text">{item.answer}</p> : null}
        </>
      ) : null}
    </article>
  );
}

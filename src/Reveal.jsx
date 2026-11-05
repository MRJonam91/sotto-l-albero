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
        <h2>La sorpresa è per chi partecipa.</h2>
        <p>
          Se organizzi senza partecipare, puoi controllare gli abbinamenti dalla
          sezione Organizza.
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
        <h2>Il tuo nome è ancora sotto l’albero.</h2>
        <p>
          {status === "archived"
            ? "Questo evento è stato archiviato."
            : status === "cancelled"
              ? "L’estrazione precedente è stata annullata. Aspettiamo la nuova."
              : `Ci ritroviamo qui il ${date(drawAt)}.`}
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
            Se l’ora è arrivata, stiamo aspettando che l’organizzatore completi
            il gruppo e l’estrazione.
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
            <h2>Hai un nome da custodire.</h2>
            <p>
              Da qui comincia la parte più bella: pensare a un regalo per
              qualcuno.
            </p>
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
                Un attimo… stiamo aprendo la lettera.
              </p>
            )}
            <button className="text-button" onClick={() => setPhase("open")}>
              Mostra subito il nome
              <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <div className="recipient-letter paper">
            <span className="eyebrow">Quest’anno pensi tu a</span>
            <h2>{recipient.name}</h2>
            <Star size={26} className="recipient-star" />
            <p>
              Un regalo scelto con cura.
              <br />E il tuo nome resta un segreto.
            </p>
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
            <h2>Qualche indizio da {recipient.name}.</h2>
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
                La lettera è ancora da scrivere. Torna tra qualche giorno: nel
                frattempo, puoi pensare a ciò che conoscete l’uno dell’altra.
              </p>
            </div>
          )}
          <div className="gift-progress">
            <h3>A che punto sei?</h3>
            <p>Un promemoria tutto tuo, salvato su questo dispositivo.</p>
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

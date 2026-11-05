import { useState } from "react";
import { ArrowRight, Mail, LockKeyhole } from "lucide-react";
import { api } from "./api.js";
import { Button, Field, Notice } from "./ui.jsx";
export default function Auth({ onLogin, local, mailConfigured }) {
  const [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [devCode, setDevCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        const r = await api("/auth/request", "POST", { email, name });
        setDevCode(r.devCode || "");
        setSent(true);
      } else {
        const r = await api("/auth/verify", "POST", { email, code });
        onLogin(r.user);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">
          <Mail size={16} /> Una lettera per te
        </span>
        <h1>
          Le persone giuste.
          <br />
          <em>Un piccolo segreto.</em>
        </h1>
        <p>
          Ritrovarsi, pensare a un regalo, aspettare Natale. Qui c’è spazio per
          tutti i preparativi.
        </p>
        <div className="auth-note">
          <LockKeyhole size={18} />
          <span>
            Un posto riservato al tuo gruppo.
            <br />
            Entra con l’email con cui hai ricevuto l’invito.
          </span>
        </div>
      </div>
      <form className="paper auth-form" onSubmit={submit}>
        <span className="paper-stamp" aria-hidden="true">
          ✧
        </span>
        <h2>
          {sent
            ? devCode
              ? "Il codice è qui sotto"
              : "Controlla la posta"
            : "Bentrovato, accomodati."}
        </h2>
        <p>
          {sent
            ? devCode
              ? `Stai provando il sito in locale: per ${email} usa il codice qui sotto. Non abbiamo inviato email.`
              : `Abbiamo inviato un codice a ${email}. Ti aspettiamo qui.`
            : "Lascia il tuo indirizzo: ti mandiamo un codice per entrare."}
        </p>
        {!sent ? (
          <>
            <Field
              label="Come ti chiami?"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
            <Field
              label="La tua email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </>
        ) : (
          <Field
            label="Codice di accesso"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
          />
        )}
        <Notice error>{error}</Notice>
        {devCode ? (
          <p className="local-code">
            Solo per la prova in locale: <strong>{devCode}</strong>
          </p>
        ) : null}
        {!mailConfigured && !local ? (
          <Notice error>
            L’invio email non è ancora configurato. Chiedi a chi gestisce il
            sito di completare l’attivazione.
          </Notice>
        ) : null}
        <Button busy={busy} type="submit">
          {sent ? "Entra" : "Ricevi il codice"}
          <ArrowRight size={17} />
        </Button>
        {sent ? (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
              setDevCode("");
            }}
          >
            Usa un’altra email
          </button>
        ) : null}
        <small>
          Il tuo indirizzo serve per accedere e ricevere gli aggiornamenti degli
          eventi a cui partecipi.
        </small>
      </form>
    </section>
  );
}

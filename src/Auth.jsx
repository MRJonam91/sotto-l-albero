import { t } from "./i18n.js";
import { useState, useEffect } from "react";
import { ArrowRight, Mail, LockKeyhole, TreePine } from "lucide-react";
import { api } from "./api.js";
import { Button, Field, Notice } from "./ui.jsx";
export default function Auth({
  onLogin,
  local,
  mailConfigured,
  preferExisting = false,
  chosenLocale,
  savingLocale,
  busy,
  setBusy,
}) {
  const [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [register, setRegister] = useState(true),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [devCode, setDevCode] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (preferExisting) setRegister(false);
  }, [preferExisting]);
  async function submit(e) {
    e.preventDefault();
    if (busy || savingLocale) return;
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        const r = await api("/auth/request", "POST", {
          email,
          ...(chosenLocale ? { locale: chosenLocale } : {}),
          ...(register ? { name } : {}),
        });
        setDevCode(r.devCode || "");
        setSent(true);
      } else {
        const r = await api("/auth/verify", "POST", {
          email,
          code,
          ...(chosenLocale ? { locale: chosenLocale } : {}),
        });
        await onLogin(r.user);
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
          <Mail size={16} /> {t("Una lettera per te")}
        </span>
        <h1>
          {t("Le persone giuste.")}
          <br />
          <em>{t("Un piccolo segreto.")}</em>
        </h1>
        <p>
          {t(
            "Ritrovati con il tuo gruppo, scegli un regalo e tieni il nome per te fino al giorno dello scambio.",
          )}
        </p>
        <div className="auth-note">
          <LockKeyhole size={18} />
          <span>
            {t("Un posto riservato al tuo gruppo.")}
            <br />
            {t("Entra con l’indirizzo a cui hai ricevuto l’invito.")}
          </span>
        </div>
      </div>
      <form className="paper auth-form" onSubmit={submit}>
        <span className="paper-stamp" aria-hidden="true">
          <TreePine size={23} strokeWidth={1.5} />
        </span>
        <h2>
          {sent
            ? devCode
              ? t("Il codice è qui sotto")
              : t("Controlla la posta")
            : t("Bentrovato, accomodati.")}
        </h2>
        <p>
          {sent
            ? devCode
              ? t(
                  "Per la prova in locale, usa il codice qui sotto per {email}. Non riceverai un’email.",
                  { email },
                )
              : t(
                  "Abbiamo mandato un codice a {email}. Inseriscilo qui per entrare.",
                  { email },
                )
            : t(
                "Inserisci il tuo indirizzo e ti mandiamo un codice per entrare.",
              )}
        </p>
        {!sent ? (
          <>
            {register && (
              <Field
                label={t("Come ti chiami?")}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
              />
            )}
            <Field
              label={t("La tua email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </>
        ) : (
          <Field
            label={t("Codice di accesso")}
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
            {t("Codice di prova")} <strong>{devCode}</strong>
          </p>
        ) : null}
        {!mailConfigured && !local ? (
          <Notice error>
            {t(
              "L’accesso via email non è ancora attivo. Contatta chi gestisce il sito.",
            )}
          </Notice>
        ) : null}
        <Button busy={busy} disabled={savingLocale} type="submit">
          {sent ? t("Entra") : t("Ricevi il codice")}
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
            {t("Usa un’altra email")}
          </button>
        ) : (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? t("Ho già un account") : t("Crea un account")}
          </button>
        )}
        <small>
          {t(
            "Il codice di accesso arriva via email. Dal profilo puoi scegliere come ricevere gli avvisi del gruppo.",
          )}
        </small>
      </form>
    </section>
  );
}

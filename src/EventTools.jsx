import { t } from "./i18n.js";
import { useRef, useState } from "react";
import { api } from "./api.js";
import { Button, Field, Notice } from "./ui.jsx";

export default function EventTools({ event, locked, action }) {
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const pending = useRef(null);

  async function prepareAccount(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setPreparing(true);
    try {
      const result = await action(
        "accounts",
        body,
        "Il posto è pronto. Per entrare basta il codice che riceverà via email.",
      );
      if (result) form.reset();
    } finally {
      setPreparing(false);
    }
  }

  async function announce(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const message = new FormData(form).get("message").trim();
    if (pending.current?.message !== message)
      pending.current = { message, requestId: crypto.randomUUID() };
    setSending(true);
    setNotice("");
    setError("");
    try {
      const result = await api(
        `/notifications/${event.id}/announce`,
        "POST",
        pending.current,
      );
      setNotice(
        result.queued
          ? "Il messaggio è in coda per chi ha attivato gli avvisi."
          : "Al momento non ci sono partecipanti che possono ricevere l’avviso.",
      );
      form.reset();
      pending.current = null;
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>{t("Account e avvisi")}</h2>
      {!locked && (
        <details className="disclosure">
          <summary>{t("Prepara un account")}</summary>
          <p>
            {t(
              "Per entrare basta un codice via email. Chi ha già un account entra nel gruppo con lo stesso profilo.",
            )}
          </p>
          <form onSubmit={prepareAccount}>
            <div className="form-grid">
              <Field
                label={t("Nome della persona")}
                name="name"
                maxLength={80}
                required
              />
              <Field
                label={t("Email della persona")}
                name="email"
                type="email"
                maxLength={254}
                required
              />
            </div>
            <Button busy={preparing}>{t("Prepara il posto")}</Button>
          </form>
        </details>
      )}
      <details className="disclosure">
        <summary>{t("Scrivi al gruppo")}</summary>
        <p>
          {t("Riceverà il messaggio chi ha attivato gli avvisi nel profilo.")}
        </p>
        <form onSubmit={announce}>
          <Field label={t("Messaggio per i partecipanti")}>
            <textarea name="message" maxLength={1000} rows={4} required />
          </Field>
          <Notice error>{error}</Notice>
          <Notice>{t(notice)}</Notice>
          <Button busy={sending}>{t("Invia al gruppo")}</Button>
        </form>
      </details>
    </section>
  );
}

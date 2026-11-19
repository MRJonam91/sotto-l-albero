import { t } from "./i18n.js";
import { useState } from "react";
import { api } from "./api.js";
import { Modal, Field, Notice, Button } from "./ui.jsx";

function localDate(value) {
  const d = new Date(value);
  return new Date(d.valueOf() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function EventEdit({ event: currentEvent, onClose, onSaved }) {
  const [event] = useState(currentEvent);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(`/events/${event.id}`, "PUT", {
        ...values,
        budget: Number(values.budget),
        historyDepth: Number(values.historyDepth),
        version: event.version,
        closeAt: new Date(values.closeAt).toISOString(),
        drawAt: new Date(values.drawAt).toISOString(),
        giftAt: new Date(values.giftAt).toISOString(),
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t("Rivediamo i preparativi")} onClose={onClose} wide>
      <p>
        {t(
          "Puoi cambiare i dettagli fino all’estrazione. Se sposti una data, avvisa il gruppo.",
        )}
      </p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field
            label={t("Nome dell’evento")}
            name="name"
            defaultValue={event.name}
            maxLength={100}
            required
          />
          <Field
            label={t("Nome del gruppo")}
            name="groupName"
            defaultValue={event.groupName || event.name}
            maxLength={100}
            hint={t("Identifica il gruppo nelle varie edizioni.")}
          />
        </div>
        <div className="form-grid">
          <Field
            label={t("Budget a persona (€)")}
            name="budget"
            type="number"
            min="0"
            max="10000"
            defaultValue={event.budget}
            required
          />
          <Field label={t("Abbinamenti da non ripetere")}>
            <select name="historyDepth" defaultValue={event.historyDepth ?? 1}>
              <option value="0">
                {t("Non considerare le edizioni precedenti")}
              </option>
              <option value="1">{t("L’ultima edizione")}</option>
              <option value="2">{t("Le ultime 2 edizioni")}</option>
              <option value="3">{t("Le ultime 3 edizioni")}</option>
              <option value="5">{t("Le ultime 5 edizioni")}</option>
              <option value="10">{t("Le ultime 10 edizioni")}</option>
            </select>
          </Field>
        </div>
        <div className="form-grid three">
          <Field
            label={t("Iscrizioni fino al")}
            name="closeAt"
            type="datetime-local"
            defaultValue={localDate(event.closeAt)}
            required
          />
          <Field
            label={t("Estraiamo i nomi il")}
            name="drawAt"
            type="datetime-local"
            defaultValue={localDate(event.drawAt)}
            required
          />
          <Field
            label={t("Ci scambiamo i regali il")}
            name="giftAt"
            type="datetime-local"
            defaultValue={localDate(event.giftAt)}
            required
          />
        </div>
        <p className="quiet">
          {t(
            "Gli orari seguono il fuso del tuo dispositivo ({zone}). Gli abbinamenti che hai inserito a mano restano esclusi finché non li rimuovi.",
            { zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          )}
        </p>
        <Field label={t("Un messaggio per il gruppo")}>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description}
            maxLength={2000}
          />
        </Field>
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Torna indietro")}
          </Button>
          <Button busy={busy}>{t("Salva le modifiche")}</Button>
        </div>
      </form>
    </Modal>
  );
}

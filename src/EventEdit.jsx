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
    <Modal title="Rivediamo i preparativi" onClose={onClose} wide>
      <p>
        Puoi cambiare i dettagli fino all’estrazione. Se sposti una data, avvisa
        il gruppo.
      </p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field
            label="Nome dell’evento"
            name="name"
            defaultValue={event.name}
            maxLength={100}
            required
          />
          <Field
            label="Nome del gruppo"
            name="groupName"
            defaultValue={event.groupName || event.name}
            maxLength={100}
            hint="Identifica il gruppo nelle varie edizioni."
          />
        </div>
        <div className="form-grid">
          <Field
            label="Budget a persona (€)"
            name="budget"
            type="number"
            min="0"
            max="10000"
            defaultValue={event.budget}
            required
          />
          <Field label="Abbinamenti da non ripetere">
            <select name="historyDepth" defaultValue={event.historyDepth ?? 1}>
              <option value="0">Non considerare le edizioni precedenti</option>
              <option value="1">L’ultima edizione</option>
              <option value="2">Le ultime 2 edizioni</option>
              <option value="3">Le ultime 3 edizioni</option>
              <option value="5">Le ultime 5 edizioni</option>
              <option value="10">Le ultime 10 edizioni</option>
            </select>
          </Field>
        </div>
        <div className="form-grid three">
          <Field
            label="Iscrizioni fino al"
            name="closeAt"
            type="datetime-local"
            defaultValue={localDate(event.closeAt)}
            required
          />
          <Field
            label="Estraiamo i nomi il"
            name="drawAt"
            type="datetime-local"
            defaultValue={localDate(event.drawAt)}
            required
          />
          <Field
            label="Ci scambiamo i regali il"
            name="giftAt"
            type="datetime-local"
            defaultValue={localDate(event.giftAt)}
            required
          />
        </div>
        <p className="quiet">
          Gli orari seguono il fuso del tuo dispositivo (
          {Intl.DateTimeFormat().resolvedOptions().timeZone}). Gli abbinamenti
          che hai inserito a mano restano esclusi finché non li rimuovi.
        </p>
        <Field label="Un messaggio per il gruppo">
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
            Torna indietro
          </Button>
          <Button busy={busy}>Salva le modifiche</Button>
        </div>
      </form>
    </Modal>
  );
}

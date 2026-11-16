import { useEffect } from "react";
import Event from "./Event.jsx";
import { statusLabel } from "./api.js";

export default function EventShortcuts({
  events,
  loading,
  selectedId,
  target,
  user,
  onSelect,
  onOverview,
  onChange,
  onStamp,
}) {
  const usable = events.filter(
    (event) => event.membership === "approved" || event.isAdmin,
  );
  const selected = events.find((event) => event.id === selectedId);
  const available =
    selected && (selected.membership === "approved" || selected.isAdmin);
  useEffect(() => {
    if (!loading && !selectedId && usable.length === 1)
      onSelect(usable[0].id, true);
  }, [loading, selectedId, usable.length, usable[0]?.id]);
  if (loading)
    return (
      <p className="loading" role="status">
        Cerchiamo i tuoi scambi…
      </p>
    );
  if (selectedId && available)
    return (
      <>
        {usable.length > 1 && (
          <button className="back-link" onClick={() => onSelect(null)}>
            ← Scegli un altro scambio
          </button>
        )}
        <Event
          key={`${selectedId}:${target}`}
          id={selectedId}
          initialTab={target}
          user={user}
          onOpen={onOverview}
          onChange={onChange}
          onStamp={onStamp}
        />
      </>
    );
  return (
    <section className="event-shortcuts">
      <span className="eyebrow">
        {target === "reveal" ? "Nome segreto" : "Sfide del gruppo"}
      </span>
      <h1>
        {target === "reveal"
          ? "Scegli lo scambio per il nome segreto"
          : "Scegli lo scambio per le sfide"}
      </h1>
      {selectedId && !available ? (
        <p role="status">
          {selected?.membership === "pending"
            ? "La tua iscrizione è in attesa di conferma."
            : "Questo scambio non è disponibile per il tuo profilo."}
        </p>
      ) : null}
      <p>
        {usable.length
          ? "Ogni gruppo ha i propri abbinamenti e la propria classifica."
          : "Per accedere serve un’iscrizione approvata a uno scambio."}
      </p>
      <div className="event-shortcut-list">
        {usable.map((event) => (
          <button
            className="paper"
            key={event.id}
            onClick={() => onSelect(event.id)}
          >
            <strong>{event.name}</strong>
            <span>{statusLabel(event.status)}</span>
          </button>
        ))}
      </div>
      {events
        .filter((event) => event.membership === "pending")
        .map((event) => (
          <div className="event-shortcut-pending" key={event.id}>
            <strong>{event.name}</strong>
            <p>Iscrizione in attesa di conferma.</p>
            <button
              className="text-button"
              onClick={() => onOverview(event.id)}
            >
              Apri l’evento
            </button>
          </div>
        ))}
    </section>
  );
}

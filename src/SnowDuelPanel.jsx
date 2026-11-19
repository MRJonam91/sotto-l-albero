import { t } from "./i18n.js";
import { useEffect, useRef, useState } from "react";
import { Snowflake } from "lucide-react";
import { api } from "./api.js";
import { Button, Field, Notice } from "./ui.jsx";
import SnowTicTacToe from "./SnowTicTacToe.jsx";

export default function SnowDuelPanel({ eventId, userId, opponents, closed }) {
  const path = `/competition/${eventId}/tris-duels`;
  const [duels, setDuels] = useState(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requests = useRef(0);
  const mutating = useRef(false);
  const reload = useRef(null);
  useEffect(() => {
    let live = true;
    setDuels(null);
    setError("");
    async function load() {
      if (mutating.current) return;
      const sequence = ++requests.current;
      try {
        const result = await api(path);
        if (live && sequence === requests.current) setDuels(result.duels);
      } catch (failure) {
        if (live && sequence === requests.current) {
          setError(failure.message);
          if ([401, 403, 404].includes(failure.status)) setDuels([]);
        }
      }
    }
    reload.current = load;
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5000);
    return () => {
      live = false;
      requests.current++;
      clearInterval(timer);
    };
  }, [path, userId]);

  async function act(suffix, body) {
    if (mutating.current) return;
    mutating.current = true;
    requests.current++;
    setBusy(true);
    setError("");
    try {
      const { duel } = await api(path + suffix, "POST", body);
      setDuels((previous) => [
        duel,
        ...(previous ?? []).filter((row) => row.id !== duel.id),
      ]);
      setSelected("");
    } catch (failure) {
      setError(failure.message);
    } finally {
      mutating.current = false;
      setBusy(false);
      reload.current?.();
    }
  }
  return (
    <section
      className="competition-section snow-duel-panel"
      aria-label={t("Tris sulla neve con il gruppo")}
    >
      <div className="competition-duel-title">
        <Snowflake aria-hidden="true" />
        <h3>{t("Tris sulla neve")}</h3>
      </div>
      <p>
        {t(
          "Una sola griglia condivisa con un amico, una mossa alla volta. Avete due giorni per giocare. È una sfida amichevole, senza punti in classifica.",
        )}
      </p>
      {!closed &&
        (opponents.length ? (
          <form
            className="competition-duel-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (selected) act("", { userId: selected });
            }}
          >
            <Field label={t("Chi inviti a giocare a tris?")}>
              <select
                required
                value={selected}
                disabled={busy}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="" disabled>
                  {t("Scegli un amico del gruppo")}
                </option>
                {opponents.map((opponent) => (
                  <option key={opponent.userId} value={opponent.userId}>
                    {opponent.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" busy={busy} disabled={!selected}>
              {t("Invita a tris")}
            </Button>
          </form>
        ) : (
          <p>
            {t("Serve un altro partecipante approvato per aprire una partita.")}
          </p>
        ))}
      <Notice error>{error}</Notice>
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={() => reload.current?.()}
      >
        {t("Aggiorna le partite")}
      </Button>
      {duels === null && !error && (
        <p role="status">{t("Cerchiamo le partite sulla neve…")}</p>
      )}
      {duels?.length === 0 && (
        <p>
          {t(
            closed
              ? "Nessuna partita da mostrare per questa edizione."
              : "Non hai partite aperte. Puoi invitare un amico del gruppo.",
          )}
        </p>
      )}
      <ul className="snow-duel-list">
        {duels?.map((duel) => (
          <li key={duel.id} className="snow-duel-card paper">
            <h4>{t("Tris con {name}", { name: duel.opponent.name })}</h4>
            {duel.myTurn && !closed && (
              <span className="snow-duel-turn">{t("È il tuo turno")}</span>
            )}
            <SnowTicTacToe
              challenge={{
                ...duel,
                ...(closed && duel.status === "active"
                  ? { status: "expired", myTurn: false }
                  : {}),
              }}
              opponentName={duel.opponent.name}
              busy={busy || closed}
              onMove={({ position }) =>
                act(`/${duel.id}`, { position, revision: duel.revision })
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

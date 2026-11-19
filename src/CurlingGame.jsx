import { subscribeLocale, t } from "./i18n.js";
import { useEffect, useRef, useState } from "react";
import { createCurlingGame } from "./curlingEngine.js";
import { api } from "./api.js";
import "./curling-game.css";

export default function CurlingGame({ onClose }) {
  const root = useRef(null);
  const [participation, setParticipation] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const alive = useRef(false);
  async function saveParticipation() {
    setSaving(true);
    setSaveError(false);
    setParticipation("Salviamo la partecipazione nel tuo ritratto…");
    try {
      await api("/profile/activity", "POST", { game: "curling" });
      if (alive.current)
        setParticipation(
          "Il tuo ritratto tiene conto della partecipazione al curling. Nessun punto in classifica.",
        );
    } catch (error) {
      if (alive.current) {
        setSaveError(true);
        setParticipation(error.message);
      }
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    const dispose = createCurlingGame(root.current, {
      onComplete: saveParticipation,
      translate: t,
      subscribeLocale,
    });
    return () => {
      alive.current = false;
      dispose();
    };
  }, []);
  return (
    <section
      ref={root}
      className="curling-game holiday-game paper"
      aria-label={t("Curling dei regali")}
    >
      <div className="f1-intro">
        <span className="f1-eyebrow">
          {t("IL CORTILE DELLA LANTERNA · CONTRO IL COMPUTER")}
        </span>
        <h2 id="curling-title">{t("Un regalo sul ghiaccio.")}</h2>
        <p>
          {t(
            "Trascina il pacco verso di te, prendi la mira e lascia andare. Vicino alla luce vale di più. E puoi spostare i regali del computer.",
          )}
        </p>
      </div>
      <div className="f1-score" aria-live="polite">
        <b data-score="" />
        <span data-turn=""></span>
      </div>
      <div className="f1-rink">
        <canvas
          aria-label={t(
            "Pista di curling. Anelli in alto, lancio in basso. Usa il pulsante pacco per trascinare oppure i comandi da tastiera.",
          )}
          tabIndex="0"
        ></canvas>
        <button
          className="f1-handle"
          data-handle=""
          aria-label={t(
            "Pacco: trascina verso di te e rilascia per lanciare. Escape annulla.",
          )}
        >
          <span></span>
        </button>
        <span className="f1-instruction">
          {t("TIRA VERSO DI TE · POI LASCIA")}
        </span>
      </div>
      <p className="curling-status" data-status="" role="status"></p>
      <div className="controls">
        <button className="primary" data-launch="">
          {t("Lancia con questa mira")}
        </button>
        <button data-cancel="">{t("Annulla mira")}</button>
        <button data-reset="">{t("Rivincita")}</button>
      </div>
      <details className="f1-settings">
        <summary>{t("Gioca da tastiera · regola la mira")}</summary>
        <div className="controls">
          <button data-left="" aria-label={t("Mira a sinistra")}>
            {t("← Mira")}
          </button>
          <button data-right="" aria-label={t("Mira a destra")}>
            {t("Mira →")}
          </button>
          <label>
            {t("Angolo ")}
            <input
              data-angle=""
              type="range"
              min="-38"
              max="38"
              defaultValue="0"
            />
            <output data-angle-out="">0°</output>
          </label>
          <label>
            {t("Forza ")}
            <input
              data-force=""
              type="range"
              min="20"
              max="100"
              defaultValue="63"
            />
            <output data-force-out="">63%</output>
          </label>
        </div>
        <p>
          {t(
            "Frecce ← →: mira. ↑ ↓: forza. Invio: lancia. Esc: annulla. Il cerchio tratteggiato mostra l’arresto previsto senza urti. Anelli: 3, 2, 1 punti; sulla linea vale l’esterno. Un rimbalzo laterale è permesso, il secondo elimina il pacco. I punti cambiano anche dopo gli urti.",
          )}
        </p>
      </details>
      <p className="profile">
        {t(
          "Sei tiri alternati · tre pacchi per te e tre per il computer · nella rivincita cambia chi comincia. Una partita conclusa contribuisce al ritratto come partecipazione dichiarata dal dispositivo: non salviamo punteggi e non assegniamo punti in classifica.",
        )}
      </p>
      {participation && (
        <p role="status">
          {saveError
            ? t("Partita conclusa. Partecipazione non salvata: {message}", {
                message: t(participation),
              })
            : t(participation)}
        </p>
      )}
      {saveError && (
        <button type="button" disabled={saving} onClick={saveParticipation}>
          {t("Riprova a salvare la partecipazione")}
        </button>
      )}
      <button type="button" className="button ghost" onClick={onClose}>
        {t("Torna ai giochi")}
      </button>
    </section>
  );
}

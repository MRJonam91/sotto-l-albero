import { useEffect, useRef } from "react";
import { createCurlingGame } from "./curlingEngine.js";
import "./curling-game.css";

export default function CurlingGame({ onClose }) {
  const root = useRef(null);
  useEffect(() => createCurlingGame(root.current), []);
  return (
    <section
      ref={root}
      className="curling-game holiday-game paper"
      aria-label="Curling dei regali"
    >
      <div className="f1-intro">
        <span className="f1-eyebrow">
          IL CORTILE DELLA LANTERNA · SULLO STESSO SCHERMO
        </span>
        <h2 id="curling-title">Un regalo sul ghiaccio.</h2>
        <p>
          Trascina il pacco verso di te, prendi la mira e lascia andare. Vicino
          alla luce vale di più. E puoi spostare i regali dell’altro.
        </p>
      </div>
      <div className="f1-score" aria-live="polite">
        <b data-score="">Giocatore 1: 0 · Giocatore 2: 0</b>
        <span data-turn=""></span>
      </div>
      <div className="f1-rink">
        <canvas
          aria-label="Pista di curling. Anelli in alto, lancio in basso. Usa il pulsante pacco per trascinare oppure i comandi da tastiera."
          tabIndex="0"
        ></canvas>
        <button
          className="f1-handle"
          data-handle=""
          aria-label="Pacco: trascina verso di te e rilascia per lanciare. Escape annulla."
        >
          <span></span>
        </button>
        <span className="f1-instruction">TIRA VERSO DI TE · POI LASCIA</span>
      </div>
      <p className="curling-status" data-status="" role="status"></p>
      <div className="controls">
        <button className="primary" data-launch="">
          Lancia con questa mira
        </button>
        <button data-cancel="">Annulla mira</button>
        <button data-reset="">Rivincita</button>
      </div>
      <details className="f1-settings">
        <summary>Gioca da tastiera · cambia modalità</summary>
        <div className="controls">
          <label>
            Partita{" "}
            <select data-mode="">
              <option value="local">Due persone, stesso schermo</option>
              <option value="cpu">Allenamento contro il computer</option>
            </select>
          </label>
          <button data-left="" aria-label="Mira a sinistra">
            ← Mira
          </button>
          <button data-right="" aria-label="Mira a destra">
            Mira →
          </button>
          <label>
            Angolo{" "}
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
            Forza{" "}
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
          Frecce ← →: mira. ↑ ↓: forza. Invio: lancia. Esc: annulla. Il cerchio
          tratteggiato mostra l’arresto previsto senza urti. Anelli: 3, 2, 1
          punti; sulla linea vale l’esterno. Un rimbalzo laterale è permesso, il
          secondo elimina il pacco. I punti cambiano anche dopo gli urti.
        </p>
      </details>
      <p className="profile">
        Sei tiri alternati · tre pacchi a testa · rivincita con primo giocatore
        alternato · due persone sullo stesso schermo o allenamento contro il
        computer · nessun risultato salvato e nessun punto in classifica.
      </p>
      <button type="button" className="button ghost" onClick={onClose}>
        Torna ai giochi
      </button>
    </section>
  );
}

import { useId, useState } from "react";
import { Sparkles } from "lucide-react";
import Avatar from "./Avatar.jsx";
import ScoreVessel from "./ScoreVessel.jsx";
import { Button, Field, Modal } from "./ui.jsx";

const views = {
  ornaments: "Palline di Natale",
  bells: "Campanellini",
  snowflakes: "Fiocchi di neve",
  stardust: "Polvere magica",
  list: "Lista",
};

const scoreLabels = {
  quiz: "Quiz di Natale",
  memory: "Memory di Natale",
  film: "Indovina il film",
  pacchi: "Pacchi smarriti",
  slitta: "Sacco della slitta",
  cartolina: "La cartolina scomparsa",
  addobbi: "Prendi i pacchi",
};

function ScoreBreakdown({ row, onClose }) {
  const stampPoints = row.stampPoints ?? 0;
  const stampCount = stampPoints / 5;
  return (
    <Modal title={`Dettaglio punti di ${row.name}`} onClose={onClose}>
      <p>
        Conta il miglior risultato di ogni prova. Ogni timbro della caccia al
        tesoro vale 5 punti, una volta sola.
      </p>
      <dl className="competition-breakdown">
        {Object.entries(scoreLabels).map(([game, title]) => (
          <div key={game}>
            <dt>{title}</dt>
            <dd>{row.scores?.[game] ?? row[game] ?? 0} punti</dd>
          </div>
        ))}
        <div>
          <dt>Timbri distinti ({stampCount} × 5)</dt>
          <dd>{stampPoints} punti</dd>
        </div>
        {row.adjustment !== 0 && row.adjustment != null && (
          <div>
            <dt>Modifiche dell’organizzatore</dt>
            <dd>
              {row.adjustment > 0 ? "+" : ""}
              {row.adjustment} punti
            </dd>
          </div>
        )}
        <div className="competition-breakdown-total">
          <dt>Totale in classifica</dt>
          <dd>{row.score} punti</dd>
        </div>
      </dl>
    </Modal>
  );
}

function getView(key) {
  try {
    const value = localStorage.getItem(key);
    if (value && Object.hasOwn(views, value)) return value;
  } catch {
    // The view still works when browser storage is unavailable.
  }
  return "ornaments";
}

export default function FestivalLeaderboard({
  rows,
  memberById,
  userId,
  onAdjust,
  busy,
}) {
  const heading = useId();
  const key = `sla-competition-view:${userId}`;
  const [view, setView] = useState(() => getView(key));
  const [replay, setReplay] = useState(0);
  const [detailsId, setDetailsId] = useState(null);
  const max = Math.max(1, ...rows.map(({ score }) => score));
  const order = [...rows].sort((a, b) => a.userId.localeCompare(b.userId));
  const colors = new Map(
    order.map((row, i) => [
      row.userId,
      `hsl(${(355 + i * 137.508) % 360} 82% 65%)`,
    ]),
  );
  const details = rows.find((row) => row.userId === detailsId);
  const list = (
    <ol
      className={view === "list" ? "competition-ranks" : "hourglass-board"}
      role="list"
    >
      {rows.map((row) => (
        <li key={row.userId}>
          {view !== "list" && (
            <ScoreVessel
              motif={view}
              fraction={row.score / max}
              score={row.score}
              color={colors.get(row.userId)}
              replay={replay}
            />
          )}
          <span
            className="competition-rank"
            aria-label={`Posizione ${row.rank}`}
          >
            {row.rank}º
          </span>
          <Avatar
            userId={row.userId}
            name={row.name}
            avatar={memberById.get(row.userId)?.avatar}
          />
          <strong className="competition-name">
            {row.name}
            {row.userId === userId ? " (tu)" : ""}
          </strong>
          <strong className="competition-points">{row.score} pt</strong>
          <div className="competition-row-actions">
            <Button
              type="button"
              variant="ghost"
              aria-label={`Dettaglio punti di ${row.name}`}
              onClick={() => setDetailsId(row.userId)}
            >
              Dettaglio punti
            </Button>
            {onAdjust && (
              <Button
                type="button"
                variant="outline"
                aria-label={`Modifica punti di ${row.name}`}
                disabled={busy}
                onClick={() => onAdjust(row)}
              >
                Modifica
              </Button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
  return (
    <section
      className="competition-section competition-standings"
      aria-labelledby={heading}
    >
      <div className="competition-standings-head">
        <div>
          <h3 id={heading}>Classifica di gruppo</h3>
          <p>
            Una clessidra per ogni partecipante confermato. Il livello mostra i
            punti di ciascuno rispetto al primo in classifica.
          </p>
        </div>
        <div className="vessel-tools">
          <Field label="Visualizzazione della classifica">
            <select
              value={view}
              onChange={(event) => {
                const value = event.target.value;
                setView(value);
                try {
                  localStorage.setItem(key, value);
                } catch {
                  /* Session-only preference. */
                }
              }}
            >
              {Object.entries(views).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {view !== "list" && rows.length > 0 && (
            <Button
              className="vessel-replay"
              type="button"
              variant="ghost"
              onClick={() => setReplay((previous) => previous + 1)}
            >
              <Sparkles size={16} aria-hidden="true" /> Rianima le clessidre
            </Button>
          )}
        </div>
      </div>
      {!rows.length ? (
        <p>La classifica mostrerà le persone con un’iscrizione approvata.</p>
      ) : view === "list" ? (
        list
      ) : (
        <div
          className="competition-vessels"
          role="region"
          aria-label="Clessidre della classifica"
          tabIndex={0}
        >
          {list}
        </div>
      )}
      {details && (
        <ScoreBreakdown row={details} onClose={() => setDetailsId(null)} />
      )}
    </section>
  );
}

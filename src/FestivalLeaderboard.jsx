import { useId, useState } from "react";
import { Sparkles } from "lucide-react";
import Avatar from "./Avatar.jsx";
import ScoreVessel from "./ScoreVessel.jsx";
import { Button, Field } from "./ui.jsx";

const views = {
  ornaments: "Palline di Natale",
  bells: "Campanellini",
  snowflakes: "Fiocchi di neve",
  stardust: "Polvere magica",
  list: "Lista",
};

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
  const max = Math.max(1, ...rows.map(({ score }) => score));
  const order = [...rows].sort((a, b) => a.userId.localeCompare(b.userId));
  const colors = new Map(
    order.map((row, i) => [
      row.userId,
      `hsl(${(355 + i * 137.508) % 360} 82% 65%)`,
    ]),
  );
  return (
    <section
      className="competition-section competition-standings"
      aria-labelledby={heading}
    >
      <div className="competition-standings-head">
        <div>
          <h3 id={heading}>Classifica di gruppo</h3>
          <p>I punteggi di questo gruppo di Babbo Natale Segreto</p>
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
      {rows.length ? (
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
            </li>
          ))}
        </ol>
      ) : (
        <p>Quando qualcuno si iscrive alle sfide, compare qui.</p>
      )}
    </section>
  );
}

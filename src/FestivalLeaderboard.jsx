import { t } from "./i18n.js";
import { useId, useState } from "react";
import { Sparkles } from "lucide-react";
import Avatar from "./Avatar.jsx";
import NameTag from "./NameTag.jsx";
import ScoreVessel from "./ScoreVessel.jsx";
import { Button, Field, Modal } from "./ui.jsx";
import { stampAwards } from "../shared/stamps.js";

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
  const completions = row.stampCompletions || 0;
  return (
    <Modal
      title={t("Dettaglio punti di {name}", { name: row.name })}
      onClose={onClose}
    >
      <p>
        {t(
          "Conta il miglior risultato di ogni prova. I timbri della caccia valgono 5 punti ciascuno. Quiz e Memory contano per i bonus raccolta.",
        )}
      </p>
      <dl className="competition-breakdown">
        {Object.entries(scoreLabels).map(([game, title]) => (
          <div key={game}>
            <dt>{t(title)}</dt>
            <dd>
              {t("{value} punti", {
                value: row.scores?.[game] ?? row[game] ?? 0,
              })}
            </dd>
          </div>
        ))}
        <div>
          <dt>{t("Timbri distinti ({stampCount} × 5)", { stampCount })}</dt>
          <dd>{t("{stampPoints} punti", { stampPoints })}</dd>
        </div>
        {[
          [completions & 1, "Raccolta base", stampAwards.base],
          [completions & 2, "Timbri giornalieri", stampAwards.seasonal],
          [completions === 3, "Album completo", stampAwards.all],
        ]
          .filter(([earned]) => Boolean(earned))
          .map(([, label, points]) => (
            <div key={label}>
              <dt>{t(label)}</dt>
              <dd>{t("+{points} punti bonus", { points })}</dd>
            </div>
          ))}
        {row.adjustment !== 0 && row.adjustment != null && (
          <div>
            <dt>{t("Modifiche dell’organizzatore")}</dt>
            <dd>
              {t("{state}{adjustment} punti", {
                state: row.adjustment > 0 ? "+" : "",
                adjustment: row.adjustment,
              })}
            </dd>
          </div>
        )}
        <div className="competition-breakdown-total">
          <dt>{t("Totale in classifica")}</dt>
          <dd>{t("{score} punti", { score: row.score })}</dd>
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
            aria-label={t("Posizione {rank}", { rank: row.rank })}
          >
            {row.rank}
          </span>
          <Avatar
            userId={row.userId}
            name={row.name}
            avatar={memberById.get(row.userId)?.avatar}
          />
          <strong className="competition-name">
            {row.name}
            {row.userId === userId ? t(" (tu)") : ""}
            {memberById.get(row.userId)?.badge ? (
              <>
                {" "}
                <NameTag
                  badge={memberById.get(row.userId).badge}
                  name={row.name}
                  nickname={memberById.get(row.userId).nickname}
                  badgeText={memberById.get(row.userId).badgeText}
                  size="sm"
                />
              </>
            ) : memberById.get(row.userId)?.nickname ? (
              <small className="guest-realname">
                {" "}
                @{memberById.get(row.userId).nickname}
              </small>
            ) : null}
          </strong>
          <strong className="competition-points">
            {t("{score} pt", { score: row.score })}
          </strong>
          <div className="competition-row-actions">
            <Button
              type="button"
              variant="ghost"
              aria-label={t("Dettaglio punti di {name}", { name: row.name })}
              onClick={() => setDetailsId(row.userId)}
            >
              {t("Dettaglio punti")}
            </Button>
            {onAdjust && (
              <Button
                type="button"
                variant="outline"
                aria-label={t("Modifica punti di {name}", { name: row.name })}
                disabled={busy}
                onClick={() => onAdjust(row)}
              >
                {t("Modifica")}
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
          <h3 id={heading}>{t("Classifica di gruppo")}</h3>
          <p>
            {t(
              "Una clessidra per ogni partecipante confermato. Il livello mostra i punti di ciascuno rispetto al primo in classifica.",
            )}
          </p>
        </div>
        <div className="vessel-tools">
          <Field label={t("Visualizzazione della classifica")}>
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
                  {t(label)}
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
              <Sparkles size={16} aria-hidden="true" />
              {t("Rianima le clessidre")}
            </Button>
          )}
        </div>
      </div>
      {!rows.length ? (
        <p>
          {t("La classifica mostrerà le persone con un’iscrizione approvata.")}
        </p>
      ) : view === "list" ? (
        list
      ) : (
        <div
          className="competition-vessels"
          role="region"
          aria-label={t("Clessidre della classifica")}
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

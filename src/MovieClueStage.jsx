import { gameT, t } from "./i18n.js";
import "./movie-clue.css";

export default function MovieClueStage({ index, prompt, icons }) {
  return (
    <div className="movie-stage">
      <div className="movie-stage-frame">
        <div className="movie-stage-head">
          <span className="movie-badge">
            {t("Film #{number}", { number: index + 1 })}
          </span>
          <span className="movie-stage-tag">{t("Indizio visivo")}</span>
        </div>
        {prompt && <p className="movie-prompt">{gameT(prompt)}</p>}
        <div
          className="movie-icons-clue"
          role="group"
          aria-label={t("Icone indizio del film {number}", {
            number: index + 1,
          })}
        >
          {icons.map((icon, i) => (
            <span key={i} className="movie-icon-tile">
              {icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

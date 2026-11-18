import "./movie-clue.css";

export default function MovieClueStage({ index, prompt, icons }) {
  return (
    <div className="movie-stage">
      <div className="movie-stage-frame">
        <div className="movie-stage-head">
          <span className="movie-badge">Film #{index + 1}</span>
          <span className="movie-stage-tag">Indizio visivo</span>
        </div>
        {prompt && <p className="movie-prompt">{prompt}</p>}
        <div
          className="movie-icons-clue"
          role="group"
          aria-label={`Icone indizio del film ${index + 1}`}
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

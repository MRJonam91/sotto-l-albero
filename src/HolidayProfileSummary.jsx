import { holidayIconMap, holidayMoods } from "../shared/holidayPortrait.js";
import {
  HolidaySpiritImage,
  MovieCharacterComparison,
  TasteRadarChart,
} from "./HolidayPortrait.jsx";

export default function HolidayProfileSummary({ profile, user, onEditMood }) {
  const status = profile.holidayProfile || {};
  const portrait = profile.portrait || {};
  const hasState = Boolean(
    status.quote ||
    status.activity ||
    status.iconMessage?.length ||
    status.riddle ||
    status.customDescription?.trim() ||
    status.dailyMood?.id ||
    profile.gamesPlayed > 0 ||
    profile.stampsCount > 0 ||
    profile.context?.activity?.interactionsCount > 0 ||
    profile.context?.activity?.games?.some((game) => game.count > 0) ||
    Object.keys(status.answers || {}).length,
  );
  const icons = (status.iconMessage || [])
    .map((id) => holidayIconMap.get(id))
    .filter(Boolean);
  const mood = holidayMoods.find((item) => item.id === status.dailyMood?.id);
  const moodIsToday = status.dailyMood?.date === profile.dailyCheckin?.today;
  return (
    <section
      className="profile-panel holiday-profile-summary"
      aria-labelledby="holiday-summary-title"
      id="profile-christmas"
    >
      <div className="holiday-summary-heading">
        <h2 id="holiday-summary-title">Il tuo Natale</h2>
        <span className="holiday-summary-visibility">
          {status.portraitApproved === false
            ? "Ritratto visibile solo a te"
            : "Ritratto visibile nei tuoi gruppi"}
        </span>
      </div>
      <div className="holiday-summary-status">
        {mood && (
          <p className="holiday-summary-mood">
            <span aria-hidden="true">{mood.emoji} </span>
            <strong>
              {moodIsToday ? "Oggi mi sento come" : "Il mio ultimo stato"}:{" "}
              {mood.label}
            </strong>
          </p>
        )}
        {status.quote && <blockquote>“{status.quote}”</blockquote>}
        {status.activity && <p>{status.activity}</p>}
        {icons.length > 0 && (
          <div
            className="holiday-summary-icons"
            role="img"
            aria-label={icons.map((icon) => icon.label).join(", ")}
          >
            {icons.map((icon) => icon.emoji).join(" ")}
          </div>
        )}
        {status.iconCaption && <p>{status.iconCaption}</p>}
        {status.riddle && (
          <div>
            <strong>Il tuo indovinello</strong>
            <p>{status.riddle}</p>
          </div>
        )}
        {!hasState && (
          <p>
            Una frase, un’attività o una preferenza: scegli cosa raccontare del
            tuo Natale.
          </p>
        )}
      </div>
      {status.portraitApproved === false && (
        <p className="profile-footnote">
          Il tuo stato si legge nel gruppo; il ritratto qui sotto resta visibile
          solo a te.
        </p>
      )}
      <div>
        <h3>Il tuo ritratto</h3>
        <p className="holiday-summary-description">
          {hasState
            ? portrait.finalDescription || portrait.generatedDescription
            : "Il ritratto si forma mentre usi il tool. Le domande servono soltanto se vuoi personalizzarlo."}
        </p>
      </div>
      <p className="profile-footnote">
        Un ritratto per gioco, basato sulle tue scelte. I passaggi sono
        facoltativi.
      </p>
      <MovieCharacterComparison
        characterMatches={portrait.characterMatches}
        matchingExplanation={portrait.matchingExplanation}
      />
      {hasState && (
        <details className="holiday-summary-details">
          <summary>Immagine e gusti del ritratto</summary>
          <div>
            <HolidaySpiritImage
              name={profile.name || user.name}
              nickname={profile.nickname}
              quote={status.quote}
              activity={status.activity}
              spiritScene={portrait.spiritScene}
              topCharacter={portrait.topCharacter}
            />
            <TasteRadarChart tastes={portrait.tastes} />
          </div>
        </details>
      )}
      {onEditMood && (
        <button type="button" className="button" onClick={onEditMood}>
          Cambia stato di oggi
        </button>
      )}
      <a
        href="#profile-holiday-editor"
        className="text-button"
        onClick={() => {
          const editor = document.getElementById("profile-holiday-editor");
          if (editor) editor.open = true;
        }}
      >
        Modifica stato e ritratto
      </a>
    </section>
  );
}

import { Button } from "./ui.jsx";
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
  const hasStatus = Boolean(
    mood ||
    status.quote ||
    status.activity ||
    icons.length ||
    status.iconCaption ||
    status.riddle,
  );
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
        {!hasStatus && <p>Il tuo stato di oggi non è ancora impostato.</p>}
      </div>
      {status.portraitApproved === false && (
        <p className="profile-footnote">
          Il tuo stato si legge nel gruppo; il ritratto qui sotto resta visibile
          solo a te.
        </p>
      )}
      <div className="holiday-summary-portrait">
        <h3>Il tuo ritratto</h3>
        <HolidaySpiritImage
          name={profile.name || user.name}
          nickname={profile.nickname}
          quote={status.quote}
          activity={status.activity}
          spiritScene={portrait.spiritScene}
          topCharacter={portrait.topCharacter}
        />
        <p className="holiday-summary-description">
          {portrait.finalDescription ||
            portrait.generatedDescription ||
            "Il ritratto si forma mentre usi il tool. Le domande servono soltanto se vuoi personalizzarlo."}
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
          <summary>Gusti e dettagli del ritratto</summary>
          <div>
            <TasteRadarChart tastes={portrait.tastes} />
          </div>
        </details>
      )}
      <div className="holiday-summary-actions">
        {onEditMood && (
          <Button type="button" onClick={onEditMood}>
            Cambia stato di oggi
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const editor = document.getElementById("profile-holiday-editor");
            if (editor) {
              editor.open = true;
              editor.scrollIntoView({
                block: "start",
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              });
              editor.querySelector("summary")?.focus({ preventScroll: true });
            }
          }}
        >
          Modifica stato e ritratto
        </Button>
      </div>
    </section>
  );
}

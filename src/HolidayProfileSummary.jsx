import { t } from "./i18n.js";
import { Button } from "./ui.jsx";
import {
  computeHolidayPortrait,
  formatPortraitDescription,
  holidayIconMap,
  holidayMoods,
} from "../shared/holidayPortrait.js";
import {
  HolidaySpiritImage,
  FestiveProgressBadge,
  MovieCharacterComparison,
  TasteRadarChart,
} from "./HolidayPortrait.jsx";

export default function HolidayProfileSummary({ profile, user, onEditMood }) {
  const status = profile.holidayProfile || {};
  const fallbackPortrait =
    !profile.portrait?.tastes ||
    !profile.portrait?.characterMatches ||
    (!profile.portrait.privateSignalParts && profile.context?.activity)
      ? computeHolidayPortrait(status, {
          ...profile.context,
          name: profile.name || user.name,
          nickname: profile.nickname,
          stampsCount: profile.stampsCount ?? profile.context?.stampsCount,
          gamesPlayed: profile.gamesPlayed,
        })
      : null;
  const portrait = { ...fallbackPortrait, ...profile.portrait };
  const descriptionParts =
    profile.portrait?.descriptionParts ??
    (!profile.portrait?.finalDescription &&
    !profile.portrait?.generatedDescription
      ? fallbackPortrait?.descriptionParts
      : null);
  const activity = status.activityPreset
    ? t(status.activityPreset)
    : status.activity;
  const isInitial =
    portrait.matchingExplanation?.provisional &&
    portrait.matchingExplanation.weights?.every((source) => !source.available);
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
    >
      <div className="holiday-summary-heading">
        <h2 id="holiday-summary-title">{t("Il tuo Natale")}</h2>
        <span className="holiday-summary-visibility">
          {status.portraitApproved === false
            ? t("Ritratto visibile solo a te")
            : t("Ritratto visibile nei tuoi gruppi")}
        </span>
      </div>
      <div className="holiday-summary-primary">
        <div className="holiday-summary-status">
          {mood && (
            <p className="holiday-summary-mood">
              <span aria-hidden="true">{mood.emoji} </span>
              <strong>
                {moodIsToday
                  ? t("Oggi mi sento come")
                  : t("Il mio ultimo stato")}
                : {t(mood.label)}
              </strong>
            </p>
          )}
          {!hasStatus && (
            <p>{t("Il tuo stato di oggi non è ancora impostato.")}</p>
          )}
          <div className="holiday-summary-actions">
            {onEditMood && (
              <Button type="button" onClick={onEditMood}>
                {t("Cambia stato di oggi")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const editor = document.getElementById(
                  "profile-holiday-editor",
                );
                if (editor) {
                  editor.open = true;
                  editor.scrollIntoView({
                    block: "start",
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "auto"
                      : "smooth",
                  });
                  editor
                    .querySelector("summary")
                    ?.focus({ preventScroll: true });
                }
              }}
            >
              {t("Modifica stato e ritratto")}
            </Button>
          </div>
          {status.quote && <blockquote>“{status.quote}”</blockquote>}
          {activity && <p>{activity}</p>}
          {icons.length > 0 && (
            <div
              className="holiday-summary-icons"
              role="img"
              aria-label={icons.map((icon) => t(icon.label)).join(", ")}
            >
              {icons.map((icon) => icon.emoji).join(" ")}
            </div>
          )}
          {status.iconCaption && <p>{status.iconCaption}</p>}
          {status.riddle && (
            <div>
              <strong>{t("Il tuo indovinello")}</strong>
              <p>{status.riddle}</p>
            </div>
          )}
        </div>
        {status.portraitApproved === false && (
          <p className="profile-footnote">
            {t(
              "Il tuo stato si legge nel gruppo; il ritratto qui sotto resta visibile solo a te.",
            )}
          </p>
        )}
      </div>
      <div className="holiday-summary-portrait">
        <h3>{t("Il tuo ritratto")}</h3>
        <FestiveProgressBadge
          progress={
            portrait.festiveProgress ||
            portrait.matchingExplanation?.festiveProgress
          }
        />
        <HolidaySpiritImage
          name={profile.name || user.name}
          nickname={profile.nickname}
          quote={status.quote}
          activity={activity}
          spiritScene={portrait.spiritScene}
          topCharacter={portrait.topCharacter}
        />
        <p className="holiday-summary-description">
          {status.customDescription ||
            (descriptionParts &&
              formatPortraitDescription(descriptionParts, t)) ||
            portrait.finalDescription ||
            portrait.generatedDescription ||
            t(
              "Il ritratto si forma mentre usi il tool. Le domande servono soltanto se vuoi personalizzarlo.",
            )}
        </p>
      </div>
      <details className="profile-portrait-details">
        <summary>{t("Tratti e personaggi")}</summary>
        <div className="holiday-summary-traits">
          <div className="holiday-summary-heading">
            <h3>{t("I tuoi tratti natalizi")}</h3>
            {isInitial && <span className="quiet">{t("Valori iniziali")}</span>}
          </div>
          <TasteRadarChart tastes={portrait.tastes} />
        </div>
        <h3>{t("I tuoi personaggi di Natale")}</h3>
        <MovieCharacterComparison
          characterMatches={portrait.characterMatches}
          matchingExplanation={portrait.matchingExplanation}
          privateSignalParts={portrait.privateSignalParts}
        />
      </details>
    </section>
  );
}

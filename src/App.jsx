import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  TreePine,
  Star,
  Bell,
  Plus,
  ArrowUpRight,
  CalendarDays,
  Gift,
  ArrowLeft,
  Mail,
  ChevronRight,
  Coffee,
  Heart,
  Snowflake,
  BookOpen,
  Globe2,
  Search,
} from "lucide-react";
import { languages, setLocale, t, useLocale } from "./i18n.js";
import { api, date, money, statusLabel } from "./api.js";
import { Button, Field, Modal, Notice } from "./ui.jsx";
import Auth from "./Auth.jsx";
import Avatar from "./Avatar.jsx";
import Event from "./Event.jsx";
import SecretSantaRules from "./SecretSantaRules.jsx";
import {
  HolidayGames,
  StampAlbum,
  StampIcon,
  StampReward,
  TimedTreasures,
} from "./Holiday.jsx";
import { useStampCollection } from "./useStampCollection.js";
import { treasureStories } from "./treasureStories.js";
import { stamps } from "../shared/stamps.js";
import { version } from "../package.json";
import { gameCatalog } from "../shared/gameCatalog.js";
import AppUpdateNotice from "./AppUpdateNotice.jsx";
import InviteNotificationHint from "./InviteNotificationHint.jsx";
import EventShortcuts from "./EventShortcuts.jsx";
import {
  AmbientEffectsModal,
  AmbientEffectsOverlay,
} from "./AmbientEffects.jsx";
import {
  countActiveEffects,
  loadAmbientEffects,
  saveAmbientEffects,
} from "./ambientEffects.js";
import DailyMoodPicker from "./DailyMoodPicker.jsx";
const ProfileSettings = lazy(() => import("./ProfileSettings.jsx"));

const sectionPaths = {
  events: "/",
  wishes: "/desideri",
  archive: "/archivio",
  games: "/giochi",
  challenges: "/sfide",
  reveal: "/nome",
  profile: "/profilo",
  rules: "/regolamento",
};
const shortcutTabs = { challenges: "competition", reveal: "reveal" };
function currentEventId() {
  return (
    location.pathname.match(/^\/events\/([^/]+)$/)?.[1] ||
    (["/sfide", "/nome"].includes(location.pathname)
      ? new URLSearchParams(location.search).get("event")
      : null)
  );
}
function currentSection() {
  return (
    Object.keys(sectionPaths).find(
      (key) => sectionPaths[key] === location.pathname,
    ) ??
    history.state?.section ??
    "events"
  );
}

function requestedEventTab() {
  const tab = new URLSearchParams(location.search).get("tab");
  return ["overview", "wishlist", "reveal", "competition", "admin"].includes(
    tab,
  )
    ? tab
    : undefined;
}

function focusMain() {
  requestAnimationFrame(() => {
    // Focus must not scroll the header out of view, especially on iOS.
    document.getElementById("main")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
}

// Keep an explicit guest choice through a visit to the rules or a page refresh.
// A returning account on a new tab keeps its own saved language.
const guestLocaleKey = "sotto-albero.guest-language";
function readGuestChoice() {
  try {
    const code = sessionStorage.getItem(guestLocaleKey);
    return Object.hasOwn(languages, code) ? code : null;
  } catch {
    return null;
  }
}

export default function App() {
  const locale = useLocale();
  const [guestChoice, setGuestChoice] = useState(readGuestChoice);
  const [savingLocale, setSavingLocale] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [groupQuery, setGroupQuery] = useState("");
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [events, setEvents] = useState([]),
    [eventsReady, setEventsReady] = useState(false),
    [eventId, setEventId] = useState(currentEventId),
    [eventTab, setEventTab] = useState(
      () => requestedEventTab() ?? history.state?.eventTab,
    ),
    [section, setSection] = useState(currentSection),
    [create, setCreate] = useState(false),
    [error, setError] = useState(""),
    [secret, setSecret] = useState(null),
    [invite, setInvite] = useState(null),
    [inviteError, setInviteError] = useState(""),
    [showInviteNotice, setShowInviteNotice] = useState(false),
    [joining, setJoining] = useState(false),
    [effects, setEffects] = useState(loadAmbientEffects),
    [effectsOpen, setEffectsOpen] = useState(false),
    [checkinDraft, setCheckinDraft] = useState(null),
    [checkinOpen, setCheckinOpen] = useState(false),
    [checkinBusy, setCheckinBusy] = useState(false),
    [checkinError, setCheckinError] = useState(""),
    [checkinFeedback, setCheckinFeedback] = useState("");
  const activeEffectsCount = countActiveEffects(effects);
  function rememberGuestChoice(code) {
    setGuestChoice(code);
    try {
      if (code) sessionStorage.setItem(guestLocaleKey, code);
      else sessionStorage.removeItem(guestLocaleKey);
    } catch {
      // The choice still applies to the open page when storage is unavailable.
    }
  }
  async function changeLanguage(code) {
    setSavingLocale(true);
    try {
      if (session?.user)
        await api("/preferences/language", "PUT", { locale: code });
      await setLocale(code);
      if (!session?.user) {
        rememberGuestChoice(code);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSavingLocale(false);
    }
  }
  function updateEffects(next) {
    setEffects(saveAmbientEffects(next));
  }
  const token = location.pathname.match(/^\/invite\/([^/]+)$/)?.[1];
  const collection = useStampCollection(session?.user?.id, events);
  const loadEvents = useCallback(async () => {
    try {
      const r = await api("/events");
      setEvents(r.events);
    } finally {
      setEventsReady(true);
    }
  }, []);
  useEffect(() => {
    let active = true;
    api("/me")
      .then(async (result) => {
        if (!active) return;
        if (Object.hasOwn(languages, result.user?.locale)) {
          await setLocale(result.user.locale).catch(() => {});
        }
        if (active) {
          if (result.user) rememberGuestChoice(null);
          setSession(result);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!token || loading) return;
    let active = true;
    api("/invite/" + encodeURIComponent(token)).then(
      (result) => {
        if (active) {
          setInvite(result);
          setInviteError("");
        }
      },
      (err) => {
        if (active) {
          setInvite(null);
          setInviteError(err.message);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [token, loading, session?.user?.id]);
  useEffect(() => {
    if (session?.user) loadEvents().catch((e) => setError(e.message));
  }, [session?.user, loadEvents]);
  async function logout() {
    await api("/auth/logout", "POST");
    setError("");
    setSession((s) => ({ ...s, user: null }));
    rememberGuestChoice(null);
    setEvents([]);
    setGroupQuery("");
    setEventId(null);
    setShowInviteNotice(false);
    setCheckinDraft(null);
    setCheckinOpen(false);
    setCheckinError("");
    setCheckinFeedback("");
  }
  async function submitDailyCheckin(action) {
    setCheckinBusy(true);
    setCheckinError("");
    try {
      const payload =
        action === "complete"
          ? { action, moodId: checkinDraft }
          : { action: "skip" };
      const updated = await api("/profile/daily-checkin", "POST", payload);
      setSession((prev) =>
        prev?.user
          ? {
              ...prev,
              user: {
                ...prev.user,
                holidayProfile: updated.holidayProfile,
                dailyCheckin: updated.dailyCheckin,
              },
            }
          : prev,
      );
      setCheckinDraft(null);
      setCheckinOpen(false);
      setCheckinFeedback(
        action === "complete"
          ? "Stato di oggi salvato. Lo ritrovi nel tuo profilo."
          : "Va bene, ci ripensiamo domani. Il tuo ritratto non cambia.",
      );
    } catch (failure) {
      setCheckinError(failure.message);
    } finally {
      setCheckinBusy(false);
    }
  }
  async function join() {
    setJoining(true);
    setError("");
    try {
      const result = await api(`/events/${invite.event.id}/join`, "POST", {
        token,
      });
      setInvite((current) => ({ ...current, membership: result.membership }));
      setShowInviteNotice(true);
      await loadEvents();
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }
  function openEvent(id, eventTab) {
    const nextTab = eventTab ?? (section === "wishes" ? "wishlist" : undefined);
    setEventId(id);
    setEventTab(nextTab);
    setSection("events");
    const url = new URL(`/events/${id}`, location.origin);
    if (nextTab) url.searchParams.set("tab", nextTab);
    history.pushState({ eventTab: nextTab, section: "events" }, "", url);
    focusMain();
  }
  function selectShortcut(id, replace = false) {
    setEventId(id);
    const url = new URL(sectionPaths[section], location.origin);
    if (id) url.searchParams.set("event", id);
    if (section === "challenges") {
      const current = new URLSearchParams(location.search);
      addSelectedGame(url, current.get("game"), current.get("mode"));
    }
    history[replace ? "replaceState" : "pushState"]({}, "", url);
    if (!replace) focusMain();
  }
  function addSelectedGame(url, gameId, mode) {
    const game = gameCatalog.find((entry) => entry.id === gameId);
    if (!game) return;
    url.searchParams.set("game", game.id);
    if (mode === "friends" && game.modes.includes("friends")) {
      url.searchParams.set("mode", "friends");
      url.hash = `friends-${game.id}`;
    } else url.hash = `game-${game.id}`;
  }
  function navigate(next, gameId, mode) {
    if (next === "profile" && gameId && section === "profile") {
      location.hash = gameId;
      return;
    }
    setGroupQuery("");
    setSection(next);
    const id = shortcutTabs[next] ? eventId : null;
    setEventId(id);
    setEventTab(shortcutTabs[next]);
    const url = new URL(sectionPaths[next], location.origin);
    if (id) url.searchParams.set("event", id);
    if (next === "challenges") addSelectedGame(url, gameId, mode);
    if (next === "profile" && gameId) url.hash = gameId;
    history.pushState({}, "", url);
    focusMain();
    if (session?.user && next !== "games" && next !== "profile")
      loadEvents().catch((e) => setError(e.message));
  }
  function discover(stamp) {
    setSecret(stamp);
    collection.collect(stamp);
  }
  useEffect(() => {
    const back = () => {
      setGroupQuery("");
      setEventId(currentEventId());
      setEventTab(requestedEventTab() ?? history.state?.eventTab);
      setSection(currentSection());
    };
    addEventListener("popstate", back);
    return () => removeEventListener("popstate", back);
  }, []);
  const shown = events.filter((e) =>
    section === "archive" ? e.status === "archived" : e.status !== "archived",
  );
  const normalizedQuery = groupQuery.trim().toLocaleLowerCase(locale);
  const matches = shown.filter((event) =>
    [event.name, event.groupName].some((value) =>
      value?.toLocaleLowerCase(locale).includes(normalizedQuery),
    ),
  );
  const showDailyCheckin = Boolean(
    session?.user?.dailyCheckin?.pendingToday &&
    !token &&
    !["profile", "rules", "games"].includes(section),
  );
  return (
    <>
      <a className="skip-link" href="#main">
        {t("Vai al contenuto")}
      </a>
      <div className={`site ${effects.snow !== "off" ? "snow-on" : ""}`}>
        <AmbientEffectsOverlay effects={effects} />
        <header className="site-header">
          <button
            className="brand"
            onClick={() => navigate("events")}
            aria-label={t("Sotto l’Albero, pagina iniziale")}
          >
            <TreePine />
            <span>Sotto l’Albero</span>
          </button>
          {session?.user ? (
            <nav aria-label={t("Navigazione principale")}>
              <button
                className={section === "events" ? "selected" : ""}
                aria-current={section === "events" ? "page" : undefined}
                aria-label={t("I miei eventi")}
                onClick={() => navigate("events")}
              >
                {t("Eventi")}
              </button>
              <button
                className={section === "wishes" ? "selected" : ""}
                aria-current={section === "wishes" ? "page" : undefined}
                aria-label={t("I desideri")}
                onClick={() => navigate("wishes")}
              >
                {t("Desideri")}
              </button>
              <button
                className={section === "games" ? "selected" : ""}
                aria-current={section === "games" ? "page" : undefined}
                onClick={() => navigate("games")}
              >
                {t("Giochi")}
              </button>
              <button
                className={section === "challenges" ? "selected" : ""}
                aria-current={section === "challenges" ? "page" : undefined}
                onClick={() => navigate("challenges")}
              >
                {t("Sfide")}
              </button>
              <button
                className={section === "reveal" ? "selected" : ""}
                aria-current={section === "reveal" ? "page" : undefined}
                onClick={() => navigate("reveal")}
              >
                {t("Nome segreto")}
              </button>
              <button
                className={section === "archive" ? "selected" : ""}
                aria-current={section === "archive" ? "page" : undefined}
                onClick={() => navigate("archive")}
              >
                {t("Archivio")}
              </button>
            </nav>
          ) : (
            <span className="header-caption">
              {t("Un regalo. Un nome. Una sorpresa.")}
            </span>
          )}
          <div className="header-tools">
            <label className="locale-control">
              <Globe2 size={17} aria-hidden="true" />
              <select
                value={locale}
                disabled={loading || savingLocale || authBusy}
                onChange={(event) => changeLanguage(event.target.value)}
                aria-label={t("Lingua")}
              >
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code} lang={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={`icon-button snow-control ${activeEffectsCount > 0 ? "active" : ""}`}
              aria-label={
                activeEffectsCount === 1
                  ? t("Atmosfera di Natale (1 effetto attivo)")
                  : activeEffectsCount
                    ? t("Atmosfera di Natale ({count} effetti attivi)", {
                        count: activeEffectsCount,
                      })
                    : t("Atmosfera di Natale (nessun effetto attivo)")
              }
              aria-haspopup="dialog"
              aria-expanded={effectsOpen}
              title={t("Neve ed effetti natalizi")}
              onClick={() => setEffectsOpen(true)}
            >
              <Snowflake size={19} aria-hidden="true" />
              {activeEffectsCount > 1 && (
                <span className="snow-badge" aria-hidden="true">
                  {activeEffectsCount}
                </span>
              )}
            </button>
            {session?.user ? (
              <button
                className="profile"
                onClick={() => navigate("profile")}
                title={t("Profilo e album dei timbri")}
                aria-label={t("Apri il mio profilo")}
                aria-current={section === "profile" ? "page" : undefined}
              >
                <Avatar
                  userId={session.user.id}
                  name={session.user.name}
                  avatar={session.user.avatar}
                />
              </button>
            ) : (
              <span className="small-star">✧</span>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <AppUpdateNotice
            idlePage={
              !eventId && ["events", "wishes", "archive"].includes(section)
            }
          />
          <Notice error>{error || (token ? inviteError : "")}</Notice>
          {checkinFeedback ? (
            <div className="daily-checkin-feedback">
              <span>{t(checkinFeedback)}</span>
              <div className="button-row">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setCheckinFeedback("");
                    navigate("profile");
                  }}
                >
                  {t("Apri il profilo")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setCheckinFeedback("")}
                >
                  {t("Chiudi")}
                </button>
              </div>
            </div>
          ) : null}
          {showDailyCheckin ? (
            <section
              className="daily-checkin-strip"
              aria-label={t("Check-in natalizio di oggi")}
            >
              <div className="daily-checkin-strip-copy">
                <strong>{t("Come ti senti oggi?")}</strong>
                <span>{t("Una sola scelta natalizia, se ti va.")}</span>
              </div>
              <div className="button-row">
                <Button
                  type="button"
                  disabled={checkinBusy}
                  onClick={() => {
                    setCheckinError("");
                    setCheckinOpen(true);
                  }}
                >
                  {t("Scegli lo stato")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={checkinBusy}
                  onClick={() => submitDailyCheckin("skip")}
                >
                  {t("Non ora")}
                </Button>
              </div>
              <Notice error>{checkinError}</Notice>
            </section>
          ) : null}
          {showDailyCheckin && checkinOpen ? (
            <Modal
              title={t("Oggi mi sento come…")}
              onClose={() => setCheckinOpen(false)}
            >
              <Notice error>{checkinError}</Notice>
              <DailyMoodPicker
                value={checkinDraft}
                onChange={setCheckinDraft}
                busy={checkinBusy}
                onSave={() => submitDailyCheckin("complete")}
              />
            </Modal>
          ) : null}
          {section === "rules" ? (
            <SecretSantaRules />
          ) : loading ? (
            <div className="loading">{t("Prepariamo le lettere…")}</div>
          ) : (
            <>
              {invite?.requiresSignIn && token && !session?.user ? (
                <section
                  className="invitation paper"
                  aria-label={t("Ritrova il tuo evento")}
                >
                  <h2>{t("Il tuo evento ti aspetta")}</h2>
                  <p>
                    {t(
                      "Le iscrizioni sono chiuse. Se hai già aderito, puoi ancora aprire l’evento.",
                    )}
                  </p>
                  <p>
                    {t(
                      "Accedi qui sotto con la stessa email usata per partecipare. L’invito chiuso non cancella la tua iscrizione.",
                    )}
                  </p>
                </section>
              ) : null}
              {invite?.event && token && !eventId ? (
                <section className="invitation paper">
                  <span className="eyebrow">{t("Ti aspettiamo")}</span>
                  <h2>{invite.event.name}</h2>
                  <p>
                    {t(
                      "{name} ti invita a scambiare un regalo con il gruppo.",
                      { name: invite.organizerName },
                    )}
                  </p>
                  <div className="inline-info">
                    <span>
                      <Gift size={17} /> {money(invite.event.budget)}
                    </span>
                    <span>
                      <CalendarDays size={17} /> {date(invite.event.giftAt)}
                    </span>
                  </div>
                  <p>{invite.event.description}</p>
                  <small>
                    {t(
                      "Chi organizza può vedere e modificare gli abbinamenti. Chi partecipa vede solo il nome della persona a cui farà il regalo.",
                    )}
                  </small>
                  {session?.user ? (
                    invite.membership === "approved" || invite.isOwner ? (
                      <div className="invitation-action">
                        <p>
                          {invite.isOwner && !invite.membership
                            ? t("Questo è il tuo evento.")
                            : t("Il tuo posto è confermato.")}
                        </p>
                        <Button
                          onClick={() =>
                            openEvent(
                              invite.event.id,
                              invite.closed && invite.membership === "approved"
                                ? "reveal"
                                : undefined,
                            )
                          }
                        >
                          {t("Apri l’evento")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={join}
                        busy={joining}
                        disabled={
                          invite.membership === "pending" || invite.closed
                        }
                      >
                        {invite.membership === "pending"
                          ? t("Richiesta inviata: ti faremo sapere")
                          : invite.closed
                            ? t("Le iscrizioni sono chiuse")
                            : t("Voglio partecipare")}
                      </Button>
                    )
                  ) : (
                    <p className="invitation-action">
                      {t("Accedi qui sotto per partecipare.")}
                    </p>
                  )}
                  {showInviteNotice && session?.user ? (
                    <InviteNotificationHint
                      key={session.user.id}
                      onConfigure={() => {
                        setShowInviteNotice(false);
                        navigate("profile", "telegram");
                      }}
                      onDismiss={() => setShowInviteNotice(false)}
                    />
                  ) : null}
                </section>
              ) : null}
              {!session?.user ? (
                <Auth
                  preferExisting={!!invite?.requiresSignIn || !!eventId}
                  chosenLocale={guestChoice}
                  savingLocale={savingLocale}
                  busy={authBusy}
                  setBusy={setAuthBusy}
                  local={session?.local}
                  mailConfigured={session?.mailConfigured}
                  onLogin={async (user) => {
                    if (Object.hasOwn(languages, user.locale))
                      await setLocale(user.locale).catch(() => {});
                    setError("");
                    rememberGuestChoice(null);
                    setSession((s) => ({ ...s, user }));
                  }}
                />
              ) : shortcutTabs[section] ? (
                <EventShortcuts
                  events={events}
                  loading={!eventsReady}
                  selectedId={eventId}
                  target={shortcutTabs[section]}
                  user={session.user}
                  onSelect={selectShortcut}
                  onOverview={openEvent}
                  onGroups={() => navigate("events")}
                  onChange={loadEvents}
                  onStamp={collection.collect}
                />
              ) : eventId ? (
                <>
                  <button
                    className="back-link"
                    onClick={() => {
                      navigate("events");
                    }}
                  >
                    <ArrowLeft size={16} /> {t("Tutti gli eventi")}
                  </button>
                  <Event
                    key={`${eventId}:${eventTab || "overview"}`}
                    id={eventId}
                    initialTab={
                      eventTab ??
                      (section === "wishes" ? "wishlist" : "overview")
                    }
                    user={session.user}
                    onOpen={(id) => {
                      openEvent(id);
                      loadEvents();
                    }}
                    onChange={loadEvents}
                    onStamp={collection.collect}
                  />
                </>
              ) : section === "profile" ? (
                <Suspense
                  fallback={<p role="status">{t("Carichiamo il profilo…")}</p>}
                >
                  <ProfileSettings
                    user={session.user}
                    onLogout={logout}
                    album={
                      <StampAlbum collection={collection} onStory={setSecret} />
                    }
                    onChange={({
                      name,
                      nickname,
                      badge,
                      badgeText,
                      holidayProfile,
                      dailyCheckin,
                      phone,
                      avatar,
                    }) =>
                      setSession((previous) =>
                        previous?.user?.id === session.user.id
                          ? {
                              ...previous,
                              user: {
                                ...previous.user,
                                ...(name ? { name } : {}),
                                nickname:
                                  nickname !== undefined
                                    ? nickname
                                    : previous.user.nickname,
                                badge:
                                  badge !== undefined
                                    ? badge
                                    : previous.user.badge,
                                badgeText: badgeText || previous.user.badgeText,
                                ...(holidayProfile ? { holidayProfile } : {}),
                                ...(dailyCheckin ? { dailyCheckin } : {}),
                                phone,
                                avatar,
                              },
                            }
                          : previous,
                      )
                    }
                  />
                </Suspense>
              ) : section === "games" ? (
                <HolidayGames
                  key={session.user.id}
                  collection={collection}
                  events={events}
                  onCompete={(gameId, mode) =>
                    navigate("challenges", gameId, mode)
                  }
                  onAlbum={() => navigate("profile", "album")}
                  onGroups={() => navigate("events")}
                  onDiscover={discover}
                />
              ) : (
                <>
                  {section === "events" && eventsReady && !shown.length && (
                    <section className="hero">
                      <img
                        className="hero-image"
                        src="/hero.webp"
                        alt={t(
                          "Una sfera di neve, un albero illuminato e una lettera chiusa con la ceralacca",
                        )}
                      />
                      <div className="hero-copy">
                        <h1>
                          {t("Gestisci i tuoi gruppi Secret Santa")}{" "}
                          <em>{t("con tutta la magia del Natale")}</em>
                        </h1>
                        <p>
                          {t(
                            "Crea e condividi i tuoi gruppi. Giocate insieme e organizzate lo scambio.",
                          )}
                        </p>
                        <div className="hero-actions">
                          <Button onClick={() => setCreate(true)}>
                            <Plus size={18} /> {t("Crea un Secret Santa")}
                          </Button>
                        </div>
                        <div className="hero-links">
                          <a className="santa-rules-link" href="/regolamento">
                            <BookOpen size={17} aria-hidden="true" />
                            {t("Regolamento del Secret Santa")}
                          </a>
                          <button
                            type="button"
                            className="text-button hunt-link"
                            onClick={() => navigate("profile", "album")}
                          >
                            {t("Caccia al tesoro e album dei timbri")}{" "}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <button
                        className="hidden-star"
                        aria-label={t("Una stella da accendere")}
                        onClick={() => discover("star")}
                      >
                        <Star size={22} aria-hidden="true" />
                      </button>
                      <TimedTreasures
                        section={section}
                        collection={collection}
                        onDiscover={discover}
                      />
                    </section>
                  )}
                  <section
                    className={`events-section ${section !== "events" || !eventsReady || shown.length ? "events-standalone" : ""}`}
                    id="my-groups"
                  >
                    <div className="section-title">
                      {section === "events" &&
                      (!eventsReady || shown.length) ? (
                        <h1>{t("I tuoi Secret Santa")}</h1>
                      ) : section === "events" ? (
                        <h2>{t("I tuoi Secret Santa")}</h2>
                      ) : (
                        <h1>
                          {section === "archive"
                            ? t("I Natali passati")
                            : t("Un pensiero per chi ti pensa")}
                        </h1>
                      )}
                      <span />
                      {section === "wishes" && (
                        <button
                          type="button"
                          className="hunt-object icon-button"
                          aria-label={t("Un pacchetto tra i desideri")}
                          onClick={() => discover("gift")}
                        >
                          <Gift size={24} aria-hidden="true" />
                        </button>
                      )}
                      {section === "archive" && (
                        <button
                          type="button"
                          className="hunt-object icon-button"
                          aria-label={t("Una campanella nell’archivio")}
                          onClick={() => discover("bell")}
                        >
                          <Bell size={24} aria-hidden="true" />
                        </button>
                      )}
                      {(section === "archive" || section === "wishes") && (
                        <TimedTreasures
                          section={section}
                          collection={collection}
                          onDiscover={discover}
                        />
                      )}
                      {shown.length ? (
                        <small>
                          {shown.length}{" "}
                          {shown.length === 1 ? t("evento") : t("eventi")}
                        </small>
                      ) : null}
                    </div>
                    {section === "events" && shown.length > 0 && (
                      <div className="groups-toolbar">
                        <Button onClick={() => setCreate(true)}>
                          <Plus size={18} aria-hidden="true" />{" "}
                          {t("Crea un Secret Santa")}
                        </Button>
                        <div className="groups-collectibles">
                          <button
                            type="button"
                            className="hunt-object icon-button"
                            aria-label={t("Una stella da accendere")}
                            onClick={() => discover("star")}
                          >
                            <Star size={22} aria-hidden="true" />
                          </button>
                          <TimedTreasures
                            section={section}
                            collection={collection}
                            onDiscover={discover}
                          />
                        </div>
                      </div>
                    )}
                    {section === "wishes" ? (
                      <p className="section-intro">
                        {t(
                          "Apri uno scambio e lascia un desiderio per chi ti farà il regalo. Anche un piccolo indizio basta.",
                        )}
                      </p>
                    ) : null}
                    {!eventsReady ? (
                      <p role="status">{t("Cerchiamo i tuoi scambi…")}</p>
                    ) : shown.length ? (
                      <div className="event-list">
                        {(shown.length > 1 || groupQuery) && (
                          <label className="group-filter">
                            <Search size={17} aria-hidden="true" />
                            <input
                              type="search"
                              aria-label={t("Cerca tra i tuoi gruppi")}
                              placeholder={t("Cerca per gruppo o scambio")}
                              value={groupQuery}
                              onChange={(event) =>
                                setGroupQuery(event.target.value)
                              }
                            />
                          </label>
                        )}
                        {matches.length === 0 && (
                          <p className="group-no-match" role="status">
                            {t("Nessun gruppo corrisponde alla ricerca.")}
                            <button
                              className="text-button"
                              onClick={() => setGroupQuery("")}
                            >
                              {t("Mostra tutti")}
                            </button>
                          </p>
                        )}
                        {matches.map((e) => (
                          <button
                            className="event-row"
                            key={e.id}
                            onClick={() => openEvent(e.id)}
                          >
                            <span className="envelope-mini" aria-hidden="true">
                              <Mail size={32} />
                              <TreePine size={12} />
                            </span>
                            <span className="event-main">
                              {e.groupName && e.groupName !== e.name && (
                                <span className="group-name">
                                  {e.groupName}
                                </span>
                              )}
                              <span className="event-name">{e.name}</span>
                              <span className="event-dates">
                                <span>
                                  <CalendarDays size={16} /> {date(e.drawAt)}
                                </span>
                                <span>
                                  <Gift size={16} /> {money(e.budget)}
                                </span>
                              </span>
                            </span>
                            <span
                              className={`status ${e.status === "drawn" ? "ready" : ""}`}
                            >
                              {statusLabel(e.status)}
                            </span>
                            <span className="row-action">
                              {section === "wishes"
                                ? t("Scrivi la tua lettera")
                                : t("Apri evento")}
                              <ChevronRight size={18} />
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <Mail size={35} />
                        <h3>
                          {section === "archive"
                            ? t("Qui terremo i bei ricordi.")
                            : t("C’è posto per il tuo primo Natale.")}
                        </h3>
                        <p>
                          {section === "archive"
                            ? t(
                                "Qui ritrovi gli scambi conclusi. L’anno prossimo puoi ripartire dallo stesso gruppo.",
                              )
                            : session.user.organizer
                              ? t(
                                  "Crea uno scambio e manda l’invito al tuo gruppo.",
                                )
                              : t(
                                  "Hai ricevuto un invito? Aprilo per partecipare. Lo scambio comparirà qui.",
                                )}
                        </p>
                        {section !== "archive" ? (
                          <button
                            className="text-button"
                            onClick={() => setCreate(true)}
                          >
                            {t("Prepariamo il primo?")}
                            <ArrowUpRight size={17} />
                          </button>
                        ) : null}
                      </div>
                    )}
                    {section !== "events" && (
                      <Button
                        variant="outline"
                        onClick={() => navigate("events")}
                      >
                        {t("Vai ai tuoi gruppi")}
                      </Button>
                    )}
                  </section>
                  {section !== "archive" && (
                    <section className="letter-strip paper">
                      <div>
                        <span className="eyebrow">{t("Basta un indizio")}</span>
                        <h2>
                          {t("“Mi piacciono i libri” è già un buon inizio.")}
                        </h2>
                        <p>
                          {t(
                            "Un desiderio, un colore, qualcosa che usi ogni giorno. Aiuta chi ti farà il regalo a scegliere con cura.",
                          )}
                        </p>
                      </div>
                      {section === "events" && (
                        <button
                          className="postmark"
                          aria-label={t("Una teiera fuori posto")}
                          onClick={() => discover("teapot")}
                        >
                          <Coffee size={31} aria-hidden="true" />
                          <span>{t("POSTA DI NATALE")}</span>
                        </button>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </main>
        <footer className="site-footer">
          <div
            className={`site-affiliate-info ${session?.amazonAffiliation ? "affiliate-active" : ""}`}
          >
            <strong>{t("Info")}</strong>
            <p id="amazon-site-information">
              {t(
                "In qualità di Affiliato Amazon io ricevo un guadagno dagli acquisti idonei.",
              )}
            </p>
            <p id="amazon-external-information">
              {t(
                "Alcuni link Amazon in questa lista possono generare una commissione di affiliazione.",
              )}
            </p>
          </div>
          <span>
            {t("Fatto per ritrovarsi. E per tenere un piccolo segreto.")}
          </span>
          <a
            href="/regolamento"
            aria-current={section === "rules" ? "page" : undefined}
          >
            {t("Regolamento del Secret Santa")}
          </a>
          <span>
            Sotto l’Albero · v{version} <Heart size={12} aria-hidden="true" />
          </span>
        </footer>
      </div>
      {create ? (
        <CreateEvent
          onClose={() => setCreate(false)}
          onCreated={(e) => {
            setCreate(false);
            openEvent(e.id, "admin");
            loadEvents();
          }}
        />
      ) : null}
      {effectsOpen && (
        <AmbientEffectsModal
          effects={effects}
          onChange={updateEffects}
          onClose={() => setEffectsOpen(false)}
        />
      )}
      {secret && (
        <Treasure
          id={secret}
          collection={collection}
          onClose={() => setSecret(null)}
          onAlbum={
            section === "profile" && location.hash === "#album"
              ? undefined
              : () => {
                  setSecret(null);
                  navigate("profile", "album");
                }
          }
        />
      )}
    </>
  );
}

function Treasure({ id, collection, onClose, onAlbum }) {
  const scene = treasureStories[id];
  return (
    <Modal title={t(scene?.title ?? stamps[id].name)} onClose={onClose}>
      {scene?.quote && (
        <blockquote className="quote" lang="en">
          “{scene.quote}”
        </blockquote>
      )}
      {scene && (
        <p className="quiet">
          <cite>{scene.source}</cite>
        </p>
      )}
      <p className="hunt-discovery">
        <StampIcon id={id} size={35} /> {t(scene?.story ?? stamps[id].story)}
      </p>
      {scene && (
        <a href={scene.link} target="_blank" rel="noreferrer">
          {t(scene.linkLabel)} <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      )}
      <StampReward id={id} collection={collection} />
      {onAlbum && (
        <Button type="button" variant="ghost" onClick={onAlbum}>
          {t("Apri l’album")}
        </Button>
      )}
    </Modal>
  );
}

function CreateEvent({ onClose, onCreated }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const v = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await api("/events", "POST", {
        ...v,
        organizerParticipates: v.organizerParticipates === "on",
        budget: Number(v.budget),
        closeAt: new Date(v.closeAt).toISOString(),
        drawAt: new Date(v.drawAt).toISOString(),
        giftAt: new Date(v.giftAt).toISOString(),
      });
      onCreated(r.event);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t("Prepariamo il tuo Secret Santa")} onClose={onClose} wide>
      <p>
        {t(
          "Scegli il nome, le date e il budget. Dopo potrai mandare gli inviti e impostare le esclusioni.",
        )}
      </p>
      <form onSubmit={submit} className="form-stack">
        <div className="form-grid">
          <Field
            label={t("Nome dello scambio")}
            name="name"
            placeholder={t("Il Natale del nostro gruppo")}
            required
            maxLength={100}
          />
          <Field
            label={t("Nome del gruppo (facoltativo)")}
            name="groupName"
            placeholder={t("Es. Famiglia, Amici…")}
            maxLength={100}
          />
        </div>
        <div className="form-grid">
          <Field
            label={t("Budget a persona (€)")}
            type="number"
            name="budget"
            min="1"
            max="10000"
            defaultValue="25"
            required
          />
          <label className="participation-choice">
            <input type="checkbox" name="organizerParticipates" />
            {t("Partecipo anch’io allo scambio")}
          </label>
        </div>
        <div className="form-grid three">
          <Field
            label={t("Iscrizioni fino al")}
            name="closeAt"
            type="datetime-local"
            required
          />
          <Field
            label={t("Estraiamo i nomi il")}
            name="drawAt"
            type="datetime-local"
            required
          />
          <Field
            label={t("Ci scambiamo i regali il")}
            name="giftAt"
            type="datetime-local"
            required
          />
        </div>
        <p className="quiet">
          {t(
            "Le date e gli orari seguono il fuso del tuo dispositivo. Fuso in uso: {zone}.",
            { zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          )}
        </p>
        <Field label={t("Un messaggio per il gruppo")}>
          <textarea
            name="description"
            maxLength={2000}
            rows={3}
            placeholder={t("Dove ci troviamo? C’è qualcosa da sapere?")}
          />
        </Field>
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Torna indietro")}
          </Button>
          <Button busy={busy}>
            {t("Crea e invita")}
            <ArrowUpRight size={17} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

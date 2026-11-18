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
} from "lucide-react";
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

export default function App() {
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
    api("/me")
      .then(setSession)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
    setEvents([]);
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
    history[replace ? "replaceState" : "pushState"]({}, "", url);
    if (!replace) focusMain();
  }
  function navigate(next) {
    setSection(next);
    const id = shortcutTabs[next] ? eventId : null;
    setEventId(id);
    setEventTab(shortcutTabs[next]);
    const url = new URL(sectionPaths[next], location.origin);
    if (id) url.searchParams.set("event", id);
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
  const showDailyCheckin = Boolean(
    session?.user?.dailyCheckin?.pendingToday &&
    !token &&
    !["profile", "rules", "games"].includes(section),
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Vai al contenuto
      </a>
      <div className={`site ${effects.snow !== "off" ? "snow-on" : ""}`}>
        <AmbientEffectsOverlay effects={effects} />
        <header className="site-header">
          <button
            className="brand"
            onClick={() => navigate("events")}
            aria-label="Sotto l’Albero, pagina iniziale"
          >
            <TreePine />
            <span>Sotto l’Albero</span>
          </button>
          {session?.user ? (
            <nav aria-label="Navigazione principale">
              <button
                className={section === "events" ? "selected" : ""}
                aria-current={section === "events" ? "page" : undefined}
                aria-label="I miei eventi"
                onClick={() => navigate("events")}
              >
                Eventi
              </button>
              <button
                className={section === "wishes" ? "selected" : ""}
                aria-current={section === "wishes" ? "page" : undefined}
                aria-label="I desideri"
                onClick={() => navigate("wishes")}
              >
                Desideri
              </button>
              <button
                className={section === "games" ? "selected" : ""}
                aria-current={section === "games" ? "page" : undefined}
                onClick={() => navigate("games")}
              >
                Giochi
              </button>
              <button
                className={section === "challenges" ? "selected" : ""}
                aria-current={section === "challenges" ? "page" : undefined}
                onClick={() => navigate("challenges")}
              >
                Sfide
              </button>
              <button
                className={section === "reveal" ? "selected" : ""}
                aria-current={section === "reveal" ? "page" : undefined}
                onClick={() => navigate("reveal")}
              >
                Nome segreto
              </button>
              <button
                className={section === "archive" ? "selected" : ""}
                aria-current={section === "archive" ? "page" : undefined}
                onClick={() => navigate("archive")}
              >
                Archivio
              </button>
            </nav>
          ) : (
            <span className="header-caption">
              Un regalo. Un nome. Una sorpresa.
            </span>
          )}
          <div className="header-tools">
            <button
              className={`icon-button snow-control ${activeEffectsCount > 0 ? "active" : ""}`}
              aria-label={
                activeEffectsCount > 0
                  ? `Atmosfera di Natale (${activeEffectsCount} ${activeEffectsCount === 1 ? "effetto attivo" : "effetti attivi"})`
                  : "Atmosfera di Natale (nessun effetto attivo)"
              }
              aria-haspopup="dialog"
              aria-expanded={effectsOpen}
              title="Neve ed effetti natalizi"
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
                title="Profilo e album dei timbri"
                aria-label="Apri il mio profilo"
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
              <span>{checkinFeedback}</span>
              <div className="button-row">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setCheckinFeedback("");
                    navigate("profile");
                  }}
                >
                  Apri il profilo
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setCheckinFeedback("")}
                >
                  Chiudi
                </button>
              </div>
            </div>
          ) : null}
          {showDailyCheckin ? (
            <section
              className="daily-checkin-strip"
              aria-label="Check-in natalizio di oggi"
            >
              <div className="daily-checkin-strip-copy">
                <strong>Come ti senti oggi?</strong>
                <span>Una sola scelta natalizia, se ti va.</span>
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
                  Scegli lo stato
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={checkinBusy}
                  onClick={() => submitDailyCheckin("skip")}
                >
                  Non ora
                </Button>
              </div>
              <Notice error>{checkinError}</Notice>
            </section>
          ) : null}
          {showDailyCheckin && checkinOpen ? (
            <Modal
              title="Oggi mi sento come…"
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
            <div className="loading">Prepariamo le lettere…</div>
          ) : (
            <>
              {invite?.requiresSignIn && token && !session?.user ? (
                <section
                  className="invitation paper"
                  aria-label="Ritrova il tuo evento"
                >
                  <h2>Il tuo evento ti aspetta</h2>
                  <p>
                    Le iscrizioni sono chiuse. Se hai già aderito, puoi ancora
                    aprire l’evento.
                  </p>
                  <p>
                    Accedi qui sotto con la stessa email usata per partecipare.
                    L’invito chiuso non cancella la tua iscrizione.
                  </p>
                </section>
              ) : null}
              {invite?.event && token && !eventId ? (
                <section className="invitation paper">
                  <span className="eyebrow">Ti aspettiamo</span>
                  <h2>{invite.event.name}</h2>
                  <p>
                    {invite.organizerName} ti invita a scambiare un regalo con
                    il gruppo.
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
                    Chi organizza può vedere e modificare gli abbinamenti. Chi
                    partecipa vede solo il nome della persona a cui farà il
                    regalo.
                  </small>
                  {session?.user ? (
                    invite.membership === "approved" || invite.isOwner ? (
                      <div className="invitation-action">
                        <p>
                          {invite.isOwner && !invite.membership
                            ? "Questo è il tuo evento."
                            : "Il tuo posto è confermato."}
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
                          Apri l’evento
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
                          ? "Richiesta inviata: ti faremo sapere"
                          : invite.closed
                            ? "Le iscrizioni sono chiuse"
                            : "Voglio partecipare"}
                      </Button>
                    )
                  ) : (
                    <p className="invitation-action">
                      Accedi qui sotto per partecipare.
                    </p>
                  )}
                  {showInviteNotice && session?.user ? (
                    <InviteNotificationHint
                      key={session.user.id}
                      onConfigure={() => {
                        setShowInviteNotice(false);
                        navigate("profile");
                        history.replaceState(
                          history.state,
                          "",
                          "/profilo#telegram",
                        );
                      }}
                      onDismiss={() => setShowInviteNotice(false)}
                    />
                  ) : null}
                </section>
              ) : null}
              {!session?.user ? (
                <Auth
                  preferExisting={!!invite?.requiresSignIn || !!eventId}
                  local={session?.local}
                  mailConfigured={session?.mailConfigured}
                  onLogin={(user) => {
                    setError("");
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
                    <ArrowLeft size={16} /> Tutti gli eventi
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
                <StampAlbum
                  user={session.user}
                  collection={collection}
                  onLogout={logout}
                  onStory={setSecret}
                >
                  <Suspense
                    fallback={<p role="status">Carichiamo il profilo…</p>}
                  >
                    <ProfileSettings
                      user={session.user}
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
                                  badgeText:
                                    badgeText || previous.user.badgeText,
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
                </StampAlbum>
              ) : section === "games" ? (
                <HolidayGames
                  key={session.user.id}
                  collection={collection}
                  events={events}
                  onCompete={() => navigate("challenges")}
                  onAlbum={() => navigate("profile")}
                  onGroups={() => navigate("events")}
                  onDiscover={discover}
                />
              ) : (
                <>
                  <section className="hero">
                    <img
                      className="hero-image"
                      src="/hero.webp"
                      alt="Una sfera di neve, un albero illuminato e una lettera chiusa con la ceralacca"
                    />
                    <div className="hero-copy">
                      <h1>
                        Gestisci i tuoi gruppi Secret Santa{" "}
                        <em>con tutta la magia del Natale</em>
                      </h1>
                      <p>
                        Crea e condividi i tuoi gruppi. Giocate insieme e
                        organizzate lo scambio.
                      </p>
                      <Button onClick={() => setCreate(true)}>
                        <Plus size={18} /> Crea un Secret Santa
                      </Button>
                      {section === "events" && (
                        <>
                          <a className="santa-rules-link" href="/regolamento">
                            <BookOpen size={17} aria-hidden="true" />
                            Regolamento del Secret Santa
                          </a>
                          <button
                            type="button"
                            className="text-button hunt-link"
                            onClick={() => navigate("profile")}
                          >
                            Caccia al tesoro e album dei timbri{" "}
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                    {section === "events" && (
                      <button
                        className="hidden-star"
                        aria-label="Una stella da accendere"
                        onClick={() => discover("star")}
                      >
                        <Star size={22} aria-hidden="true" />
                      </button>
                    )}
                    {section === "events" && (
                      <TimedTreasures
                        section={section}
                        collection={collection}
                        onDiscover={discover}
                      />
                    )}
                  </section>
                  <section className="events-section">
                    <div className="section-title">
                      <h2>
                        {section === "archive"
                          ? "I Natali passati"
                          : section === "wishes"
                            ? "Un pensiero per chi ti pensa"
                            : "I tuoi Secret Santa"}
                      </h2>
                      <span />
                      {section === "wishes" && (
                        <button
                          type="button"
                          className="hunt-object icon-button"
                          aria-label="Un pacchetto tra i desideri"
                          onClick={() => discover("gift")}
                        >
                          <Gift size={24} aria-hidden="true" />
                        </button>
                      )}
                      {section === "archive" && (
                        <button
                          type="button"
                          className="hunt-object icon-button"
                          aria-label="Una campanella nell’archivio"
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
                          {shown.length === 1 ? "evento" : "eventi"}
                        </small>
                      ) : null}
                    </div>
                    {section === "wishes" ? (
                      <p className="section-intro">
                        Apri uno scambio e lascia un desiderio per chi ti farà
                        il regalo. Anche un piccolo indizio basta.
                      </p>
                    ) : null}
                    {shown.length ? (
                      <div className="event-list">
                        {shown.map((e) => (
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
                                ? "Scrivi la tua lettera"
                                : "Apri evento"}
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
                            ? "Qui terremo i bei ricordi."
                            : "C’è posto per il tuo primo Natale."}
                        </h3>
                        <p>
                          {section === "archive"
                            ? "Qui ritrovi gli scambi conclusi. L’anno prossimo puoi ripartire dallo stesso gruppo."
                            : session.user.organizer
                              ? "Crea uno scambio e manda l’invito al tuo gruppo."
                              : "Hai ricevuto un invito? Aprilo per partecipare. Lo scambio comparirà qui."}
                        </p>
                        {section !== "archive" ? (
                          <button
                            className="text-button"
                            onClick={() => setCreate(true)}
                          >
                            Prepariamo il primo?
                            <ArrowUpRight size={17} />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </section>
                  <section className="letter-strip paper">
                    <div>
                      <span className="eyebrow">Basta un indizio</span>
                      <h2>“Mi piacciono i libri” è già un buon inizio.</h2>
                      <p>
                        Un desiderio, un colore, qualcosa che usi ogni giorno.
                        Aiuta chi ti farà il regalo a scegliere con cura.
                      </p>
                    </div>
                    {section === "events" && (
                      <button
                        className="postmark"
                        aria-label="Una teiera fuori posto"
                        onClick={() => discover("teapot")}
                      >
                        <Coffee size={31} aria-hidden="true" />
                        <span>POSTA DI NATALE</span>
                      </button>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
        <footer>
          <span>Fatto per ritrovarsi. E per tenere un piccolo segreto.</span>
          <a
            href="/regolamento"
            aria-current={section === "rules" ? "page" : undefined}
          >
            Regolamento del Secret Santa
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
            section === "profile" && !eventId
              ? undefined
              : () => {
                  setSecret(null);
                  navigate("profile");
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
    <Modal title={scene?.title ?? stamps[id].name} onClose={onClose}>
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
        <StampIcon id={id} size={35} /> {scene?.story ?? stamps[id].story}
      </p>
      {scene && (
        <a href={scene.link} target="_blank" rel="noreferrer">
          {scene.linkLabel} <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      )}
      <StampReward id={id} collection={collection} />
      {onAlbum && (
        <Button type="button" variant="ghost" onClick={onAlbum}>
          Apri l’album
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
    <Modal title="Prepariamo il tuo Secret Santa" onClose={onClose} wide>
      <p>
        Scegli il nome, le date e il budget. Dopo potrai mandare gli inviti e
        impostare le esclusioni.
      </p>
      <form onSubmit={submit} className="form-stack">
        <div className="form-grid">
          <Field
            label="Nome dello scambio"
            name="name"
            placeholder="Il Natale del nostro gruppo"
            required
            maxLength={100}
          />
          <Field
            label="Nome del gruppo (facoltativo)"
            name="groupName"
            placeholder="Es. Famiglia, Amici…"
            maxLength={100}
          />
        </div>
        <div className="form-grid">
          <Field
            label="Budget a persona (€)"
            type="number"
            name="budget"
            min="1"
            max="10000"
            defaultValue="25"
            required
          />
          <label className="participation-choice">
            <input type="checkbox" name="organizerParticipates" />
            Partecipo anch’io allo scambio
          </label>
        </div>
        <div className="form-grid three">
          <Field
            label="Iscrizioni fino al"
            name="closeAt"
            type="datetime-local"
            required
          />
          <Field
            label="Estraiamo i nomi il"
            name="drawAt"
            type="datetime-local"
            required
          />
          <Field
            label="Ci scambiamo i regali il"
            name="giftAt"
            type="datetime-local"
            required
          />
        </div>
        <p className="quiet">
          Le date e gli orari seguono il fuso del tuo dispositivo. Fuso in uso:{" "}
          {Intl.DateTimeFormat().resolvedOptions().timeZone}.
        </p>
        <Field label="Un messaggio per il gruppo">
          <textarea
            name="description"
            maxLength={2000}
            rows={3}
            placeholder="Dove ci troviamo? C’è qualcosa da sapere?"
          />
        </Field>
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Torna indietro
          </Button>
          <Button busy={busy}>
            Crea e invita
            <ArrowUpRight size={17} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

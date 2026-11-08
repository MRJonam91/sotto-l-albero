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
import { stamps } from "../shared/stamps.js";
const ProfileSettings = lazy(() => import("./ProfileSettings.jsx"));

const sectionPaths = {
  events: "/",
  wishes: "/desideri",
  archive: "/archivio",
  games: "/giochi",
  profile: "/profilo",
  rules: "/regolamento",
};
function currentSection() {
  return (
    Object.keys(sectionPaths).find(
      (key) => sectionPaths[key] === location.pathname,
    ) ??
    history.state?.section ??
    "events"
  );
}

function focusMain() {
  requestAnimationFrame(() => document.getElementById("main")?.focus());
}

export default function App() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [events, setEvents] = useState([]),
    [eventId, setEventId] = useState(
      () => location.pathname.match(/^\/events\/([^/]+)$/)?.[1] || null,
    ),
    [section, setSection] = useState(currentSection),
    [create, setCreate] = useState(false),
    [error, setError] = useState(""),
    [secret, setSecret] = useState(null),
    [invite, setInvite] = useState(null),
    [joining, setJoining] = useState(false),
    [snow, setSnow] = useState(
      () => localStorage.getItem("sla-snow") !== "off",
    );
  const token = location.pathname.match(/^\/invite\/([^/]+)$/)?.[1];
  const collection = useStampCollection(session?.user?.id);
  const loadEvents = useCallback(async () => {
    const r = await api("/events");
    setEvents(r.events);
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
        if (active) setInvite(result);
      },
      (err) => {
        if (active) {
          setInvite(null);
          setError(err.message);
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
  }
  async function join() {
    setJoining(true);
    setError("");
    try {
      const result = await api(`/events/${invite.event.id}/join`, "POST", {
        token,
      });
      setInvite((current) => ({ ...current, membership: result.membership }));
      await loadEvents();
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }
  function openEvent(id, eventTab) {
    setEventId(id);
    history.pushState({ eventTab, section }, "", `/events/${id}`);
    focusMain();
  }
  function navigate(next) {
    setSection(next);
    setEventId(null);
    history.pushState({}, "", sectionPaths[next]);
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
      setEventId(location.pathname.match(/^\/events\/([^/]+)$/)?.[1] || null);
      setSection(currentSection());
    };
    addEventListener("popstate", back);
    return () => removeEventListener("popstate", back);
  }, []);
  const shown = events.filter((e) =>
    section === "archive" ? e.status === "archived" : e.status !== "archived",
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Vai al contenuto
      </a>
      <div className={`site ${snow ? "snow-on" : ""}`}>
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
                onClick={() => navigate("events")}
              >
                I miei eventi
              </button>
              <button
                className={section === "wishes" ? "selected" : ""}
                aria-current={section === "wishes" ? "page" : undefined}
                onClick={() => navigate("wishes")}
              >
                I desideri
              </button>
              <button
                className={section === "archive" ? "selected" : ""}
                aria-current={section === "archive" ? "page" : undefined}
                onClick={() => navigate("archive")}
              >
                Archivio
              </button>
              <button
                className={section === "games" ? "selected" : ""}
                aria-current={section === "games" ? "page" : undefined}
                onClick={() => navigate("games")}
              >
                Giochi
              </button>
            </nav>
          ) : (
            <span className="header-caption">
              Un regalo. Un nome. Una sorpresa.
            </span>
          )}
          <div className="header-tools">
            <button
              className="icon-button snow-control"
              aria-label={snow ? "Disattiva la neve" : "Attiva la neve"}
              aria-pressed={snow}
              onClick={() => {
                localStorage.setItem("sla-snow", snow ? "off" : "on");
                setSnow(!snow);
              }}
            >
              <Snowflake size={19} />
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
          <Notice error>{error}</Notice>
          {section === "rules" ? (
            <SecretSantaRules />
          ) : loading ? (
            <div className="loading">Prepariamo le lettere…</div>
          ) : (
            <>
              {invite && token && !eventId ? (
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
                    invite.membership === "approved" ? (
                      <div className="invitation-action">
                        <p>Il tuo posto è confermato.</p>
                        <Button onClick={() => openEvent(invite.event.id)}>
                          Apri l’evento
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={join}
                        busy={joining}
                        disabled={invite.membership === "pending"}
                      >
                        {invite.membership === "pending"
                          ? "Richiesta inviata: ti faremo sapere"
                          : "Voglio partecipare"}
                      </Button>
                    )
                  ) : (
                    <p className="invitation-action">
                      Accedi qui sotto per partecipare.
                    </p>
                  )}
                </section>
              ) : null}
              {!session?.user ? (
                <Auth
                  local={session?.local}
                  mailConfigured={session?.mailConfigured}
                  onLogin={(user) => {
                    setError("");
                    setSession((s) => ({ ...s, user }));
                  }}
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
                    key={eventId}
                    id={eventId}
                    initialTab={
                      history.state?.eventTab ??
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
                >
                  <Suspense
                    fallback={<p role="status">Carichiamo il profilo…</p>}
                  >
                    <ProfileSettings
                      user={session.user}
                      onChange={({ phone, avatar }) =>
                        setSession((previous) =>
                          previous?.user?.id === session.user.id
                            ? {
                                ...previous,
                                user: { ...previous.user, phone, avatar },
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
                  onAlbum={() => navigate("profile")}
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
                      {session.user.organizer ? (
                        <Button onClick={() => setCreate(true)}>
                          <Plus size={18} /> Crea un Secret Santa
                        </Button>
                      ) : (
                        <p className="quiet">
                          Hai ricevuto un invito? Apri il link per unirti al
                          gruppo.
                        </p>
                      )}
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
                      <TimedTreasures section={section} onDiscover={discover} />
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
                        {session.user.organizer && section !== "archive" ? (
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
            Sotto l’Albero <Heart size={12} />
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
      {secret ? (
        <Modal
          title={
            secret === "star"
              ? "Hai acceso una stella."
              : secret === "teapot"
                ? "Questa teiera ci ricorda qualcosa…"
                : stamps[secret].name
          }
          onClose={() => setSecret(null)}
        >
          {secret === "star" ? (
            <>
              <p className="quote">“I know him!”</p>
              <p>
                Buddy, <cite>Elf</cite> (2003). Quel momento in cui riconosci
                una persona e non riesci a contenere la gioia.
              </p>
              <a
                href="https://clip.cafe/elf-2003/and-i-said-i-know-im-gonna-call/"
                target="_blank"
                rel="noreferrer"
              >
                La battuta originale <ArrowUpRight size={14} />
              </a>
            </>
          ) : secret === "teapot" ? (
            <>
              <p>
                In <cite>Christmas Party</cite>, Jim prepara per Pam una teiera
                piena di piccoli ricordi. Un regalo riuscito, a volte, comincia
                dall’attenzione.
              </p>
              <p className="quiet">The Office · stagione 2, episodio 10</p>
              <a
                href="https://www.televisionacademy.com/features/news/online-originals/holiday-episodes-simpsons-the-oc-friends"
                target="_blank"
                rel="noreferrer"
              >
                La storia dell’episodio <ArrowUpRight size={14} />
              </a>
            </>
          ) : (
            <p className="hunt-discovery">
              <StampIcon id={secret} size={35} /> {stamps[secret].story}
            </p>
          )}
          <StampReward id={secret} collection={collection} />
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSecret(null);
              navigate("profile");
            }}
          >
            Apri l’album
          </Button>
        </Modal>
      ) : null}
    </>
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
        <Field
          label="Nome dello scambio"
          name="name"
          placeholder="Il Natale del nostro gruppo"
          required
          maxLength={100}
        />
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

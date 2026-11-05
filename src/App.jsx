import { useState, useEffect, useCallback } from "react";
import {
  TreePine,
  Star,
  LogOut,
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
} from "lucide-react";
import { api, date, money, statusLabel } from "./api.js";
import { Button, Field, Modal, Notice } from "./ui.jsx";
import Auth from "./Auth.jsx";
import Event from "./Event.jsx";

export default function App() {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [events, setEvents] = useState([]),
    [eventId, setEventId] = useState(
      () => location.pathname.match(/^\/events\/([^/]+)$/)?.[1] || null,
    ),
    [section, setSection] = useState("events"),
    [create, setCreate] = useState(false),
    [error, setError] = useState(""),
    [secret, setSecret] = useState(null),
    [invite, setInvite] = useState(null),
    [invited, setInvited] = useState(false),
    [snow, setSnow] = useState(
      () => localStorage.getItem("sla-snow") !== "off",
    );
  const token = location.pathname.match(/^\/invite\/([^/]+)$/)?.[1];
  const loadEvents = useCallback(async () => {
    const r = await api("/events");
    setEvents(r.events);
  }, []);
  useEffect(() => {
    api("/me")
      .then(setSession)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    if (token)
      api("/invite/" + encodeURIComponent(token))
        .then(setInvite)
        .catch((e) => setError(e.message));
  }, [token]);
  useEffect(() => {
    if (session?.user) loadEvents().catch((e) => setError(e.message));
  }, [session?.user, loadEvents]);
  async function logout() {
    await api("/auth/logout", "POST");
    setSession((s) => ({ ...s, user: null }));
    setEvents([]);
    setEventId(null);
  }
  async function join() {
    try {
      await api(`/events/${invite.event.id}/join`, "POST", { token });
      setInvited(true);
      await loadEvents();
    } catch (e) {
      setError(e.message);
    }
  }
  function openEvent(id) {
    setEventId(id);
    history.pushState({}, "", `/events/${id}`);
  }
  function navigate(next) {
    setSection(next);
    setEventId(null);
    history.pushState({}, "", "/");
    loadEvents().catch((e) => setError(e.message));
  }
  useEffect(() => {
    const back = () =>
      setEventId(location.pathname.match(/^\/events\/([^/]+)$/)?.[1] || null);
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
                onClick={() => navigate("events")}
              >
                I miei eventi
              </button>
              <button
                className={section === "wishes" ? "selected" : ""}
                onClick={() => navigate("wishes")}
              >
                I desideri
              </button>
              <button
                className={section === "archive" ? "selected" : ""}
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
                onClick={logout}
                title="Esci"
                aria-label={`Esci dall’account di ${session.user.name}`}
              >
                <span>{session.user.name?.slice(0, 1) || "?"}</span>
                <LogOut size={15} />
              </button>
            ) : (
              <span className="small-star">✧</span>
            )}
          </div>
        </header>
        <main id="main">
          <Notice error>{error}</Notice>
          {loading ? (
            <div className="loading">Prepariamo le lettere…</div>
          ) : (
            <>
              {invite && !eventId ? (
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
                    L’organizzatore può consultare e gestire gli abbinamenti.
                    Gli altri partecipanti vedranno soltanto il proprio
                    destinatario.
                  </small>
                  {session?.user ? (
                    <Button onClick={join} disabled={invited}>
                      {invited
                        ? "Richiesta inviata: ti faremo sapere"
                        : "Voglio partecipare"}
                    </Button>
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
                  onLogin={(user) => setSession((s) => ({ ...s, user }))}
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
                    initialTab={section === "wishes" ? "wishlist" : "overview"}
                    user={session.user}
                    onOpen={(id) => {
                      openEvent(id);
                      loadEvents();
                    }}
                    onChange={loadEvents}
                  />
                </>
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
                        Quest’anno, il regalo
                        <br />
                        <em>comincia qui.</em>
                      </h1>
                      <p>
                        Riunisci le persone a cui vuoi bene.
                        <br />
                        Al nome da tenere segreto pensiamo noi.
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
                    </div>
                    <button
                      className="hidden-star"
                      aria-label="Una stella da accendere"
                      onClick={() => setSecret("star")}
                    >
                      <Star size={22} />
                    </button>
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
                      {shown.length ? (
                        <small>
                          {shown.length}{" "}
                          {shown.length === 1 ? "evento" : "eventi"}
                        </small>
                      ) : null}
                    </div>
                    {section === "wishes" ? (
                      <p className="section-intro">
                        Ogni gruppo ha la sua lettera. Apri un evento e racconta
                        cosa ti farebbe piacere trovare sotto l’albero.
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
                            ? "Gli eventi conclusi compariranno qui. Potrai ripartire dallo stesso gruppo l’anno prossimo."
                            : session.user.organizer
                              ? "Crea un evento e invita il tuo gruppo. Il resto si prepara insieme."
                              : "Quando accetti un invito, ritrovi qui il tuo evento."}
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
                    <button
                      className="postmark"
                      aria-label="Una teiera fuori posto"
                      onClick={() => setSecret("teapot")}
                    >
                      <Coffee size={31} />
                      <span>POSTA DI NATALE</span>
                    </button>
                  </section>
                </>
              )}
            </>
          )}
        </main>
        <footer>
          <span>Fatto per ritrovarsi. E per tenere un piccolo segreto.</span>
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
            openEvent(e.id);
            loadEvents();
          }}
        />
      ) : null}
      {secret ? (
        <Modal
          title={
            secret === "star"
              ? "Hai acceso una stella."
              : "Questa teiera ci ricorda qualcosa…"
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
          ) : (
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
          )}
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
        Prima le cose pratiche, poi gli inviti. Potrai organizzare l’evento
        anche senza partecipare allo scambio.
      </p>
      <form onSubmit={submit} className="form-stack">
        <Field
          label="Come lo chiamiamo?"
          name="name"
          placeholder="Il Natale del nostro gruppo"
          required
          maxLength={100}
        />
        <div className="form-grid">
          <Field
            label="Nome del gruppo"
            name="groupName"
            placeholder="Lo stesso nome, anche l’anno prossimo"
            required
            maxLength={100}
          />
          <Field
            label="Budget a persona (€)"
            type="number"
            name="budget"
            min="1"
            max="10000"
            defaultValue="25"
            required
          />
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
          Gli orari seguono il fuso del tuo dispositivo:{" "}
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
            Crea l’evento
            <ArrowUpRight size={17} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

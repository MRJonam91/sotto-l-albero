import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  CalendarDays,
  Gift,
  Users,
  Mail,
  LockKeyhole,
  Settings2,
  ArrowRight,
  Check,
  Copy,
  RefreshCw,
  Archive,
  Plus,
  Trash2,
  ChevronDown,
  Send,
} from "lucide-react";
import { api, date, money, statusLabel, activeMember } from "./api.js";
import { Button, Field, Notice, Modal } from "./ui.jsx";
import EventEdit from "./EventEdit.jsx";
const Reveal = lazy(() => import("./Reveal.jsx"));
const types = {
  object: "Un oggetto",
  theme: "Un interesse",
  preference: "Una preferenza",
  avoid: "Da evitare",
  hint: "Un indizio",
  riddle: "Un indovinello",
  surprise: "Sorprendimi",
};

export default function Event({
  id,
  user,
  onOpen,
  onChange,
  initialTab = "overview",
}) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState(initialTab),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(null);
  const load = useCallback(
    async (reveal = false) => {
      const r = await api(`/events/${id}${reveal ? "?reveal=1" : ""}`);
      setData(r);
      return r;
    },
    [id],
  );
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    if (!data || data.event.status === "archived") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load().catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [data?.event.status, load]);
  async function action(path, body = {}, message = "Fatto, tutto salvato.") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await api(`/events/${id}/${path}`, "POST", body);
      await load();
      onChange();
      setNotice(message);
      return r;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div className="loading">
        <Notice error>{error}</Notice>
        {!error ? "Apriamo la lettera…" : null}
      </div>
    );
  const { event, members = [], recipient } = data;
  const own = members.find(
    (m) => m.userId === user.id || m.id === user.id || m.email === user.email,
  );
  const approved = members.filter((m) => activeMember(m.status));
  const tabs = [
    ["overview", "L’evento", Users],
    ["wishlist", "La mia lettera", Mail],
    ["reveal", "Il nome segreto", Gift],
    ...(event.isAdmin ? [["admin", "Organizza", Settings2]] : []),
  ];
  return (
    <article className="event-page">
      <div className="event-heading">
        <div>
          <span className="eyebrow">{event.groupName || "Il tuo gruppo"}</span>
          <h1>{event.name}</h1>
        </div>
        <span className="status">{statusLabel(event.status)}</span>
      </div>
      <div className="event-facts">
        <span>
          <Gift /> {money(event.budget)} <small>a persona</small>
        </span>
        <span>
          <CalendarDays />{" "}
          <span>
            {date(event.drawAt)}
            <small>Estrazione</small>
          </span>
        </span>
        <span>
          <Users /> {approved.length} <small>partecipanti</small>
        </span>
      </div>
      <nav className="tabs" aria-label="Sezioni dell’evento">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            className={tab === value ? "selected" : ""}
            onClick={() => {
              setTab(value);
              setError("");
              setNotice("");
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      <Notice error>{error || event.error}</Notice>
      <Notice>{notice}</Notice>
      {tab === "overview" ? (
        <div className="event-columns">
          <section>
            <h2>Ci prepariamo al Natale.</h2>
            <p className="event-description">
              {event.description ||
                "Un pensiero scelto con cura e la curiosità di scoprire chi ha pensato a te."}
            </p>
            <dl className="details-list">
              <div>
                <dt>Iscrizioni fino al</dt>
                <dd>{date(event.closeAt)}</dd>
              </div>
              <div>
                <dt>Ci scambiamo i regali</dt>
                <dd>{date(event.giftAt)}</dd>
              </div>
              <div>
                <dt>Il tuo posto</dt>
                <dd>
                  {own
                    ? activeMember(own.status)
                      ? "Ci sei anche tu"
                      : own.status === "pending"
                        ? "In attesa di conferma"
                        : "Iscrizione chiusa"
                    : "Stai organizzando senza partecipare"}
                </dd>
              </div>
            </dl>
            {event.isAdmin &&
            !own &&
            event.status !== "drawn" &&
            event.status !== "archived" ? (
              <Button
                busy={busy}
                onClick={() =>
                  action(
                    "join",
                    { token: event.inviteToken },
                    "Ora fai parte del gruppo.",
                  )
                }
              >
                Partecipo anch’io <Plus size={16} />
              </Button>
            ) : null}
            {own && activeMember(own.status) ? (
              <Button onClick={() => setTab("wishlist")}>
                Scrivi la tua lettera <ArrowRight size={17} />
              </Button>
            ) : null}
            <p className="privacy-note">
              <LockKeyhole size={16} />
              Il nome che estrai resta tra te e l’organizzatore. Gli altri
              avranno la loro sorpresa.
            </p>
          </section>
          <aside className="paper guest-list">
            <span className="eyebrow">Attorno all’albero</span>
            <h2>Chi c’è</h2>
            {members.length ? (
              members
                .filter((m) => m.status !== "removed")
                .map((m) => (
                  <div className="guest" key={m.id}>
                    <span className="avatar">{m.name?.slice(0, 1)}</span>
                    <span>
                      {m.name}
                      <small>
                        {m.status === "pending"
                          ? "Aspetta una conferma"
                          : m.hasWishlist
                            ? "Ha lasciato qualche indizio"
                            : "La lettera è ancora da scrivere"}
                      </small>
                    </span>
                    {m.hasWishlist ? <Mail size={17} /> : null}
                  </div>
                ))
            ) : (
              <p>
                Le persone che accetteranno l’invito compariranno qui. Si
                comincia con un messaggio.
              </p>
            )}
          </aside>
        </div>
      ) : null}
      {tab === "wishlist" ? (
        own && activeMember(own.status) ? (
          <Wishlist
            initial={data.wishlist || []}
            id={id}
            onSaved={() => {
              load();
              setNotice(
                "La tua lettera è pronta. Puoi tornare a modificarla quando vuoi.",
              );
            }}
          />
        ) : (
          <div className="empty-state">
            <Mail />
            <h2>Una lettera per chi partecipa.</h2>
            <p>
              {own?.status === "pending"
                ? "Appena l’organizzatore conferma il tuo posto, potrai scrivere i tuoi desideri."
                : "Prima unisciti allo scambio, poi scrivi cosa ti farebbe piacere ricevere."}
            </p>
          </div>
        )
      ) : null}
      {tab === "reveal" ? (
        <Suspense
          fallback={<div className="loading">Prepariamo la tua sorpresa…</div>}
        >
          <Reveal
            key={`${id}:${event.version}`}
            recipient={recipient}
            drawAt={event.drawAt}
            status={event.status}
            isMember={!!own && activeMember(own.status)}
            eventId={`${id}:${event.version}`}
          />
        </Suspense>
      ) : null}
      {tab === "admin" && event.isAdmin ? (
        <Admin
          data={data}
          busy={busy}
          action={action}
          load={load}
          setConfirm={setConfirm}
          onOpen={onOpen}
          setError={setError}
        />
      ) : null}
      {confirm ? (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p>{confirm.text}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const reason = new FormData(e.currentTarget).get("reason");
              const r = await action(
                confirm.path,
                reason
                  ? { reason, version: confirm.version ?? event.version }
                  : {},
              );
              if (r) setConfirm(null);
            }}
          >
            {confirm.path === "cancel" ? (
              <Field label="Cosa è successo?">
                <textarea name="reason" required maxLength={500} rows={3} />
              </Field>
            ) : null}
            <div className="form-actions">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setConfirm(null)}
              >
                Torna indietro
              </Button>
              <Button busy={busy}>{confirm.button}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </article>
  );
}

function Wishlist({ initial, id, onSaved }) {
  const [items, setItems] = useState(() =>
      initial.map((item) => ({ ...item })),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function update(index, key, value) {
    setItems((all) =>
      all.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/events/${id}/wishlist`, "PUT", { items });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="wishlist">
      <div className="content-heading">
        <div>
          <h2>Cosa ti farebbe piacere?</h2>
          <p>
            Puoi essere preciso o lasciare spazio alla sorpresa. Scrivi come
            parleresti a una persona che ti conosce.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={items.length >= 30}
          onClick={() =>
            setItems((a) => [
              ...a,
              {
                type: "object",
                title: "",
                description: "",
                url: "",
                hint: "",
                answer: "",
              },
            ])
          }
        >
          <Plus size={17} />
          Aggiungi un desiderio
        </Button>
      </div>
      <form onSubmit={save}>
        {items.length ? (
          items.map((item, i) => (
            <div className="wish-editor paper" key={item.id || i}>
              <div className="wish-top">
                <span className="letter-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Field label="Che tipo di desiderio?">
                  <select
                    value={item.type}
                    onChange={(e) => update(i, "type", e.target.value)}
                  >
                    {Object.entries(types).map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Rimuovi desiderio ${i + 1}`}
                  onClick={() => setItems((a) => a.filter((_, n) => n !== i))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <Field
                label={
                  item.type === "riddle"
                    ? "Il tuo indovinello"
                    : "Dagli un nome"
                }
                value={item.title}
                onChange={(e) => update(i, "title", e.target.value)}
                maxLength={150}
                required
                placeholder={
                  item.type === "theme"
                    ? "Per esempio, le serate con un buon libro"
                    : "Un pensiero che ti somiglia"
                }
              />
              <Field label="Racconta qualcosa in più">
                <textarea
                  value={item.description || ""}
                  onChange={(e) => update(i, "description", e.target.value)}
                  rows={2}
                  maxLength={1500}
                  placeholder="Un colore, una taglia, un dettaglio utile…"
                />
              </Field>
              {item.type === "object" ? (
                <Field
                  label="Un link, se ti va"
                  type="url"
                  value={item.url || ""}
                  onChange={(e) => update(i, "url", e.target.value)}
                  placeholder="https://"
                />
              ) : null}
              {["riddle", "hint"].includes(item.type) ? (
                <>
                  <Field
                    label="Un aiuto per chi prova a indovinare"
                    value={item.hint || ""}
                    onChange={(e) => update(i, "hint", e.target.value)}
                    maxLength={1000}
                  />
                  {item.type === "riddle" ? (
                    <Field
                      label="La soluzione"
                      value={item.answer || ""}
                      onChange={(e) => update(i, "answer", e.target.value)}
                      maxLength={1000}
                      hint="Chi riceve la tua lettera potrà leggerla se ha bisogno di una mano."
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Mail />
            <h3>Il foglio è tutto tuo.</h3>
            <p>
              Parti da una cosa semplice: qualcosa che ti piace, che ti serve o
              che ti incuriosisce.
            </p>
          </div>
        )}
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <small>La lettera la leggerete tu e chi ti farà il regalo.</small>
          <Button busy={busy}>
            <Check size={17} />
            Salva la lettera
          </Button>
        </div>
      </form>
    </section>
  );
}

function Admin({ data, busy, action, load, setConfirm, onOpen, setError }) {
  const { event, members = [], rules = [], invites = [] } = data;
  const [copied, setCopied] = useState(false),
    [emails, setEmails] = useState(""),
    [history, setHistory] = useState(""),
    [rule, setRule] = useState({
      giverId: "",
      receiverId: "",
      type: "exclude",
    }),
    [ruleBusy, setRuleBusy] = useState(false),
    [revealing, setRevealing] = useState(false),
    [editing, setEditing] = useState(false);
  const eligible = members.filter((m) => activeMember(m.status)),
    names = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const link = event.inviteToken
    ? `${location.origin}/invite/${event.inviteToken}`
    : "";
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Il browser non permette di copiare. Puoi selezionare il link qui sotto.",
      );
    }
  }
  async function saveRules(next) {
    setRuleBusy(true);
    try {
      await api(`/events/${event.id}/rules`, "PUT", { rules: next });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRuleBusy(false);
    }
  }
  const locked = ["drawn", "archived"].includes(event.status);
  return (
    <div className="admin-stack">
      {editing ? (
        <EventEdit
          event={event}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      ) : null}
      <section className="content-heading">
        <div>
          <h2>Prima di cominciare.</h2>
          <p>
            Una data da spostare o un budget da rivedere? Puoi cambiare i
            dettagli prima dell’estrazione.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={locked}
          onClick={() => setEditing(true)}
        >
          <Settings2 size={16} />
          Modifica l’evento
        </Button>
      </section>
      <section>
        <div className="content-heading">
          <div>
            <h2>Invita il tuo gruppo.</h2>
            <p>
              Un messaggio nella chat e si comincia. Ogni persona confermerà il
              proprio posto.
            </p>
          </div>
          <Mail className="section-icon" />
        </div>
        <div className="invite-box">
          <code>{link || "Link non disponibile"}</code>
          <div className="button-row">
            <Button variant="outline" onClick={() => copy(link)}>
              <Copy size={16} />
              {copied ? "Copiato" : "Copia link"}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                copy(
                  `Quest’anno ci scambiamo un regalo? Ti aspetto a ${event.name}. Budget: ${money(event.budget)}. Estraiamo i nomi il ${date(event.drawAt)}; ci scambiamo i regali il ${date(event.giftAt)}. Per partecipare: ${link}`,
                )
              }
            >
              Copia il messaggio
            </Button>
            <Button
              variant="ghost"
              busy={busy}
              onClick={() =>
                setConfirm({
                  title: "Creiamo un nuovo link?",
                  text: "Il link precedente smetterà di funzionare. Chi è già iscritto rimarrà nel gruppo.",
                  path: "rotate-invite",
                  button: "Cambia il link",
                })
              }
            >
              <RefreshCw size={15} />
              Cambia link
            </Button>
          </div>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await action(
              "invites",
              { emails: [...new Set(emails.split(/[\s,;]+/).filter(Boolean))] },
              "Gli inviti sono in coda. Li invieremo rispettando i limiti del servizio email.",
            );
            if (r) setEmails("");
          }}
          className="email-invite"
        >
          <Field
            label="Oppure invita via email"
            hint="Separa gli indirizzi con una virgola o vai a capo."
          >
            <textarea
              rows={2}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="amica@esempio.it, amico@esempio.it"
              required
            />
          </Field>
          <Button busy={busy}>
            <Send size={16} />
            Invia gli inviti
          </Button>
        </form>
        {invites.length ? (
          <details className="disclosure">
            <summary>
              Vedi gli inviti inviati <ChevronDown size={16} />
            </summary>
            {invites.map((i, n) => (
              <div className="simple-row" key={i.id || n}>
                <span>{i.email}</span>
                <span>
                  {{
                    queued: "In coda",
                    sent: "Inviato",
                    failed: "Invio da riprovare",
                    accepted: "Accettato",
                  }[i.state || i.status] ||
                    i.state ||
                    i.status}
                </span>
              </div>
            ))}
          </details>
        ) : null}
      </section>
      <section className="admin-section">
        <h2>Chi partecipa?</h2>
        {members.length ? (
          members.map((m) => (
            <div className="simple-row" key={m.id}>
              <span>
                <strong>{m.name}</strong>
                <small>{m.email || ""}</small>
              </span>
              <span>
                {m.status === "pending"
                  ? "Da confermare"
                  : m.status === "removed"
                    ? "Non partecipa"
                    : m.hasWishlist
                      ? "Lettera pronta"
                      : "Lettera da scrivere"}
              </span>
              <div className="button-row">
                {m.status === "pending" ? (
                  <Button
                    variant="outline"
                    busy={busy}
                    onClick={() =>
                      action(
                        `members/${m.id}`,
                        { status: "approved" },
                        "Posto confermato.",
                      )
                    }
                  >
                    Conferma
                  </Button>
                ) : null}
                {m.status !== "removed" && !locked ? (
                  <button
                    className="text-button"
                    onClick={() =>
                      action(
                        `members/${m.id}`,
                        { status: "removed" },
                        "La persona è stata rimossa dallo scambio.",
                      )
                    }
                  >
                    Rimuovi
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p>Non si è ancora iscritto nessuno. Manda il primo invito.</p>
        )}
      </section>
      <section className="admin-section">
        <h2>Le regole degli abbinamenti.</h2>
        <p>
          Evita coppie già uscite o fissa un abbinamento. Lo storico del gruppo
          aiuta a non ripetere gli scambi.
        </p>
        <form
          className="rule-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveRules([...rules, rule]);
          }}
        >
          <Field label="Chi fa il regalo">
            <select
              required
              value={rule.giverId}
              onChange={(e) =>
                setRule((r) => ({ ...r, giverId: e.target.value }))
              }
            >
              <option value="">Scegli una persona</option>
              {eligible.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Regola">
            <select
              value={rule.type}
              onChange={(e) => setRule((r) => ({ ...r, type: e.target.value }))}
            >
              <option value="exclude">Non deve regalarlo a</option>
              <option value="fixed">Deve regalarlo a</option>
            </select>
          </Field>
          <Field label="Chi riceve">
            <select
              required
              value={rule.receiverId}
              onChange={(e) =>
                setRule((r) => ({ ...r, receiverId: e.target.value }))
              }
            >
              <option value="">Scegli una persona</option>
              {eligible
                .filter((m) => m.id !== rule.giverId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>
          <Button busy={ruleBusy} disabled={locked}>
            <Plus size={16} />
            Aggiungi
          </Button>
        </form>
        {rules.map((r, i) => (
          <div className="simple-row" key={i}>
            <span>
              {names[r.giverId] || "Partecipante"}{" "}
              <span className="quiet">
                {r.type === "fixed" ? "regala a" : "non regala a"}
              </span>{" "}
              {names[r.receiverId] || "Partecipante"}
            </span>
            <button
              className="icon-button"
              aria-label="Rimuovi regola"
              disabled={locked}
              onClick={() => saveRules(rules.filter((_, n) => i !== n))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <details className="disclosure">
          <summary>
            Aggiungi gli scambi degli anni passati <ChevronDown size={16} />
          </summary>
          <p>
            Una coppia per riga: email di chi ha fatto il regalo, email di chi
            lo ha ricevuto. Usa gli indirizzi delle persone iscritte.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const pairs = history
                .split("\n")
                .filter((l) => l.trim())
                .map((l) => {
                  const [giverEmail, receiverEmail] = l
                    .split(/[,;\s]+/)
                    .filter(Boolean);
                  return { giverEmail, receiverEmail };
                });
              const r = await action(
                "history",
                { pairs },
                "Gli scambi passati sono stati salvati.",
              );
              if (r) setHistory("");
            }}
          >
            <Field label="Scambi passati">
              <textarea
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                rows={4}
                placeholder="chi.regala@esempio.it, chi.riceve@esempio.it"
                required
              />
            </Field>
            <div className="button-row">
              <Button disabled={locked} busy={busy}>
                Salva lo storico
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={locked}
                onClick={() =>
                  setConfirm({
                    title: "Rimuoviamo gli scambi inseriti a mano?",
                    text: "Lo storico delle edizioni organizzate sul sito rimane. Rimuoveremo soltanto le coppie che hai aggiunto a mano per questo gruppo.",
                    path: "clear-history",
                    button: "Rimuovi lo storico importato",
                  })
                }
              >
                Rimuovi gli scambi importati
              </Button>
            </div>
          </form>
        </details>
      </section>
      <section className="admin-section draw-section">
        <div>
          <span className="eyebrow">È arrivato il momento?</span>
          <h2>Un nome per ciascuno.</h2>
          <p>
            L’estrazione parte alla data scelta. Puoi avviarla anche da qui:
            servono almeno tre partecipanti confermati.
          </p>
        </div>
        <Button
          busy={busy}
          disabled={locked || eligible.length < 3}
          onClick={() =>
            setConfirm({
              title: "Possiamo estrarre i nomi?",
              text: "Salveremo un destinatario per ogni persona confermata. Controlla che il gruppo sia al completo: dopo l’estrazione servirà annullarla per cambiare i partecipanti.",
              path: "draw",
              button: "Sì, estrai i nomi",
            })
          }
        >
          <Gift size={18} />
          Estrai i nomi
        </Button>
      </section>
      {event.status === "drawn" ? (
        <section className="admin-section">
          <h2>Gli abbinamenti sono pronti.</h2>
          <p>
            Apri l’elenco soltanto se hai bisogno di gestire lo scambio: vedrai
            tutte le sorprese.
          </p>
          <Button
            variant="outline"
            busy={revealing}
            onClick={async () => {
              if (
                !window.confirm(
                  "Vedrai tutti gli abbinamenti, compreso chi farà un regalo a te. Vuoi continuare?",
                )
              )
                return;
              setRevealing(true);
              try {
                await load(true);
              } catch (e) {
                setError(e.message);
              } finally {
                setRevealing(false);
              }
            }}
          >
            <LockKeyhole size={16} />
            Mostra gli abbinamenti
          </Button>
          {data.assignments ? (
            <div className="assignment-list">
              {data.assignments.map((a, i) => (
                <div className="simple-row" key={i}>
                  <span>{names[a.giverId] || a.giverName}</span>
                  <ArrowRight size={15} />
                  <span>{names[a.receiverId] || a.receiverName}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="admin-section maintenance">
        <h2>Quando sarà passato Natale.</h2>
        <p>Conserva il gruppo per l’anno prossimo o chiudi questo evento.</p>
        <div className="button-row">
          <Button
            variant="outline"
            busy={busy}
            onClick={async () => {
              const name = window.prompt(
                "Come chiamiamo il prossimo evento?",
                event.name + " · nuova edizione",
              );
              if (name?.trim()) {
                const r = await action(
                  "duplicate",
                  { name: name.trim() },
                  "Nuovo evento creato.",
                );
                if (r) onOpen(r.event.id);
              }
            }}
          >
            <Copy size={16} />
            Prepara la prossima edizione
          </Button>
          <Button
            variant="ghost"
            busy={busy}
            disabled={event.status === "archived"}
            onClick={() =>
              setConfirm({
                title: "Mettiamo via questo Natale?",
                text: "L’evento passerà nell’archivio. Potrai ritrovarlo e creare la prossima edizione.",
                path: "archive",
                button: "Archivia l’evento",
              })
            }
          >
            <Archive size={16} />
            Archivia
          </Button>
          {event.status === "drawn" ? (
            <Button
              variant="ghost danger"
              onClick={() =>
                setConfirm({
                  title: "Annulliamo questa estrazione?",
                  text: "I nomi assegnati non saranno più validi. Avvisa il gruppo, soprattutto se qualcuno ha già comprato il regalo.",
                  path: "cancel",
                  version: event.version,
                  button: "Annulla l’estrazione",
                })
              }
            >
              Annulla l’estrazione
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

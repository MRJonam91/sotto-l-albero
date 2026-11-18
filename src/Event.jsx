import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
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
  Trophy,
} from "lucide-react";
import { api, date, money, statusLabel, activeMember } from "./api.js";
import { Button, Field, Notice, Modal } from "./ui.jsx";
import EventEdit from "./EventEdit.jsx";
import Avatar from "./Avatar.jsx";
import NameTag from "./NameTag.jsx";
import { GroupMemberPortraitCard } from "./HolidayPortrait.jsx";
import { holidayIconMap } from "../shared/holidayPortrait.js";
import EventTools from "./EventTools.jsx";
import DrawExplanation from "./DrawExplanation.jsx";
import GiftBrowser from "./GiftBrowser.jsx";
import {
  hasAmazonAffiliateTag,
  isAmazonUrl,
  productSearchLinks,
} from "../shared/amazonLinks.js";
import "./amazon-wishlist.css";
const Reveal = lazy(() => import("./Reveal.jsx"));
const Competition = lazy(() => import("./Competition.jsx"));
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
  onStamp,
  initialTab = "overview",
}) {
  const [data, setData] = useState(null),
    [selectedTab, setTab] = useState(initialTab),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(null),
    [renamingGroup, setRenamingGroup] = useState(false),
    [selectedMemberId, setSelectedMemberId] = useState(null);
  const loadId = useRef(0);
  const isAdmin = data?.event.isAdmin;
  const tab = selectedTab === "admin" && !isAdmin ? "overview" : selectedTab;
  const load = useCallback(async () => {
    const requestId = ++loadId.current;
    try {
      const r = await api(`/events/${id}`);
      if (requestId === loadId.current) setData(r);
      return r;
    } catch (error) {
      if (
        requestId === loadId.current &&
        [401, 403, 404].includes(error.status)
      ) {
        setError(error.message);
        setData(null);
      }
      throw error;
    }
  }, [id]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    if (tab !== "admin" || initialTab !== "admin") return;
    const section = location.hash.slice(1);
    if (!["event-settings", "event-members"].includes(section)) return;
    document.getElementById(section)?.focus();
  }, [initialTab, tab]);
  useEffect(() => {
    if (!data || data.event.status === "archived") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load().catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [data?.event.status, load]);
  async function action(path, body = {}, message = "Fatto.") {
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
        {!error ? "Caricamento dell’evento…" : null}
      </div>
    );
  const { event, members = [] } = data;
  const own = members.find(
    (m) => m.userId === user.id || m.id === user.id || m.email === user.email,
  );
  const approved = members.filter((m) => activeMember(m.status));
  const tabs = [
    ["overview", "L’evento", Users],
    ["wishlist", "La mia lettera", Mail],
    ...(event.isAdmin || own?.status === "approved"
      ? [["reveal", "Il nome segreto", Gift]]
      : []),
    ...(event.isAdmin || own?.status === "approved"
      ? [["competition", "Sfide e classifica", Trophy]]
      : []),
    ...(event.isAdmin ? [["admin", "Organizza", Settings2]] : []),
  ];
  return (
    <article className="event-page">
      <div className="event-heading">
        <div>
          <div className="event-heading-title-row">
            <span className="eyebrow">{event.groupName || event.name}</span>
            {event.isAdmin ? (
              <button
                type="button"
                className="text-button"
                onClick={() => setRenamingGroup(true)}
              >
                Modifica nome gruppo
              </button>
            ) : null}
          </div>
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
            aria-current={tab === value ? "page" : undefined}
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
            <h2>Lo scambio di Natale</h2>
            <p className="event-description">
              {event.description ||
                "Prepara un regalo per la persona che hai pescato. Il resto è una sorpresa."}
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
              <div className="button-row">
                <Button onClick={() => setTab("wishlist")}>
                  Scrivi la tua lettera <ArrowRight size={17} />
                </Button>
                {event.status !== "archived" && (
                  <Button
                    variant="outline"
                    onClick={() => setTab("competition")}
                  >
                    <Trophy size={17} aria-hidden="true" /> Gioca con il gruppo
                  </Button>
                )}
              </div>
            ) : null}
            <p className="privacy-note">
              <LockKeyhole size={16} />
              Ogni partecipante vede il nome che ha pescato. Chi organizza può
              consultare tutti gli abbinamenti.
            </p>
          </section>
          <aside className="paper guest-list">
            <span className="eyebrow">Attorno all’albero</span>
            <h2>Il gruppo</h2>
            <p>
              Apri il ritratto di una persona per vedere stato, tratti e
              personaggi condivisi.
            </p>
            {members.length ? (
              members
                .filter((m) => m.status !== "removed")
                .map((m) => (
                  <div className="guest" key={m.id}>
                    <Avatar userId={m.userId} name={m.name} avatar={m.avatar} />
                    <span>
                      <span className="guest-identity">
                        <span>{m.name}</span>
                        {m.nickname && !m.badge ? (
                          <small className="guest-realname">
                            @{m.nickname}
                          </small>
                        ) : null}
                        {m.badge ? (
                          <NameTag
                            badge={m.badge}
                            name={m.name}
                            nickname={m.nickname}
                            badgeText={m.badgeText}
                            size="sm"
                          />
                        ) : null}
                      </span>
                      <small>
                        {m.status === "pending"
                          ? "In attesa di conferma"
                          : m.hasWishlist
                            ? "Ha lasciato qualche indizio"
                            : "La lettera è ancora da scrivere"}
                      </small>
                      {m.holidayStatus?.activity ? (
                        <small>{m.holidayStatus.activity}</small>
                      ) : null}
                      {m.holidayStatus?.iconMessage?.length ? (
                        <small>
                          {m.holidayStatus.iconMessage
                            .map((iconId) => holidayIconMap.get(iconId)?.emoji)
                            .join(" ")}
                        </small>
                      ) : null}
                      {m.status === "approved" ||
                      m.portrait ||
                      m.holidayStatus?.riddle ||
                      m.holidayStatus?.activity ? (
                        <button
                          type="button"
                          className="guest-portrait-trigger"
                          aria-label={`Vedi il ritratto di ${m.name}`}
                          onClick={() => setSelectedMemberId(m.userId)}
                        >
                          {m.holidayStatus?.riddle
                            ? "Indovinello e ritratto"
                            : "Vedi stato e ritratto"}
                        </button>
                      ) : null}
                    </span>
                    {m.hasWishlist ? <Mail size={17} /> : null}
                  </div>
                ))
            ) : (
              <p>Qui vedrai chi accetta l’invito.</p>
            )}
          </aside>
        </div>
      ) : null}
      {tab === "wishlist" ? (
        own && activeMember(own.status) ? (
          <Wishlist
            initial={data.wishlist || []}
            id={id}
            budget={event.budget}
            onSaved={() => {
              load();
              setNotice(
                "La tua lettera è pronta. Puoi modificarla quando vuoi.",
              );
            }}
          />
        ) : (
          <div className="empty-state">
            <Mail />
            <h2>Una lettera per chi partecipa.</h2>
            <p>
              {own?.status === "pending"
                ? "Potrai scrivere la lettera appena chi organizza conferma il tuo posto."
                : "Partecipa allo scambio per lasciare qualche idea a chi ti farà il regalo."}
            </p>
          </div>
        )
      ) : null}
      {tab === "reveal" ? (
        <Suspense
          fallback={<div className="loading">Prepariamo la tua sorpresa…</div>}
        >
          <Reveal
            key={`${user.id}:${id}:${event.version}`}
            userId={user.id}
            openRecipient={async () => {
              const { recipient } = await api(
                `/events/${id}/recipient`,
                "POST",
                { version: event.version },
              );
              return recipient;
            }}
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
          onRenameGroup={() => setRenamingGroup(true)}
        />
      ) : null}
      {renamingGroup && event.isAdmin ? (
        <GroupRenameModal
          event={event}
          busy={busy}
          onClose={() => setRenamingGroup(false)}
          onSubmit={async (values) => {
            const result = await action(
              "rename",
              values,
              "Il nome del gruppo e dello scambio è stato aggiornato.",
            );
            if (result) setRenamingGroup(false);
          }}
        />
      ) : null}
      {selectedMemberId &&
      members.find((m) => m.userId === selectedMemberId) ? (
        <Modal
          title={`Spirito di Natale · ${members.find((m) => m.userId === selectedMemberId).name}`}
          onClose={() => setSelectedMemberId(null)}
          wide
        >
          <GroupMemberPortraitCard
            member={members.find((m) => m.userId === selectedMemberId)}
            currentUserId={user.id}
            interactions={data.portraitInteractions || []}
            onInteract={async (payload) => {
              const res = await api(
                `/events/${id}/portrait-interact`,
                "POST",
                payload,
              );
              await load();
              return res;
            }}
          />
        </Modal>
      ) : null}
      {tab === "competition" &&
      (event.isAdmin || own?.status === "approved") ? (
        <Suspense fallback={<p role="status">Carichiamo la classifica…</p>}>
          <Competition
            event={event}
            user={user}
            members={members}
            onStamp={onStamp}
          />
        </Suspense>
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

function Wishlist({ initial, id, budget, onSaved }) {
  const [items, setItems] = useState(() =>
      initial.map((item) => ({ ...item })),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("amazon");
  const [searchCity, setSearchCity] = useState("");
  const [product, setProduct] = useState({ title: "", url: "" });
  const [productError, setProductError] = useState("");
  const [amazonPreferences, setAmazonPreferences] = useState(null);
  useEffect(() => {
    let active = true;
    api("/preferences/amazon")
      .then((result) => {
        if (active) setAmazonPreferences(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const searchReady =
    !!query.trim() && (provider !== "local" || !!searchCity.trim());
  const searchUrl = productSearchLinks(query, searchCity)[provider];
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
      const result = await api(`/events/${id}/wishlist`, "PUT", { items });
      if (Array.isArray(result.items)) setItems(result.items);
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
            Lascia qualche idea a chi ti farà il regalo. Basta un titolo, un
            colore o qualcosa che ti piacerebbe provare.
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
      <GiftBrowser
        eventId={id}
        budget={budget}
        selectedUrls={items.map((item) => item.url)}
        disabled={busy || items.length >= 30}
        onAdd={(product) => {
          if (
            items.length >= 30 ||
            items.some((item) => item.url === product.url)
          )
            return false;
          setItems((all) => [
            ...all,
            {
              type: "object",
              title: product.title,
              url: product.url,
              description: "",
              hint: "",
              answer: "",
            },
          ]);
          return true;
        }}
      />
      <details className="wish-shopping paper">
        <summary>Hai già un link o vuoi cercare in altri negozi?</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (searchReady)
              window.open(searchUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <div className="wish-search-fields">
            <Field
              label="Cosa cerchi?"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={200}
              placeholder="Per esempio, tazza blu"
            />
            <Field label="Dove cercare">
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="amazon">Amazon.it</option>
                <option value="etsy">Etsy</option>
                <option value="toyscenter">
                  Toys Center · ricerca sul web
                </option>
                <option value="web">Tutto il web</option>
                <option value="local">Negozi in una città</option>
              </select>
            </Field>
            <Button type="submit" variant="outline" disabled={!searchReady}>
              Cerca ↗
            </Button>
          </div>
          {provider === "local" ? (
            <Field
              label="Città dello scambio"
              value={searchCity}
              onChange={(event) => setSearchCity(event.target.value)}
              maxLength={80}
              placeholder="Dove vi scambierete i regali?"
              hint="La ricerca usa questa città; non richiediamo la tua posizione."
            />
          ) : null}
        </form>
        <p className="wish-search-note">
          La ricerca si apre in una nuova scheda. Scegli sul sito del negozio,
          copia il link e torna qui per aggiungerlo. Non verifichiamo prezzi,
          disponibilità, spedizione o ritiro.
        </p>
        <details className="wish-manual">
          <summary>Aggiungi un prodotto con nome e link</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setProductError("");
              if (items.length >= 30) {
                setProductError("Puoi lasciare fino a 30 desideri.");
                return;
              }
              try {
                const url = new URL(product.url);
                if (
                  !["https:", "http:"].includes(url.protocol) ||
                  !product.title.trim()
                )
                  throw new Error();
                setItems((all) => [
                  ...all,
                  {
                    type: "object",
                    title: product.title.trim(),
                    url: url.href,
                    description: "",
                    hint: "",
                    answer: "",
                  },
                ]);
                setProduct({ title: "", url: "" });
              } catch {
                setProductError(
                  "Inserisci il nome del prodotto e un link che inizi con https:// o http://.",
                );
              }
            }}
          >
            <Field
              label="Nome del prodotto"
              value={product.title}
              onChange={(event) =>
                setProduct({ ...product, title: event.target.value })
              }
              required
              maxLength={150}
            />
            <Field
              label="Link del prodotto o del negozio"
              type="url"
              value={product.url}
              onChange={(event) =>
                setProduct({ ...product, url: event.target.value })
              }
              required
              placeholder="https://"
              hint="Puoi usare Amazon, Etsy, Toys Center o qualsiasi altro negozio, anche locale."
            />
            <Notice error>{productError}</Notice>
            <Button
              type="submit"
              variant="outline"
              disabled={items.length >= 30 || busy}
            >
              Aggiungi alla lettera
            </Button>
            <p className="wish-search-note">
              Poi premi “Salva la lettera” per conservare tutti i desideri.
            </p>
          </form>
        </details>
      </details>
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
                    ? "Per esempio, una serata con un buon libro"
                    : "Per esempio, una tazza blu"
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
                <>
                  <Field
                    label="Un link, se ti va"
                    type="url"
                    value={item.url || ""}
                    onChange={(e) => update(i, "url", e.target.value)}
                    placeholder="https://"
                  />
                  {amazonPreferences?.allowed &&
                  amazonPreferences.enabled &&
                  amazonPreferences.tag &&
                  isAmazonUrl(item.url) ? (
                    <label className="wish-affiliate">
                      <input
                        type="checkbox"
                        checked={item.amazonAffiliate === true}
                        onChange={(event) =>
                          update(i, "amazonAffiliate", event.target.checked)
                        }
                      />
                      <span>
                        Applica il mio tracking ID Amazon a questo prodotto
                        quando salvo la lettera
                      </span>
                    </label>
                  ) : null}
                  {/^https:\/\/(?:www\.)?amzn\.to\//i.test(item.url || "") &&
                  amazonPreferences?.allowed ? (
                    <small className="wish-affiliate-disclosure">
                      Per applicare il tuo codice, apri il link breve e copia
                      qui il link completo di Amazon.
                    </small>
                  ) : null}
                  {hasAmazonAffiliateTag(item.url) ? (
                    <small className="wish-affiliate-disclosure">
                      Link affiliato Amazon
                    </small>
                  ) : null}
                  <details className="wish-pickup">
                    <summary>Ritiro in negozio (facoltativo)</summary>
                    <label className="wish-affiliate">
                      <input
                        type="checkbox"
                        checked={item.fulfillment === "pickup"}
                        onChange={(event) =>
                          update(
                            i,
                            "fulfillment",
                            event.target.checked ? "pickup" : "",
                          )
                        }
                      />
                      <span>
                        Questo desiderio richiede il ritiro in negozio
                      </span>
                    </label>
                    {item.fulfillment === "pickup" ? (
                      <Field
                        label="Città del ritiro"
                        value={item.pickupCity || ""}
                        onChange={(event) =>
                          update(i, "pickupCity", event.target.value)
                        }
                        required
                        maxLength={80}
                        hint="Scegli una città comoda per lo scambio. Usa la descrizione per indicare negozio e dettagli da verificare."
                      />
                    ) : null}
                  </details>
                </>
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
                      hint="Chi ti fa il regalo può aprire la soluzione quando vuole."
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
              Comincia da qualcosa che ti piace, ti serve o ti incuriosisce.
            </p>
          </div>
        )}
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <small>La lettera è visibile a te e a chi ti farà il regalo.</small>
          <Button busy={busy}>
            <Check size={17} />
            Salva la lettera
          </Button>
        </div>
      </form>
    </section>
  );
}

function GroupRenameModal({ event, busy, onClose, onSubmit }) {
  const [groupName, setGroupName] = useState(event.groupName || event.name);
  const [name, setName] = useState(event.name);
  return (
    <Modal title="Modifica nome del gruppo" onClose={onClose}>
      <p>
        Puoi aggiornare in qualsiasi momento il nome del gruppo e il titolo di
        questa edizione dello scambio.
      </p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ groupName, name });
        }}
      >
        <Field
          label="Nome del gruppo"
          name="groupName"
          maxLength={100}
          required
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          hint="Resta associato al gruppo anche nelle prossime edizioni."
        />
        <Field
          label="Nome dello scambio"
          name="name"
          maxLength={100}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint="Il titolo di questa edizione."
        />
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Torna indietro
          </Button>
          <Button busy={busy}>Salva i nomi</Button>
        </div>
      </form>
    </Modal>
  );
}

function Admin({
  data,
  busy,
  action,
  load,
  setConfirm,
  onOpen,
  setError,
  onRenameGroup,
}) {
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
    [assignmentView, setAssignmentView] = useState(null),
    [editing, setEditing] = useState(false);
  const assignments =
    assignmentView?.version === event.version ? assignmentView.items : null;
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
        "Non siamo riusciti a copiare. Seleziona il link e copialo a mano.",
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
          <h2 id="event-settings" tabIndex={-1}>
            Dettagli dello scambio
          </h2>
          <p>Puoi cambiare date, budget e messaggio fino all’estrazione.</p>
        </div>
        <div className="button-row">
          <Button variant="ghost" type="button" onClick={onRenameGroup}>
            Rinomina gruppo
          </Button>
          <Button
            variant="outline"
            disabled={locked}
            onClick={() => setEditing(true)}
          >
            <Settings2 size={16} />
            Modifica l’evento
          </Button>
        </div>
      </section>
      <section>
        <div className="content-heading">
          <div>
            <h2>Invita il tuo gruppo.</h2>
            <p>Condividi il link in chat oppure manda un invito via email.</p>
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
                  `Facciamo il Secret Santa? Ti aspetto a ${event.name}! Il budget è ${money(event.budget)} a persona. Peschiamo i nomi il ${date(event.drawAt)} e ci scambiamo i regali il ${date(event.giftAt)}. Apri il link per partecipare: ${link}`,
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
                  title: "Cambiare il link di invito?",
                  text: "I link di invito già inviati smetteranno di funzionare. Chi si è già iscritto resta nel gruppo.",
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
              "Gli inviti sono in coda. Puoi controllare lo stato qui sotto.",
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
              Stato degli inviti <ChevronDown size={16} />
            </summary>
            {invites.map((i, n) => (
              <div className="simple-row" key={i.id || n}>
                <span>{i.email}</span>
                <span>
                  {{
                    queued: "In coda",
                    sent: "Inviato",
                    failed: "Da inviare di nuovo",
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
      <EventTools event={event} locked={locked} action={action} />
      <section className="admin-section">
        <h2 id="event-members" tabIndex={-1}>
          Chi partecipa?
        </h2>
        {members.length ? (
          members.map((m) => (
            <div className="simple-row" key={m.id}>
              <span>
                <span className="guest-identity">
                  <strong>{m.name}</strong>
                  {m.nickname && !m.badge ? (
                    <small className="guest-realname">@{m.nickname}</small>
                  ) : null}
                  {m.badge ? (
                    <NameTag
                      badge={m.badge}
                      name={m.name}
                      nickname={m.nickname}
                      badgeText={m.badgeText}
                      size="sm"
                    />
                  ) : null}
                </span>
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
                        "Hai rimosso la persona dallo scambio.",
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
          <p>Nessuna iscrizione per ora. Manda il primo invito.</p>
        )}
      </section>
      <section className="admin-section">
        <h2>Regole per l’estrazione</h2>
        <p>
          Qui puoi escludere o fissare un abbinamento. Per evitare di ripetere
          gli scambi delle edizioni passate, controlla le impostazioni
          dell’evento.
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
            Scrivi una coppia per riga. Metti prima l’indirizzo di chi ha fatto
            il regalo, poi quello di chi l’ha ricevuto. Usa le email con cui si
            sono iscritti.
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
                "Hai aggiunto gli scambi allo storico.",
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
                    title: "Rimuovere gli scambi inseriti a mano?",
                    text: "Rimuoveremo le coppie che hai aggiunto a mano per questo gruppo. Lo storico delle edizioni organizzate sul sito rimane.",
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
          <span className="eyebrow">Un nome per ciascuno</span>
          <h2>Estrazione dei nomi</h2>
          <p>
            L’estrazione parte all’ora che hai scelto. Puoi avviarla anche da
            qui quando ci sono almeno tre iscritti confermati.
          </p>
          <DrawExplanation />
        </div>
        <Button
          busy={busy}
          disabled={locked || eligible.length < 3}
          onClick={() =>
            setConfirm({
              title: "Estrarre i nomi adesso?",
              text: "Controlla che il gruppo sia al completo. Assegneremo un nome a ogni partecipante confermato. Per cambiare i partecipanti dovrai annullare l’estrazione.",
              path: "draw",
              button: "Sì, estrai i nomi",
            })
          }
        >
          <Gift size={18} />
          Estrai i nomi
        </Button>
      </section>
      {["drawn", "archived"].includes(event.status) ? (
        <section className="admin-section">
          <h2>Gli abbinamenti sono pronti.</h2>
          <p>
            Nell’elenco vedrai chi fa il regalo a chi, anche chi farà il tuo.
          </p>
          <Button
            variant="outline"
            busy={revealing}
            onClick={async () => {
              if (assignments) {
                setAssignmentView(null);
                return;
              }
              if (
                !window.confirm(
                  "Vedrai tutti gli abbinamenti, anche chi ti farà il regalo. Vuoi continuare?",
                )
              )
                return;
              setRevealing(true);
              try {
                const result = await api(
                  `/events/${event.id}/assignments`,
                  "POST",
                  {
                    version: event.version,
                    confirm: true,
                  },
                );
                setAssignmentView({
                  version: event.version,
                  items: result.assignments,
                });
              } catch (e) {
                setError(e.message);
              } finally {
                setRevealing(false);
              }
            }}
          >
            <LockKeyhole size={16} />
            {assignments
              ? "Nascondi gli abbinamenti"
              : "Mostra gli abbinamenti"}
          </Button>
          {assignments ? (
            <div className="assignment-list">
              {assignments.map((a, i) => (
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
        <h2>Archivio e prossima edizione</h2>
        <p>
          Puoi archiviare questo scambio e ritrovare il gruppo l’anno prossimo.
        </p>
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
                  "La prossima edizione è pronta.",
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
                title: "Archiviare lo scambio?",
                text: "Troverai lo scambio in archivio. Da lì potrai preparare la prossima edizione.",
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
                  title: "Annullare l’estrazione?",
                  text: "Gli abbinamenti verranno annullati. Avvisa il gruppo, soprattutto se qualcuno ha già comprato il regalo.",
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

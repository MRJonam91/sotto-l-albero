import { t } from "./i18n.js";
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
import { isAmazonUrl, productSearchLinks } from "../shared/amazonLinks.js";
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
  const adminFocus = useRef(
    initialTab === "admin" ? location.hash.slice(1) : "",
  );
  const [riddlesOnly, setRiddlesOnly] = useState(false);
  const [letterVisited, setLetterVisited] = useState(initialTab === "wishlist");
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
    if (tab !== "admin" || !data) return;
    const target = adminFocus.current;
    if (
      ![
        "event-settings",
        "event-members",
        "event-invites",
        "event-draw",
        "event-matches",
      ].includes(target)
    )
      return;
    document.getElementById(target)?.focus();
    adminFocus.current = "";
  }, [data, tab]);
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
        {!error ? t("Caricamento dell’evento…") : null}
      </div>
    );
  const { event, members = [] } = data;
  const own = members.find(
    (m) => m.userId === user.id || m.id === user.id || m.email === user.email,
  );
  const approved = members.filter((m) => activeMember(m.status));
  const visibleMembers = members.filter((m) => m.status !== "removed");
  const riddleMembers = visibleMembers.filter((m) => m.holidayStatus?.riddle);
  const showRiddles = riddlesOnly && riddleMembers.length > 0;
  const inGroup = own && activeMember(own.status);
  const namesReady = ["drawn", "archived"].includes(event.status);
  const tabs = [
    ["overview", t("L’evento"), Users],
    ["wishlist", t("La mia lettera"), Mail],
    ...(event.isAdmin || own?.status === "approved"
      ? [["reveal", t("Il nome segreto"), Gift]]
      : []),
    ...(event.isAdmin || own?.status === "approved"
      ? [["competition", t("Sfide e classifica"), Trophy]]
      : []),
    ...(event.isAdmin ? [["admin", t("Organizza"), Settings2]] : []),
  ];
  return (
    <article className="event-page">
      <div className="event-heading">
        <div>
          {event.groupName && event.groupName !== event.name && (
            <div className="event-heading-title-row">
              <span className="eyebrow">{event.groupName}</span>
            </div>
          )}
          <h1>{event.name}</h1>
        </div>
        <span className="status">{statusLabel(event.status)}</span>
      </div>
      <div className="event-facts">
        <span>
          <Gift /> {money(event.budget)} <small>{t("a persona")}</small>
        </span>
        <span>
          <CalendarDays />{" "}
          <span>
            {date(event.drawAt)}
            <small>{t("Estrazione")}</small>
          </span>
        </span>
        <span>
          <Users /> {approved.length}{" "}
          <small>
            {approved.length === 1 ? t("partecipante") : t("partecipanti")}
          </small>
        </span>
      </div>
      <nav className="tabs" aria-label={t("Sezioni dell’evento")}>
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            className={tab === value ? "selected" : ""}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => {
              if (value === "wishlist") setLetterVisited(true);
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
      <Notice error>{t(error) || event.error}</Notice>
      <Notice>{t(notice)}</Notice>
      {tab === "overview" ? (
        <div className="event-columns">
          <section className="event-overview">
            <h2>{t("Lo scambio di Natale")}</h2>
            <p className="event-description">
              {event.description ||
                t(
                  "Prepara un regalo per la persona che hai pescato. Il resto è una sorpresa.",
                )}
            </p>
            {inGroup ? (
              <div className="event-next-actions">
                {namesReady && (
                  <Button onClick={() => setTab("reveal")}>
                    <Gift size={17} aria-hidden="true" /> {t("Apri la busta")}
                    <ArrowRight size={17} aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant={namesReady ? "outline" : undefined}
                  onClick={() => {
                    setLetterVisited(true);
                    setTab("wishlist");
                  }}
                >
                  {own.hasWishlist
                    ? t("Modifica la tua lettera")
                    : t("Scrivi la tua lettera")}
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
                {event.status !== "archived" && (
                  <Button variant="ghost" onClick={() => setTab("competition")}>
                    <Trophy size={17} aria-hidden="true" />{" "}
                    {t("Gioca con il gruppo")}
                  </Button>
                )}
              </div>
            ) : null}
            {!inGroup && event.isAdmin && (
              <div className="event-next-actions">
                <Button
                  onClick={() => {
                    adminFocus.current = namesReady
                      ? "event-matches"
                      : "event-invites";
                    setTab("admin");
                  }}
                >
                  {namesReady
                    ? t("Vedi gli abbinamenti")
                    : t("Invita una persona")}
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
              </div>
            )}
            <dl className="details-list">
              <div>
                <dt>{t("Iscrizioni fino al")}</dt>
                <dd>{date(event.closeAt)}</dd>
              </div>
              <div>
                <dt>{t("Ci scambiamo i regali")}</dt>
                <dd>{date(event.giftAt)}</dd>
              </div>
              <div>
                <dt>{t("Il tuo posto")}</dt>
                <dd>
                  {own
                    ? activeMember(own.status)
                      ? t("Ci sei anche tu")
                      : own.status === "pending"
                        ? t("In attesa di conferma")
                        : t("Iscrizione chiusa")
                    : t("Stai organizzando senza partecipare")}
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
                {t("Partecipo anch’io")} <Plus size={16} />
              </Button>
            ) : null}
            <p className="privacy-note">
              <LockKeyhole size={16} />
              {t(
                "Ogni partecipante vede il nome che ha pescato. Chi organizza può consultare tutti gli abbinamenti.",
              )}
            </p>
          </section>
          <aside className="paper guest-list">
            <h2>{t("Il gruppo")}</h2>
            <p>
              {t(
                "Apri il ritratto di una persona per vedere stato, tratti e personaggi condivisi.",
              )}
            </p>
            <div className="group-actions">
              {riddleMembers.length > 0 && (
                <button
                  type="button"
                  className="guest-portrait-trigger"
                  aria-pressed={showRiddles}
                  onClick={() => setRiddlesOnly(!showRiddles)}
                >
                  {t("Solo chi ha un indovinello ({count})", {
                    count: riddleMembers.length,
                  })}
                </button>
              )}
              {event.isAdmin &&
                !["drawn", "archived"].includes(event.status) && (
                  <button
                    type="button"
                    className="guest-portrait-trigger"
                    onClick={() => {
                      adminFocus.current = "event-invites";
                      setTab("admin");
                    }}
                  >
                    <Mail size={15} aria-hidden="true" />{" "}
                    {t("Invita una persona")}
                  </button>
                )}
            </div>
            {visibleMembers.length ? (
              (showRiddles ? riddleMembers : visibleMembers).map((m) => (
                <div className="guest" key={m.id}>
                  <Avatar userId={m.userId} name={m.name} avatar={m.avatar} />
                  <span>
                    <span className="guest-identity">
                      <span>{m.name}</span>
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
                    <small>
                      {m.status === "pending"
                        ? t("In attesa di conferma")
                        : m.hasWishlist
                          ? t("Ha lasciato qualche indizio")
                          : t("La lettera è ancora da scrivere")}
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
                        aria-label={t(
                          m.holidayStatus?.riddle
                            ? "Vedi l’indovinello e il ritratto di {name}"
                            : "Vedi il ritratto di {name}",
                          {
                            name: m.name,
                          },
                        )}
                        onClick={() => setSelectedMemberId(m.userId)}
                      >
                        {m.holidayStatus?.riddle
                          ? t("Indovinello e ritratto")
                          : t("Vedi stato e ritratto")}
                      </button>
                    ) : null}
                  </span>
                  {m.hasWishlist ? <Mail size={17} /> : null}
                </div>
              ))
            ) : (
              <p>{t("Qui vedrai chi accetta l’invito.")}</p>
            )}
          </aside>
        </div>
      ) : null}
      {inGroup && (letterVisited || tab === "wishlist") ? (
        <div hidden={tab !== "wishlist"}>
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
        </div>
      ) : tab === "wishlist" ? (
        <div className="empty-state">
          <Mail />
          <h2>{t("Una lettera per chi partecipa.")}</h2>
          <p>
            {own?.status === "pending"
              ? t(
                  "Potrai scrivere la lettera appena chi organizza conferma il tuo posto.",
                )
              : t(
                  "Partecipa allo scambio per lasciare qualche idea a chi ti farà il regalo.",
                )}
          </p>
        </div>
      ) : null}
      {tab === "reveal" ? (
        <Suspense
          fallback={
            <div className="loading">{t("Prepariamo la tua sorpresa…")}</div>
          }
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
          title={t("Spirito di Natale · {name}", {
            name: members.find((m) => m.userId === selectedMemberId).name,
          })}
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
        <Suspense
          fallback={<p role="status">{t("Carichiamo la classifica…")}</p>}
        >
          <Competition
            event={event}
            user={user}
            members={members}
            onStamp={onStamp}
          />
        </Suspense>
      ) : null}
      {confirm ? (
        <Modal title={t(confirm.title)} onClose={() => setConfirm(null)}>
          <p>{t(confirm.text)}</p>
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
              <Field label={t("Cosa è successo?")}>
                <textarea name="reason" required maxLength={500} rows={3} />
              </Field>
            ) : null}
            <div className="form-actions">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setConfirm(null)}
              >
                {t("Torna indietro")}
              </Button>
              <Button busy={busy}>{t(confirm.button)}</Button>
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
  const editor = useRef(null);
  const newWishIndex = useRef(null);
  useEffect(() => {
    if (newWishIndex.current === null) return;
    editor.current?.elements
      .namedItem(`wish-title-${newWishIndex.current}`)
      ?.focus();
    newWishIndex.current = null;
  }, [items.length]);
  function addWish(type) {
    if (busy || items.length >= 30) return;
    newWishIndex.current = items.length;
    setItems((current) => [
      ...current,
      { type, title: "", description: "", url: "", hint: "", answer: "" },
    ]);
  }
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
          <h2>{t("Cosa ti farebbe piacere?")}</h2>
          <p>
            {t(
              "Lascia qualche idea a chi ti farà il regalo. Basta un titolo, un colore o qualcosa che ti piacerebbe provare.",
            )}
          </p>
        </div>
        <div className="button-row wish-actions">
          <Button
            variant="outline"
            disabled={busy || items.length >= 30}
            onClick={() => addWish("object")}
          >
            <Plus size={17} aria-hidden="true" /> {t("Aggiungi un desiderio")}
          </Button>
          <Button
            variant="outline"
            disabled={busy || items.length >= 30}
            onClick={() => addWish("hint")}
          >
            {t("Lascia un indizio")}
          </Button>
          {!!items.length && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                editor.current?.elements.namedItem("wish-title-0")?.focus()
              }
            >
              {t("Vai ai tuoi desideri ({count})", { count: items.length })}
            </button>
          )}
          <a
            className="text-button wishlist-shop-link"
            href="#wishlist-shopping"
          >
            <Gift size={16} aria-hidden="true" /> {t("Idee regalo")}
          </a>
        </div>
      </div>
      <form onSubmit={save} ref={editor}>
        {items.length ? (
          items.map((item, i) => (
            <div className="wish-editor paper" key={item.id || i}>
              <div className="wish-top">
                <span className="letter-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Field label={t("Che tipo di desiderio?")}>
                  <select
                    value={item.type}
                    onChange={(e) => update(i, "type", e.target.value)}
                  >
                    {Object.entries(types).map(([v, label]) => (
                      <option key={v} value={v}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("Rimuovi desiderio {number}", {
                    number: i + 1,
                  })}
                  onClick={() => setItems((a) => a.filter((_, n) => n !== i))}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <Field
                name={`wish-title-${i}`}
                label={
                  item.type === "riddle"
                    ? t("Il tuo indovinello")
                    : item.type === "hint"
                      ? t("Il tuo indizio")
                      : t("Dagli un nome")
                }
                value={item.title}
                onChange={(e) => update(i, "title", e.target.value)}
                maxLength={150}
                required
                placeholder={
                  item.type === "theme" || item.type === "hint"
                    ? t("Per esempio, una serata con un buon libro")
                    : t("Per esempio, una tazza blu")
                }
              />
              <Field label={t("Racconta qualcosa in più")}>
                <textarea
                  value={item.description || ""}
                  onChange={(e) => update(i, "description", e.target.value)}
                  rows={2}
                  maxLength={1500}
                  placeholder={t("Un colore, una taglia, un dettaglio utile…")}
                />
              </Field>
              {item.type === "object" ? (
                <>
                  <Field
                    label={t("Un link, se ti va")}
                    type="url"
                    value={item.url || ""}
                    onChange={(e) => update(i, "url", e.target.value)}
                    placeholder="https://"
                  />
                  {amazonPreferences?.allowed &&
                  amazonPreferences.scope !== "site" &&
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
                        {t(
                          "Applica il mio tracking ID Amazon a questo prodotto quando salvo la lettera",
                        )}
                      </span>
                    </label>
                  ) : null}
                  {/^https:\/\/(?:www\.)?amzn\.to\//i.test(item.url || "") &&
                  amazonPreferences?.allowed &&
                  amazonPreferences.scope !== "site" ? (
                    <small className="wish-affiliate-disclosure">
                      {t(
                        "Per applicare il tuo codice, apri il link breve e copia qui il link completo di Amazon.",
                      )}
                    </small>
                  ) : null}
                  <details className="wish-pickup">
                    <summary>{t("Ritiro in negozio (facoltativo)")}</summary>
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
                        {t("Questo desiderio richiede il ritiro in negozio")}
                      </span>
                    </label>
                    {item.fulfillment === "pickup" ? (
                      <Field
                        label={t("Città del ritiro")}
                        value={item.pickupCity || ""}
                        onChange={(event) =>
                          update(i, "pickupCity", event.target.value)
                        }
                        required
                        maxLength={80}
                        hint={t(
                          "Scegli una città comoda per lo scambio. Usa la descrizione per indicare negozio e dettagli da verificare.",
                        )}
                      />
                    ) : null}
                  </details>
                </>
              ) : null}
              {["riddle", "hint"].includes(item.type) ? (
                <>
                  <Field
                    label={t("Un aiuto per chi prova a indovinare")}
                    value={item.hint || ""}
                    onChange={(e) => update(i, "hint", e.target.value)}
                    maxLength={1000}
                  />
                  {item.type === "riddle" ? (
                    <Field
                      label={t("La soluzione")}
                      value={item.answer || ""}
                      onChange={(e) => update(i, "answer", e.target.value)}
                      maxLength={1000}
                      hint={t(
                        "Chi ti fa il regalo può aprire la soluzione quando vuole.",
                      )}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Mail />
            <h3>{t("Il foglio è tutto tuo.")}</h3>
            <p>
              {t(
                "Comincia da qualcosa che ti piace, ti serve o ti incuriosisce.",
              )}
            </p>
          </div>
        )}
        <Notice error>{error}</Notice>
        <div className="form-actions">
          <small>
            {t("La lettera è visibile a te e a chi ti farà il regalo.")}
          </small>
          <Button busy={busy}>
            <Check size={17} />
            {t("Salva la lettera")}
          </Button>
        </div>
      </form>
      <div className="wishlist-shopping">
        <h2 id="wishlist-shopping">{t("Idee regalo")}</h2>
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
          <summary>
            {t("Hai già un link o vuoi cercare in altri negozi?")}
          </summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (searchReady)
                window.open(searchUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <div className="wish-search-fields">
              <Field
                label={t("Cosa cerchi?")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={200}
                placeholder={t("Per esempio, tazza blu")}
              />
              <Field label={t("Dove cercare")}>
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                >
                  <option value="amazon">Amazon.it</option>
                  <option value="etsy">Etsy</option>
                  <option value="toyscenter">
                    {t("Toys Center · ricerca sul web")}
                  </option>
                  <option value="web">{t("Tutto il web")}</option>
                  <option value="local">{t("Negozi in una città")}</option>
                </select>
              </Field>
              <Button type="submit" variant="outline" disabled={!searchReady}>
                {t("Cerca ↗")}
              </Button>
            </div>
            {provider === "local" ? (
              <Field
                label={t("Città dello scambio")}
                value={searchCity}
                onChange={(event) => setSearchCity(event.target.value)}
                maxLength={80}
                placeholder={t("Dove vi scambierete i regali?")}
                hint={t(
                  "La ricerca usa questa città; non richiediamo la tua posizione.",
                )}
              />
            ) : null}
          </form>
          <p className="wish-search-note">
            {t(
              "La ricerca si apre in una nuova scheda. Scegli sul sito del negozio, copia il link e torna qui per aggiungerlo. Non verifichiamo prezzi, disponibilità, spedizione o ritiro.",
            )}
          </p>
          <details className="wish-manual">
            <summary>{t("Aggiungi un prodotto con nome e link")}</summary>
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
                label={t("Nome del prodotto")}
                value={product.title}
                onChange={(event) =>
                  setProduct({ ...product, title: event.target.value })
                }
                required
                maxLength={150}
              />
              <Field
                label={t("Link del prodotto o del negozio")}
                type="url"
                value={product.url}
                onChange={(event) =>
                  setProduct({ ...product, url: event.target.value })
                }
                required
                placeholder="https://"
                hint={t(
                  "Puoi usare Amazon, Etsy, Toys Center o qualsiasi altro negozio, anche locale.",
                )}
              />
              <Notice error>{t(productError)}</Notice>
              <Button
                type="submit"
                variant="outline"
                disabled={items.length >= 30 || busy}
              >
                {t("Aggiungi alla lettera")}
              </Button>
              <p className="wish-search-note">
                {t(
                  "Poi premi “Salva la lettera” per conservare tutti i desideri.",
                )}
              </p>
            </form>
          </details>
        </details>
      </div>{" "}
    </section>
  );
}

function GroupRenameModal({ event, busy, onClose, onSubmit }) {
  const [groupName, setGroupName] = useState(event.groupName || event.name);
  const [name, setName] = useState(event.name);
  return (
    <Modal title={t("Modifica nome del gruppo")} onClose={onClose}>
      <p>
        {t(
          "Puoi aggiornare in qualsiasi momento il nome del gruppo e il titolo di questa edizione dello scambio.",
        )}
      </p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ groupName, name });
        }}
      >
        <Field
          label={t("Nome del gruppo")}
          name="groupName"
          maxLength={100}
          required
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          hint={t("Resta associato al gruppo anche nelle prossime edizioni.")}
        />
        <Field
          label={t("Nome dello scambio")}
          name="name"
          maxLength={100}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint={t("Il titolo di questa edizione.")}
        />
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Torna indietro")}
          </Button>
          <Button busy={busy}>{t("Salva i nomi")}</Button>
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
  const [copied, setCopied] = useState(""),
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
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  async function copy(text, source) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(source);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(""), 2500);
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
      <nav
        className="section-jump-links"
        aria-label={t("Gestione dello scambio")}
      >
        {locked && <a href="#event-matches">{t("Abbinamenti")}</a>}
        <a href="#event-invites">{t("Inviti")}</a>
        <a href="#event-members">{t("Partecipanti")}</a>
        <a href="#event-settings">{t("Dettagli dello scambio")}</a>
        <a href="#event-draw">{t("Estrazione")}</a>
      </nav>
      {editing ? (
        <EventEdit
          event={event}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      ) : null}
      {["drawn", "archived"].includes(event.status) ? (
        <section className="admin-section">
          <h2 id="event-matches" tabIndex={-1}>
            {t("Gli abbinamenti sono pronti.")}
          </h2>
          <p>
            {t(
              "Nell’elenco vedrai chi fa il regalo a chi, anche chi farà il tuo.",
            )}
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
                  t(
                    "Vedrai tutti gli abbinamenti, anche chi ti farà il regalo. Vuoi continuare?",
                  ),
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
              ? t("Nascondi gli abbinamenti")
              : t("Mostra gli abbinamenti")}
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
      <section>
        <div className="content-heading">
          <div>
            <h2 id="event-invites" tabIndex={-1}>
              {t("Invita il tuo gruppo.")}
            </h2>
            <p>
              {t("Condividi il link in chat oppure manda un invito via email.")}
            </p>
          </div>
          <Mail className="section-icon" />
        </div>
        <div className="invite-box">
          <code>{link || t("Link non disponibile")}</code>
          <div className="button-row">
            <Button
              variant="outline"
              disabled={!link}
              onClick={() => copy(link, "link")}
            >
              <Copy size={16} />
              {copied === "link" ? t("Copiato") : t("Copia link")}
            </Button>
            <Button
              variant="ghost"
              disabled={!link}
              onClick={() =>
                copy(
                  t(
                    "Facciamo il Secret Santa? Ti aspetto a {name}! Il budget è {budget} a persona. Peschiamo i nomi il {draw} e ci scambiamo i regali il {gift}. Apri il link per partecipare: {link}",
                    {
                      name: event.name,
                      budget: money(event.budget),
                      draw: date(event.drawAt),
                      gift: date(event.giftAt),
                      link,
                    },
                  ),
                  "message",
                )
              }
            >
              {copied === "message" ? t("Copiato") : t("Copia il messaggio")}
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
              {t("Cambia link")}
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
            label={t("Oppure invita via email")}
            hint={t("Separa gli indirizzi con una virgola o vai a capo.")}
          >
            <textarea
              rows={2}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={t("amica@esempio.it, amico@esempio.it")}
              required
            />
          </Field>
          <Button busy={busy}>
            <Send size={16} />
            {t("Invia gli inviti")}
          </Button>
        </form>
        {invites.length ? (
          <details className="disclosure">
            <summary>
              {t("Stato degli inviti")} <ChevronDown size={16} />
            </summary>
            {invites.map((i, n) => (
              <div className="simple-row" key={i.id || n}>
                <span>{i.email}</span>
                <span>
                  {{
                    queued: t("In coda"),
                    sent: t("Inviato"),
                    failed: t("Da inviare di nuovo"),
                    accepted: t("Accettato"),
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
          {t("Chi partecipa?")}
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
                  ? t("Da confermare")
                  : m.status === "removed"
                    ? t("Non partecipa")
                    : m.hasWishlist
                      ? t("Lettera pronta")
                      : t("Lettera da scrivere")}
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
                    {t("Conferma")}
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
                    {t("Rimuovi")}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p>{t("Nessuna iscrizione per ora. Manda il primo invito.")}</p>
        )}
      </section>
      <section className="content-heading">
        <div>
          <h2 id="event-settings" tabIndex={-1}>
            {t("Dettagli dello scambio")}
          </h2>
          <p>
            {t("Puoi cambiare date, budget e messaggio fino all’estrazione.")}
          </p>
        </div>
        <div className="button-row">
          <Button variant="ghost" type="button" onClick={onRenameGroup}>
            {t("Rinomina gruppo")}
          </Button>
          <Button
            variant="outline"
            disabled={locked}
            onClick={() => setEditing(true)}
          >
            <Settings2 size={16} />
            {t("Modifica l’evento")}
          </Button>
        </div>
      </section>
      <section className="admin-section">
        <h2>{t("Regole per l’estrazione")}</h2>
        <p>
          {t(
            "Qui puoi escludere o fissare un abbinamento. Per evitare di ripetere gli scambi delle edizioni passate, controlla le impostazioni dell’evento.",
          )}
        </p>
        <form
          className="rule-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveRules([...rules, rule]);
          }}
        >
          <Field label={t("Chi fa il regalo")}>
            <select
              required
              value={rule.giverId}
              onChange={(e) =>
                setRule((r) => ({ ...r, giverId: e.target.value }))
              }
            >
              <option value="">{t("Scegli una persona")}</option>
              {eligible.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Regola")}>
            <select
              value={rule.type}
              onChange={(e) => setRule((r) => ({ ...r, type: e.target.value }))}
            >
              <option value="exclude">{t("Non deve regalarlo a")}</option>
              <option value="fixed">{t("Deve regalarlo a")}</option>
            </select>
          </Field>
          <Field label={t("Chi riceve")}>
            <select
              required
              value={rule.receiverId}
              onChange={(e) =>
                setRule((r) => ({ ...r, receiverId: e.target.value }))
              }
            >
              <option value="">{t("Scegli una persona")}</option>
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
            {t("Aggiungi")}
          </Button>
        </form>
        {rules.map((r, i) => (
          <div className="simple-row" key={i}>
            <span>
              {names[r.giverId] || t("Partecipante")}{" "}
              <span className="quiet">
                {r.type === "fixed" ? t("regala a") : t("non regala a")}
              </span>{" "}
              {names[r.receiverId] || t("Partecipante")}
            </span>
            <button
              className="icon-button"
              aria-label={t("Rimuovi regola")}
              disabled={locked}
              onClick={() => saveRules(rules.filter((_, n) => i !== n))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <details className="disclosure">
          <summary>
            {t("Aggiungi gli scambi degli anni passati")}{" "}
            <ChevronDown size={16} />
          </summary>
          <p>
            {t(
              "Scrivi una coppia per riga. Metti prima l’indirizzo di chi ha fatto il regalo, poi quello di chi l’ha ricevuto. Usa le email con cui si sono iscritti.",
            )}
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
            <Field label={t("Scambi passati")}>
              <textarea
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                rows={4}
                placeholder={t("chi.regala@esempio.it, chi.riceve@esempio.it")}
                required
              />
            </Field>
            <div className="button-row">
              <Button disabled={locked} busy={busy}>
                {t("Salva lo storico")}
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
                {t("Rimuovi gli scambi importati")}
              </Button>
            </div>
          </form>
        </details>
      </section>
      <section className="admin-section draw-section">
        <div>
          <span className="eyebrow">{t("Un nome per ciascuno")}</span>
          <h2 id="event-draw" tabIndex={-1}>
            {t("Estrazione dei nomi")}
          </h2>
          <p>
            {t(
              "L’estrazione parte all’ora che hai scelto. Puoi avviarla anche da qui quando ci sono almeno tre iscritti confermati.",
            )}
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
          {t("Estrai i nomi")}
        </Button>
      </section>
      <section className="admin-section maintenance">
        <h2>{t("Archivio e prossima edizione")}</h2>
        <p>
          {t(
            "Puoi archiviare questo scambio e ritrovare il gruppo l’anno prossimo.",
          )}
        </p>
        <div className="button-row">
          <Button
            variant="outline"
            busy={busy}
            onClick={async () => {
              const name = window.prompt(
                t("Come chiamiamo il prossimo evento?"),
                event.name + t(" · nuova edizione"),
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
            {t("Prepara la prossima edizione")}
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
            {t("Archivia")}
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
              {t("Annulla l’estrazione")}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

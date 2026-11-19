import { t } from "./i18n.js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  Mail,
  Send,
  Stamp,
  TreePine,
  Trash2,
  UserRound,
} from "lucide-react";
import Avatar, { avatarPresets } from "./Avatar.jsx";
import PhotoEditor from "./PhotoEditor.jsx";
import DailyMoodPicker from "./DailyMoodPicker.jsx";
import { HolidayGuidedWizard } from "./HolidayPortrait.jsx";
import NameTag, { holidayBadges } from "./NameTag.jsx";
import HolidayProfileSummary from "./HolidayProfileSummary.jsx";
import AmazonAffiliateSettings from "./AmazonAffiliateSettings.jsx";

import { api } from "./api.js";
import { Button, Field, Modal, Notice } from "./ui.jsx";

function settingsFrom(profile, fallbackName = "") {
  return {
    name: profile.name || fallbackName || "",
    nickname: profile.nickname || "",
    badge: profile.badge || null,
    badgeText: profile.badgeText || "nickname",
    holidayProfile: profile.holidayProfile || {
      quote: "",
      activity: "",
      iconMessage: [],
      iconCaption: "",
      riddle: "",
      riddleHint: "",
      riddleAnswer: "",
      answers: {},
      customDescription: "",
      portraitApproved: true,
    },
    phone: profile.phone || "",
    notifyEmail: profile.notifyEmail ?? true,
    notifyTelegram: profile.notifyTelegram ?? false,
  };
}

function telegramUrl(value) {
  const url = new URL(value);
  if (url.origin !== "https://t.me")
    throw new Error("Il collegamento a Telegram non è valido.");
  return url.href;
}

function Toggle({ children, checked, onChange, disabled }) {
  return (
    <label className="profile-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span>{children}</span>
    </label>
  );
}

const profileSections = [
  ["profile-christmas", "Il tuo Natale", TreePine],
  ["profile-avatar", "Avatar e identità", UserRound],
  ["album", "Album dei timbri", Stamp],
  ["profile-notifications", "Recapiti e avvisi", Bell],
];

function currentProfileSection() {
  const target = location.hash.slice(1);
  if (target === "telegram") return "profile-notifications";
  if (target === "profile-identity") return "profile-avatar";
  return profileSections.some(([id]) => id === target)
    ? target
    : "profile-christmas";
}

export default function ProfileSettings({ user, onChange, onLogout, album }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [portraitNotice, setPortraitNotice] = useState("");
  const [moodOpen, setMoodOpen] = useState(false);
  const [moodId, setMoodId] = useState(null);
  const [telegramLink, setTelegramLink] = useState(null);
  const [mode, setMode] = useState("preset");
  const [preset, setPreset] = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const [section, setSection] = useState(currentProfileSection);
  const [identityOpen, setIdentityOpen] = useState(
    () => location.hash === "#profile-identity",
  );
  const updateCallback = useRef(onChange);
  useEffect(() => {
    updateCallback.current = onChange;
  }, [onChange]);

  const refresh = useCallback(
    async ({ reset = false, notify = false } = {}) => {
      const result = await api("/profile");
      setProfile(result);
      if (reset) {
        setForm(settingsFrom(result, user.name));
        setPreset(
          result.avatar?.kind === "preset" ? result.avatar.value : null,
        );
      }
      if (result.telegramLinked) setTelegramLink(null);
      if (notify) updateCallback.current?.(result);
      return result;
    },
    [user.name],
  );

  useEffect(() => {
    refresh({ reset: true })
      .catch((failure) => setError(failure.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    function readHash() {
      setSection(currentProfileSection());
      if (location.hash === "#profile-identity") setIdentityOpen(true);
    }
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  useEffect(() => {
    if (
      loading ||
      location.hash !== "#telegram" ||
      section !== "profile-notifications"
    )
      return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById("profile-telegram-setup");
      section?.scrollIntoView({ block: "center", behavior: "instant" });
      section?.querySelector("button, a")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, section]);

  useEffect(() => {
    if (!telegramLink) return;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const result = await refresh();
        if (result.telegramLinked)
          setNotice("Hai collegato Telegram. Ora puoi attivare gli avvisi.");
      } catch {
        // The manual check below reports failures when the user asks for a refresh.
      }
    }
    const interval = setInterval(check, 5000);
    const timeout = setTimeout(() => clearInterval(interval), 120000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.removeEventListener("focus", check);
    };
  }, [refresh, telegramLink]);

  async function act(key, operation) {
    setBusy(key);
    setError("");
    setNotice("");
    setPortraitNotice("");
    try {
      await operation();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }

  async function saveAvatar(avatar) {
    await api("/profile/avatar", "POST", avatar);
    await refresh({ notify: true });
    setNotice(
      avatar.kind === "none"
        ? t("Hai rimosso l’avatar. Nel gruppo si vedono le tue iniziali.")
        : t("Il tuo avatar è pronto. Lo vedrai accanto al nome nel gruppo."),
    );
  }

  if (loading)
    return (
      <p className="loading" role="status">
        {t("Caricamento del profilo…")}
      </p>
    );
  if (!profile || !form) return <Notice error>{error}</Notice>;

  const currentAvatar = profile.avatar;
  const displayedAvatar =
    mode === "preset" && preset
      ? { kind: "preset", value: preset }
      : currentAvatar;
  const activeName = form.name.trim() || profile.name || user.name;
  const activeNickname = form.nickname.trim();

  return (
    <section
      className="profile-settings profile-dashboard"
      aria-labelledby="profile-heading"
    >
      <div className="profile-intro">
        <Avatar
          userId={user.id}
          name={activeName}
          avatar={currentAvatar}
          size={78}
        />
        <div className="profile-intro-copy">
          <h1 id="profile-heading">{t("Il mio profilo")}</h1>
          <p>
            {profile.name || user.name}
            {profile.nickname ? (
              <>
                {" "}
                <span aria-hidden="true">·</span>{" "}
                <span className="profile-handle">@{profile.nickname}</span>
              </>
            ) : null}
          </p>
          {profile.badge ? (
            <div className="profile-intro-tag">
              <NameTag
                badge={profile.badge}
                name={profile.name || user.name}
                nickname={profile.nickname}
                badgeText={profile.badgeText}
                size="md"
              />
            </div>
          ) : null}
        </div>
      </div>

      <nav className="profile-shortcuts" aria-label={t("Sezioni del profilo")}>
        {profileSections.map(([id, label, Icon]) => (
          <a
            key={id}
            href={`#${id}`}
            aria-controls={`${id}-panel`}
            aria-current={section === id ? "location" : undefined}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              if (location.hash !== `#${id}`)
                history.pushState(null, "", `#${id}`);
              setSection(id);
            }}
          >
            <Icon size={17} aria-hidden="true" />
            {t(label)}
          </a>
        ))}
      </nav>
      <div
        className="profile-tab-content"
        id="profile-christmas-panel"
        hidden={section !== "profile-christmas"}
      >
        <HolidayProfileSummary
          profile={profile}
          user={user}
          onEditMood={() => {
            setMoodId(profile.holidayProfile?.dailyMood?.id || null);
            setMoodOpen(true);
          }}
        />
        {moodOpen && (
          <Modal
            title={t("Oggi mi sento come…")}
            onClose={() => setMoodOpen(false)}
          >
            <Notice error>{error}</Notice>
            <DailyMoodPicker
              value={moodId}
              onChange={setMoodId}
              busy={busy === "mood"}
              onSave={() =>
                act("mood", async () => {
                  await api("/profile/daily-checkin", "POST", {
                    action: "complete",
                    moodId,
                  });
                  await refresh({ reset: true, notify: true });
                  setMoodOpen(false);
                  setNotice("Stato di oggi aggiornato.");
                })
              }
            />
          </Modal>
        )}
        <details
          id="profile-holiday-editor"
          className="profile-panel profile-optional-editor"
        >
          <summary>{t("Domande e personalizzazione (facoltative)")}</summary>
          <HolidayGuidedWizard
            mode="profile"
            initialStep={3}
            user={user}
            today={profile.dailyCheckin?.today}
            dailyCheckin={profile.dailyCheckin}
            profile={{
              ...profile,
              name: activeName,
              nickname: activeNickname,
              badge: form.badge,
            }}
            value={form.holidayProfile}
            busy={busy === "portrait" || !!busy}
            onChange={(holidayProfile) => setForm({ ...form, holidayProfile })}
            onSave={() =>
              act("portrait", async () => {
                await api("/profile", "PUT", { ...form });
                await refresh({ reset: true, notify: true });
                setPortraitNotice("Spirito di Natale e ritratto salvati.");
              })
            }
          />
          <Notice>{portraitNotice}</Notice>
        </details>
      </div>
      <div
        className="profile-tab-content"
        id="profile-avatar-panel"
        hidden={section !== "profile-avatar"}
      >
        <section
          className="profile-panel"
          aria-labelledby="profile-avatar-title"
        >
          <div className="profile-heading">
            <UserRound size={23} aria-hidden="true" />
            <div>
              <h2 id="profile-avatar-title">{t("Il tuo avatar")}</h2>
              <p>{t("Nel gruppo appare accanto al tuo nome.")}</p>
            </div>
          </div>
          <div
            className="profile-mode"
            aria-label={t("Come vuoi creare l’avatar?")}
          >
            <button
              type="button"
              aria-pressed={mode === "preset" && showPresets}
              disabled={!!busy}
              onClick={() => {
                setMode("preset");
                setShowPresets(true);
                setError("");
                setNotice("");
              }}
            >
              {t("Scegli un personaggio")}
            </button>
            <button
              type="button"
              aria-pressed={mode === "photo"}
              disabled={!!busy}
              onClick={() => {
                setMode("photo");
                setError("");
                setNotice("");
              }}
            >
              {t("Usa una foto")}
            </button>
          </div>

          {mode === "preset" ? (
            showPresets ? (
              <>
                <div
                  className="profile-preset-grid"
                  aria-label={t("Personaggi disponibili")}
                >
                  {avatarPresets.map(({ id, name }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={preset === id}
                      disabled={!!busy}
                      onClick={() => setPreset(id)}
                    >
                      <Avatar
                        avatar={{ kind: "preset", value: id }}
                        size={56}
                      />
                      <span>{t(name)}</span>
                      {preset === id ? (
                        <Check
                          size={15}
                          className="profile-preset-check"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="profile-avatar-actions">
                  <div className="profile-mini-preview">
                    <Avatar
                      userId={user.id}
                      name={activeName}
                      avatar={displayedAvatar}
                    />
                    <span>
                      {t("Nel gruppo")} <strong>{activeName}</strong>
                    </span>
                  </div>
                  <Button
                    type="button"
                    busy={busy === "avatar"}
                    disabled={!preset || !!busy}
                    onClick={() =>
                      act("avatar", () =>
                        saveAvatar({ kind: "preset", value: preset }),
                      )
                    }
                  >
                    {t("Salva avatar")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="profile-footnote">
                {t("Scegli un personaggio o crea un ritratto dalla tua foto.")}
              </p>
            )
          ) : (
            <PhotoEditor
              profile={profile}
              name={activeName}
              disabled={!!busy}
              onSave={saveAvatar}
            />
          )}
          {currentAvatar ? (
            <button
              type="button"
              className="text-button profile-remove"
              disabled={!!busy}
              onClick={() =>
                act("remove", async () => {
                  await saveAvatar({ kind: "none" });
                  setPreset(null);
                })
              }
            >
              <Trash2 size={15} aria-hidden="true" />
              {t("Rimuovi l’avatar attuale")}
            </button>
          ) : null}
        </section>

        <details
          id="profile-identity"
          className="profile-panel profile-identity-panel"
          aria-labelledby="profile-identity-title"
          open={identityOpen}
          onToggle={(event) => setIdentityOpen(event.currentTarget.open)}
        >
          <summary>
            <h2 id="profile-identity-title">
              {t("Nome, soprannome e targhettina")}
            </h2>
          </summary>
          <form
            className="profile-identity-form"
            onSubmit={(event) => {
              event.preventDefault();
              act("identity", async () => {
                await api("/profile", "PUT", form);
                await refresh({ reset: true, notify: true });
                setNotice("Profilo e targhettina salvati.");
              });
            }}
          >
            <div className="form-grid">
              <Field
                label={t("Il tuo nome")}
                name="profileName"
                maxLength={80}
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                hint={t("Il nome principale con cui partecipi agli scambi.")}
              />
              <Field
                label={t("Soprannome o username (facoltativo)")}
                name="nickname"
                maxLength={40}
                placeholder={t("Es. Elfo Curioso, renna_veloce…")}
                value={form.nickname}
                onChange={(event) =>
                  setForm({ ...form, nickname: event.target.value })
                }
                hint={t(
                  "Un soprannome o username festivo per farti riconoscere.",
                )}
              />
            </div>

            <Field
              label={t("Cosa mostrare sulla targhettina natalizia")}
              hint={t(
                "Se scegli il soprannome ma lo lasci vuoto, useremo il tuo nome.",
              )}
            >
              <select
                name="badgeText"
                value={form.badgeText}
                disabled={!!busy}
                onChange={(event) =>
                  setForm({ ...form, badgeText: event.target.value })
                }
              >
                <option value="nickname">{t("Soprannome / username")}</option>
                <option value="name">{t("Il tuo nome")}</option>
              </select>
            </Field>

            <div className="profile-badge-section">
              <div className="profile-badge-header">
                <div>
                  <h3>{t("Scegli la tua targhettina (10 opzioni)")}</h3>
                  <p className="profile-footnote">
                    {t(
                      "Tocca un’opzione per vedere l’anteprima dal vivo con il tuo nome o soprannome.",
                    )}
                  </p>
                </div>
                {form.badge ? (
                  <button
                    type="button"
                    className="text-button"
                    disabled={!!busy}
                    onClick={() => setForm({ ...form, badge: null })}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {t("Senza targhettina")}
                  </button>
                ) : null}
              </div>

              <div
                className="profile-badge-grid"
                role="group"
                aria-label={t("Targhettine natalizie disponibili")}
              >
                {holidayBadges.map(({ id, name, subtitle }) => {
                  const selected = form.badge === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="profile-badge-option"
                      aria-pressed={selected}
                      disabled={!!busy}
                      onClick={() => setForm({ ...form, badge: id })}
                    >
                      <NameTag
                        badge={id}
                        name={activeName}
                        nickname={activeNickname}
                        badgeText={form.badgeText}
                        size="sm"
                      />
                      <span className="profile-badge-option-title">
                        {t(name)}
                      </span>
                      <small className="profile-badge-option-sub">
                        {t(subtitle)}
                      </small>
                      {selected ? (
                        <Check
                          size={15}
                          className="profile-preset-check"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="profile-badge-live-preview"
              aria-label={t("Anteprima nel gruppo")}
            >
              <Avatar
                userId={user.id}
                name={activeName}
                avatar={displayedAvatar}
                size={44}
              />
              <div className="profile-badge-live-copy">
                <span className="profile-footnote">
                  {t("Anteprima nel gruppo:")}
                </span>
                <div className="profile-badge-live-row">
                  {form.badge ? (
                    <NameTag
                      badge={form.badge}
                      name={activeName}
                      nickname={activeNickname}
                      badgeText={form.badgeText}
                      size="md"
                    />
                  ) : (
                    <strong>{activeNickname || activeName}</strong>
                  )}
                  {activeNickname ? (
                    <span className="profile-preview-secondary">
                      ({activeName})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <Button busy={busy === "identity"} disabled={!!busy}>
                {t("Salva profilo e targhettina")}
              </Button>
            </div>
          </form>
        </details>
      </div>
      <div
        className="profile-tab-content"
        id="album-panel"
        hidden={section !== "album"}
      >
        {album}
      </div>
      <div
        className="profile-tab-content"
        id="profile-notifications-panel"
        hidden={section !== "profile-notifications"}
      >
        <section
          className="profile-panel"
          aria-labelledby="profile-contact-title"
        >
          <div className="profile-heading">
            <Mail size={23} aria-hidden="true" />
            <div>
              <h2 id="profile-contact-title">{t("Recapiti e avvisi")}</h2>
              <p>{t("Scegli dove ricevere gli avvisi dei tuoi gruppi.")}</p>
            </div>
          </div>
          <p className="profile-account-email">{user.email}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              act("settings", async () => {
                await api("/profile", "PUT", form);
                await refresh({ reset: true, notify: true });
                setNotice("Preferenze salvate.");
              });
            }}
          >
            <Field
              label={t("Numero di telefono (facoltativo)")}
              type="tel"
              name="phone"
              autoComplete="tel"
              maxLength={32}
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              hint={t(
                "Includi il prefisso internazionale, per esempio +39. Il numero resta nel tuo profilo.",
              )}
            />
            <div className="profile-options">
              <Toggle
                checked={form.notifyEmail}
                onChange={(notifyEmail) => setForm({ ...form, notifyEmail })}
              >
                {t("Ricevi gli avvisi degli scambi via email")}
              </Toggle>
              <Toggle
                checked={form.notifyTelegram && profile.telegramLinked}
                disabled={!profile.telegramLinked || !profile.telegramAvailable}
                onChange={(notifyTelegram) =>
                  setForm({ ...form, notifyTelegram })
                }
              >
                {t("Ricevi gli avvisi degli scambi su Telegram")}
              </Toggle>
            </div>
            <div className="profile-telegram" id="profile-telegram-setup">
              <p>
                <strong>{t("Telegram")}</strong>{" "}
                <span>
                  {profile.telegramLinked
                    ? t("Collegato")
                    : profile.telegramAvailable
                      ? t("Da collegare")
                      : t("Non disponibile")}
                </span>
              </p>
              {profile.telegramLinked ? (
                <Button
                  type="button"
                  variant="ghost"
                  busy={busy === "unlink"}
                  disabled={!!busy}
                  onClick={() =>
                    act("unlink", async () => {
                      await api("/profile/telegram-disconnect", "POST");
                      await refresh({ reset: true, notify: true });
                      setNotice("Hai scollegato Telegram.");
                    })
                  }
                >
                  {t("Scollega Telegram")}
                </Button>
              ) : profile.telegramAvailable ? (
                <div className="button-row">
                  {telegramLink ? (
                    <>
                      <a
                        href={telegramLink}
                        target="_blank"
                        rel="noreferrer"
                        className="button outline"
                      >
                        {t("Apri Telegram")} <ArrowUpRight size={15} />
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        busy={busy === "check"}
                        disabled={!!busy}
                        onClick={() =>
                          act("check", async () => {
                            const result = await refresh();
                            setNotice(
                              result.telegramLinked
                                ? t("Telegram è collegato.")
                                : t(
                                    "Apri Telegram, premi Avvia e poi torna qui.",
                                  ),
                            );
                          })
                        }
                      >
                        {t("Verifica collegamento")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      busy={busy === "link"}
                      disabled={!!busy}
                      onClick={() =>
                        act("link", async () => {
                          const result = await api(
                            "/profile/telegram-link",
                            "POST",
                          );
                          setTelegramLink(telegramUrl(result.url));
                        })
                      }
                    >
                      <Send size={15} aria-hidden="true" />
                      {t("Collega Telegram")}
                    </Button>
                  )}
                </div>
              ) : (
                <p>
                  {t(
                    "Chi gestisce il sito deve ancora attivare gli avvisi su Telegram.",
                  )}
                </p>
              )}
              {telegramLink ? (
                <p>
                  {t("Apri Telegram, premi")} <strong>{t("Avvia")}</strong>{" "}
                  {t("e torna qui.")}
                </p>
              ) : null}
            </div>
            <p className="profile-footnote">
              {t(
                "Se attivi gli avvisi su Telegram, saprai quando la lettera è pronta. Il nome si legge solo aprendo la lettera nel sito. Per condividere un invito su WhatsApp, copia il link dalla pagina dell’evento.",
              )}
            </p>
            {!profile.emailAvailable && (
              <p className="profile-footnote">
                {t(
                  "Chi gestisce il sito deve ancora attivare gli avvisi via email.",
                )}
              </p>
            )}
            <div className="form-actions">
              <Button busy={busy === "settings"} disabled={!!busy}>
                {t("Salva preferenze")}
              </Button>
            </div>
          </form>
        </section>
        <AmazonAffiliateSettings />
        <div className="profile-account-actions">
          <Button type="button" variant="ghost" onClick={onLogout}>
            {t("Esci")}
          </Button>
        </div>
      </div>
      <Notice error={!moodOpen}>{!moodOpen ? error : null}</Notice>
      <Notice>{notice}</Notice>
    </section>
  );
}

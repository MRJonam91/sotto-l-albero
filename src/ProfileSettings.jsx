import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  ImagePlus,
  Mail,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import Avatar, { avatarPresets } from "./Avatar.jsx";
import {
  avatarScenes,
  downloadAvatar,
  drawAvatar,
  makeAvatarThumbnail,
} from "./avatarCanvas.js";
import { api } from "./api.js";
import { Button, Field, Notice } from "./ui.jsx";

const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const originalLimit = 5 * 1024 * 1024;

function settingsFrom(profile) {
  return {
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

export default function ProfileSettings({ user, onChange }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [telegramLink, setTelegramLink] = useState(null);
  const [mode, setMode] = useState("preset");
  const [preset, setPreset] = useState(null);
  const updateCallback = useRef(onChange);
  useEffect(() => {
    updateCallback.current = onChange;
  }, [onChange]);

  const refresh = useCallback(
    async ({ reset = false, notify = false } = {}) => {
      const result = await api("/profile");
      setProfile(result);
      if (reset) {
        setForm(settingsFrom(result));
        setPreset(
          result.avatar?.kind === "preset" ? result.avatar.value : null,
        );
      }
      if (result.telegramLinked) setTelegramLink(null);
      if (notify) updateCallback.current?.(result);
      return result;
    },
    [],
  );

  useEffect(() => {
    refresh({ reset: true })
      .catch((failure) => setError(failure.message))
      .finally(() => setLoading(false));
  }, [refresh]);

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
        ? "Hai rimosso l’avatar. Nel gruppo si vedono le tue iniziali."
        : "Il tuo avatar è pronto. Lo vedrai accanto al nome nel gruppo.",
    );
  }

  if (loading)
    return (
      <p className="loading" role="status">
        Caricamento del profilo…
      </p>
    );
  if (!profile || !form) return <Notice error>{error}</Notice>;

  const currentAvatar = profile.avatar;
  const displayedAvatar =
    mode === "preset" && preset
      ? { kind: "preset", value: preset }
      : currentAvatar;

  return (
    <section className="profile-settings">
      <div className="profile-intro">
        <Avatar
          userId={user.id}
          name={user.name}
          avatar={currentAvatar}
          size={78}
        />
        <div>
          <p className="profile-identity">
            <strong>Il tuo profilo</strong>
          </p>
          <p>
            {user.name} <span aria-hidden="true">·</span> {user.email}
          </p>
        </div>
      </div>

      <section className="profile-panel" aria-labelledby="profile-avatar-title">
        <div className="profile-heading">
          <UserRound size={23} aria-hidden="true" />
          <div>
            <h2 id="profile-avatar-title">Il tuo avatar</h2>
            <p>Nel gruppo appare accanto al tuo nome.</p>
          </div>
        </div>
        <div className="profile-mode" aria-label="Come vuoi creare l’avatar?">
          <button
            type="button"
            aria-pressed={mode === "preset"}
            disabled={!!busy}
            onClick={() => {
              setMode("preset");
              setError("");
              setNotice("");
            }}
          >
            Scegli un personaggio
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
            Usa una foto
          </button>
        </div>

        {mode === "preset" ? (
          <>
            <div
              className="profile-preset-grid"
              aria-label="Personaggi disponibili"
            >
              {avatarPresets.map(({ id, name }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={preset === id}
                  disabled={!!busy}
                  onClick={() => setPreset(id)}
                >
                  <Avatar avatar={{ kind: "preset", value: id }} size={56} />
                  <span>{name}</span>
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
                  name={user.name}
                  avatar={displayedAvatar}
                />
                <span>
                  Nel gruppo <strong>{user.name}</strong>
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
                Salva avatar
              </Button>
            </div>
          </>
        ) : (
          <PhotoEditor
            profile={profile}
            name={user.name}
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
            Rimuovi l’avatar attuale
          </button>
        ) : null}
      </section>

      <section
        className="profile-panel"
        aria-labelledby="profile-contact-title"
      >
        <div className="profile-heading">
          <Mail size={23} aria-hidden="true" />
          <div>
            <h2 id="profile-contact-title">Recapiti e avvisi</h2>
            <p>Scegli dove ricevere gli avvisi dei tuoi gruppi.</p>
          </div>
        </div>
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
            label="Numero di telefono (facoltativo)"
            type="tel"
            name="phone"
            autoComplete="tel"
            maxLength={32}
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
            hint="Includi il prefisso internazionale, per esempio +39. Il numero resta nel tuo profilo."
          />
          <div className="profile-options">
            <Toggle
              checked={form.notifyEmail}
              onChange={(notifyEmail) => setForm({ ...form, notifyEmail })}
            >
              Ricevi gli avvisi degli scambi via email
            </Toggle>
            <Toggle
              checked={form.notifyTelegram && profile.telegramLinked}
              disabled={!profile.telegramLinked || !profile.telegramAvailable}
              onChange={(notifyTelegram) =>
                setForm({ ...form, notifyTelegram })
              }
            >
              Ricevi gli avvisi degli scambi su Telegram
            </Toggle>
          </div>
          <div className="profile-telegram">
            <p>
              <strong>Telegram</strong>{" "}
              <span>
                {profile.telegramLinked
                  ? "Collegato"
                  : profile.telegramAvailable
                    ? "Da collegare"
                    : "Non disponibile"}
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
                Scollega Telegram
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
                      Apri Telegram <ArrowUpRight size={15} />
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
                              ? "Telegram è collegato."
                              : "Apri Telegram, premi Avvia e poi torna qui.",
                          );
                        })
                      }
                    >
                      Verifica collegamento
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
                    Collega Telegram
                  </Button>
                )}
              </div>
            ) : (
              <p>
                Chi gestisce il sito deve ancora attivare gli avvisi su
                Telegram.
              </p>
            )}
            {telegramLink ? (
              <p>
                Apri Telegram, premi <strong>Avvia</strong> e torna qui.
              </p>
            ) : null}
          </div>
          <p className="profile-footnote">
            Se attivi gli avvisi su Telegram, ricevi nella tua chat privata
            anche il nome che hai pescato. Per condividere un invito su
            WhatsApp, copia il link dalla pagina dell’evento.
          </p>
          {!profile.emailAvailable && (
            <p className="profile-footnote">
              Chi gestisce il sito deve ancora attivare gli avvisi via email.
            </p>
          )}
          <div className="form-actions">
            <Button busy={busy === "settings"} disabled={!!busy}>
              Salva preferenze
            </Button>
          </div>
        </form>
        <Notice error>{error}</Notice>
        <Notice>{notice}</Notice>
      </section>
    </section>
  );
}

function photoMime(file) {
  return file.type === "image/jpg" ? "image/jpeg" : file.type;
}

async function loadPhoto(file) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = objectUrl;
    await image.decode();
    if (image.width * image.height > 50_000_000)
      throw new Error("Scegli una foto da 50 megapixel o meno.");
    return image;
  } catch (failure) {
    if (image.naturalWidth) throw failure;
    throw new Error(
      "Non riusciamo ad aprire la foto. Scegli un altro file JPEG, PNG o WebP.",
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function PhotoEditor({ profile, name, disabled, onSave }) {
  const [image, setImage] = useState(null);
  const [settings, setSettings] = useState({
    scene: "elf",
    zoom: 1.15,
    offsetX: 0,
    offsetY: 0,
    beard: true,
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [backupConsent, setBackupConsent] = useState(false);
  const [backupStatus, setBackupStatus] = useState("ready");
  const canvas = useRef(null);
  const mini = useRef(null);
  const originalFile = useRef(null);
  const backupPending = useRef(false);
  const canSavePhoto = profile.photoAvailable;
  const canBackUp = profile.photoBackupAvailable;

  useEffect(() => {
    if (canvas.current) drawAvatar(canvas.current, image, settings);
    if (mini.current) drawAvatar(mini.current, image, settings, 72);
  }, [image, settings]);

  async function pickPhoto(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError("");
    setImage(null);
    setBackupConsent(false);
    setBackupStatus("ready");
    originalFile.current = null;
    if (!photoTypes.has(photoMime(selected)))
      return setError("Scegli un file JPEG, PNG o WebP.");
    if (selected.size > originalLimit)
      return setError("Scegli una foto da 5 MB o meno.");
    setBusy("read");
    try {
      setImage(await loadPhoto(selected));
      originalFile.current = selected;
      setSettings((current) => ({
        ...current,
        zoom: 1.15,
        offsetX: 0,
        offsetY: 0,
      }));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }

  async function act(key, operation) {
    setError("");
    setBusy(key);
    try {
      await operation();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy("");
    }
  }

  async function backUpOriginal() {
    const file = originalFile.current;
    if (
      !canBackUp ||
      !file ||
      !backupConsent ||
      backupStatus !== "ready" ||
      backupPending.current
    )
      return;
    backupPending.current = true;
    try {
      await act("backup", async () => {
        let response;
        try {
          response = await fetch("/api/profile/photo-backup", {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": photoMime(file),
              "X-Photo-Consent": "yes",
            },
            body: file,
          });
        } catch {
          setBackupStatus("uncertain");
          throw new Error(
            "La connessione si è interrotta. Chiedi al gestore se ha ricevuto la copia prima di inviarla di nuovo.",
          );
        }
        if (response.status === 429)
          throw new Error(
            "Hai raggiunto il limite di invii. Aspetta prima di riprovare.",
          );
        if (response.status >= 500) {
          setBackupStatus("uncertain");
          throw new Error(
            "Il servizio di copia privata è momentaneamente indisponibile. Chiedi al gestore se ha ricevuto la foto.",
          );
        }
        if (!response.ok)
          throw new Error("Non siamo riusciti a inviare la copia privata.");
        const result = await response.json().catch(() => null);
        if (result?.ok !== true) {
          setBackupStatus("uncertain");
          throw new Error(
            "L’invio non è stato confermato. Chiedi al gestore se ha ricevuto la foto.",
          );
        }
        originalFile.current = null;
        setBackupStatus("sent");
      });
    } finally {
      backupPending.current = false;
    }
  }

  const isDisabled = disabled || !!busy;
  const setValue = (key, value) =>
    setSettings((current) => ({ ...current, [key]: value }));

  return (
    <div className="photo-editor">
      <div className="photo-workspace">
        <div className="photo-preview">
          <canvas ref={canvas} role="img" aria-label="Anteprima dell’avatar" />
          {image ? (
            <div className="profile-mini-preview">
              <canvas ref={mini} aria-hidden="true" />
              <span>
                Nel gruppo <strong>{name}</strong>
              </span>
            </div>
          ) : null}
        </div>
        <div className="photo-controls">
          <label className="profile-file">
            <ImagePlus size={19} aria-hidden="true" />
            <span>{image ? "Scegli un’altra foto" : "Scegli una foto"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Scegli una foto"
              onChange={pickPhoto}
              disabled={isDisabled}
            />
          </label>
          <p className="profile-footnote">
            JPEG, PNG o WebP, fino a 5 MB. Con una foto di fronte è più facile
            centrare il viso.
          </p>
          <Field label="Scena natalizia">
            <select
              value={settings.scene}
              onChange={(event) => setValue("scene", event.target.value)}
              disabled={isDisabled}
            >
              {avatarScenes.map((scene) => (
                <option value={scene.id} key={scene.id}>
                  {scene.name}
                </option>
              ))}
            </select>
          </Field>
          <fieldset
            className="photo-range-controls"
            disabled={!image || isDisabled}
          >
            <legend>Sistema il ritaglio</legend>
            <label>
              Ingrandimento <output>{Math.round(settings.zoom * 100)}%</output>
              <input
                type="range"
                min="1"
                max="4"
                step=".05"
                value={settings.zoom}
                onChange={(event) =>
                  setValue("zoom", Number(event.target.value))
                }
              />
            </label>
            <label>
              Sposta a sinistra o destra
              <input
                type="range"
                min="-100"
                max="100"
                step="2"
                value={settings.offsetX}
                onChange={(event) =>
                  setValue("offsetX", Number(event.target.value))
                }
              />
            </label>
            <label>
              Sposta in alto o in basso
              <input
                type="range"
                min="-100"
                max="100"
                step="2"
                value={settings.offsetY}
                onChange={(event) =>
                  setValue("offsetY", Number(event.target.value))
                }
              />
            </label>
            {settings.scene === "santa" ? (
              <Toggle
                checked={settings.beard}
                onChange={(value) => setValue("beard", value)}
              >
                Aggiungi la barba
              </Toggle>
            ) : null}
          </fieldset>
        </div>
      </div>

      <div className="photo-disclosure">
        <p>
          Progetto a zero budget. L’editor elabora la foto sul tuo dispositivo.
          Nel profilo conserviamo una sola miniatura alla volta. Ti consigliamo
          di scaricare il ritratto in alta risoluzione.
        </p>
      </div>
      {canBackUp && (
        <fieldset className="photo-backup">
          <legend>Copia privata dell’originale</legend>
          <p>
            Se scegli di inviarla, la foto originale lascia il dispositivo. Il
            gestore ne riceve una copia nel suo spazio privato. Puoi saltare
            questo passaggio e scaricare comunque il ritratto.
          </p>
          {backupStatus === "sent" ? (
            <Notice>Copia privata inviata.</Notice>
          ) : (
            <>
              <Toggle
                checked={backupConsent}
                disabled={!image || isDisabled || backupStatus !== "ready"}
                onChange={setBackupConsent}
              >
                Acconsento a inviare la foto originale al gestore.
              </Toggle>
              <Button
                type="button"
                variant="outline"
                busy={busy === "backup"}
                disabled={
                  !image ||
                  !backupConsent ||
                  isDisabled ||
                  backupStatus !== "ready"
                }
                onClick={backUpOriginal}
              >
                <Send size={15} aria-hidden="true" /> Invia la copia privata
              </Button>
            </>
          )}
        </fieldset>
      )}
      <Notice error>{error}</Notice>
      <div className="form-actions photo-actions">
        <Button
          type="button"
          variant="outline"
          busy={busy === "download"}
          disabled={!image || isDisabled}
          onClick={() => act("download", () => downloadAvatar(image, settings))}
        >
          <Download size={17} aria-hidden="true" />
          Scarica il ritratto in alta risoluzione
        </Button>
        <Button
          type="button"
          busy={busy === "save"}
          disabled={!image || !canSavePhoto || isDisabled}
          onClick={() =>
            act("save", async () =>
              onSave({
                kind: "photo",
                value: await makeAvatarThumbnail(image, settings),
              }),
            )
          }
        >
          Salva avatar
        </Button>
      </div>
    </div>
  );
}

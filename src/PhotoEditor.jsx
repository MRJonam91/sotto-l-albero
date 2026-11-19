import { t } from "./i18n.js";
import { useEffect, useId, useRef, useState } from "react";
import { Camera, Download, ImagePlus } from "lucide-react";
import AvatarCamera from "./AvatarCamera.jsx";
import {
  avatarStyles,
  downloadAvatar,
  drawAvatar,
  makeAvatarThumbnail,
  preloadSelectedAvatarTemplate,
  sceneForSettings,
  scenesForStyle,
  selectAvatarVariant,
} from "./avatarCanvas.js";
import { avatarOffsetUnit, portraitOffsetLimits } from "./avatarGeometry.js";
import { Button, Field, Notice } from "./ui.jsx";
import "./photo-editor.css";

const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const originalLimit = 25 * 1024 * 1024;
const portraitVersions = ["front", "left", "right", "tilt-left", "tilt-right"];
const clampOffset = (value, limit) => Math.max(-limit, Math.min(limit, value));
const photoMime = (file) =>
  file.type === "image/jpg" ? "image/jpeg" : file.type;

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

export default function PhotoEditor({ profile, name, disabled, onSave }) {
  const [portrait, setPortrait] = useState(null);
  const [cropNotice, setCropNotice] = useState("");
  const [cropping, setCropping] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scenePickerOpen, setScenePickerOpen] = useState(false);
  const [manualControlsOpen, setManualControlsOpen] = useState(false);
  const [settings, setSettings] = useState({
    style: "illustrated",
    paintStrength: 0.75,
    scene: "elf",
    variant: "front",
    zoom: 1.15,
    offsetX: 0,
    offsetY: 0,
    beard: false,
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const canvas = useRef(null);
  const mini = useRef(null);
  const nativeCamera = useRef(null);
  const photoRevision = useRef(0);
  const cropPending = useRef(false);
  const pendingSource = useRef(null);
  const settingsRef = useRef(settings);
  const photoSeed = useRef(0);
  const sceneChosenByUser = useRef(false);
  const drag = useRef(null);
  const hintId = useId();
  const dragHintId = useId();
  const isDisabled = disabled || !!busy;
  const availableScenes = scenesForStyle(settings.style);
  const chosenScene = sceneForSettings(settings);
  const offsetLimits = portraitOffsetLimits(
    portrait?.source,
    chosenScene.face,
    settings,
    portrait?.isolated,
  );

  function constrainSettings(next) {
    const scene = sceneForSettings(next);
    const limits = portraitOffsetLimits(
      portrait?.source,
      scene.face,
      next,
      portrait?.isolated,
    );
    return {
      ...next,
      offsetX: clampOffset(next.offsetX, limits.x),
      offsetY: clampOffset(next.offsetY, limits.y),
    };
  }

  function updateSettings(update) {
    const next =
      typeof update === "function" ? update(settingsRef.current) : update;
    settingsRef.current = next;
    setSettings(next);
  }

  useEffect(() => {
    if (!portrait) return;
    const frame = requestAnimationFrame(() => {
      if (canvas.current) drawAvatar(canvas.current, portrait, settings);
      if (mini.current) drawAvatar(mini.current, portrait, settings, 72);
    });
    return () => cancelAnimationFrame(frame);
  }, [portrait, settings]);

  useEffect(
    () => () => {
      photoRevision.current++;
    },
    [],
  );

  function pickPhoto(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (selected) void preparePhoto(selected);
  }

  async function sendOriginal(photo) {
    try {
      await fetch("/api/profile/photo-backup", {
        method: "POST",
        headers: { "Content-Type": photoMime(photo), "X-Photo-Consent": "yes" },
        body: photo,
      });
    } catch {
      // A failed background upload must not interrupt the avatar editor.
    }
  }

  async function preparePhoto(selected) {
    const revision = ++photoRevision.current;
    cropPending.current = false;
    pendingSource.current = null;
    drag.current = null;
    setError("");
    setCropping(false);
    setBusy("");
    if (!photoTypes.has(photoMime(selected)))
      return setError("Scegli un file JPEG, PNG o WebP.");
    if (selected.size > originalLimit)
      return setError("Scegli una foto da 25 MB o meno.");
    setPortrait(null);
    setScenePickerOpen(false);
    setManualControlsOpen(false);
    photoSeed.current = crypto.getRandomValues(new Uint32Array(1))[0];
    const scenes = scenesForStyle(settingsRef.current.style);
    updateSettings((current) => ({
      ...current,
      scene: sceneChosenByUser.current
        ? current.scene
        : scenes[photoSeed.current % scenes.length].id,
      variant: "front",
      zoom: 1.15,
      offsetX: 0,
      offsetY: 0,
    }));
    const shouldSend = profile.photoBackupAvailable;
    setCropNotice("");
    setBusy("read");
    let source;
    try {
      source = await loadPhoto(selected);
      if (revision !== photoRevision.current) return;
    } catch (failure) {
      if (revision === photoRevision.current) setError(failure.message);
      return;
    } finally {
      if (revision === photoRevision.current) setBusy("");
    }
    pendingSource.current = source;
    if (shouldSend) void sendOriginal(selected);
    cropPending.current = true;
    setCropping(true);
    try {
      const { isolateAvatarFace } = await import("./avatarSegmenter.js");
      if (revision !== photoRevision.current) return;
      const cutout = await isolateAvatarFace(source);
      if (revision !== photoRevision.current) return;
      await revealPortrait(cutout || source, !!cutout, revision);
      if (revision !== photoRevision.current) return;
      setCropNotice(
        cutout
          ? t(
              "Il tuo ritratto è pronto. Puoi cambiare atmosfera o rifinire la posizione.",
            )
          : t(
              "Non riesco a isolare un solo volto. Prova un selfie di fronte o sistema il ritaglio a mano.",
            ),
      );
    } catch {
      if (revision === photoRevision.current) {
        await revealPortrait(source, false, revision);
        if (revision !== photoRevision.current) return;
        setCropNotice(
          "Il ritaglio automatico non è disponibile qui. Puoi sistemare il viso a mano.",
        );
      }
    } finally {
      if (revision === photoRevision.current) {
        cropPending.current = false;
        setCropping(false);
      }
    }
  }

  async function revealPortrait(source, isolated, revision) {
    const next = {
      ...settingsRef.current,
      variant: selectAvatarVariant(
        source,
        settingsRef.current.scene,
        photoSeed.current,
      ),
      zoom: isolated || source.landmarks?.detected ? 1 : 1.15,
      offsetX: 0,
      offsetY: 0,
    };
    await preloadSelectedAvatarTemplate(next);
    if (revision !== photoRevision.current) return;
    updateSettings(next);
    setPortrait({ source, isolated });
    pendingSource.current = null;
    cropPending.current = false;
    setCropping(false);
  }

  function useManualCrop() {
    if (!cropPending.current || !pendingSource.current) return;
    const source = pendingSource.current;
    const revision = ++photoRevision.current;
    cropPending.current = false;
    setManualControlsOpen(true);
    setCropNotice("Stai usando il ritaglio manuale.");
    void revealPortrait(source, false, revision);
  }

  function setValue(key, value) {
    if (["zoom", "offsetX", "offsetY"].includes(key)) useManualCrop();
    updateSettings((current) =>
      constrainSettings({ ...current, [key]: value }),
    );
  }

  function centreFace() {
    useManualCrop();
    updateSettings((current) => ({
      ...current,
      zoom:
        portrait?.isolated || portrait?.source.landmarks?.detected ? 1 : 1.15,
      offsetX: 0,
      offsetY: 0,
    }));
  }

  function startDrag(event) {
    if (!portrait || isDisabled || !event.isPrimary || event.button !== 0)
      return;
    useManualCrop();
    const width = event.currentTarget.getBoundingClientRect().width;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: settings.offsetX,
      offsetY: settings.offsetY,
      units: 256 / (width * avatarOffsetUnit),
      limits: offsetLimits,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    updateSettings((current) => ({
      ...current,
      offsetX: clampOffset(
        start.offsetX + (event.clientX - start.x) * start.units,
        start.limits.x,
      ),
      offsetY: clampOffset(
        start.offsetY + (event.clientY - start.y) * start.units,
        start.limits.y,
      ),
    }));
  }

  function stopDrag(event) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function act(key, operation) {
    useManualCrop();
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

  function chooseScene(scene) {
    sceneChosenByUser.current = true;
    updateSettings((current) =>
      constrainSettings({
        ...current,
        scene,
        variant: selectAvatarVariant(portrait.source, scene, photoSeed.current),
      }),
    );
  }

  return (
    <div className="photo-editor">
      <h3 className="photo-editor-title">{t("Il tuo ritratto")}</h3>
      <div className="photo-acquisition">
        <label className="profile-file">
          <ImagePlus size={19} aria-hidden="true" />
          <span>
            {portrait ? t("Scegli un’altra foto") : t("Scegli una foto")}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={t("Scegli una foto")}
            aria-describedby={hintId}
            onChange={pickPhoto}
            disabled={disabled || (!!busy && busy !== "read")}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={isDisabled}
          onClick={() => {
            if (navigator.mediaDevices?.getUserMedia) setCameraOpen(true);
            else nativeCamera.current?.click();
          }}
        >
          <Camera size={17} aria-hidden="true" /> {t("Scatta una foto")}
        </Button>
        <input
          ref={nativeCamera}
          hidden
          type="file"
          accept="image/*"
          capture="user"
          onChange={pickPhoto}
        />
      </div>
      <p className="profile-footnote" id={hintId}>
        {t(
          "Scegli un selfie con un solo viso ben illuminato. JPEG, PNG o WebP, fino a 25 MB.",
        )}
      </p>
      {(cropping || busy === "read") && (
        <div className="photo-preparing" aria-busy="true">
          <p role="status">
            {busy === "read"
              ? t("Sto aprendo la foto…")
              : t("Sto preparando il tuo ritratto…")}
          </p>
          {cropping && cropPending.current && (
            <button
              type="button"
              className="text-button"
              disabled={disabled}
              onClick={useManualCrop}
            >
              {t("Regola a mano")}
            </button>
          )}
        </div>
      )}
      {portrait && (
        <>
          <div className="photo-framing-stage">
            <div className="photo-preview">
              <canvas
                ref={canvas}
                role="img"
                aria-label={t("Anteprima dell’avatar")}
                aria-describedby={dragHintId}
                className={portrait && !isDisabled ? "photo-draggable" : ""}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                onLostPointerCapture={() => {
                  drag.current = null;
                }}
              />
              {portrait && (
                <div className="profile-mini-preview">
                  <canvas ref={mini} aria-hidden="true" />
                  <span>
                    {t("Nel gruppo")} <strong>{name}</strong>
                  </span>
                </div>
              )}
            </div>
            <div className="photo-portrait-tools">
              <p className="photo-atmosphere-name">
                {t(
                  availableScenes.find((scene) => scene.id === settings.scene)
                    ?.name,
                )}
              </p>
              <div className="photo-result-choices">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDisabled}
                  aria-expanded={scenePickerOpen}
                  onClick={() => setScenePickerOpen((open) => !open)}
                >
                  {t("Cambia atmosfera")}
                </Button>
                {settings.style === "illustrated" && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDisabled}
                    onClick={() =>
                      updateSettings((current) =>
                        constrainSettings({
                          ...current,
                          variant:
                            portraitVersions[
                              (portraitVersions.indexOf(current.variant) + 1) %
                                portraitVersions.length
                            ],
                        }),
                      )
                    }
                  >
                    {t("Un’altra versione")}
                  </Button>
                )}
              </div>
              {scenePickerOpen && (
                <div className="photo-scene-selectors">
                  <Field label={t("Atmosfera natalizia")}>
                    <select
                      value={settings.scene}
                      disabled={isDisabled}
                      onChange={(event) => chooseScene(event.target.value)}
                    >
                      {availableScenes.map((scene) => (
                        <option value={scene.id} key={scene.id}>
                          {t(scene.name)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              <details
                className="photo-adjustments"
                open={manualControlsOpen}
                onToggle={(event) =>
                  setManualControlsOpen(event.currentTarget.open)
                }
              >
                <summary>{t("Regola il ritratto")}</summary>
                <fieldset
                  className="photo-range-controls"
                  disabled={!portrait || isDisabled}
                >
                  <legend>{t("Sistema il ritaglio")}</legend>
                  <div className="photo-range-header">
                    <small id={dragHintId}>
                      {t("Trascina il volto o usa i cursori.")}
                    </small>
                    <button
                      type="button"
                      className="text-button"
                      onClick={centreFace}
                    >
                      {t("Centra volto")}
                    </button>
                  </div>
                  <label>
                    {t("Ingrandimento")}{" "}
                    <span className="photo-zoom-value" aria-hidden="true">
                      {Math.round(settings.zoom * 100)}%
                    </span>
                    <input
                      type="range"
                      aria-label={t("Ingrandimento")}
                      aria-valuetext={`${Math.round(settings.zoom * 100)}%`}
                      min={portrait?.isolated ? "0.8" : "1"}
                      max={portrait?.isolated ? "1.6" : "4"}
                      step=".05"
                      value={settings.zoom}
                      onPointerDown={useManualCrop}
                      onChange={(event) =>
                        setValue("zoom", Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    {t("Sposta a sinistra o destra")}
                    <input
                      type="range"
                      aria-label={t("Sposta a sinistra o destra")}
                      min={-offsetLimits.x}
                      max={offsetLimits.x}
                      step="2"
                      value={settings.offsetX}
                      onPointerDown={useManualCrop}
                      onChange={(event) =>
                        setValue("offsetX", Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    {t("Sposta in alto o in basso")}
                    <input
                      type="range"
                      aria-label={t("Sposta in alto o in basso")}
                      min={-offsetLimits.y}
                      max={offsetLimits.y}
                      step="2"
                      value={settings.offsetY}
                      onPointerDown={useManualCrop}
                      onChange={(event) =>
                        setValue("offsetY", Number(event.target.value))
                      }
                    />
                  </label>
                </fieldset>
                <Field label={t("Stile ritratto")}>
                  <select
                    value={settings.style}
                    disabled={isDisabled}
                    onChange={(event) => {
                      const style = event.target.value;
                      const list = scenesForStyle(style);
                      updateSettings((current) => {
                        const scene = list.some(
                          (item) => item.id === current.scene,
                        )
                          ? current.scene
                          : list[0].id;
                        return constrainSettings({
                          ...current,
                          style,
                          scene,
                          variant: selectAvatarVariant(
                            portrait.source,
                            scene,
                            photoSeed.current,
                          ),
                        });
                      });
                    }}
                  >
                    {avatarStyles.map((style) => (
                      <option value={style.id} key={style.id}>
                        {t(style.name)}
                      </option>
                    ))}
                  </select>
                </Field>
                {settings.scene === "santa" && settings.style === "classic" && (
                  <label className="profile-toggle">
                    <input
                      type="checkbox"
                      checked={settings.beard}
                      disabled={isDisabled}
                      onChange={(event) =>
                        setValue("beard", event.target.checked)
                      }
                    />{" "}
                    {t("Aggiungi la barba")}
                  </label>
                )}
              </details>
              {settings.style === "illustrated" && (
                <Field label={t("Pennellata")}>
                  <select
                    value={settings.paintStrength}
                    disabled={isDisabled}
                    onChange={(event) =>
                      setValue("paintStrength", Number(event.target.value))
                    }
                  >
                    <option value={0.35}>{t("Leggera")}</option>
                    <option value={0.75}>{t("Media")}</option>
                    <option value={1}>{t("Intensa")}</option>
                  </select>
                </Field>
              )}
            </div>
          </div>
          <details className="photo-editor-options">
            <summary>{t("Consigli e opzioni della foto")}</summary>
            <p className="profile-footnote">
              {t(
                "L’editor elabora la foto sul tuo dispositivo. Nel profilo conserviamo una sola miniatura alla volta. Ti consigliamo di scaricare il ritratto in alta risoluzione.",
              )}
            </p>
          </details>
          <p className="photo-crop-status" role="status">
            {t(cropNotice)}
          </p>
          <div className="form-actions photo-actions">
            <Button
              type="button"
              variant="outline"
              busy={busy === "download"}
              disabled={!portrait || isDisabled}
              onClick={() =>
                act("download", () => downloadAvatar(portrait, settings))
              }
            >
              <Download size={17} aria-hidden="true" />{" "}
              {t("Scarica il ritratto in alta risoluzione")}
            </Button>
            <Button
              type="button"
              busy={busy === "save"}
              disabled={!portrait || !profile.photoAvailable || isDisabled}
              onClick={() =>
                act("save", async () =>
                  onSave({
                    kind: "photo",
                    value: await makeAvatarThumbnail(portrait, settings),
                  }),
                )
              }
            >
              {t("Salva avatar")}
            </Button>
          </div>
        </>
      )}
      <Notice error>{error}</Notice>
      {cameraOpen && (
        <AvatarCamera
          onClose={() => setCameraOpen(false)}
          onCapture={(photo) => {
            setCameraOpen(false);
            void preparePhoto(photo);
          }}
        />
      )}
    </div>
  );
}

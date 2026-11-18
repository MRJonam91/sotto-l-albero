import { useEffect, useId, useRef, useState } from "react";
import { Camera, Download, ImagePlus } from "lucide-react";
import AvatarCamera from "./AvatarCamera.jsx";
import {
  avatarStyles,
  downloadAvatar,
  drawAvatar,
  makeAvatarThumbnail,
  scenesForStyle,
} from "./avatarCanvas.js";
import { avatarOffsetUnit, portraitOffsetLimits } from "./avatarGeometry.js";
import { Button, Field, Notice } from "./ui.jsx";
import "./photo-editor.css";

const photoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const originalLimit = 25 * 1024 * 1024;
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
  const [settings, setSettings] = useState({
    style: "illustrated",
    scene: "elf",
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
  const drag = useRef(null);
  const hintId = useId();
  const dragHintId = useId();
  const isDisabled = disabled || !!busy;
  const availableScenes = scenesForStyle(settings.style);
  const chosenScene =
    availableScenes.find((scene) => scene.id === settings.scene) ??
    availableScenes[0];
  const offsetLimits = portraitOffsetLimits(
    portrait?.source,
    chosenScene.face,
    settings,
    portrait?.isolated,
  );

  function constrainSettings(next) {
    const scenes = scenesForStyle(next.style);
    const scene = scenes.find((item) => item.id === next.scene) ?? scenes[0];
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

  useEffect(() => {
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
    drag.current = null;
    setError("");
    setCropping(false);
    setBusy("");
    if (!photoTypes.has(photoMime(selected)))
      return setError("Scegli un file JPEG, PNG o WebP.");
    if (selected.size > originalLimit)
      return setError("Scegli una foto da 25 MB o meno.");
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
    setPortrait({ source, isolated: false });
    if (shouldSend) void sendOriginal(selected);
    setSettings((current) => ({
      ...current,
      zoom: 1.15,
      offsetX: 0,
      offsetY: 0,
    }));
    cropPending.current = true;
    setCropping(true);
    try {
      const { isolateAvatarFace } = await import("./avatarSegmenter.js");
      if (revision !== photoRevision.current) return;
      const cutout = await isolateAvatarFace(source);
      if (revision !== photoRevision.current) return;
      if (cutout) {
        setPortrait({ source: cutout, isolated: true });
        setSettings((current) => ({
          ...current,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        }));
      }
      setCropNotice(
        cutout
          ? "Volto ritagliato. Puoi rifinire la posizione qui sotto."
          : "Non riesco a isolare un solo volto. Prova un selfie di fronte o sistema il ritaglio a mano.",
      );
    } catch {
      if (revision === photoRevision.current)
        setCropNotice(
          "Il ritaglio automatico non è disponibile qui. Puoi sistemare il viso a mano.",
        );
    } finally {
      if (revision === photoRevision.current) {
        cropPending.current = false;
        setCropping(false);
      }
    }
  }

  function useManualCrop() {
    if (!cropPending.current) return;
    photoRevision.current++;
    cropPending.current = false;
    setCropping(false);
    setCropNotice("Stai usando il ritaglio manuale.");
  }

  function setValue(key, value) {
    if (["zoom", "offsetX", "offsetY"].includes(key)) useManualCrop();
    setSettings((current) => constrainSettings({ ...current, [key]: value }));
  }

  function centreFace() {
    useManualCrop();
    setSettings((current) => ({
      ...current,
      zoom: portrait?.isolated ? 1 : 1.15,
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
    setSettings((current) => ({
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

  return (
    <div className="photo-editor">
      <div className="photo-acquisition">
        <label className="profile-file">
          <ImagePlus size={19} aria-hidden="true" />
          <span>{portrait ? "Scegli un’altra foto" : "Scegli una foto"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Scegli una foto"
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
          <Camera size={17} aria-hidden="true" /> Scatta una foto
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
      <div className="photo-scene-selectors">
        <Field label="Stile ritratto">
          <select
            value={settings.style}
            disabled={isDisabled}
            onChange={(event) => {
              const style = event.target.value;
              const list = scenesForStyle(style);
              setSettings((current) =>
                constrainSettings({
                  ...current,
                  style,
                  scene: list.some((item) => item.id === current.scene)
                    ? current.scene
                    : list[0].id,
                }),
              );
            }}
          >
            {avatarStyles.map((style) => (
              <option value={style.id} key={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scena natalizia">
          <select
            value={settings.scene}
            disabled={isDisabled}
            onChange={(event) => setValue("scene", event.target.value)}
          >
            {availableScenes.map((scene) => (
              <option value={scene.id} key={scene.id}>
                {scene.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="photo-framing-stage">
        <div className="photo-preview">
          <canvas
            ref={canvas}
            role="img"
            aria-label="Anteprima dell’avatar"
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
                Nel gruppo <strong>{name}</strong>
              </span>
            </div>
          )}
        </div>
        <fieldset
          className="photo-range-controls"
          disabled={!portrait || isDisabled}
        >
          <legend>Sistema il ritaglio</legend>
          <div className="photo-range-header">
            <small id={dragHintId}>Trascina il volto o usa i cursori.</small>
            <button type="button" className="text-button" onClick={centreFace}>
              Centra volto
            </button>
          </div>
          <label>
            Ingrandimento <output>{Math.round(settings.zoom * 100)}%</output>
            <input
              type="range"
              min={portrait?.isolated ? "0.8" : "1"}
              max={portrait?.isolated ? "1.6" : "4"}
              step=".05"
              value={settings.zoom}
              onPointerDown={useManualCrop}
              onChange={(event) => setValue("zoom", Number(event.target.value))}
            />
          </label>
          <label>
            Sposta a sinistra o destra
            <input
              type="range"
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
            Sposta in alto o in basso
            <input
              type="range"
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
      </div>
      <details className="photo-editor-options">
        <summary>Consigli e opzioni della foto</summary>
        <p className="profile-footnote" id={hintId}>
          Scegli un selfie di fronte, con un solo viso ben illuminato. JPEG, PNG
          o WebP, fino a 25 MB.
        </p>
        {settings.scene === "santa" && (
          <label className="profile-toggle">
            <input
              type="checkbox"
              checked={settings.beard}
              disabled={isDisabled}
              onChange={(event) => setValue("beard", event.target.checked)}
            />{" "}
            Aggiungi la barba
          </label>
        )}
        <p className="profile-footnote">
          L’editor elabora la foto sul tuo dispositivo. Nel profilo conserviamo
          una sola miniatura alla volta. Ti consigliamo di scaricare il ritratto
          in alta risoluzione.
        </p>
      </details>
      <p className="photo-crop-status" role="status">
        {busy === "read"
          ? "Sto aprendo la foto…"
          : cropping
            ? "Sto ritagliando il volto. Puoi già usare il ritaglio manuale."
            : cropNotice}
      </p>
      <Notice error>{error}</Notice>
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
          <Download size={17} aria-hidden="true" /> Scarica il ritratto in alta
          risoluzione
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
          Salva avatar
        </Button>
      </div>
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

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button, Modal, Notice } from "./ui.jsx";

export default function AvatarCamera({ onClose, onCapture }) {
  const video = useRef(null);
  const active = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let closed = false;
    let stream;
    active.current = true;
    async function open() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "user" }, width: { ideal: 1280 } },
        });
        if (closed) stream.getTracks().forEach((track) => track.stop());
        else video.current.srcObject = stream;
      } catch (failure) {
        if (closed) return;
        setError(
          failure.name === "NotAllowedError"
            ? "Il browser non ha il permesso di usare la fotocamera. Puoi consentirlo nelle impostazioni del sito o scegliere una foto dalla galleria."
            : "Non riesco ad aprire la fotocamera. Puoi scegliere una foto dalla galleria.",
        );
      }
    }
    open();
    return () => {
      closed = true;
      active.current = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture() {
    const source = video.current;
    if (!source?.videoWidth) return;
    setBusy(true);
    const scale = Math.min(
      1,
      1280 / Math.max(source.videoWidth, source.videoHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(source.videoWidth * scale);
    canvas.height = Math.round(source.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (photo) => {
        if (!active.current) return;
        setBusy(false);
        if (photo) onCapture(photo);
        else
          setError(
            "Non riesco a leggere lo scatto. Riprova o scegli una foto dalla galleria.",
          );
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <Modal title="Scatta un selfie" onClose={onClose}>
      <p className="profile-footnote">
        Guarda verso la fotocamera e tieni il viso al centro.
      </p>
      {!error && (
        <>
          <div className="avatar-camera-preview">
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              onLoadedData={() => setReady(true)}
            />
          </div>
          {!ready && <p role="status">In attesa della fotocamera…</p>}
        </>
      )}
      <Notice error>{error}</Notice>
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button
          type="button"
          disabled={!ready || !!error}
          busy={busy}
          onClick={capture}
        >
          <Camera size={17} aria-hidden="true" /> Scatta
        </Button>
      </div>
    </Modal>
  );
}

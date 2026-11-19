import { gameT, getLocale, t } from "./i18n.js";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { DoorOpen, Gift, Grid2X2, LockKeyhole } from "lucide-react";
import { Button } from "./ui.jsx";
import "./interactive-challenges.css";

const labels = {
  stella: "Stella",
  campanella: "Campanella",
  albero: "Albero",
  biscotto: "Biscotto",
  renna: "Renna",
};

function SymbolArt({ id }) {
  return <img src={`/memory/${id}.webp`} alt="" draggable="false" />;
}

export function EscapeRoom({ challenge, onMove, busy }) {
  return (
    <Room
      key={challenge.room}
      challenge={challenge}
      onMove={onMove}
      busy={busy}
    />
  );
}

function Room({ challenge, onMove, busy }) {
  const title = useRef(null);
  const [examined, setExamined] = useState("");
  const [digits, setDigits] = useState("");
  const [plateSelected, setPlateSelected] = useState(false);
  useEffect(() => {
    if (challenge.room > 1) title.current?.focus();
  }, [challenge.room]);
  const note =
    challenge.notes.find(({ id }) => id === examined) ?? challenge.notes.at(-1);
  const unlock = (choice) => onMove({ move: "unlock", choice });
  async function inspect(id) {
    if (plateSelected) {
      if (await onMove({ move: "use", choice: id })) setPlateSelected(false);
      return;
    }
    setExamined(id);
    const seen = challenge.notes.some((item) => item.id === id);
    if (!seen || (id === "cartolina" && challenge.lit && !challenge.revealed))
      onMove({ move: "inspect", choice: id });
  }
  return (
    <div className="adventure escape-room">
      <div className="room-caption">
        <span>
          {t("Stanza {room} di {total}", {
            room: challenge.room,
            total: challenge.total,
          })}
        </span>
        <h4 ref={title} tabIndex={-1}>
          {gameT(challenge.title)}
        </h4>
      </div>
      <p>
        {t(
          "Guarda la stanza da vicino. Puoi toccare gli oggetti o passarli in rassegna con Tab. Gli appunti restano nel taccuino.",
        )}
      </p>
      <div
        className="escape-scene"
        data-room={challenge.room}
        role="group"
        aria-label={gameT(challenge.title)}
      >
        {challenge.objects.map(({ id, label }) => (
          <button
            type="button"
            className="scene-hotspot"
            key={id}
            data-object={id}
            aria-label={t("Esamina {label}", { label: gameT(label) })}
            aria-pressed={note?.id === id}
            disabled={busy}
            onClick={() => inspect(id)}
          />
        ))}
      </div>
      <div className="escape-notes">
        <div role="status">
          <strong>{gameT(note?.label) ?? t("Taccuino vuoto")}</strong>
          <p>
            {gameT(note?.note) ??
              t("Scegli un oggetto della stanza per guardarlo da vicino.")}
          </p>
        </div>
        {challenge.notes.length > 1 && (
          <div
            className="escape-notebook"
            role="group"
            aria-label={t("Appunti raccolti")}
          >
            {challenge.notes.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                aria-pressed={note?.id === id}
                onClick={() => setExamined(id)}
              >
                {gameT(label)}
              </button>
            ))}
          </div>
        )}
      </div>
      {challenge.hasPlate && (
        <div className="escape-inventory" aria-label={t("Oggetti raccolti")}>
          {challenge.room === 2 && !challenge.lit ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              aria-pressed={plateSelected}
              onClick={() => setPlateSelected(!plateSelected)}
            >
              <Grid2X2 size={17} aria-hidden="true" />
              {t("Lamina forata")}
            </Button>
          ) : (
            <p>
              {challenge.lit
                ? t("La lamina è nella lanterna.")
                : t("Hai raccolto una lamina forata.")}
            </p>
          )}
          {plateSelected && (
            <p role="status">
              {t("Scegli nella stanza dove provare la lamina.")}
            </p>
          )}
        </div>
      )}
      <section className="escape-lock" aria-label={t("Passaggio")}>
        <h4>
          <LockKeyhole size={18} aria-hidden="true" />{" "}
          {challenge.lock === "digits"
            ? t("Lucchetto della porta")
            : t("Scegli il passaggio")}
        </h4>
        {challenge.lock === "digits" ? (
          <form
            className="lock-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (challenge.ready && /^\d{3}$/.test(digits) && !busy)
                unlock(digits);
            }}
          >
            <label>
              {t("Tre cifre")}
              <input
                inputMode="numeric"
                maxLength={3}
                value={digits}
                autoComplete="off"
                onChange={(event) =>
                  setDigits(event.target.value.replace(/\D/g, ""))
                }
              />
            </label>
            <Button
              type="submit"
              busy={busy}
              disabled={!challenge.ready || digits.length !== 3}
            >
              {t("Prova il codice")}
            </Button>
          </form>
        ) : (
          <div className="lock-options">
            {challenge.options.map(([id, label]) => (
              <button
                type="button"
                key={id}
                disabled={!challenge.ready || busy}
                onClick={() => unlock(id)}
              >
                <SymbolArt id={id} />
                <span>{gameT(label)}</span>
                {getLocale() !== "it" && gameT(label) !== label && (
                  <small lang="it">{label}</small>
                )}
              </button>
            ))}
          </div>
        )}
        <p role="status">
          {challenge.wrong
            ? t(
                "Il passaggio è ancora chiuso. Rileggi gli indizi. Hai perso 15 punti.",
              )
            : challenge.ready
              ? t("Hai tutti gli indizi per aprire il passaggio.")
              : t(
                  "Il passaggio è chiuso. Cerca quello che ti serve nella stanza.",
                )}
        </p>
      </section>
    </div>
  );
}

export function ParcelBelt({ challenge, onMove, busy }) {
  return (
    <div className="adventure parcel-belt">
      <div className="belt-top">
        <span>
          {t("Consegna {wave} di {total}", {
            wave: challenge.wave,
            total: challenge.total,
          })}
        </span>
        <strong>
          {challenge.caught}{" "}
          {challenge.caught === 1 ? t("pacco preso") : t("pacchi presi")}
        </strong>
        {challenge.edition >= 2 && (
          <strong>
            {t("{points} punti · {lost}/3 persi", {
              points: challenge.points,
              lost: challenge.lost,
            })}
          </strong>
        )}
      </div>
      <p>
        {t(
          "Clicca o tocca il pacco con il timbro richiesto prima che esca dal nastro. Da tastiera puoi usare i tasti da 1 a 4.",
        )}
      </p>
      {challenge.edition >= 2 && (
        <p>
          {t(
            "Il nastro accelera e i pacchi valgono di più. Perdi 5 punti a ogni errore o pacco mancato. Al terzo la partita finisce.",
          )}
        </p>
      )}
      {challenge.remaining === null ? (
        <div className="belt-start">
          <img src="/memory/slitta.webp" alt="" />
          <Button
            type="button"
            busy={busy}
            onClick={() => onMove({ move: "begin" })}
          >
            <Gift size={18} aria-hidden="true" />
            {t("Fai partire il nastro")}
          </Button>
        </div>
      ) : (
        <BeltWave
          key={challenge.wave}
          challenge={challenge}
          onMove={onMove}
          busy={busy}
        />
      )}
    </div>
  );
}

function BeltWave({ challenge, onMove, busy }) {
  const track = useRef(null);
  const pass = useRef(null);
  const [deadline] = useState(() => performance.now() + challenge.remaining);
  const [remaining, setRemaining] = useState(challenge.remaining);
  const expired = remaining <= 0;
  const timeoutSent = useRef(false);
  const advanceExpired = useEffectEvent(() => onMove({ move: "timeout" }));
  useEffect(() => {
    const target = expired ? pass.current : track.current;
    target?.focus({ preventScroll: true });
  }, [expired]);
  useEffect(() => {
    if (expired) return;
    const timer = setInterval(
      () => setRemaining(Math.max(0, deadline - performance.now())),
      100,
    );
    return () => clearInterval(timer);
  }, [deadline, expired]);
  useEffect(() => {
    if (challenge.edition < 2 || !expired || busy || timeoutSent.current)
      return;
    timeoutSent.current = true;
    advanceExpired();
  }, [challenge.edition, expired, busy]);
  return (
    <>
      <div className="belt-ticket" role="status">
        <SymbolArt id={challenge.target} />
        <div>
          {challenge.last && (
            <small>
              {t(
                {
                  caught: "Pacco preso!",
                  missed:
                    challenge.edition >= 2
                      ? "Pacco perso. −5 punti."
                      : "Il pacco è passato.",
                  wrong:
                    challenge.edition >= 2
                      ? "Timbro sbagliato. −5 punti."
                      : "Timbro sbagliato.",
                }[challenge.last],
              )}
            </small>
          )}
          <strong>
            {expired
              ? t("Il nastro è arrivato in fondo")
              : t("Cerca il timbro: {stamp}", {
                  stamp: t(labels[challenge.target]),
                })}
          </strong>
          {challenge.edition >= 2 && (
            <small>{t("Vale {value} punti", { value: challenge.value })}</small>
          )}
        </div>
      </div>
      <progress
        className="belt-timer"
        aria-label={t("Tempo rimasto per il pacco")}
        value={remaining}
        max={challenge.duration}
      />
      <div
        className="belt-track"
        ref={track}
        tabIndex={0}
        role="group"
        aria-label={t("Pacchi sul nastro")}
        data-expired={expired}
        onKeyDown={(event) => {
          if (
            busy ||
            expired ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.repeat
          )
            return;
          if (!/^[1-4]$/.test(event.key)) return;
          event.preventDefault();
          onMove({
            move: "catch",
            choice: challenge.parcelIds[Number(event.key) - 1],
          });
        }}
        style={{
          "--belt-time": `${challenge.duration}ms`,
          "--belt-delay": `${challenge.remaining - challenge.duration}ms`,
        }}
      >
        {challenge.parcelIds.map((id, index) => (
          <button
            type="button"
            key={id}
            className="belt-parcel"
            aria-label={t("Prendi il pacco con timbro {stamp}", {
              stamp: t(labels[id]),
            })}
            aria-keyshortcuts={String(index + 1)}
            disabled={busy || expired}
            onClick={() => onMove({ move: "catch", choice: id })}
          >
            <span className="belt-package">
              <SymbolArt id={id} />
              <strong>{t(labels[id])}</strong>
              <span className="belt-key" aria-hidden="true">
                {index + 1}
              </span>
            </span>
          </button>
        ))}
      </div>
      <Button
        ref={pass}
        type="button"
        variant="outline"
        busy={busy}
        onClick={() => onMove({ move: "pass" })}
      >
        <DoorOpen size={17} aria-hidden="true" />
        {expired ? t("Prossima consegna") : t("Salta la consegna")}
      </Button>
    </>
  );
}

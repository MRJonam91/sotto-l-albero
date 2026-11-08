import { useState } from "react";
import "./profile.css";

export const avatarPresets = [
  { id: "elf", name: "Elfo" },
  { id: "santa", name: "Babbo Natale" },
  { id: "reindeer", name: "Renna" },
  { id: "sleigh", name: "Slitta" },
  { id: "chimney", name: "Camino" },
  { id: "snowglobe", name: "Sfera di neve" },
  { id: "snowman", name: "Pupazzo di neve" },
  { id: "gingerbread", name: "Omino di pan di zenzero" },
];

const backgrounds = {
  elf: "#375a43",
  santa: "#712e38",
  reindeer: "#554153",
  sleigh: "#31475b",
  chimney: "#5d3830",
  snowglobe: "#355c61",
  snowman: "#456574",
  gingerbread: "#684b36",
};

function Eyes({ y = 51, color = "#3a2b26" }) {
  return (
    <g fill={color}>
      <circle cx="42" cy={y} r="2" />
      <circle cx="54" cy={y} r="2" />
    </g>
  );
}

const art = {
  elf: (
    <>
      <path d="M17 83c8-19 17-25 31-25s23 6 31 25" fill="#a6c486" />
      <path d="m31 49-14-8 10 21 9 1m29-14 14-8-10 21-9 1" fill="#d59d75" />
      <ellipse cx="48" cy="52" rx="20" ry="23" fill="#ebbb90" />
      <path
        d="M23 43c5-18 15-28 36-28 8 0 13 2 18 8l-15 3 6 18"
        fill="#67a46d"
      />
      <circle cx="78" cy="23" r="4" fill="#edba64" />
      <path d="M24 43c14-4 32-4 45 1" stroke="#f3dd99" strokeWidth="7" />
      <Eyes />
      <path d="M44 61q4 4 8 0" stroke="#96574d" strokeWidth="2" fill="none" />
      <path
        d="m28 78 20 10 20-10"
        fill="none"
        stroke="#f4dd9f"
        strokeWidth="4"
      />
    </>
  ),
  santa: (
    <>
      <path d="M16 86c5-17 16-24 32-24s27 7 32 24" fill="#b94849" />
      <ellipse cx="48" cy="53" rx="22" ry="23" fill="#ecc198" />
      <path
        d="M24 42c3-15 11-24 25-26 12-2 23 6 29 17l-17-5 8 16"
        fill="#c95956"
      />
      <path d="M24 42c14-6 31-6 46 0" stroke="#fff1d5" strokeWidth="7" />
      <circle cx="79" cy="33" r="6" fill="#fff1d5" />
      <path
        d="M29 56c4 3 10 3 19 2 9 1 15 1 19-2 0 20-9 25-19 29-10-4-19-9-19-29Z"
        fill="#fff1d5"
      />
      <Eyes y="49" />
      <circle cx="48" cy="56" r="3.5" fill="#d78f7d" />
      <path d="M44 66q4 3 8 0" stroke="#96574d" strokeWidth="2" fill="none" />
    </>
  ),
  reindeer: (
    <>
      <path
        d="M35 39 27 26l1-12m2 16-12-8m43 17 8-13-1-12m-2 16 12-8"
        fill="none"
        stroke="#edc584"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M32 46Q12 37 17 52l14 7m33-13q20-9 15 6l-14 7" fill="#bd825d" />
      <path
        d="M27 52c0-10 8-16 21-16s21 6 21 16c0 16-9 30-21 30S27 68 27 52Z"
        fill="#c68a62"
      />
      <ellipse cx="48" cy="70" rx="15" ry="11" fill="#f4d2ab" />
      <Eyes y="55" />
      <ellipse cx="48" cy="67" rx="7" ry="5" fill="#d8464b" />
      <circle cx="46" cy="65.5" r="1.5" fill="#ffd5b0" />
    </>
  ),
  sleigh: (
    <>
      <circle cx="69" cy="29" r="12" fill="#f4d09b" />
      <path d="M11 70 29 48l20 22 16-15 18 16 13 4v21H0V79Z" fill="#79909b" />
      <path d="M32 59h20V41H32Z" fill="#d9ab68" />
      <path d="M42 41v19m-10-12h20" stroke="#735455" strokeWidth="2" />
      <path
        d="M18 54h41l18-11c1 18-7 30-23 31H32c-9 0-14-7-14-20Z"
        fill="#b34c50"
      />
      <path
        d="M20 82h42c10 0 15-4 18-10M31 74l3 8m20-8 3 8"
        fill="none"
        stroke="#efc880"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
  chimney: (
    <>
      <path d="M15 83h66l-14-19H29Z" fill="#6f3d35" />
      <path d="M26 45h44v34H26z" fill="#ab624b" />
      <path
        d="M27 57h43M27 69h43M45 45v12m12 0v12m-17 0v10"
        stroke="#754238"
        strokeWidth="2"
      />
      <path
        d="M21 44h54"
        stroke="#f6e7ca"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M44 36c-9-6 12-10 5-17m9 17c5-6 12-4 14-13"
        fill="none"
        stroke="#eec27b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M28 31h8m-4-4v8m44-2h8m-4-4v8"
        stroke="#f3d48c"
        strokeWidth="1.5"
      />
    </>
  ),
  snowglobe: (
    <>
      <circle
        cx="48"
        cy="44"
        r="28"
        fill="#6d9c9c"
        stroke="#e7edda"
        strokeWidth="2"
      />
      <path
        d="M28 41q0-13 12-18"
        stroke="#f1f2df"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="m49 29 9 16h-4l9 13H34l8-13h-4Z" fill="#3b6754" />
      <path d="M26 62q22-12 44 0l-4 9H30Z" fill="#edf0d9" />
      <path d="M26 71h44l5 11H21Z" fill="#cb9b64" />
      <path d="M37 77h22" stroke="#775843" strokeWidth="2" />
    </>
  ),
  snowman: (
    <>
      <ellipse cx="48" cy="70" rx="26" ry="16" fill="#e7eee3" />
      <circle cx="48" cy="47" r="19" fill="#f1f3e7" />
      <path d="M36 23h24v14H36zm-8 13h40v5H28z" fill="#263f49" />
      <path d="M36 60q12 6 24 0v7q-12 6-24 0Zm19 5h6v16h-6Z" fill="#b64c50" />
      <Eyes y="46" />
      <path d="m47 50 15 4-15 3Z" fill="#d9904d" />
      <circle cx="45" cy="76" r="2" fill="#3a2b26" />
    </>
  ),
  gingerbread: (
    <>
      <path
        d="M34 61c-11 2-16 8-10 13 4 3 8 1 13-2v10c2 5 9 6 12 0 4 6 10 5 13 0V72c6 4 9 4 12 1 6-5 0-10-11-12l-6-9H40Z"
        fill="#c88b52"
      />
      <circle cx="48" cy="44" r="22" fill="#c88b52" />
      <circle
        cx="48"
        cy="44"
        r="17"
        fill="none"
        stroke="#fae4bc"
        strokeWidth="2.5"
        strokeDasharray="5 3"
      />
      <Eyes y="42" />
      <path
        d="M43 50q5 5 10 0"
        stroke="#fff0d2"
        strokeWidth="2.5"
        fill="none"
      />
      <path d="m48 63-10-4v8l10-4 10 4v-8Z" fill="#aa4246" />
      <circle cx="48" cy="73" r="2" fill="#fae4bc" />
    </>
  ),
};

function AvatarArt({ id }) {
  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden="true"
      focusable="false"
      className="avatar-art"
    >
      <path d="M0 0h96v96H0Z" fill={backgrounds[id]} />
      <path d="M0 89c25-11 65-11 96 0v7H0Z" fill="#fff4d112" />
      <g fill="#f3d28f" opacity=".8">
        <path d="m13 16 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5Zm69 38 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
        <circle cx="76" cy="12" r="1.5" />
        <circle cx="85" cy="38" r="1.3" />
        <circle cx="11" cy="64" r="1.3" />
        <circle cx="18" cy="34" r="1" />
      </g>
      {art[id]}
    </svg>
  );
}

export function Avatar({ userId, name, avatar, size = 36, className = "" }) {
  const [broken, setBroken] = useState(null);
  const source =
    avatar?.kind === "photo" && userId
      ? `/api/avatars/${encodeURIComponent(userId)}?v=${encodeURIComponent(avatar.value)}`
      : null;
  const initials =
    (name ?? "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => Array.from(word)[0])
      .join("")
      .toLocaleUpperCase("it") || "?";
  const preset =
    avatar?.kind === "preset" && Object.hasOwn(art, avatar.value)
      ? avatar.value
      : null;
  return (
    <span
      className={`member-avatar ${className}`}
      style={{ "--avatar-size": `${size}px` }}
      aria-hidden="true"
    >
      {preset ? (
        <AvatarArt id={preset} />
      ) : source && broken !== source ? (
        <img
          src={source}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(source)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}

export default Avatar;

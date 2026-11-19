import { t } from "./i18n.js";
import {
  formatBadgeLabel,
  holidayBadgeIds,
  holidayBadges,
} from "../shared/badges.js";
import "./profile.css";

export { holidayBadges, holidayBadgeIds, formatBadgeLabel };

const emblems = {
  holly: (
    <g>
      <path
        d="M12 4C8 4 5 8 7 12c-4 1-4 6 0 8 4 1 7-2 7-6 2 3 6 4 9 1 2-3 0-7-4-7 1-3-2-4-7-4Z"
        fill="#2c7a4b"
        stroke="#8be0a4"
        strokeWidth="1.2"
      />
      <circle cx="13" cy="13" r="2.6" fill="#e63946" />
      <circle cx="16.8" cy="11.5" r="2.3" fill="#ff5a5f" />
      <circle cx="15.5" cy="15.5" r="2.2" fill="#d62828" />
    </g>
  ),
  candycane: (
    <g>
      <path
        d="M15 20V9.5a4 4 0 0 0-8 0v1.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M15 20V9.5a4 4 0 0 0-8 0v1.5"
        fill="none"
        stroke="#e63946"
        strokeWidth="4"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
      <path
        d="M11 13.5 19 11m-8 2.5L19 16"
        stroke="#7bd389"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </g>
  ),
  gingerbread: (
    <g>
      <circle
        cx="12"
        cy="7.5"
        r="3.8"
        fill="#d98a4c"
        stroke="#fff3df"
        strokeWidth="1.2"
      />
      <path
        d="M6.5 12.5h11m-5.5 0v4.5m0 0-3 3.5m3-3.5 3 3.5"
        stroke="#d98a4c"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.8" cy="7.2" r="0.7" fill="#fff" />
      <circle cx="13.2" cy="7.2" r="0.7" fill="#fff" />
      <circle cx="12" cy="13.8" r="1.1" fill="#e63946" />
    </g>
  ),
  starlight: (
    <g>
      <path
        d="M3 16c4-3 8-4 13-3"
        stroke="#f7d774"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path
        d="m15.5 4.5 1.6 3.5 3.8.5-2.8 2.6.7 3.8-3.3-1.8-3.3 1.8.7-3.8-2.8-2.6 3.8-.5Z"
        fill="#ffe17d"
        stroke="#fff8dc"
        strokeWidth="1"
      />
    </g>
  ),
  velvet: (
    <g>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        fill="#9e2a35"
        stroke="#fff1d6"
        strokeWidth="1.4"
      />
      <rect x="4" y="10" width="16" height="4" fill="#1e1b18" />
      <rect
        x="9.5"
        y="8.8"
        width="5"
        height="6.4"
        rx="1"
        fill="none"
        stroke="#f5cb5c"
        strokeWidth="1.8"
      />
    </g>
  ),
  frost: (
    <g
      stroke="#bfefff"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="m10 5 2 2 2-2m-4 14 2-2 2 2" fill="none" />
      <circle cx="12" cy="12" r="2.2" fill="#e8fbff" />
    </g>
  ),
  waxseal: (
    <g>
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="#b8292f"
        stroke="#7a161b"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="5.6"
        fill="none"
        stroke="#f7d488"
        strokeWidth="1"
        strokeDasharray="2 1.5"
      />
      <path d="m12 7.5 3.6 6.5H8.4Z" fill="#f7d488" />
    </g>
  ),
  reindeer: (
    <g>
      <path
        d="M8.5 9 6 4.5M7 7 4.5 6.5M15.5 9 18 4.5M17 7l2.5-.5"
        stroke="#e8c382"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <ellipse cx="12" cy="13.5" rx="5.2" ry="5" fill="#b57c4e" />
      <circle cx="10.2" cy="12.2" r="0.9" fill="#231815" />
      <circle cx="13.8" cy="12.2" r="0.9" fill="#231815" />
      <circle cx="12" cy="15.2" r="2.2" fill="#ff3b3f" />
    </g>
  ),
  lantern: (
    <g>
      <path
        d="M9 5.5h6M8 8h8l-1 10H9L8 8Zm-1 10h10"
        fill="#2b3d34"
        stroke="#f4c96b"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 10c1.8 1.8 2 4.5 0 5.8-2-1.3-1.8-4 0-5.8Z" fill="#ffcf56" />
    </g>
  ),
  bells: (
    <g>
      <path
        d="M9.5 8C7 8 6 10.5 6 14.5h7c0-4-1-6.5-3.5-6.5Zm5 1c-2 0-3 2.2-3 5.5h6.5c0-3.3-1-5.5-3.5-5.5Z"
        fill="#f4c95d"
        stroke="#fff3c4"
        strokeWidth="1"
      />
      <circle cx="9.2" cy="16" r="1.3" fill="#d99b26" />
      <circle cx="14.8" cy="16" r="1.3" fill="#d99b26" />
      <path
        d="M8.5 7.2 12 5.5l3.5 1.7"
        stroke="#e63946"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
};

export default function NameTag({
  badge,
  name = "",
  nickname = "",
  badgeText = "nickname",
  text,
  size = "md",
  className = "",
}) {
  if (!badge || !holidayBadgeIds.has(badge)) return null;
  const label =
    text !== undefined
      ? String(text || "").trim() || "Ospite"
      : formatBadgeLabel({ name, nickname, badgeText });
  const preset = holidayBadges.find((item) => item.id === badge);
  return (
    <span
      className={`holiday-nametag tag-${badge} tag-size-${size} ${className}`.trim()}
      data-badge={badge}
      title={preset ? t("Targhettina: {name}", {name:t(preset.name)}) : undefined}
    >
      <span className="nametag-eyelet" aria-hidden="true" />
      <svg
        viewBox="0 0 24 24"
        className="nametag-emblem"
        aria-hidden="true"
        focusable="false"
      >
        {emblems[badge]}
      </svg>
      <span className="nametag-label">{label}</span>
    </span>
  );
}

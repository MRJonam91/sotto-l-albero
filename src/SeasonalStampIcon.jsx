import React from "react";

// Original drawings of the objects: no film stills, logos or character artwork.
export default function SeasonalStampIcon({ id, size = 26 }) {
  let drawing;
  switch (id) {
    case "office_ipod":
      drawing = (
        <>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <rect x="8.5" y="4.5" width="7" height="5" rx=".5" />
          <circle cx="12" cy="15.5" r="3.5" />
          <circle cx="12" cy="15.5" r="1" />
        </>
      );
      break;
    case "polar_bell":
      drawing = (
        <>
          <path d="M10 5V3h4v2M8 6 5 3M16 6l3-3" />
          <circle cx="12" cy="13" r="7.5" />
          <path d="M7 18.5 12 13l5 5.5" />
          <circle cx="12" cy="11.5" r="1.5" />
        </>
      );
      break;
    case "grinch_ornament":
      drawing = (
        <>
          <path d="M11 4V2h3M9 7V4h6v3" />
          <circle cx="12" cy="14" r="7.5" />
          <path d="m5.5 13 3 2 3-2 3 2 3-2M6.5 17h11" />
        </>
      );
      break;
    case "elf_snowglobe":
      drawing = (
        <>
          <path d="M6 18a8.5 8.5 0 1 1 12 0M5 18h14l1 4H4z" />
          <path d="M8 17v-5h3v5M11 17V8h3v9M12.5 8V5M14 17v-6h3v6" />
          <path d="M7 7h.01M17 8h.01M6 12h.01M16 5h.01" />
        </>
      );
      break;
    case "kevin_pizza":
      drawing = (
        <>
          <path d="m4 5 8 17 8-17M4 5q8-5 16 0l-1 2q-7-4-14 0z" />
          <path d="m7 9 1 1M15 9l1 1M11 16l1-1" />
          <circle cx="12" cy="11" r="1.5" />
        </>
      );
      break;
    case "klaus_letter":
      drawing = (
        <>
          <rect x="2" y="5" width="20" height="14" rx="1.5" />
          <path d="m3 6 9 7 9-7M3 18l6-7M21 18l-6-7" />
          <path d="M17 7h3v3h-3z" />
        </>
      );
      break;
    case "charlie_tree":
      drawing = (
        <>
          <path d="M12 3v16M12 6 9 8M12 9l5 2M12 12l-6 2M12 15l5 1M7 22l10-3M7 19l10 3" />
          <path d="m9 8-2-1M9 8l-1 2M6 14l-2-1M6 14l-1 2M17 11l2-1" />
          <path d="M16 12v1" />
          <circle cx="16" cy="15" r="2" />
        </>
      );
      break;
    case "frosty_hat":
      drawing = (
        <>
          <path d="M7 17 6 3h12l-1 14M6.5 12h11M4 17h16q2 0 2 2t-2 2H4q-2 0-2-2t2-2Z" />
          <path d="m15 11 4-4M19 7l-3-1M19 7l1 3" />
        </>
      );
      break;
    case "arthur_slippers":
      drawing = (
        <>
          <path d="M3 12V8q0-3 3-3t3 3v9q0 3-3 3t-3-3ZM15 12V8q0-3 3-3t3 3v9q0 3-3 3t-3-3Z" />
          <path d="M3 13q3-3 6 0M15 13q3-3 6 0M4 16h.01M8 16h.01M16 16h.01M20 16h.01M6 18h.01M18 18h.01" />
          <path d="M4 13 2 10M8 13l2-3M16 13l-2-3M20 13l2-3" />
        </>
      );
      break;
    case "rudolph_nose":
      drawing = (
        <>
          <circle cx="12" cy="13" r="5.5" />
          <path d="M9.5 11a3 3 0 0 1 2.5-1M6.5 13 2 16M17.5 13l4.5 3M12 2v2M4 5l2 2M20 5l-2 2M2 10h2M20 10h2M12 21v1" />
        </>
      );
      break;
    default:
      return null;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {drawing}
    </svg>
  );
}

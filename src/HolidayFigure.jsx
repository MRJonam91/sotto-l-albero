const figures = {
  santa: (
    <>
      <path className="figure-red" d="M5 9c1-4 4-6 8-6 3 0 5 1 6 4l-4-1 2 3z" />
      <circle cx="20" cy="7" r="1.5" />
      <rect x="4" y="9" width="15" height="3" rx="1.5" />
      <path d="M5 12v4c0 2 2 2 3 2 0 2 2 3 4 3s4-1 4-3c2 0 3-1 3-3v-3M8 14h.1m7.9 0h.1M9 17c1-2 2-2 3-1 1-1 2-1 3 1" />
    </>
  ),
  hat: (
    <>
      <path className="figure-red" d="M5 15 9 5c1-3 5-3 7 0l3 5-5-2 3 7z" />
      <rect x="3" y="15" width="16" height="4" rx="2" />
      <circle cx="20" cy="11" r="2" />
    </>
  ),
  reindeer: (
    <>
      <path d="M8 9 5 6 4 3m2 4L3 6m13 3 3-3 1-3m-2 4 3-1M7 12c-3 0-4-2-4-3 3 0 4 1 5 2m8 0c1-1 2-2 5-2 0 1-1 3-4 3M7 14c0-3 2-5 5-5s5 2 5 5c0 3-2 7-5 7s-5-4-5-7zM10 14h.1m3.9 0h.1" />
      <ellipse className="figure-red" cx="12" cy="17.5" rx="1.8" ry="1.2" />
    </>
  ),
  sleigh: (
    <>
      <path
        className="figure-red"
        d="M4 7h4l2 5h8l3-3v5c0 2-2 3-4 3H8C6 17 4 15 4 13z"
      />
      <path d="M8 17v3m8-3v3M3 20h16c2 0 3-1 3-3M13 7h3m-4-3h4" />
    </>
  ),
};

export default function HolidayFigure({ id, size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {figures[id]}
    </svg>
  );
}

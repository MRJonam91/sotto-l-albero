import { useId } from "react";

const chamber = "M36 49C36 37 100 37 100 49V226C100 240 36 240 36 226Z";
const grains = [
  [0, 2, 0.88, -18],
  [9, -1, 0.66, 24],
  [16, 2, 1, 36],
  [25, -2, 0.73, -43],
  [4, 10, 1.04, 26],
  [14, 10, 0.65, -19],
  [22, 9, 1.02, 13],
  [-2, 18, 0.95, 36],
  [8, 19, 0.77, -14],
  [16, 17, 1.02, -29],
  [24, 18, 0.69, 27],
  [11, 25, 0.9, 49],
];
const flecks =
  "M2 6h.1m3 7h.1m4-10h.1m1 16h.1m3-12h.1m3 16h.1m2-19h.1m1 11h.1m3-8h.1m1 13h.1m3-16h.1m0 9h.1m-24 6h.1m6 3h.1m12 1h.1";
const trajectories = [
  [-24, 9, 5],
  [-8, -5, 29],
  [13, -9, 13],
  [24, -14, 38],
  [2, 13, 48],
  [-15, 5, 62],
  [19, 1, 71],
  [-3, -10, 78],
];

function Figure({ motif, paint }) {
  switch (motif) {
    case "bells":
      return (
        <>
          <path
            d="M-.9-3.4a.9.9 0 1 1 1.8 0M-1.2 3.2a1.2 1.2 0 0 0 2.4 0"
            fill="none"
            stroke="#ffe5a7"
            strokeWidth=".65"
          />
          <path
            d="M-2.4.4c0-2.4.8-3.3 2.4-3.3s2.4.9 2.4 3.3l1 2.3h-6.8Z"
            fill={paint}
            stroke="#ffe5a7"
            strokeWidth=".45"
          />
          <path
            d="M-3.2 2.4h6.4M-1.4-1.5l-.3 2"
            stroke="#fff6d7"
            strokeWidth=".55"
            strokeLinecap="round"
          />
        </>
      );
    case "snowflakes":
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M0-4v8m-3.5-6 7 4m0-4-7 4"
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <path
            d="M0-3-1-2m1-1 1 1M0 3l-1-1m1 1 1-1M-2.7-1.5v1m5.4 2v-1m0-2v1m-5.4 2v-1"
            stroke="#f0ffff"
            strokeWidth=".5"
          />
          <path d="m0-1.1 1 1.1-1 1.1L-1 0Z" fill="#f7fffc" />
        </g>
      );
    case "stardust":
      return (
        <>
          <path
            d="M0-4C.5-1.4 1.4-.5 4 0 1.4.5.5 1.4 0 4-.5 1.4-1.4.5-4 0-1.4-.5-.5-1.4 0-4Z"
            fill={paint}
            stroke="#ffebbc"
            strokeWidth=".42"
          />
          <path
            d="M0-2.3.4-.4 2.3 0 .4.4 0 2.3-.4.4-2.3 0-.4-.4Z"
            fill="#fff8db"
          />
        </>
      );
    default:
      return (
        <>
          <circle
            cy=".5"
            r="3.35"
            fill={paint}
            stroke="currentColor"
            strokeWidth=".4"
          />
          <path
            d="M-1.1-2.55h2.2v-1.1h-2.2ZM0-3.65c-1.1-.9 1.1-1.5 0 0"
            fill="#ffe1a0"
            stroke="#ffe1a0"
            strokeWidth=".35"
          />
          <path
            d="M-2.8-.2c1.3.6 3.4.6 5.6-.15"
            stroke="#ffe8bc"
            strokeWidth=".52"
            fill="none"
          />
          <ellipse
            cx="-1.3"
            cy="-.8"
            rx=".72"
            ry=".48"
            fill="#fffaf0"
            opacity=".86"
          />
        </>
      );
  }
}

export default function ScoreVessel({ motif, fraction, score, color, replay }) {
  const id = useId();
  const ref = (name) => `url(#${id}-${name})`;
  const fill = fraction ? Math.max(9, 168 * fraction) : 0;
  const level = 232 - fill;
  const effect = `${motif}:${score}:${fraction}:${replay}`;
  return (
    <svg
      className="hourglass-art"
      data-motif={motif}
      viewBox="0 0 136 280"
      aria-hidden="true"
      focusable="false"
      style={{ "--hourglass-color": color }}
    >
      <defs>
        <clipPath id={id + "-glass"}>
          <path d={chamber} />
        </clipPath>
        <clipPath id={id + "-pile"}>
          <rect
            className="vessel-fill-window"
            x="36"
            y={level}
            width="64"
            height={fill ? fill + 4 : 0}
          />
        </clipPath>
        <linearGradient id={id + "-bronze"} x2="0" y2="1">
          <stop stopColor="#4d2a17" />
          <stop offset=".23" stopColor="#bf8a4a" />
          <stop offset=".36" stopColor="#f4d399" />
          <stop offset=".48" stopColor="#a16c39" />
          <stop offset=".75" stopColor="#5f361e" />
          <stop offset=".89" stopColor="#bb8445" />
          <stop offset="1" stopColor="#422416" />
        </linearGradient>
        <linearGradient id={id + "-column"} x2="1" y2="0">
          <stop stopColor="#4b2a17" />
          <stop offset=".32" stopColor="#d7a86d" />
          <stop offset=".48" stopColor="#fae4a4" />
          <stop offset=".68" stopColor="#9d6437" />
          <stop offset="1" stopColor="#432618" />
        </linearGradient>
        <linearGradient id={id + "-glass-light"} x2="1" y2="0">
          <stop stopColor="#b6dcd6" stopOpacity=".26" />
          <stop offset=".19" stopColor="#5c9292" stopOpacity=".12" />
          <stop offset=".48" stopColor="#071714" stopOpacity=".33" />
          <stop offset=".8" stopColor="#3d605b" stopOpacity=".08" />
          <stop offset=".97" stopColor="#e8f5e3" stopOpacity=".26" />
        </linearGradient>
        <linearGradient id={id + "-gleam"} x2="1" y2="0">
          <stop stopColor="#f6fff7" stopOpacity="0" />
          <stop offset=".37" stopColor="#f6fff7" stopOpacity=".44" />
          <stop offset=".53" stopColor="#fff9de" stopOpacity=".93" />
          <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id + "-pile-color"} x2="0" y2="1">
          <stop stopColor="currentColor" stopOpacity=".84" />
          <stop offset=".55" stopColor="currentColor" stopOpacity=".44" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".78" />
        </linearGradient>
        <radialGradient id={id + "-stone"} cx=".35" cy=".25" r=".83">
          <stop stopColor="#fff6d9" />
          <stop offset=".31" stopColor="currentColor" />
          <stop offset=".66" stopColor="currentColor" stopOpacity=".68" />
          <stop offset="1" stopColor="#122c25" />
        </radialGradient>
        <radialGradient id={id + "-aura"}>
          <stop stopColor="currentColor" stopOpacity=".58" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <g id={id + "-figure"}>
          <Figure motif={motif} paint={ref("stone")} />
        </g>
        <pattern
          id={id + "-grains"}
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-7)"
        >
          {grains.map(([x, y, scale, angle]) => (
            <use
              key={`${x}/${y}`}
              href={`#${id}-figure`}
              transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
            />
          ))}
          <path
            d={flecks}
            stroke="#fff7df"
            strokeWidth="1.05"
            strokeLinecap="round"
            opacity=".78"
          />
          <path
            d={flecks}
            transform="translate(1.7 1.25)"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            opacity=".83"
          />
        </pattern>
      </defs>

      <ellipse
        cx="68"
        cy="253"
        rx="62"
        ry="23"
        fill={ref("aura")}
        opacity={fraction ? ".64" : ".2"}
      />
      <ellipse cx="68" cy="260" rx="47" ry="8" fill="#050f0d" opacity=".84" />
      <path
        d="M26 54q-9 0-9 9v149q0 9 9 9m84-167q9 0 9 9v149q0 9-9 9"
        fill="none"
        stroke={ref("bronze")}
        strokeWidth="3"
      />
      <path
        d="M27 44h7v191h-7zm75 0h7v191h-7z"
        fill={ref("column")}
        stroke="#593621"
        strokeWidth=".7"
      />
      <path
        d="M29 62v153m75-153v153"
        stroke="#6f432a"
        strokeDasharray="1.1 3.3"
        strokeWidth="1.25"
      />
      <path
        d="M26 68c-13-7-16 5-9 11 3 3 9 0 7-4m86-7c13-7 16 5 9 11-3 3-9 0-7-4M26 206c-13 7-16-5-9-11 3-3 9 0 7 4m86 7c13 7 16-5 9-11-3-3-9 0-7 4"
        fill="none"
        stroke={ref("bronze")}
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d={chamber}
        fill={ref("glass-light")}
        stroke="#b8d5ca"
        strokeOpacity=".64"
        strokeWidth="1.05"
      />
      <g clipPath={ref("glass")}>
        <g clipPath={ref("pile")}>
          <path d="M36 54h64v182H36Z" fill={ref("pile-color")} />
          <path d="M36 54h64v182H36Z" fill={ref("grains")} />
        </g>
        {fraction > 0 && (
          <g
            className="vessel-meniscus"
            style={{ transform: `translateY(${level}px)` }}
          >
            <ellipse cx="68" rx="31" ry="5" fill="currentColor" opacity=".34" />
            <path
              d="M38 0q30 9 60 0"
              stroke="#fff3c6"
              strokeOpacity=".55"
              strokeWidth=".65"
              fill="none"
            />
          </g>
        )}
        <g key={effect}>
          <g
            className="vessel-sweep"
            style={{
              "--vessel-delay": `${Math.min(7, Math.floor(fraction * 7)) * 42}ms`,
            }}
          >
            <path d="M18 32h18l-9 212H9Z" fill={ref("gleam")} />
            <path d="M39 42h3l-8 190h-3Z" fill="#fffce7" opacity=".48" />
          </g>
          {fraction > 0 &&
            trajectories.map(([x, drift, delay], index) => (
              <g key={delay} transform={`translate(${68 + x} 49)`}>
                <g
                  className="vessel-particle"
                  style={{
                    "--drift": `${drift}px`,
                    "--fall": `${Math.max(8, level - 49)}px`,
                    "--vessel-delay": `${delay * 22}ms`,
                  }}
                >
                  {index % 3 ? (
                    <circle r={index % 2 ? 1.55 : 0.9} fill="currentColor" />
                  ) : (
                    <use href={`#${id}-figure`} transform="scale(.85)" />
                  )}
                </g>
              </g>
            ))}
        </g>
        <path
          d="M43 50v170m4-163v144m46-144v163"
          stroke="#f1fff3"
          strokeWidth="1.4"
          strokeOpacity=".45"
          strokeLinecap="round"
        />
        <path
          d="M45 54v52m48 56v52"
          stroke="#f5fff8"
          strokeWidth="2.15"
          strokeOpacity=".55"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M37 54c0 10 62 10 62 0"
        stroke="#ffefcc"
        strokeOpacity=".28"
        fill="none"
      />
      <path
        d="M32 42q4-9 21-13l12-8h6l12 8q17 4 21 13ZM28 46h80v9H28ZM27 228h82v9H27ZM28 236h80l-7 9H35ZM38 244h60l7 10H31Z"
        fill={ref("bronze")}
        stroke="#a77541"
        strokeWidth=".75"
      />
      <path
        d="M68 11c4 5 7 7 7 10 0 7-14 7-14 0 0-3 3-5 7-10Z"
        fill={ref("bronze")}
        stroke="#e0af72"
        strokeWidth=".65"
      />
      <path
        d="M33 49h70m-71 183h72m-67 17h62"
        stroke="#ffe0a2"
        strokeOpacity=".86"
        strokeWidth=".7"
        strokeLinecap="round"
      />
      <path
        d="M68 225c4 3 8 3 13 3v9c0 7-6 10-13 13-7-3-13-6-13-13v-9c5 0 9 0 13-3Z"
        fill={ref("bronze")}
        stroke="#f0c68a"
        strokeWidth=".85"
      />
      <circle
        cx="68"
        cy="236"
        r="7.4"
        fill="#172925"
        stroke="#e8b877"
        strokeWidth=".7"
      />
      <use href={`#${id}-figure`} transform="translate(68 236) scale(1.25)" />
      <g className="vessel-glints" key={effect + "-glints"}>
        <path
          className="vessel-glint"
          style={{ "--vessel-delay": "220ms" }}
          d="M31 50q0 5 5 5-5 0-5 5 0-5-5-5 5 0 5-5Z"
        />
        <path
          className="vessel-glint"
          style={{ "--vessel-delay": "980ms" }}
          d="M103 206q0 4 4 4-4 0-4 4 0-4-4-4 4 0 4-4Z"
        />
        <path
          className="vessel-glint"
          style={{ "--vessel-delay": "1480ms" }}
          d="M89 30q0 3 3 3-3 0-3 3 0-3-3-3 3 0 3-3Z"
        />
      </g>
    </svg>
  );
}

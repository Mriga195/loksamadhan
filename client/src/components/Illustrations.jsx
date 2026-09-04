// Flat SVG scenes for the landing page. Inline, not image files: they are two-tone blue/green
// line art that has to sit on a gradient and scale to any width, which a PNG does badly and a
// second network request does worse. Icon.jsx stays the icon set (one 24x24 path each); this
// file is the handful of larger drawings, which need multiple shapes and their own palettes.
//
// Colours are Tailwind's blue/emerald/amber ramps written as hex, same as Logo.jsx — these are
// pictures, not themed UI, so they don't read from the tokens in index.css.

const BLUE = { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 600: '#2563eb' };

// Skyline behind the hero copy. One deterministic window grid per building rather than 200
// hand-written rects — the layout maths is shorter than the markup it replaces.
function Building({ x, y, w, fill, windows }) {
  const h = 300 - y;
  const cols = Math.max(1, Math.round((w - 14) / 18));
  const rows = Math.max(1, Math.round((h - 24) / 26));
  const gapX = (w - cols * 8) / (cols + 1);

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={fill} />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            x={x + gapX + c * (8 + gapX)}
            y={y + 14 + r * 26}
            width="8"
            height="11"
            rx="1.5"
            fill={windows}
          />
        )),
      )}
    </g>
  );
}

const SKYLINE = [
  // x, y (roofline), width, body fill, window fill
  [0, 120, 78, BLUE[200], BLUE[100]],
  [70, 168, 62, BLUE[100], BLUE[50]],
  [124, 92, 86, BLUE[300], BLUE[100]],
  [202, 150, 70, BLUE[200], BLUE[50]],
  [264, 116, 58, BLUE[100], BLUE[50]],
  [980, 140, 66, BLUE[100], BLUE[50]],
  [1038, 96, 84, BLUE[300], BLUE[100]],
  [1112, 158, 60, BLUE[200], BLUE[50]],
  [1164, 112, 78, BLUE[100], BLUE[50]],
  [1234, 150, 72, BLUE[200], BLUE[50]],
  [1298, 84, 90, BLUE[300], BLUE[100]],
  [1380, 140, 60, BLUE[200], BLUE[50]],
];

function Tree({ x, y, s = 1, fill = BLUE[200] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="-26" width="6" height="26" rx="3" fill={BLUE[300]} />
      <circle cx="0" cy="-38" r="22" fill={fill} />
      <circle cx="-16" cy="-26" r="14" fill={fill} />
      <circle cx="16" cy="-26" r="14" fill={fill} />
    </g>
  );
}

function Lamp({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={BLUE[300]} strokeWidth="4" fill="none" strokeLinecap="round">
      <path d="M0 0v-86" />
      <path d="M-12 -86h24l-4 -14h-16Z" fill={BLUE[200]} stroke="none" />
      <circle cx="0" cy="-100" r="4" fill={BLUE[300]} stroke="none" />
    </g>
  );
}

function Pin({ x, y, color, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0-34a17 17 0 0 0-17 17c0 12 17 27 17 27s17-15 17-27A17 17 0 0 0 0-34Z" fill={color} />
      <circle cx="0" cy="-17" r="6" fill="#fff" />
    </g>
  );
}

export function CityScene({ className = '' }) {
  return (
    <svg viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className={className}>
      {/* Clouds */}
      <g fill="#fff" opacity="0.75">
        <ellipse cx="300" cy="58" rx="46" ry="18" />
        <ellipse cx="336" cy="50" rx="30" ry="22" />
        <ellipse cx="1090" cy="46" rx="52" ry="20" />
        <ellipse cx="1130" cy="40" rx="32" ry="24" />
      </g>

      {SKYLINE.map(([x, y, w, fill, windows]) => (
        <Building key={x} x={x} y={y} w={w} fill={fill} windows={windows} />
      ))}

      {/* Ground: opaque, so every building base is cut off at the same line rather than
          showing through a translucent shape */}
      <path d="M0 300V252c240-34 480-34 720-16s480 18 720-12v76Z" fill="#f7fbff" />

      {/* Foreground props stay inside x 100–1340: the viewBox is 1440 wide and drawn with
          `slice`, so a narrower viewport crops roughly 80 units off each edge. */}
      <Tree x={130} y={266} s={0.9} />
      <Tree x={1240} y={264} s={1} />
      <Tree x={1318} y={274} s={0.75} fill={BLUE[100]} />
      <Lamp x={272} y={268} s={0.8} />
      <Lamp x={1340} y={266} s={0.9} />

      {/* Bench */}
      <g transform="translate(200 268)" fill={BLUE[300]}>
        <rect x="-34" y="-22" width="68" height="7" rx="3" />
        <rect x="-34" y="-10" width="68" height="7" rx="3" />
        <rect x="-30" y="-22" width="6" height="22" rx="3" />
        <rect x="24" y="-22" width="6" height="22" rx="3" />
      </g>

      {/* Only two pins: the counter card sits over the middle of this scene, and anything
          drawn there is half-covered by it. */}
      <Pin x={168} y={196} color={BLUE[600]} s={0.9} />
      <Pin x={1196} y={192} color="#10b981" s={0.85} />
    </svg>
  );
}

// Step 1 — a phone being held, pin dropped, camera badge.
export function ReportScene({ className = '' }) {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className={className}>
      <ellipse cx="100" cy="132" rx="70" ry="10" fill={BLUE[100]} />
      {/* Hand */}
      <path d="M56 150c-6-26-4-52 4-64 5-8 16-6 16 4v22" fill="none" stroke={BLUE[200]} strokeWidth="14" strokeLinecap="round" />
      {/* Phone */}
      <rect x="66" y="18" width="68" height="112" rx="12" fill="#fff" stroke={BLUE[300]} strokeWidth="3" />
      <rect x="74" y="30" width="52" height="72" rx="6" fill={BLUE[50]} />
      <rect x="88" y="112" width="24" height="4" rx="2" fill={BLUE[200]} />
      {/* Dropped pin */}
      <path d="M100 44a14 14 0 0 0-14 14c0 10 14 22 14 22s14-12 14-22a14 14 0 0 0-14-14Z" fill="#f97316" />
      <circle cx="100" cy="58" r="5" fill="#fff" />
      {/* Camera badge */}
      <circle cx="132" cy="98" r="17" fill={BLUE[600]} />
      <g fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M124 103v-8a2 2 0 0 1 2-2h2l1.5-2.5h5L136 93h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2Z" />
        <circle cx="132" cy="99" r="3.4" />
      </g>
    </svg>
  );
}

// Step 2 — the same report on the map, moving between two statuses.
export function TrackScene({ className = '' }) {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className={className}>
      <rect x="18" y="16" width="164" height="118" rx="14" fill={BLUE[50]} stroke={BLUE[200]} strokeWidth="2" />
      <g stroke={BLUE[100]} strokeWidth="6" strokeLinecap="round">
        <path d="M18 62h164M74 16v118M132 40v94" />
      </g>
      <path d="M64 96C64 70 96 78 118 52" fill="none" stroke={BLUE[400]} strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
      <Pin x={64} y={104} color={BLUE[600]} s={0.5} />
      <Pin x={118} y={60} color="#10b981" s={0.5} />
      {/* Status chips */}
      <g>
        <rect x="96" y="80" width="80" height="22" rx="11" fill="#fff" stroke={BLUE[200]} />
        <circle cx="110" cy="91" r="4" fill={BLUE[600]} />
        <text x="120" y="95" fontSize="10" fill="#475569" fontFamily="Inter, sans-serif">Submitted</text>
        <rect x="96" y="106" width="80" height="22" rx="11" fill="#fff" stroke="#a7f3d0" />
        <circle cx="110" cy="117" r="5" fill="#10b981" />
        <path d="m107.6 117 1.8 1.8 3.2-3.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="120" y="121" fontSize="10" fill="#475569" fontFamily="Inter, sans-serif">Resolved</text>
      </g>
    </svg>
  );
}

// Step 3 — closed with evidence: a checked-off report, stamped.
export function ResolvedScene({ className = '' }) {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className={className}>
      <circle cx="150" cy="52" r="26" fill={BLUE[50]} />
      <circle cx="46" cy="96" r="20" fill={BLUE[50]} />
      <rect x="58" y="14" width="88" height="118" rx="12" fill="#fff" stroke={BLUE[300]} strokeWidth="3" />
      <rect x="84" y="6" width="36" height="18" rx="6" fill={BLUE[200]} stroke={BLUE[300]} strokeWidth="2" />
      <g stroke={BLUE[200]} strokeWidth="5" strokeLinecap="round">
        <path d="M76 48h34M76 68h50M76 88h40" />
      </g>
      <g fill="none" stroke={BLUE[400]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m66 46 3 3 5-6M66 66l3 3 5-6" />
      </g>
      <circle cx="132" cy="106" r="24" fill="#10b981" />
      <path d="m122 106 6.5 6.5L142 99" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "What we promise" — a shield, because the three lines under it are all guarantees.
export function ShieldScene({ className = '' }) {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" className={className}>
      <ellipse cx="100" cy="128" rx="62" ry="9" fill="#d1fae5" />
      <g fill="#a7f3d0">
        <path d="M42 108c-14-4-24-16-24-30 16-2 30 6 34 20Z" />
        <path d="M158 108c14-4 24-16 24-30-16-2-30 6-34 20Z" />
      </g>
      <path d="M100 16 56 32v40c0 30 20 50 44 60 24-10 44-30 44-60V32Z" fill="#10b981" />
      <path d="M100 26 66 38v34c0 25 16 41 34 50V26Z" fill="#34d399" opacity="0.5" />
      <path d="m84 74 12 12 24-26" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

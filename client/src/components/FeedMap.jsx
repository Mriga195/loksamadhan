import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StatusPill from './StatusPill';

// ── Department / Category SVG path definitions ──
const DEPT_ICONS = {
  roads: {
    name: 'Roads & Infrastructure',
    d: 'M4 20 9 4h6l5 16M9.5 12h5',
  },
  water: {
    name: 'Water Supply & Sewage',
    d: 'M12 3S6 10.5 6 14.5a6 6 0 0 0 12 0C18 10.5 12 3 12 3Z',
  },
  sanitation: {
    name: 'Solid Waste Management',
    d: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  },
  lighting: {
    name: 'Electricity & Lighting',
    d: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4.9 1.1.9 1.9v.2h5.2v-.2c0-.8.3-1.5.9-1.9A6 6 0 0 0 12 3Z',
  },
  drainage: {
    name: 'Public Health & Drainage',
    d: 'M4 8h16M4 8l2 12h12l2-12M9 12v4m6-4v4',
  },
  general: {
    name: 'General Administration',
    d: 'M4 21h16M6 21V6l6-3 6 3v15M10 10h1M14 10h1M10 14h1M14 14h1',
  },
};

function getDepartmentIconPath(issue) {
  const dept = issue.department || '';
  const cat = issue.category || '';

  if (dept === 'Roads & Infrastructure' || cat === 'Road') return DEPT_ICONS.roads.d;
  if (dept === 'Water Supply & Sewage' || cat === 'Water') return DEPT_ICONS.water.d;
  if (dept === 'Solid Waste Management' || cat === 'Sanitation') return DEPT_ICONS.sanitation.d;
  if (dept === 'Electricity & Lighting' || cat === 'Streetlight') return DEPT_ICONS.lighting.d;
  if (dept === 'Public Health & Drainage' || cat === 'Drainage') return DEPT_ICONS.drainage.d;
  return DEPT_ICONS.general.d;
}

// ── Priority Theme Colors ──
const PRIORITY_THEMES = {
  high: {
    bg: '#dc2626',      // Red-600
    border: '#991b1b',  // Red-800
    tag: 'bg-red-50 text-red-700 border-red-200',
    label: 'High Priority',
  },
  medium: {
    bg: '#d97706',      // Amber-600
    border: '#92400e',  // Amber-800
    tag: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Medium Priority',
  },
  low: {
    bg: '#16a34a',      // Green-600
    border: '#166534',  // Green-800
    tag: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Low Priority',
  },
  default: {
    bg: '#2563eb',      // Brand Blue-600 (Normal / Unassigned priority)
    border: '#1e40af',  // Blue-800
    tag: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Standard',
  },
};

// ── Numbered Pin Marker with Department Icon and Priority Color ──
const createNumberedPin = (n, issue) => {
  const p = (issue.priority || '').toLowerCase();
  const theme = PRIORITY_THEMES[p] || PRIORITY_THEMES.default;
  const iconPath = getDepartmentIconPath(issue);

  return L.divIcon({
    className: '!bg-transparent !border-none',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
        <div style="background-color: ${theme.bg}; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #ffffff;"
             class="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full text-white transition-transform hover:scale-110">
          <span style="font-size: 11px; font-weight: 800; line-height: 1; font-family: monospace; padding-left: 2px;">${n}</span>
          <svg style="width: 13px; height: 13px; stroke-width: 2.2; flex-shrink: 0;" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="${iconPath}"></path>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid ${theme.bg}; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [46, 30],
    iconAnchor: [23, 30],
    popupAnchor: [0, -30],
  });
};

// ── Unnumbered variant (single point views) ──
const createDotPin = (issue) => {
  const p = (issue.priority || '').toLowerCase();
  const theme = PRIORITY_THEMES[p] || PRIORITY_THEMES.default;
  const iconPath = getDepartmentIconPath(issue);

  return L.divIcon({
    className: '!bg-transparent !border-none',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; user-select: none;">
        <div style="background-color: ${theme.bg}; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 2px solid #ffffff;"
             class="flex items-center justify-center p-1 rounded-full text-white">
          <svg style="width: 14px; height: 14px; stroke-width: 2.2;" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="${iconPath}"></path>
          </svg>
        </div>
        <div style="width: 0; height: 0; border-left: 3px solid transparent; border-right: 3px solid transparent; border-top: 5px solid ${theme.bg}; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

const DEFAULT_CENTER = [26.6338, 92.7926]; // Tezpur, Assam

function FitBounds({ points }) {
  const map = useMap();
  const key = points.join('|');
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function FeedMap({ issues, numbered = true }) {
  const [showLegend, setShowLegend] = useState(false);

  const pins = issues
    .map((i, idx) => ({ issue: i, n: idx + 1, at: i.location?.coordinates }))
    .filter(p => Array.isArray(p.at) && p.at.length === 2)
    .map(p => ({ ...p, at: [p.at[1], p.at[0]] }));

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={pins[0]?.at || DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={pins.map(p => p.at)} />

        {pins.map(({ issue, n, at }) => {
          const p = (issue.priority || '').toLowerCase();
          const priorityTheme = PRIORITY_THEMES[p] || PRIORITY_THEMES.default;

          return (
            <Marker
              key={issue._id}
              position={at}
              icon={numbered ? createNumberedPin(n, issue) : createDotPin(issue)}
            >
              <Popup className="custom-feed-popup">
                <div className="p-1 text-ink space-y-1.5 min-w-[210px] max-w-[260px]">
                  <div className="flex items-center justify-between gap-1 border-b border-line pb-1.5">
                    <span
                      style={{ backgroundColor: priorityTheme.bg }}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                    >
                      #{n}
                    </span>
                    <StatusPill status={issue.status} size="sm" />
                  </div>

                  <Link
                    to={`/issues/${issue._id}`}
                    className="block font-semibold text-xs leading-snug text-ink hover:text-brand-600 line-clamp-2 transition-colors"
                  >
                    {issue.title}
                  </Link>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                      {issue.department || issue.category}
                    </span>
                    {issue.priority && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${priorityTheme.tag} capitalize`}>
                        {issue.priority} Priority
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-ink-muted line-clamp-1">
                    {issue.address || issue.area || 'Tezpur, Assam'}
                  </p>

                  <div className="pt-1 border-t border-line flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted font-medium">
                      {issue.supporterCount || 0} supporter{(issue.supporterCount || 0) === 1 ? '' : 's'}
                    </span>
                    <Link
                      to={`/issues/${issue._id}`}
                      className="font-semibold text-brand-600 hover:underline text-[11px]"
                    >
                      View Report &rarr;
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ── Interactive Map Legend ── */}
      <div className="absolute bottom-3 right-3 z-[1000]">
        {showLegend ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-slate-200 text-xs space-y-2.5 max-w-[220px]">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                Map Pin Legend
              </span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-700 text-xs p-0.5 cursor-pointer"
                title="Close legend"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Priority Colors
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-600 shrink-0"></span>
                  <span className="text-[11px] text-slate-700">High Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="text-[11px] text-slate-700">Medium Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-emerald-600 shrink-0"></span>
                  <span className="text-[11px] text-slate-700">Low Priority</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-blue-600 shrink-0"></span>
                  <span className="text-[11px] text-slate-700">Standard / Unassigned</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Format
              </p>
              <p className="text-[11px] text-slate-600 leading-snug">
                Each pin shows <strong>[Number]</strong> matching the feed card + <strong>[Department Icon]</strong>.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-all cursor-pointer"
          >
            <span className="inline-flex gap-1 items-center">
              <span className="size-2 rounded-full bg-red-600"></span>
              <span className="size-2 rounded-full bg-amber-500"></span>
              <span className="size-2 rounded-full bg-blue-600"></span>
            </span>
            <span>Legend</span>
          </button>
        )}
      </div>
    </div>
  );
}

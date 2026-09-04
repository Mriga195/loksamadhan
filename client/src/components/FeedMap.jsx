import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Read-only companion to the feed list: one numbered pin per visible issue, numbers matching
// the badge on each card. Separate from MapPicker — that one is a draggable single-point input
// for the report form and shares nothing with this beyond the tile URL.

// divIcon instead of the default PNG marker: the number has to be in the pin, and this needs
// no image assets or bundler icon-path fix.
const pin = (n) => L.divIcon({
  className: '',
  html: `<span class="grid size-7 place-items-center rounded-full bg-brand-600 text-xs
    font-semibold text-white shadow ring-2 ring-white">${n}</span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const DEFAULT_CENTER = [26.6338, 92.7926];   // Tezpur, Assam, when nothing has coordinates yet

// Fit the view to whatever is currently listed. Runs on every filter change, which is exactly
// when the set of pins changes.
function FitBounds({ points }) {
  const map = useMap();
  const key = points.join('|');   // stable dep: the array is rebuilt every render
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, key]);   // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function FeedMap({ issues }) {
  // [lng, lat] in the API, [lat, lng] in Leaflet. Issues without coordinates are skipped, not
  // dropped from the numbering — the badge must keep matching the card.
  const pins = issues
    .map((i, idx) => ({ issue: i, n: idx + 1, at: i.location?.coordinates }))
    .filter(p => Array.isArray(p.at) && p.at.length === 2)
    .map(p => ({ ...p, at: [p.at[1], p.at[0]] }));

  return (
    <MapContainer center={pins[0]?.at || DEFAULT_CENTER} zoom={13} scrollWheelZoom={false}
      className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={pins.map(p => p.at)} />
      {pins.map(({ issue, n, at }) => (
        <Marker key={issue._id} position={at} icon={pin(n)}>
          <Popup>
            <strong>{issue.title}</strong>
            <br />
            {issue.address || issue.area || issue.category}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon';
import { ASSAM_VIEWBOX, inAssam } from '../assam';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icon for Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Helper component inside MapContainer to capture map click events
function MapEvents({ onSelectLocation }) {
  useMapEvents({
    click(e) {
      onSelectLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Recenter map view when center coordinates change
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

const TEZPUR_CENTER = [26.6338, 92.7926]; // Tezpur, Assam [lat, lng]

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const street = addr.road || addr.street || addr.footway || addr.path || '';
    const neighbourhood = addr.suburb || addr.neighbourhood || addr.residential || addr.subdivision || addr.hamlet || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const subdistrict = addr.county || addr.city_district || '';
    const district = addr.state_district || addr.county || addr.district || '';
    const state = addr.state || 'Assam';

    // Unpopulated spots (forest, river, farmland) return no city — never invent one, fall back to
    // whatever Nominatim did give, then to the raw coordinates.
    const parts = [...new Set([street, neighbourhood, city, subdistrict, district, state].filter(Boolean))];
    const displayName = parts.length > 1
      ? parts.join(', ')
      : (data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    const area = neighbourhood || city || subdistrict || district || '';
    const region = district || city || '';

    return { displayName, area, street, city, district, region };
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return null;
  }
}

async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();

  // Support direct coordinate entry: "26.63, 92.79" or "92.79, 26.63"
  const coordMatch = q.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (coordMatch) {
    const v1 = parseFloat(coordMatch[1]);
    const v2 = parseFloat(coordMatch[3]);
    if (inAssam(v1, v2)) {
      return [{
        lat: v1,
        lon: v2,
        display_name: `Coordinates: ${v1.toFixed(5)}, ${v2.toFixed(5)}`,
      }];
    }
    if (inAssam(v2, v1)) {
      return [{
        lat: v2,
        lon: v1,
        display_name: `Coordinates: ${v2.toFixed(5)}, ${v1.toFixed(5)}`,
      }];
    }
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&countrycodes=in&bounded=1&viewbox=${ASSAM_VIEWBOX}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).filter(r => inAssam(parseFloat(r.lat), parseFloat(r.lon)));
  } catch (err) {
    console.error('Search location error:', err);
    return [];
  }
}

const MapPicker = ({ onLocationChange, initialLocation }) => {
  // Leaflet uses [lat, lng], API uses [lng, lat]
  const [position, setPosition] = useState(() => {
    if (initialLocation && Array.isArray(initialLocation) && initialLocation.length === 2) {
      return [initialLocation[1], initialLocation[0]];
    }
    return TEZPUR_CENTER;
  });
  const [mapCenter, setMapCenter] = useState(position);
  const [geoStatus, setGeoStatus] = useState('locating'); // 'locating' | 'success' | 'fallback'
  const [detectedAddress, setDetectedAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [outsideAssam, setOutsideAssam] = useState(false);

  // Manual location search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const markerRef = useRef(null);
  const geocodeAbortRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Close search suggestions on click outside
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const updateLocation = async (lat, lng) => {
    if (!inAssam(lat, lng)) {
      // Reports are Assam-only: snap the pin back and say why.
      setOutsideAssam(true);
      setPosition(p => [...p]);
      return;
    }
    setOutsideAssam(false);
    setPosition([lat, lng]);

    // Abort prior reverse-geocode if in flight
    if (geocodeAbortRef.current) {
      geocodeAbortRef.current = false;
    }
    const currentCall = true;
    geocodeAbortRef.current = currentCall;

    setIsGeocoding(true);
    const info = await reverseGeocode(lat, lng);
    if (geocodeAbortRef.current !== currentCall) return;

    setIsGeocoding(false);
    const locInfo = info || { displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, area: '' };
    setDetectedAddress(locInfo.displayName);

    // Notify parent of location in API format [lng, lat] (LONGITUDE FIRST) along with address info
    if (onLocationChange) {
      onLocationChange([lng, lat], locInfo);
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('fallback');
      updateLocation(TEZPUR_CENTER[0], TEZPUR_CENTER[1]);
      setMapCenter(TEZPUR_CENTER);
      return;
    }

    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!inAssam(lat, lng)) {
          setGeoStatus('fallback');
          updateLocation(TEZPUR_CENTER[0], TEZPUR_CENTER[1]);
          setMapCenter(TEZPUR_CENTER);
          return;
        }
        setGeoStatus('success');
        updateLocation(lat, lng);
        setMapCenter([lat, lng]);
      },
      (_err) => {
        setGeoStatus('fallback');
        updateLocation(TEZPUR_CENTER[0], TEZPUR_CENTER[1]);
        setMapCenter(TEZPUR_CENTER);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Immediately inform parent of default position so coordinates are never null
    updateLocation(position[0], position[1]);

    if (initialLocation && Array.isArray(initialLocation) && initialLocation.length === 2) {
      setGeoStatus('success');
      return;
    }
    fetchCurrentLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const executeSearch = async (q) => {
    if (!q || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchLocations(q);
    setIsSearching(false);
    setSearchResults(results);
    setShowResults(true);
    return results;
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(val);
    }, 350);
  };

  const handleSelectLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter([lat, lng]);
      updateLocation(lat, lng);
      setShowResults(false);
      const shortName = item.display_name?.split(',')[0] || item.display_name;
      setSearchQuery(shortName);
    }
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelectLocation(searchResults[0]);
      } else if (searchQuery.trim()) {
        const res = await executeSearch(searchQuery);
        if (res && res.length > 0) {
          handleSelectLocation(res[0]);
        }
      }
    }
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          updateLocation(latLng.lat, latLng.lng);
        }
      },
    }),
    []
  );

  return (
    <div className="w-full space-y-2.5">
      {/* Search and Location Actions Bar */}
      {/* Column order flips below sm: on a phone you are standing at the problem, so GPS comes
          first and search is the fallback. On a desktop it is the other way round. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Manual Location Search Input */}
        <div ref={searchContainerRef} className="relative flex-1">
          <div className="relative flex items-center">
            <Icon name="search" className="pointer-events-none absolute left-3 size-4 text-ink-muted" />
            {/* text-base below sm: anything under 16px makes iOS Safari zoom the page in on
                focus, and it never zooms back out. */}
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
              placeholder="Search area or landmark…"
              className="h-11 w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-20
                text-base placeholder:text-ink-muted focus:border-brand-600 focus:outline-none
                focus:ring-1 focus:ring-brand-600 sm:h-10 sm:text-sm"
            />
            {isSearching ? (
              <span className="absolute right-2 text-xs font-medium text-brand-600 animate-pulse">
                Searching…
              </span>
            ) : (
              <button
                type="button"
                onClick={() => executeSearch(searchQuery)}
                disabled={!searchQuery.trim()}
                className="absolute right-1.5 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold
                  text-brand-600 hover:bg-brand-100 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Find
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto
              rounded-xl border border-line bg-surface py-1 shadow-lg">
              {searchResults.map((item, idx) => (
                <button
                  key={item.place_id || idx}
                  type="button"
                  onClick={() => handleSelectLocation(item)}
                  className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left text-sm text-ink
                    hover:bg-brand-50/70 transition-colors cursor-pointer border-b border-line/40 last:border-b-0"
                >
                  <Icon name="map" className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink truncate">
                      {item.display_name?.split(',')[0]}
                    </span>
                    <span className="block text-xs text-ink-muted truncate">
                      {item.display_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Use Current Location Button */}
        <button
          type="button"
          onClick={fetchCurrentLocation}
          disabled={geoStatus === 'locating'}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2
            rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-600
            shadow-sm transition-colors hover:bg-brand-100 disabled:opacity-50 sm:min-h-10 sm:w-auto
            sm:shrink-0 sm:bg-surface sm:hover:bg-brand-50"
        >
          <Icon name="locate" className={`size-4 ${geoStatus === 'locating' ? 'animate-spin' : ''}`} />
          {geoStatus === 'locating' ? 'Locating…' : 'Use current location'}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative isolate z-0 h-80 w-full overflow-hidden rounded-lg border border-line sm:h-72">
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={mapCenter} />
          <MapEvents onSelectLocation={updateLocation} />
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
          >
            <Popup>
              {detectedAddress ? `Pinned at: ${detectedAddress}` : 'Drag pin or click map to select location'}
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Pinned Location Status & Guidance */}
      <div className="flex flex-col gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs text-ink sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon name="map" className="size-4 shrink-0 text-brand-600" />
          <span className="truncate">
            {outsideAssam ? (
              <span className="font-semibold text-red-600">
                That spot is outside Assam. LokSamadhan only accepts reports inside Assam — pin a location within the state.
              </span>
            ) : isGeocoding ? (
              <span className="text-brand-600 animate-pulse font-medium">Resolving address for pin…</span>
            ) : detectedAddress ? (
              <span>
                Pinned at: <span className="font-semibold text-ink">{detectedAddress}</span>{' '}
                <span className="text-ink-muted font-normal">(drag pin to fine-tune exact spot)</span>
              </span>
            ) : (
              <span>Location set. Drag pin or click map to fine-tune exact spot.</span>
            )}
          </span>
        </div>
        <span className="hidden shrink-0 font-mono text-[11px] text-ink-muted sm:inline">
          [{position[1].toFixed(5)}, {position[0].toFixed(5)}]
        </span>
      </div>
    </div>
  );
};

export default MapPicker;
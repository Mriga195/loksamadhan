import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const markerRef = useRef(null);

  const updateLocation = (lat, lng) => {
    setPosition([lat, lng]);
    // Notify parent of location in API format [lng, lat] (LONGITUDE FIRST)
    if (onLocationChange) {
      onLocationChange([lng, lat]);
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
    // If initialLocation was passed, don't override with geolocation
    if (initialLocation && Array.isArray(initialLocation) && initialLocation.length === 2) {
      setGeoStatus('success');
      return;
    }
    fetchCurrentLocation();
  }, []);

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
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted">
          Drag pin or click map to set location
        </span>
        <button
          type="button"
          onClick={fetchCurrentLocation}
          disabled={geoStatus === 'locating'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50 hover:border-brand-300 disabled:opacity-50 cursor-pointer"
        >
          {geoStatus === 'locating' ? (
            <>
              <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              <span>Locating...</span>
            </>
          ) : (
            <>
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="12" cy="12" r="8"/>
                <line x1="12" y1="2" x2="12" y2="4"/>
                <line x1="12" y1="20" x2="12" y2="22"/>
                <line x1="20" y1="12" x2="22" y2="12"/>
                <line x1="2" y1="12" x2="4" y2="12"/>
              </svg>
              <span>Fetch Current Location</span>
            </>
          )}
        </button>
      </div>

      <div className="h-72 w-full rounded-lg overflow-hidden border border-gray-300 relative">
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
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
            <Popup>Drag pin or click map to select location</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {geoStatus === 'locating' && 'Locating your position...'}
          {geoStatus === 'fallback' && 'Geolocation unavailable. Centered to Tezpur, Assam (drag pin or click map to adjust).'}
          {geoStatus === 'success' && 'Location set. Drag pin or click map to adjust.'}
        </span>
        <span className="font-mono">
          [{position[1].toFixed(5)}, {position[0].toFixed(5)}]
        </span>
      </div>
    </div>
  );
};

export default MapPicker;
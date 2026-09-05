import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon';

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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fetchCurrentLocation}
          disabled={geoStatus === 'locating'}
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border
            border-brand-200 bg-surface px-4 text-sm font-semibold text-brand-600 shadow-sm
            transition-colors hover:bg-brand-50 disabled:opacity-50"
        >
          <Icon name="locate" className={`size-4 ${geoStatus === 'locating' ? 'animate-spin' : ''}`} />
          {geoStatus === 'locating' ? 'Locating…' : 'Use current location'}
        </button>
      </div>

      <div className="relative isolate z-0 h-72 w-full overflow-hidden rounded-lg border border-line">
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
            <Popup>Drag pin or click map to select location</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-ink-muted">
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
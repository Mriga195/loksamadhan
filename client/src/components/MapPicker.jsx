import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
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

const DEFAULT_CENTER = [19.0760, 72.8777]; // Mumbai / default city center [lat, lng]

const MapPicker = ({ onLocationChange, initialLocation }) => {
  // Leaflet uses [lat, lng], API uses [lng, lat]
  const [position, setPosition] = useState(() => {
    if (initialLocation && Array.isArray(initialLocation) && initialLocation.length === 2) {
      return [initialLocation[1], initialLocation[0]];
    }
    return DEFAULT_CENTER;
  });
  const [geoStatus, setGeoStatus] = useState('locating'); // 'locating' | 'success' | 'fallback'
  const markerRef = useRef(null);

  const updateLocation = (lat, lng) => {
    setPosition([lat, lng]);
    // Notify parent of location in API format [lng, lat] (LONGITUDE FIRST)
    if (onLocationChange) {
      onLocationChange([lng, lat]);
    }
  };

  useEffect(() => {
    // If initialLocation was passed, don't override with geolocation
    if (initialLocation && Array.isArray(initialLocation) && initialLocation.length === 2) {
      setGeoStatus('success');
      return;
    }

    if (!navigator.geolocation) {
      setGeoStatus('fallback');
      updateLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeoStatus('success');
        updateLocation(lat, lng);
      },
      (_err) => {
        setGeoStatus('fallback');
        updateLocation(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
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
          {geoStatus === 'fallback' && 'Geolocation unavailable. Drag the pin to your location.'}
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
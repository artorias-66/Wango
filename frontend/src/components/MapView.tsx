// frontend/src/components/MapView.tsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPosition } from '../hooks/useGeolocation';
import type { NearbyHangout } from '../api/wango.api';

// Fix Leaflet default icon path issue with Vite
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CATEGORY_COLORS: Record<string, string> = {
  SPORTS:     '#f59e0b',
  GO_KARTING: '#ef4444',
  CRICKET:    '#10b981',
  FOOTBALL:   '#3b82f6',
  GAMING:     '#8b5cf6',
  FOOD:       '#f97316',
  OUTDOOR:    '#22c55e',
  MUSIC:      '#ec4899',
  SOCIAL:     '#06b6d4',
  FITNESS:    '#84cc16',
  TRAVEL:     '#a78bfa',
};

const CATEGORY_ICONS: Record<string, string> = {
  SPORTS: '⚽', GO_KARTING: '🏎️', CRICKET: '🏏', FOOTBALL: '🏟️',
  GAMING: '🎮', FOOD: '🍜', OUTDOOR: '🏕️', MUSIC: '🎵',
  SOCIAL: '👥', FITNESS: '💪', TRAVEL: '✈️',
};

function createHangoutIcon(category: string, isSelected: boolean) {
  const color = CATEGORY_COLORS[category] ?? '#00d4ff';
  const icon = CATEGORY_ICONS[category] ?? '📍';
  const size = isSelected ? 44 : 38;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${isSelected ? `<div style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid ${color};
          animation: pulse-ring 1.5s ease-out infinite;
          opacity: 0.6;
        "></div>` : ''}
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: rgba(8,13,26,0.9);
          border: 2px solid ${color};
          box-shadow: 0 0 ${isSelected ? 16 : 8}px ${color}80;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? 20 : 17}px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          ${icon}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: rgba(0, 212, 255, 0.15);
          animation: pulse-ring 2s ease-out infinite;
        "></div>
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--color-primary, #00d4ff);
          border: 3px solid white;
          box-shadow: 0 0 16px rgba(0,212,255,0.5);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Re-center map when position changes
function MapRecenter({ position }: { position: GeoPosition }) {
  const map = useMap();
  const prevPos = useRef<GeoPosition | null>(null);

  useEffect(() => {
    if (!prevPos.current) {
      map.setView([position.lat, position.lng], 13);
    }
    prevPos.current = position;
  }, [position, map]);

  return null;
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)} km`;
}

interface MapViewProps {
  position: GeoPosition | null;
  hangouts: NearbyHangout[];
  radiusMeters: number;
  selectedId: number | null;
  onSelectHangout: (hangout: NearbyHangout) => void;
  onJoin: (hangout: NearbyHangout) => void;
}

export function MapView({
  position,
  hangouts,
  radiusMeters,
  selectedId,
  onSelectHangout,
  onJoin,
}: MapViewProps) {
  const defaultCenter: [number, number] = position
    ? [position.lat, position.lng]
    : [20.5937, 78.9629]; // India center fallback

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {position && (
        <>
          <MapRecenter position={position} />

          {/* User marker */}
          <Marker
            position={[position.lat, position.lng]}
            icon={createUserIcon()}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-primary)', padding: '4px' }}>
                <strong style={{ color: 'var(--color-primary)' }}>📍 You are here</strong>
              </div>
            </Popup>
          </Marker>

          {/* Search radius overlay */}
          <Circle
            center={[position.lat, position.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: '#00d4ff',
              fillColor: '#00d4ff',
              fillOpacity: 0.04,
              weight: 1.5,
              dashArray: '6, 6',
              opacity: 0.5,
            }}
          />
        </>
      )}

      {/* Hangout markers */}
      {hangouts.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lng]}
          icon={createHangoutIcon(h.category, selectedId === h.id)}
          eventHandlers={{ click: () => onSelectHangout(h) }}
        >
          <Popup>
            <div style={{
              fontFamily: 'var(--font-body)',
              minWidth: 200,
              padding: '4px',
            }}>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)' }}>
                {h.title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                by {h.user.name} · {formatDistance(h.distanceMeters)} away
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-success)', marginBottom: 10 }}>
                {h.joinCount}/{h.maxParticipants} going
              </p>
              <button
                className="btn btn-primary btn-sm btn-full"
                onClick={() => onJoin(h)}
                style={{ fontSize: 12 }}
              >
                Request to Join
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

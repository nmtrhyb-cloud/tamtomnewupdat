import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="#f97316" stroke="white" stroke-width="3"/>
      <g transform="translate(10,12) scale(1.2)">
        <rect x="1" y="7" width="20" height="10" rx="3" fill="white"/>
        <rect x="3" y="4" width="14" height="7" rx="2" fill="white"/>
        <circle cx="5" cy="18" r="2.5" fill="#f97316"/>
        <circle cx="17" cy="18" r="2.5" fill="#f97316"/>
        <rect x="14" y="5" width="4" height="4" rx="1" fill="#bfdbfe"/>
        <rect x="5" y="5" width="7" height="4" rx="1" fill="#bfdbfe"/>
      </g>
    </svg>
  `),
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24]
});

const destinationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="52" viewBox="0 0 44 52">
      <path d="M22 2C12.6 2 5 9.6 5 19c0 13.5 17 31 17 31s17-17.5 17-31c0-9.4-7.6-17-17-17z" fill="#ef4444" stroke="white" stroke-width="2"/>
      <circle cx="22" cy="19" r="7" fill="white"/>
      <circle cx="22" cy="19" r="4" fill="#ef4444"/>
    </svg>
  `),
  iconSize: [44, 52],
  iconAnchor: [22, 52],
  popupAnchor: [0, -52]
});

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function makeArrowIcon(bearing: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width:0;height:0;
      border-left:8px solid transparent;
      border-right:8px solid transparent;
      border-bottom:16px solid #f97316;
      transform:rotate(${bearing}deg);
      transform-origin:center center;
      opacity:0.9;
    "></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

interface MapComponentProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    title: string;
    type: 'driver' | 'destination' | 'default';
    popup?: string;
  }>;
  driverPosition?: [number, number];
  showDriverRadius?: boolean;
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  height?: string;
}

function MapEvents({ onLocationSelect }: { onLocationSelect?: MapComponentProps['onLocationSelect'] }) {
  const map = useMap();
  useEffect(() => {
    if (onLocationSelect) {
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          const data = await response.json();
          const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          onLocationSelect(lat, lng, address);
        } catch {
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      });
    }
    return () => { map.off('click'); };
  }, [map, onLocationSelect]);
  return null;
}

function UpdateMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function AutoFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prevPoints = useRef<string>('');

  useEffect(() => {
    if (points.length < 2) return;
    const key = points.map(p => p.join(',')).join('|');
    if (key === prevPoints.current) return;
    prevPoints.current = key;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
  }, [map, points]);

  return null;
}

export default function MapComponent({
  center,
  zoom = 13,
  markers = [],
  driverPosition,
  showDriverRadius = false,
  onLocationSelect,
  height = '400px'
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);

  const destinationMarker = markers.find(m => m.type === 'destination');
  const destinationPos: [number, number] | null = destinationMarker ? destinationMarker.position : null;

  const hasRoute = !!(driverPosition && destinationPos);
  const routePoints: [number, number][] = hasRoute ? [driverPosition!, destinationPos!] : [];

  const midPoint: [number, number] | null = hasRoute
    ? [
        (driverPosition![0] + destinationPos![0]) / 2,
        (driverPosition![1] + destinationPos![1]) / 2,
      ]
    : null;

  const bearing = hasRoute
    ? calculateBearing(driverPosition![0], driverPosition![1], destinationPos![0], destinationPos![1])
    : 0;

  const allPoints: [number, number][] = [
    ...(driverPosition ? [driverPosition] : []),
    ...(destinationPos ? [destinationPos] : []),
  ];

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allPoints.length >= 2 ? (
          <AutoFitBounds points={allPoints} />
        ) : (
          <UpdateMapView center={center} zoom={zoom} />
        )}

        <MapEvents onLocationSelect={onLocationSelect} />

        {/* Route line from driver to customer */}
        {hasRoute && (
          <>
            {/* Shadow line */}
            <Polyline
              positions={routePoints}
              pathOptions={{ color: '#000', weight: 6, opacity: 0.15 }}
            />
            {/* Main dashed route line */}
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: '#f97316',
                weight: 4,
                opacity: 0.85,
                dashArray: '12, 8',
              }}
            />
            {/* Midpoint arrow */}
            {midPoint && (
              <Marker position={midPoint} icon={makeArrowIcon(bearing)} interactive={false} />
            )}
          </>
        )}

        {/* Driver marker */}
        {driverPosition && (
          <>
            <Marker position={driverPosition} icon={driverIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-orange-600">🚗 موقع السائق الحالي</p>
                  <p className="text-xs text-gray-500">يتحدث تلقائياً</p>
                </div>
              </Popup>
            </Marker>
            {showDriverRadius && (
              <Circle
                center={driverPosition}
                radius={1000}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.08 }}
              />
            )}
          </>
        )}

        {/* Other markers (destination, etc.) */}
        {markers.map((marker, index) => {
          const icon = marker.type === 'driver'
            ? driverIcon
            : marker.type === 'destination'
            ? destinationIcon
            : undefined;

          return (
            <Marker key={index} position={marker.position} icon={icon}>
              <Popup>
                <div>
                  <strong>{marker.title}</strong>
                  {marker.popup && <p>{marker.popup}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

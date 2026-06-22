import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Navigation, Phone, Loader2, MapPin, X, ExternalLink } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const driverMarkerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r="24" fill="#10b981" stroke="white" stroke-width="3"/>
      <g transform="translate(13,14) scale(1.1)">
        <rect x="1" y="7" width="20" height="10" rx="3" fill="white"/>
        <rect x="3" y="3" width="14" height="8" rx="2" fill="white"/>
        <circle cx="5" cy="18" r="2.5" fill="#10b981"/>
        <circle cx="17" cy="18" r="2.5" fill="#10b981"/>
        <rect x="13" y="4" width="4" height="4" rx="1" fill="#a7f3d0"/>
        <rect x="5" y="4" width="6" height="4" rx="1" fill="#a7f3d0"/>
      </g>
    </svg>
  `),
  iconSize: [52, 52],
  iconAnchor: [26, 26],
  popupAnchor: [0, -26],
});

const customerMarkerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <path d="M22 2C12.6 2 5 9.6 5 19c0 13.5 17 33 17 33s17-19.5 17-33C39 9.6 31.4 2 22 2z" fill="#ef4444" stroke="white" stroke-width="2.5"/>
      <circle cx="22" cy="19" r="8" fill="white"/>
      <circle cx="22" cy="19" r="4.5" fill="#ef4444"/>
    </svg>
  `),
  iconSize: [44, 56],
  iconAnchor: [22, 56],
  popupAnchor: [0, -56],
});

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeArrowIcon(bearing: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      width:0;height:0;
      border-left:10px solid transparent;
      border-right:10px solid transparent;
      border-bottom:20px solid #10b981;
      transform:rotate(${bearing}deg);
      transform-origin:center center;
      opacity:0.9;
      filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    "></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (positions.length >= 2 && !done.current) {
      done.current = true;
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16, animate: true });
    } else if (positions.length === 1) {
      map.setView(positions[0], 15, { animate: true });
    }
  }, [map, positions]);
  return null;
}

interface DriverToCustomerMapProps {
  customerLat: number;
  customerLng: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  onClose: () => void;
}

export default function DriverToCustomerMap({
  customerLat,
  customerLng,
  customerName,
  customerPhone,
  deliveryAddress,
  onClose,
}: DriverToCustomerMapProps) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const watchRef = useRef<number | null>(null);

  const customerPos: [number, number] = [customerLat, customerLng];

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('جهازك لا يدعم تحديد الموقع');
      setGpsLoading(false);
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setDriverPos([pos.coords.latitude, pos.coords.longitude]);
        setGpsLoading(false);
        setGpsError(null);
      },
      (err) => {
        setGpsError('تعذّر الحصول على موقعك. تأكد من تفعيل GPS.');
        setGpsLoading(false);
        console.error('GPS error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const hasRoute = driverPos !== null;
  const routePoints: [number, number][] = hasRoute ? [driverPos!, customerPos] : [];
  const midPoint: [number, number] | null = hasRoute
    ? [(driverPos![0] + customerPos[0]) / 2, (driverPos![1] + customerPos[1]) / 2]
    : null;
  const bearing = hasRoute ? calculateBearing(driverPos![0], driverPos![1], customerPos[0], customerPos[1]) : 0;
  const distanceKm = hasRoute ? calculateDistance(driverPos![0], driverPos![1], customerPos[0], customerPos[1]) : null;

  const mapPoints: [number, number][] = hasRoute ? [driverPos!, customerPos] : [customerPos];
  const mapCenter: [number, number] = hasRoute
    ? [(driverPos![0] + customerPos[0]) / 2, (driverPos![1] + customerPos[1]) / 2]
    : customerPos;

  const openGoogleMaps = () => {
    const origin = driverPos ? `${driverPos[0]},${driverPos[1]}` : '';
    const dest = `${customerLat},${customerLng}`;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-black/60" dir="rtl">
      <div className="flex flex-col h-full max-h-full bg-white rounded-t-2xl mt-4 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-green-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            <div>
              <p className="font-bold text-sm">تتبع موقع العميل</p>
              <p className="text-xs text-green-100 truncate max-w-[220px]">{customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border-b border-green-100 shrink-0">
          {gpsLoading && (
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>جاري تحديد موقعك...</span>
            </div>
          )}
          {gpsError && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <MapPin className="h-3.5 w-3.5" />
              <span>{gpsError}</span>
            </div>
          )}
          {distanceKm !== null && (
            <div className="flex items-center gap-2 text-xs text-green-700 font-bold">
              <Navigation className="h-3.5 w-3.5" />
              <span>المسافة المتبقية: {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)} م` : `${distanceKm.toFixed(1)} كم`}</span>
            </div>
          )}
          {driverPos && (
            <div className="flex items-center gap-1 text-xs text-green-600 mr-auto">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>GPS مفعّل</span>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          <MapContainer
            center={mapCenter}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds positions={mapPoints} />

            {/* Route line */}
            {hasRoute && routePoints.length >= 2 && (
              <>
                <Polyline
                  positions={routePoints}
                  pathOptions={{ color: '#000', weight: 7, opacity: 0.12 }}
                />
                <Polyline
                  positions={routePoints}
                  pathOptions={{ color: '#10b981', weight: 4, opacity: 0.9, dashArray: '14, 9' }}
                />
                {midPoint && (
                  <Marker position={midPoint} icon={makeArrowIcon(bearing)} interactive={false} />
                )}
              </>
            )}

            {/* Driver marker */}
            {driverPos && (
              <Marker position={driverPos} icon={driverMarkerIcon}>
                <Popup>
                  <div className="text-center min-w-[140px]">
                    <p className="font-bold text-green-600 text-sm">📍 موقعك الحالي</p>
                    <p className="text-xs text-gray-500 mt-1">يتحدث تلقائياً</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Customer marker */}
            <Marker position={customerPos} icon={customerMarkerIcon}>
              <Popup>
                <div className="min-w-[160px]">
                  <p className="font-bold text-red-600 text-sm mb-1">🏠 موقع العميل</p>
                  <p className="text-xs font-semibold text-gray-800">{customerName}</p>
                  <p className="text-xs text-gray-600 mt-1">{deliveryAddress}</p>
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => window.open(`tel:${customerPhone}`)}
                      className="flex-1 bg-green-600 text-white text-xs py-1 px-2 rounded"
                    >
                      اتصال
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Loading overlay */}
          {gpsLoading && !driverPos && (
            <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 z-[500]">
              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
              <span className="text-xs text-gray-700">تحديد موقع السائق...</span>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-4 py-3 bg-white border-t shrink-0 flex gap-3">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
            onClick={openGoogleMaps}
          >
            <ExternalLink className="h-4 w-4" />
            التوجيه عبر خرائط Google
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-green-200 text-green-700"
            onClick={() => window.open(`tel:${customerPhone}`)}
          >
            <Phone className="h-4 w-4" />
            اتصال
          </Button>
        </div>
      </div>
    </div>
  );
}

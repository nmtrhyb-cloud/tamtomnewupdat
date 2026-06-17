import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Truck, Settings, Plus, Trash2, Save, Calculator, Percent,
  ShieldCheck, Layers, MapPin, Map as MapIcon, Crosshair, Undo2,
  RotateCcw, CheckCircle2, Info, Edit,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// إصلاح أيقونات Leaflet الافتراضية مرة واحدة
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── أنواع البيانات ──────────────────────────────────────────────────────────

interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  minDistance: string;
  maxDistance: string;
  deliveryFee: string;
  estimatedTime?: string;
  isActive: boolean;
}

interface DeliveryFeeSettings {
  id?: string;
  type: 'fixed' | 'per_km' | 'zone_based' | 'restaurant_custom';
  baseFee: string;
  perKmFee: string;
  minFee: string;
  maxFee: string;
  freeDeliveryThreshold: string;
}

interface GeoZone {
  id: string;
  name: string;
  description?: string;
  deliveryFee?: string;
  coordinates: string;
  isActive: boolean;
}

interface DeliveryRule {
  id: string;
  name: string;
  ruleType: 'distance' | 'order_value' | 'zone';
  minDistance?: string;
  maxDistance?: string;
  minOrderValue?: string;
  maxOrderValue?: string;
  geoZoneId?: string;
  fee: string;
  isActive: boolean;
  priority: number;
}

interface DeliveryDiscount {
  id: string;
  name: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: string;
  minOrderValue?: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

// ─── مكوّن خريطة موقع المتجر ─────────────────────────────────────────────────

function StoreLocationMap({
  initialLat, initialLng,
  onConfirm, onClose,
}: {
  initialLat: number; initialLng: number;
  onConfirm: (lat: string, lng: string) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [pickedLat, setPickedLat] = useState(initialLat.toFixed(6));
  const [pickedLng, setPickedLng] = useState(initialLng.toFixed(6));

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true })
      .setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true })
      .addTo(map)
      .bindPopup('موقع المتجر')
      .openPopup();

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setPickedLat(lat.toFixed(6));
      setPickedLng(lng.toFixed(6));
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setPickedLat(lat.toFixed(6));
      setPickedLng(lng.toFixed(6));
    });

    mapRef.current = map;
    markerRef.current = marker;

    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col gap-0">
      <div
        ref={containerRef}
        style={{ height: 360, width: '100%', zIndex: 0 }}
        className="border-y border-gray-200"
      />
      <div className="px-4 py-3 bg-gray-50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-600">خط العرض (Lat)</Label>
            <Input
              value={pickedLat}
              onChange={e => {
                setPickedLat(e.target.value);
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && markerRef.current && mapRef.current) {
                  markerRef.current.setLatLng([v, parseFloat(pickedLng)]);
                  mapRef.current.panTo([v, parseFloat(pickedLng)]);
                }
              }}
              className="font-mono text-sm h-9"
              placeholder="15.3694"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-600">خط الطول (Lng)</Label>
            <Input
              value={pickedLng}
              onChange={e => {
                setPickedLng(e.target.value);
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && markerRef.current && mapRef.current) {
                  markerRef.current.setLatLng([parseFloat(pickedLat), v]);
                  mapRef.current.panTo([parseFloat(pickedLat), v]);
                }
              }}
              className="font-mono text-sm h-9"
              placeholder="44.1910"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => onConfirm(pickedLat, pickedLng)}
            disabled={!pickedLat || !pickedLng}
          >
            <Crosshair className="h-4 w-4" />
            تأكيد الموقع
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

// ─── مكوّن رسم المضلع للمناطق الجغرافية ───────────────────────────────────────

function GeoZonePolygonMap({
  initialCoords,
  onConfirm,
  onClose,
}: {
  initialCoords: { lat: number; lng: number }[];
  onConfirm: (coords: { lat: number; lng: number }[]) => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>(initialCoords);

  const DEFAULT_CENTER: [number, number] = [15.3694, 44.1910];

  const redrawPolygon = useCallback((map: L.Map, pts: { lat: number; lng: number }[]) => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }

    pts.forEach((pt, i) => {
      const sm = L.circleMarker([pt.lat, pt.lng], {
        radius: 7, color: '#e53225', fillColor: '#e53225', fillOpacity: 1, weight: 2,
      }).addTo(map).bindTooltip(`${i + 1}`, { permanent: true, direction: 'center', className: 'leaflet-tooltip-point' });
      markersRef.current.push(sm as any);
    });

    if (pts.length >= 3) {
      polygonRef.current = L.polygon(
        pts.map(p => [p.lat, p.lng] as [number, number]),
        { color: '#e53225', fillColor: '#e53225', fillOpacity: 0.15, weight: 2 }
      ).addTo(map);
    } else if (pts.length === 2) {
      L.polyline(pts.map(p => [p.lat, p.lng] as [number, number]), { color: '#e53225', weight: 2 })
        .addTo(map);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const center = points.length > 0
      ? [points[0].lat, points[0].lng] as [number, number]
      : DEFAULT_CENTER;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    redrawPolygon(map, points);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const newPt = { lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) };
      setPoints(prev => {
        const updated = [...prev, newPt];
        redrawPolygon(map, updated);
        return updated;
      });
    });

    setTimeout(() => map.invalidateSize(), 150);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const handleUndo = () => {
    setPoints(prev => {
      const updated = prev.slice(0, -1);
      if (mapRef.current) redrawPolygon(mapRef.current, updated);
      return updated;
    });
  };

  const handleClear = () => {
    setPoints([]);
    if (mapRef.current) redrawPolygon(mapRef.current, []);
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2 text-xs text-blue-700">
        <Info className="h-3.5 w-3.5 shrink-0" />
        انقر على الخريطة لإضافة نقاط المضلع. تحتاج 3 نقاط على الأقل لتشكيل منطقة.
      </div>
      <div
        ref={containerRef}
        style={{ height: 340, width: '100%', zIndex: 0 }}
        className="border-b border-gray-200"
      />
      <div className="px-4 py-3 bg-gray-50 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={points.length >= 3 ? 'default' : 'secondary'}>
            {points.length} نقطة {points.length >= 3 ? '✓' : `(${3 - points.length} متبقية)`}
          </Badge>
          <div className="flex gap-2 mr-auto">
            <Button size="sm" variant="outline" onClick={handleUndo} disabled={points.length === 0}>
              <Undo2 className="h-3.5 w-3.5 ml-1" /> تراجع
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear} disabled={points.length === 0}>
              <RotateCcw className="h-3.5 w-3.5 ml-1" /> مسح الكل
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => onConfirm(points)}
            disabled={points.length < 3}
          >
            <CheckCircle2 className="h-4 w-4" />
            تأكيد المنطقة ({points.length} نقطة)
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────────────────────

export default function AdminDeliveryFees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('settings');

  // ── جلب البيانات ──
  const { data: settings } = useQuery<DeliveryFeeSettings>({ queryKey: ['/api/delivery-fees/settings'] });
  const { data: zones = [], isLoading: zonesLoading } = useQuery<DeliveryZone[]>({ queryKey: ['/api/delivery-fees/zones'] });
  const { data: geoZones = [], isLoading: geoZonesLoading } = useQuery<GeoZone[]>({ queryKey: ['/api/delivery-fees/geo-zones'] });
  const { data: deliveryRules = [], isLoading: rulesLoading } = useQuery<DeliveryRule[]>({ queryKey: ['/api/delivery-fees/rules'] });
  const { data: discounts = [], isLoading: discountsLoading } = useQuery<DeliveryDiscount[]>({ queryKey: ['/api/delivery-fees/discounts'] });

  // ── موقع المتجر ──
  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });
  const [storeLat, setStoreLat] = useState('15.3694');
  const [storeLng, setStoreLng] = useState('44.1910');
  const [isStoreMapOpen, setIsStoreMapOpen] = useState(false);

  useEffect(() => {
    if (uiSettings && Array.isArray(uiSettings)) {
      const lat = uiSettings.find((s: any) => s.key === 'store_lat')?.value;
      const lng = uiSettings.find((s: any) => s.key === 'store_lng')?.value;
      if (lat) setStoreLat(lat);
      if (lng) setStoreLng(lng);
    }
  }, [uiSettings]);

  const saveLocationMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: string; lng: string }) => {
      await Promise.all([
        apiRequest('PUT', '/api/admin/ui-settings/store_lat', { value: lat }),
        apiRequest('PUT', '/api/admin/ui-settings/store_lng', { value: lng }),
      ]);
    },
    onSuccess: () => {
      toast({ title: '✅ تم حفظ موقع المتجر', description: 'سيُستخدم الموقع الجديد لحساب رسوم التوصيل' });
      queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });
    },
    onError: () => toast({ title: 'خطأ في حفظ الموقع', variant: 'destructive' }),
  });

  // ── إعدادات الرسوم ──
  const [formSettings, setFormSettings] = useState<DeliveryFeeSettings>({
    type: 'per_km', baseFee: '5', perKmFee: '2', minFee: '3', maxFee: '50', freeDeliveryThreshold: '0',
  });
  useEffect(() => { if (settings) setFormSettings(settings); }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: DeliveryFeeSettings) => {
      const res = await apiRequest('POST', '/api/delivery-fees/settings', {
        ...data,
        baseFee: parseFloat(data.baseFee || '0').toString(),
        perKmFee: parseFloat(data.perKmFee || '0').toString(),
        minFee: parseFloat(data.minFee || '0').toString(),
        maxFee: parseFloat(data.maxFee || '0').toString(),
        freeDeliveryThreshold: parseFloat(data.freeDeliveryThreshold || '0').toString(),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'فشل الحفظ');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '✅ تم حفظ إعدادات رسوم التوصيل' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/settings'] });
    },
    onError: (e: any) => toast({ title: 'خطأ في الحفظ', description: e.message, variant: 'destructive' }),
  });

  // ── مناطق المسافات ──
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [newZone, setNewZone] = useState({ name: '', description: '', minDistance: '0', maxDistance: '', deliveryFee: '', estimatedTime: '' });
  const addZoneMutation = useMutation({
    mutationFn: async (data: typeof newZone) => {
      const res = await apiRequest('POST', '/api/delivery-fees/zones', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة المنطقة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/zones'] });
      setIsAddZoneOpen(false);
      setNewZone({ name: '', description: '', minDistance: '0', maxDistance: '', deliveryFee: '', estimatedTime: '' });
    },
    onError: () => toast({ title: 'خطأ في إضافة المنطقة', variant: 'destructive' }),
  });
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/delivery-fees/zones/${id}`, {});
      return res.json();
    },
    onSuccess: () => { toast({ title: 'تم الحذف' }); queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/zones'] }); },
    onError: () => toast({ title: 'خطأ في الحذف', variant: 'destructive' }),
  });

  // ── المناطق الجغرافية ──
  const [isAddGeoZoneOpen, setIsAddGeoZoneOpen] = useState(false);
  const [isGeoMapOpen, setIsGeoMapOpen] = useState(false);
  const [newGeoZone, setNewGeoZone] = useState<Partial<GeoZone>>({ name: '', description: '', deliveryFee: '', coordinates: '[]', isActive: true });
  const [drawnCoords, setDrawnCoords] = useState<{ lat: number; lng: number }[]>([]);

  const addGeoZoneMutation = useMutation({
    mutationFn: async (data: Partial<GeoZone>) => {
      const res = await apiRequest('POST', '/api/delivery-fees/geo-zones', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة المنطقة الجغرافية بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/geo-zones'] });
      setIsAddGeoZoneOpen(false);
      setNewGeoZone({ name: '', description: '', deliveryFee: '', coordinates: '[]', isActive: true });
      setDrawnCoords([]);
    },
    onError: () => toast({ title: 'خطأ في إضافة المنطقة', variant: 'destructive' }),
  });

  const deleteGeoZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/delivery-fees/geo-zones/${id}`, {});
      return res.json();
    },
    onSuccess: () => { toast({ title: 'تم الحذف' }); queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/geo-zones'] }); },
    onError: () => toast({ title: 'خطأ في الحذف', variant: 'destructive' }),
  });

  // ── القواعد الديناميكية ──
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<DeliveryRule>>({ name: '', ruleType: 'distance', fee: '', priority: 0, isActive: true });
  const addRuleMutation = useMutation({
    mutationFn: async (data: Partial<DeliveryRule>) => {
      const res = await apiRequest('POST', '/api/delivery-fees/rules', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة القاعدة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/rules'] });
      setIsAddRuleOpen(false);
      setNewRule({ name: '', ruleType: 'distance', fee: '', priority: 0, isActive: true });
    },
    onError: () => toast({ title: 'خطأ في إضافة القاعدة', variant: 'destructive' }),
  });
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => { const res = await apiRequest('DELETE', `/api/delivery-fees/rules/${id}`, {}); return res.json(); },
    onSuccess: () => { toast({ title: 'تم الحذف' }); queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/rules'] }); },
  });

  // ── الخصومات ──
  const [isAddDiscountOpen, setIsAddDiscountOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState<Partial<DeliveryDiscount>>({ name: '', discountType: 'percentage', discountValue: '', minOrderValue: '', isActive: true });
  const addDiscountMutation = useMutation({
    mutationFn: async (data: Partial<DeliveryDiscount>) => {
      const res = await apiRequest('POST', '/api/delivery-fees/discounts', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'تمت إضافة الخصم بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/discounts'] });
      setIsAddDiscountOpen(false);
      setNewDiscount({ name: '', discountType: 'percentage', discountValue: '', minOrderValue: '', isActive: true });
    },
    onError: () => toast({ title: 'خطأ في إضافة الخصم', variant: 'destructive' }),
  });
  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => { const res = await apiRequest('DELETE', `/api/delivery-fees/discounts/${id}`, {}); return res.json(); },
    onSuccess: () => { toast({ title: 'تم الحذف' }); queryClient.invalidateQueries({ queryKey: ['/api/delivery-fees/discounts'] }); },
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة رسوم التوصيل</h1>
          <p className="text-muted-foreground">تحكم في طريقة حساب رسوم التوصيل</p>
        </div>
        <Truck className="h-8 w-8 text-primary" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="settings"><Settings className="h-4 w-4 ml-1 inline" />الإعدادات</TabsTrigger>
          <TabsTrigger value="zones"><MapPin className="h-4 w-4 ml-1 inline" />مناطق المسافات</TabsTrigger>
          <TabsTrigger value="geo-zones"><Layers className="h-4 w-4 ml-1 inline" />الجغرافية</TabsTrigger>
          <TabsTrigger value="rules"><ShieldCheck className="h-4 w-4 ml-1 inline" />القواعد</TabsTrigger>
          <TabsTrigger value="discounts"><Percent className="h-4 w-4 ml-1 inline" />الخصومات</TabsTrigger>
        </TabsList>

        {/* ── تاب الإعدادات العامة ─────────────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-6">

          {/* موقع المتجر */}
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">موقع المتجر</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    يُستخدم لحساب مسافة التوصيل. انقر على الزر لتحديد الموقع من الخريطة.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* زر فتح الخريطة */}
              <Dialog open={isStoreMapOpen} onOpenChange={setIsStoreMapOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-12 gap-2 border-2 border-green-300 text-green-700 hover:bg-green-50 font-bold">
                    <MapIcon className="h-5 w-5" />
                    تحديد الموقع على الخريطة
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 overflow-hidden" dir="rtl">
                  <DialogHeader className="px-4 pt-4 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      تحديد موقع المتجر
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      انقر على الخريطة أو اسحب الدبوس لتحديد الموقع الدقيق
                    </p>
                  </DialogHeader>
                  {isStoreMapOpen && (
                    <StoreLocationMap
                      initialLat={parseFloat(storeLat) || 15.3694}
                      initialLng={parseFloat(storeLng) || 44.1910}
                      onConfirm={(lat, lng) => {
                        setStoreLat(lat);
                        setStoreLng(lng);
                        setIsStoreMapOpen(false);
                        toast({ title: '✅ تم تحديد الموقع', description: `${lat}, ${lng}` });
                      }}
                      onClose={() => setIsStoreMapOpen(false)}
                    />
                  )}
                </DialogContent>
              </Dialog>

              {/* إدخال يدوي */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">خط العرض (Latitude)</Label>
                  <Input type="text" inputMode="decimal" placeholder="15.3694" value={storeLat} onChange={e => setStoreLat(e.target.value)} className="font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">خط الطول (Longitude)</Label>
                  <Input type="text" inputMode="decimal" placeholder="44.1910" value={storeLng} onChange={e => setStoreLng(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => saveLocationMutation.mutate({ lat: storeLat, lng: storeLng })} disabled={saveLocationMutation.isPending || !storeLat || !storeLng} className="gap-2 bg-green-600 hover:bg-green-700" size="sm">
                  <Save className="h-4 w-4" />
                  {saveLocationMutation.isPending ? 'جاري الحفظ...' : 'حفظ الموقع'}
                </Button>
                {storeLat && storeLng && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-green-200 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span className="text-muted-foreground">الموقع الحالي:</span>
                    <span className="font-mono font-bold text-gray-800">{storeLat}, {storeLng}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* طريقة الحساب */}
          <Card>
            <CardHeader>
              <CardTitle>طريقة حساب رسوم التوصيل</CardTitle>
              <CardDescription>اختر كيفية حساب رسوم التوصيل للطلبات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>نوع الحساب</Label>
                <Select value={formSettings.type} onValueChange={(v: DeliveryFeeSettings['type']) => setFormSettings(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">رسوم ثابتة</SelectItem>
                    <SelectItem value="per_km">حسب المسافة (لكل كيلومتر)</SelectItem>
                    <SelectItem value="zone_based">حسب المناطق</SelectItem>
                    <SelectItem value="restaurant_custom">حسب إعدادات المطعم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الرسوم الأساسية (ريال)</Label>
                  <Input type="number" value={formSettings.baseFee} onChange={e => setFormSettings(p => ({ ...p, baseFee: e.target.value }))} placeholder="5" />
                </div>
                {formSettings.type === 'per_km' && (
                  <div className="space-y-2">
                    <Label>رسوم لكل كيلومتر (ريال)</Label>
                    <Input type="number" value={formSettings.perKmFee} onChange={e => setFormSettings(p => ({ ...p, perKmFee: e.target.value }))} placeholder="2" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الحد الأدنى (ريال)</Label>
                  <Input type="number" value={formSettings.minFee} onChange={e => setFormSettings(p => ({ ...p, minFee: e.target.value }))} placeholder="3" />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى (ريال)</Label>
                  <Input type="number" value={formSettings.maxFee} onChange={e => setFormSettings(p => ({ ...p, maxFee: e.target.value }))} placeholder="50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>حد التوصيل المجاني (ريال) — 0 = معطّل</Label>
                <Input type="number" value={formSettings.freeDeliveryThreshold} onChange={e => setFormSettings(p => ({ ...p, freeDeliveryThreshold: e.target.value }))} placeholder="0" />
                <p className="text-xs text-muted-foreground">إذا تجاوز المجموع الفرعي هذا المبلغ، يصبح التوصيل مجانياً.</p>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="p-4 flex items-start gap-2">
                  <Calculator className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {formSettings.type === 'fixed' && `رسوم ثابتة = ${formSettings.baseFee} ريال`}
                    {formSettings.type === 'per_km' && `رسوم = ${formSettings.baseFee} + (مسافة × ${formSettings.perKmFee}) ريال`}
                    {formSettings.type === 'zone_based' && 'حسب منطقة التوصيل المحددة'}
                    {formSettings.type === 'restaurant_custom' && 'حسب إعدادات كل مطعم'}
                  </span>
                </CardContent>
              </Card>
              <Button onClick={() => saveSettingsMutation.mutate(formSettings)} disabled={saveSettingsMutation.isPending} className="w-full">
                <Save className="h-4 w-4 ml-2" />
                {saveSettingsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تاب مناطق المسافات ──────────────────────────────────────────── */}
        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>مناطق المسافات</CardTitle>
                <CardDescription>تحديد رسوم التوصيل بناءً على نطاق المسافة بالكيلومترات</CardDescription>
              </div>
              <Dialog open={isAddZoneOpen} onOpenChange={setIsAddZoneOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 ml-2" />إضافة منطقة</Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader><DialogTitle>إضافة منطقة مسافات جديدة</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم المنطقة *</Label>
                      <Input value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))} placeholder="مثال: قريب (0-5 كم)" />
                    </div>
                    <div className="space-y-2">
                      <Label>وصف اختياري</Label>
                      <Input value={newZone.description} onChange={e => setNewZone(p => ({ ...p, description: e.target.value }))} placeholder="وصف المنطقة" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>المسافة الدنيا (كم) *</Label>
                        <Input type="number" min="0" value={newZone.minDistance} onChange={e => setNewZone(p => ({ ...p, minDistance: e.target.value }))} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>المسافة القصوى (كم) *</Label>
                        <Input type="number" min="0" value={newZone.maxDistance} onChange={e => setNewZone(p => ({ ...p, maxDistance: e.target.value }))} placeholder="5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>رسوم التوصيل (ريال) *</Label>
                        <Input type="number" min="0" value={newZone.deliveryFee} onChange={e => setNewZone(p => ({ ...p, deliveryFee: e.target.value }))} placeholder="10" />
                      </div>
                      <div className="space-y-2">
                        <Label>الوقت التقديري (دقيقة)</Label>
                        <Input type="number" min="0" value={newZone.estimatedTime} onChange={e => setNewZone(p => ({ ...p, estimatedTime: e.target.value }))} placeholder="30" />
                      </div>
                    </div>
                    <Button onClick={() => addZoneMutation.mutate(newZone)} disabled={addZoneMutation.isPending || !newZone.name || !newZone.maxDistance || !newZone.deliveryFee} className="w-full">
                      {addZoneMutation.isPending ? 'جاري الحفظ...' : 'حفظ المنطقة'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {zonesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <MapPin className="h-10 w-10 opacity-30" />
                  <p className="font-medium">لا توجد مناطق مسافات</p>
                  <p className="text-sm">أضف مناطق لتحديد رسوم التوصيل حسب المسافة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {zones.map(zone => (
                    <div key={zone.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{zone.name}</h4>
                          <Badge variant={zone.isActive ? 'default' : 'secondary'}>{zone.isActive ? 'نشطة' : 'معطلة'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {zone.minDistance} – {zone.maxDistance} كم
                          {zone.estimatedTime && ` · ${zone.estimatedTime} دقيقة`}
                        </p>
                        <p className="text-sm font-bold text-primary">{zone.deliveryFee} ريال</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => deleteZoneMutation.mutate(zone.id)} disabled={deleteZoneMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تاب المناطق الجغرافية ───────────────────────────────────────── */}
        <TabsContent value="geo-zones" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>المناطق الجغرافية (Geo-Zones)</CardTitle>
                <CardDescription>ارسم مناطق جغرافية دقيقة على الخريطة لتطبيق رسوم مخصصة</CardDescription>
              </div>
              <Dialog open={isAddGeoZoneOpen} onOpenChange={setIsAddGeoZoneOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 ml-2" />إضافة منطقة</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 overflow-hidden" dir="rtl">
                  <DialogHeader className="px-4 pt-4 pb-2">
                    <DialogTitle>إضافة منطقة جغرافية جديدة</DialogTitle>
                  </DialogHeader>
                  <div className="px-4 pb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>اسم المنطقة *</Label>
                        <Input value={newGeoZone.name} onChange={e => setNewGeoZone(p => ({ ...p, name: e.target.value }))} placeholder="مثال: وسط المدينة" />
                      </div>
                      <div className="space-y-2">
                        <Label>رسوم التوصيل (ريال)</Label>
                        <Input type="number" value={newGeoZone.deliveryFee} onChange={e => setNewGeoZone(p => ({ ...p, deliveryFee: e.target.value }))} placeholder="15" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>وصف اختياري</Label>
                      <Input value={newGeoZone.description} onChange={e => setNewGeoZone(p => ({ ...p, description: e.target.value }))} placeholder="وصف المنطقة الجغرافية" />
                    </div>
                    {/* زر رسم المضلع */}
                    <div className="space-y-2">
                      <Label>حدود المنطقة على الخريطة *</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="flex-1 gap-2 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setIsGeoMapOpen(true)}>
                          <MapIcon className="h-4 w-4" />
                          {drawnCoords.length >= 3 ? `✅ تم رسم ${drawnCoords.length} نقاط — انقر للتعديل` : 'ارسم المنطقة على الخريطة'}
                        </Button>
                        {drawnCoords.length > 0 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => { setDrawnCoords([]); setNewGeoZone(p => ({ ...p, coordinates: '[]' })); }}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {drawnCoords.length > 0 && (
                        <p className="text-xs text-green-600 font-medium">{drawnCoords.length} نقطة تم رسمها</p>
                      )}
                    </div>
                  </div>

                  {/* خريطة رسم المضلع (تظهر داخل نفس الـ Dialog) */}
                  {isGeoMapOpen && (
                    <div className="border-t border-gray-200">
                      <GeoZonePolygonMap
                        initialCoords={drawnCoords}
                        onConfirm={(coords) => {
                          setDrawnCoords(coords);
                          setNewGeoZone(p => ({ ...p, coordinates: JSON.stringify(coords) }));
                          setIsGeoMapOpen(false);
                        }}
                        onClose={() => setIsGeoMapOpen(false)}
                      />
                    </div>
                  )}

                  {!isGeoMapOpen && (
                    <div className="px-4 pb-4">
                      <Button
                        onClick={() => addGeoZoneMutation.mutate(newGeoZone)}
                        disabled={addGeoZoneMutation.isPending || !newGeoZone.name || drawnCoords.length < 3}
                        className="w-full"
                      >
                        {addGeoZoneMutation.isPending ? 'جاري الحفظ...' : 'حفظ المنطقة الجغرافية'}
                      </Button>
                      {drawnCoords.length < 3 && <p className="text-xs text-amber-600 text-center mt-2">ارسم المنطقة على الخريطة أولاً (3 نقاط على الأقل)</p>}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {geoZonesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : geoZones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <Layers className="h-10 w-10 opacity-30" />
                  <p className="font-medium">لا توجد مناطق جغرافية</p>
                  <p className="text-sm">ارسم مناطق جغرافية على الخريطة لتطبيق رسوم مخصصة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {geoZones.map(zone => {
                    let pointCount = 0;
                    try { pointCount = JSON.parse(zone.coordinates).length; } catch {}
                    return (
                      <div key={zone.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{zone.name}</h4>
                            <Badge variant={zone.isActive ? 'default' : 'secondary'}>{zone.isActive ? 'نشطة' : 'معطلة'}</Badge>
                          </div>
                          {zone.description && <p className="text-sm text-muted-foreground">{zone.description}</p>}
                          <p className="text-xs text-muted-foreground">{pointCount} نقطة جغرافية</p>
                          {zone.deliveryFee && <p className="text-sm font-bold text-primary">{zone.deliveryFee} ريال</p>}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => deleteGeoZoneMutation.mutate(zone.id)} disabled={deleteGeoZoneMutation.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تاب القواعد الديناميكية ─────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>القواعد الديناميكية</CardTitle>
                <CardDescription>قواعد مخصصة لحساب رسوم التوصيل بناءً على شروط معينة</CardDescription>
              </div>
              <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 ml-2" />إضافة قاعدة</Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader><DialogTitle>إضافة قاعدة جديدة</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم القاعدة *</Label>
                      <Input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="مثال: خصم للطلبات الكبيرة" />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع القاعدة *</Label>
                      <Select value={newRule.ruleType} onValueChange={(v: any) => setNewRule(p => ({ ...p, ruleType: v, minDistance: '', maxDistance: '', minOrderValue: '', maxOrderValue: '', geoZoneId: '' }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="distance">حسب المسافة</SelectItem>
                          <SelectItem value="order_value">حسب قيمة الطلب</SelectItem>
                          <SelectItem value="zone">حسب المنطقة الجغرافية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* حقول حسب النوع */}
                    {newRule.ruleType === 'distance' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>المسافة الدنيا (كم)</Label>
                          <Input type="number" min="0" value={newRule.minDistance || ''} onChange={e => setNewRule(p => ({ ...p, minDistance: e.target.value }))} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>المسافة القصوى (كم)</Label>
                          <Input type="number" min="0" value={newRule.maxDistance || ''} onChange={e => setNewRule(p => ({ ...p, maxDistance: e.target.value }))} placeholder="10" />
                        </div>
                      </div>
                    )}
                    {newRule.ruleType === 'order_value' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>أدنى قيمة طلب (ريال)</Label>
                          <Input type="number" min="0" value={newRule.minOrderValue || ''} onChange={e => setNewRule(p => ({ ...p, minOrderValue: e.target.value }))} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                          <Label>أقصى قيمة طلب (ريال)</Label>
                          <Input type="number" min="0" value={newRule.maxOrderValue || ''} onChange={e => setNewRule(p => ({ ...p, maxOrderValue: e.target.value }))} placeholder="100" />
                        </div>
                      </div>
                    )}
                    {newRule.ruleType === 'zone' && (
                      <div className="space-y-2">
                        <Label>المنطقة الجغرافية *</Label>
                        {geoZones.length === 0 ? (
                          <p className="text-xs text-amber-600 p-3 bg-amber-50 rounded-lg">لا توجد مناطق جغرافية. أضف مناطق أولاً من تاب "الجغرافية".</p>
                        ) : (
                          <Select value={newRule.geoZoneId} onValueChange={v => setNewRule(p => ({ ...p, geoZoneId: v }))}>
                            <SelectTrigger><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
                            <SelectContent>
                              {geoZones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>الرسوم (ريال) *</Label>
                        <Input type="number" min="0" value={newRule.fee} onChange={e => setNewRule(p => ({ ...p, fee: e.target.value }))} placeholder="10" />
                      </div>
                      <div className="space-y-2">
                        <Label>الأولوية (رقم أكبر = أعلى)</Label>
                        <Input type="number" value={newRule.priority} onChange={e => setNewRule(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} placeholder="0" />
                      </div>
                    </div>

                    <Button
                      onClick={() => addRuleMutation.mutate(newRule)}
                      disabled={addRuleMutation.isPending || !newRule.name || !newRule.fee}
                      className="w-full"
                    >
                      {addRuleMutation.isPending ? 'جاري الحفظ...' : 'حفظ القاعدة'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : deliveryRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <ShieldCheck className="h-10 w-10 opacity-30" />
                  <p className="font-medium">لا توجد قواعد</p>
                  <p className="text-sm">أضف قواعد لتخصيص رسوم التوصيل حسب شروط معينة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>{rule.isActive ? 'نشطة' : 'معطلة'}</Badge>
                          <Badge variant="outline" className="text-xs">أولوية {rule.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {rule.ruleType === 'distance' && `مسافة: ${rule.minDistance || 0} – ${rule.maxDistance} كم`}
                          {rule.ruleType === 'order_value' && `قيمة: ${rule.minOrderValue || 0} – ${rule.maxOrderValue} ريال`}
                          {rule.ruleType === 'zone' && 'منطقة جغرافية'}
                        </p>
                        <p className="text-sm font-bold text-primary">{rule.fee} ريال</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => deleteRuleMutation.mutate(rule.id)} disabled={deleteRuleMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تاب الخصومات ────────────────────────────────────────────────── */}
        <TabsContent value="discounts" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>خصومات التوصيل</CardTitle>
                <CardDescription>عروض وخصومات على رسوم التوصيل</CardDescription>
              </div>
              <Dialog open={isAddDiscountOpen} onOpenChange={setIsAddDiscountOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 ml-2" />إضافة خصم</Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader><DialogTitle>إضافة خصم جديد</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>اسم الخصم *</Label>
                      <Input value={newDiscount.name} onChange={e => setNewDiscount(p => ({ ...p, name: e.target.value }))} placeholder="مثال: خصم نهاية الأسبوع" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>نوع الخصم *</Label>
                        <Select value={newDiscount.discountType} onValueChange={(v: any) => setNewDiscount(p => ({ ...p, discountType: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                            <SelectItem value="fixed_amount">مبلغ ثابت (ريال)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>القيمة * {newDiscount.discountType === 'percentage' ? '(%)' : '(ريال)'}</Label>
                        <Input type="number" min="0" max={newDiscount.discountType === 'percentage' ? 100 : undefined} value={newDiscount.discountValue} onChange={e => setNewDiscount(p => ({ ...p, discountValue: e.target.value }))} placeholder={newDiscount.discountType === 'percentage' ? '50' : '5'} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>الحد الأدنى للطلب (ريال) — اتركه فارغاً للتطبيق دائماً</Label>
                      <Input type="number" min="0" value={newDiscount.minOrderValue || ''} onChange={e => setNewDiscount(p => ({ ...p, minOrderValue: e.target.value }))} placeholder="مثال: 50 (اختياري)" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>تاريخ البداية</Label>
                        <Input type="date" value={newDiscount.validFrom || ''} onChange={e => setNewDiscount(p => ({ ...p, validFrom: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>تاريخ الانتهاء</Label>
                        <Input type="date" value={newDiscount.validUntil || ''} onChange={e => setNewDiscount(p => ({ ...p, validUntil: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
                      <Switch checked={newDiscount.isActive !== false} onCheckedChange={v => setNewDiscount(p => ({ ...p, isActive: v }))} />
                      <Label className="cursor-pointer">تفعيل الخصم فوراً</Label>
                    </div>
                    <Button
                      onClick={() => addDiscountMutation.mutate(newDiscount)}
                      disabled={addDiscountMutation.isPending || !newDiscount.name || !newDiscount.discountValue}
                      className="w-full"
                    >
                      {addDiscountMutation.isPending ? 'جاري الحفظ...' : 'حفظ الخصم'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {discountsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : discounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                  <Percent className="h-10 w-10 opacity-30" />
                  <p className="font-medium">لا توجد خصومات</p>
                  <p className="text-sm">أضف خصومات على رسوم التوصيل للعملاء</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discounts.map(discount => (
                    <div key={discount.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{discount.name}</h4>
                          <Badge variant={discount.isActive ? 'default' : 'secondary'}>{discount.isActive ? 'نشط' : 'معطّل'}</Badge>
                        </div>
                        <p className="text-sm font-bold text-green-600">
                          {discount.discountType === 'percentage' ? `${discount.discountValue}% خصم` : `${discount.discountValue} ريال خصم`}
                        </p>
                        {discount.minOrderValue && <p className="text-xs text-muted-foreground">الحد الأدنى: {discount.minOrderValue} ريال</p>}
                        {discount.validFrom && <p className="text-xs text-muted-foreground">{discount.validFrom} → {discount.validUntil || '∞'}</p>}
                      </div>
                      <Button variant="outline" size="icon" onClick={() => deleteDiscountMutation.mutate(discount.id)} disabled={deleteDiscountMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

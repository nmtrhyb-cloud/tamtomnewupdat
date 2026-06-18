/**
 * خدمة حساب رسوم التوصيل
 * Delivery Fee Calculation Service
 */

import { storage } from "../storage";

const DEFAULT_BASE_FEE = 5;
const DEFAULT_PER_KM_FEE = 2;
const DEFAULT_MIN_FEE = 3;
const DEFAULT_MAX_FEE = 50;
const EARTH_RADIUS_KM = 6371;

export interface DeliveryLocation {
  lat: number;
  lng: number;
}

export interface DeliveryFeeResult {
  fee: number;
  distance: number;
  estimatedTime: string;
  feeBreakdown: {
    baseFee: number;
    distanceFee: number;
    totalBeforeLimit: number;
  };
  isFreeDelivery: boolean;
  freeDeliveryReason?: string;
  appliedRuleId?: string;
  appliedDiscountId?: string;
}

export interface DeliveryFeeSettings {
  type: 'fixed' | 'per_km' | 'zone_based' | 'restaurant_custom';
  baseFee: number;
  perKmFee: number;
  minFee: number;
  maxFee: number;
  freeDeliveryThreshold: number;
}

/**
 * حساب المسافة بين نقطتين باستخدام صيغة Haversine
 */
export function calculateDistance(
  point1: DeliveryLocation,
  point2: DeliveryLocation
): number {
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 100) / 100;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * التحقق مما إذا كانت النقطة داخل مضلع (Geo-Zone)
 */
export function isPointInPolygon(point: DeliveryLocation, polygon: DeliveryLocation[]): boolean {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = point.lat, yi = point.lng;
    const x1 = polygon[i].lat, y1 = polygon[i].lng;
    const x2 = polygon[j].lat, y2 = polygon[j].lng;

    const intersect = ((y1 > yi) !== (y2 > yi)) &&
      (xi < (x2 - x1) * (yi - y1) / (y2 - y1) + x1);
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

/**
 * تقدير وقت التوصيل بناءً على المسافة
 */
export function estimateDeliveryTime(distanceKm: number): string {
  const avgSpeedKmH = 30;
  const prepTimeMinutes = 15;

  const travelTimeMinutes = (distanceKm / avgSpeedKmH) * 60;
  const totalTimeMinutes = Math.ceil(prepTimeMinutes + travelTimeMinutes);

  const minTime = totalTimeMinutes;
  const maxTime = Math.ceil(totalTimeMinutes * 1.3);

  if (maxTime <= 60) {
    return `${minTime}-${maxTime} دقيقة`;
  } else {
    const minHours = Math.floor(minTime / 60);
    const maxHours = Math.ceil(maxTime / 60);
    if (minHours === maxHours) {
      return `حوالي ${minHours} ساعة`;
    }
    return `${minHours}-${maxHours} ساعة`;
  }
}

/**
 * جلب إعدادات رسوم التوصيل من قاعدة البيانات
 */
async function getDeliveryFeeSettings(): Promise<DeliveryFeeSettings> {
  // قراءة إعدادات الواجهة كاحتياط
  let uiBaseFee = DEFAULT_BASE_FEE;
  let uiPerKmFee = DEFAULT_PER_KM_FEE;
  let uiMinFee = DEFAULT_MIN_FEE;
  try {
    const allUiSettings = await storage.getUiSettings();
    const uiMap = new Map(allUiSettings.map((s: any) => [s.key, s.value]));
    const rawBase = parseFloat(uiMap.get('delivery_base_fee') || '0');
    const rawPerKm = parseFloat(uiMap.get('delivery_fee_per_km') || '0');
    const rawMin = parseFloat(uiMap.get('min_delivery_fee') || '0');
    if (rawBase > 0) uiBaseFee = rawBase;
    if (rawPerKm > 0) uiPerKmFee = rawPerKm;
    if (rawMin > 0) uiMinFee = rawMin;
  } catch (_) {}

  try {
    const globalSettings = await storage.getDeliveryFeeSettings();
    if (globalSettings && globalSettings.type) {
      const dbBaseFee = Math.max(0, parseFloat(globalSettings.baseFee || '0'));
      const dbPerKmFee = Math.max(0, parseFloat(globalSettings.perKmFee || '0'));
      const dbMinFee = Math.max(0, parseFloat(globalSettings.minFee || '0'));
      const dbMaxFee = Math.max(0, parseFloat(globalSettings.maxFee || DEFAULT_MAX_FEE.toString()));

      return {
        type: globalSettings.type as DeliveryFeeSettings['type'],
        // إذا كانت القيمة في DB صفر، استخدم إعدادات الواجهة كاحتياط
        baseFee: dbBaseFee > 0 ? dbBaseFee : uiBaseFee,
        perKmFee: dbPerKmFee > 0 ? dbPerKmFee : uiPerKmFee,
        minFee: dbMinFee > 0 ? dbMinFee : uiMinFee,
        maxFee: dbMaxFee > 0 ? dbMaxFee : DEFAULT_MAX_FEE,
        freeDeliveryThreshold: Math.max(0, parseFloat(globalSettings.freeDeliveryThreshold || '0')),
      };
    }
  } catch (error) {
    console.error('[DeliveryFee] Error fetching settings:', error);
  }

  return {
    type: 'per_km',
    baseFee: uiBaseFee,
    perKmFee: uiPerKmFee,
    minFee: uiMinFee,
    maxFee: DEFAULT_MAX_FEE,
    freeDeliveryThreshold: 0
  };
}

/**
 * جلب موقع المتجر الرئيسي من إعدادات النظام
 * يُستخدم كاحتياط عندما لا يكون للمطعم إحداثيات
 */
async function getSystemStoreLocation(): Promise<DeliveryLocation | null> {
  try {
    const allSettings = await storage.getUiSettings();
    const settingsMap = new Map(allSettings.map((s: any) => [s.key, s.value]));
    const storeLat = settingsMap.get('store_lat');
    const storeLng = settingsMap.get('store_lng');

    if (storeLat && storeLng) {
      const lat = parseFloat(storeLat);
      const lng = parseFloat(storeLng);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { lat, lng };
      }
    }
  } catch (error) {
    console.error('[DeliveryFee] Error fetching system store location:', error);
  }
  return null;
}

/**
 * حساب رسوم التوصيل الكاملة
 */
export async function calculateDeliveryFee(
  customerLocation: DeliveryLocation,
  restaurantId: string | null,
  orderSubtotal: number
): Promise<DeliveryFeeResult> {
  // جلب جميع البيانات بشكل متوازٍ - موقع المتجر دائماً من إعدادات النظام
  const [geoZones, deliveryRules, discounts, deliverySettings, systemStoreLocation] = await Promise.all([
    storage.getGeoZones(),
    storage.getDeliveryRules(),
    storage.getDeliveryDiscounts(),
    getDeliveryFeeSettings(),
    getSystemStoreLocation(),
  ]);

  const activeGeoZones = geoZones.filter(z => z.isActive);
  const activeRules = deliveryRules.filter(r => r.isActive);
  const activeDiscounts = discounts.filter(d => d.isActive);

  // موقع المتجر الرئيسي (طمطوم) من إعدادات النظام (store_lat/store_lng)
  const storeLocation: DeliveryLocation | null = systemStoreLocation;

  // حساب المسافة
  const distance = storeLocation
    ? calculateDistance(customerLocation, storeLocation)
    : 0;
  const estimatedTime = estimateDeliveryTime(distance);

  // تحديد المنطقة الجغرافية (Geo-Zone)
  let matchingGeoZoneId: string | null = null;
  for (const zone of activeGeoZones) {
    try {
      const polygon = JSON.parse(zone.coordinates);
      if (isPointInPolygon(customerLocation, polygon)) {
        matchingGeoZoneId = zone.id;
        break;
      }
    } catch (e) {
      console.error(`[DeliveryFee] Error parsing geo-zone ${zone.name}:`, e);
    }
  }

  // تطبيق القواعد الديناميكية
  let appliedFee: number | null = null;
  let appliedRuleId: string | undefined;

  for (const rule of activeRules) {
    let matches = false;

    if (rule.ruleType === 'zone' && rule.geoZoneId === matchingGeoZoneId) {
      matches = true;
    } else if (rule.ruleType === 'distance') {
      const minD = rule.minDistance ? parseFloat(rule.minDistance) : 0;
      const maxD = rule.maxDistance ? parseFloat(rule.maxDistance) : Infinity;
      if (distance >= minD && distance <= maxD) matches = true;
    } else if (rule.ruleType === 'order_value') {
      const minV = rule.minOrderValue ? parseFloat(rule.minOrderValue) : 0;
      const maxV = rule.maxOrderValue ? parseFloat(rule.maxOrderValue) : Infinity;
      if (orderSubtotal >= minV && orderSubtotal <= maxV) matches = true;
    }

    if (matches) {
      appliedFee = parseFloat(rule.fee);
      appliedRuleId = rule.id;
      break;
    }
  }

  // الحساب الافتراضي إذا لم تطبق أي قاعدة
  if (appliedFee === null) {
    switch (deliverySettings.type) {
      case 'fixed':
        appliedFee = deliverySettings.baseFee;
        break;
      case 'zone_based':
        appliedFee = await getZoneBasedFee(distance);
        break;
      case 'per_km':
      default:
        appliedFee = deliverySettings.baseFee + (distance * deliverySettings.perKmFee);
        break;
    }
  }

  // تطبيق التوصيل المجاني والخصومات
  let isFreeDelivery = false;
  let freeDeliveryReason: string | undefined;
  let appliedDiscountId: string | undefined;

  if (deliverySettings.freeDeliveryThreshold > 0 && orderSubtotal >= deliverySettings.freeDeliveryThreshold) {
    isFreeDelivery = true;
    freeDeliveryReason = `توصيل مجاني للطلبات فوق ${deliverySettings.freeDeliveryThreshold} ريال`;
    appliedFee = 0;
  } else {
    const now = new Date();
    for (const discount of activeDiscounts) {
      if (discount.validFrom && new Date(discount.validFrom) > now) continue;
      if (discount.validUntil && new Date(discount.validUntil) < now) continue;
      if (discount.minOrderValue && orderSubtotal < parseFloat(discount.minOrderValue)) continue;

      appliedDiscountId = discount.id;
      if (discount.discountType === 'percentage') {
        const discountAmount = appliedFee * (parseFloat(discount.discountValue) / 100);
        appliedFee -= discountAmount;
        if (parseFloat(discount.discountValue) === 100) {
          isFreeDelivery = true;
          freeDeliveryReason = `خصم توصيل مجاني: ${discount.name}`;
        }
      } else {
        appliedFee -= parseFloat(discount.discountValue);
        if (appliedFee <= 0) {
          appliedFee = 0;
          isFreeDelivery = true;
          freeDeliveryReason = `توصيل مجاني: ${discount.name}`;
        }
      }
      break;
    }
  }

  // تطبيق الحدود الدنيا والقصوى
  if (!isFreeDelivery) {
    appliedFee = Math.max(deliverySettings.minFee, Math.min(deliverySettings.maxFee, appliedFee));
  }
  appliedFee = Math.max(0, Math.round(appliedFee * 100) / 100);

  return {
    fee: appliedFee,
    distance,
    estimatedTime,
    feeBreakdown: {
      baseFee: isFreeDelivery ? 0 : appliedFee,
      distanceFee: 0,
      totalBeforeLimit: appliedFee
    },
    isFreeDelivery,
    freeDeliveryReason,
    appliedRuleId,
    appliedDiscountId
  };
}

/**
 * حساب رسوم التوصيل حسب المناطق
 */
async function getZoneBasedFee(distance: number): Promise<number> {
  try {
    const zones = await storage.getDeliveryZones();

    if (zones && zones.length > 0) {
      const matchingZone = zones.find(zone =>
        distance >= parseFloat(zone.minDistance || '0') &&
        distance <= parseFloat(zone.maxDistance || '999')
      );

      if (matchingZone) {
        return parseFloat(matchingZone.deliveryFee || String(DEFAULT_BASE_FEE));
      }
    }
  } catch (error) {
    console.error('[DeliveryFee] Error fetching delivery zones:', error);
  }

  return DEFAULT_BASE_FEE + (distance * DEFAULT_PER_KM_FEE);
}

/**
 * حساب رسوم التوصيل السريع
 */
export function calculateQuickDeliveryFee(
  distanceKm: number,
  baseFee: number = DEFAULT_BASE_FEE,
  perKmFee: number = DEFAULT_PER_KM_FEE
): number {
  const fee = baseFee + (distanceKm * perKmFee);
  return Math.round(Math.max(DEFAULT_MIN_FEE, Math.min(DEFAULT_MAX_FEE, fee)) * 100) / 100;
}

export default {
  calculateDistance,
  calculateDeliveryFee,
  calculateQuickDeliveryFee,
  estimateDeliveryTime
};

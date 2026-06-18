/**
 * مسارات API لرسوم التوصيل
 * Delivery Fee API Routes
 */

import express from "express";
import { storage } from "../storage";
import { calculateDeliveryFee, calculateDistance, estimateDeliveryTime } from "../services/deliveryFeeService";
import { deliveryFeeCache } from "../utils/cache";
import { z } from "zod";
import { coerceRequestData } from "../utils/coercion";
import { broadcastSettingsChanged } from "../broadcast";
import { 
  insertGeoZoneSchema, 
  insertDeliveryRuleSchema, 
  insertDeliveryDiscountSchema 
} from "@shared/schema";

const router = express.Router();

router.post("/calculate", async (req, res) => {
  try {
    const { customerLat, customerLng, restaurantId, orderSubtotal } = req.body;

    if (!customerLat || !customerLng) {
      return res.status(400).json({
        error: "بيانات ناقصة",
        details: "يجب توفير إحداثيات العميل"
      });
    }

    const lat = parseFloat(customerLat);
    const lng = parseFloat(customerLng);
    const subtotal = parseFloat(orderSubtotal || '0');

    // دقة أعلى (4 خانات عشرية ≈ 11م) لضمان صحة حساب المناطق الجغرافية
    const cacheKey = deliveryFeeCache.generateKey(
      Math.round(lat * 10000),
      Math.round(lng * 10000),
      restaurantId,
      Math.round(subtotal)
    );

    let result = deliveryFeeCache.get(cacheKey);
    
    if (!result) {
      result = await calculateDeliveryFee(
        { lat, lng },
        restaurantId || null,
        subtotal
      );
      deliveryFeeCache.set(cacheKey, result);
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('خطأ في حساب رسوم التوصيل:', error);
    res.status(500).json({ error: error.message || "خطأ في الخادم" });
  }
});

// حساب المسافة بين نقطتين
router.post("/distance", async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.body;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({
        error: "بيانات ناقصة",
        details: "يجب توفير إحداثيات النقطتين"
      });
    }

    const distance = calculateDistance(
      { lat: parseFloat(fromLat), lng: parseFloat(fromLng) },
      { lat: parseFloat(toLat), lng: parseFloat(toLng) }
    );

    const estimatedTime = estimateDeliveryTime(distance);

    res.json({
      success: true,
      distance,
      unit: 'km',
      estimatedTime
    });
  } catch (error: any) {
    console.error('خطأ في حساب المسافة:', error);
    res.status(500).json({ error: error.message || "خطأ في الخادم" });
  }
});

// جلب إعدادات رسوم التوصيل
router.get("/settings", async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const settings = await storage.getDeliveryFeeSettings(restaurantId as string);
    
    if (!settings) {
      // إرجاع الإعدادات الافتراضية
      return res.json({
        type: 'per_km',
        baseFee: '5',
        perKmFee: '2',
        minFee: '3',
        maxFee: '50',
        freeDeliveryThreshold: '0',
        isDefault: true
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('خطأ في جلب إعدادات رسوم التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إنشاء أو تحديث إعدادات رسوم التوصيل (للمدير)
router.post("/settings", async (req, res) => {
  try {
    const coercedData = coerceRequestData(req.body);

    const settingsSchema = z.object({
      type: z.enum(['fixed', 'per_km', 'zone_based', 'restaurant_custom']),
      baseFee: z.string().optional(),
      perKmFee: z.string().optional(),
      minFee: z.string().optional(),
      maxFee: z.string().optional(),
      freeDeliveryThreshold: z.string().optional(),
      restaurantId: z.string().optional()
    });

    const validatedData = settingsSchema.parse(coercedData);

    const validateNumber = (value: string | undefined, fieldName: string): string => {
      if (!value || value === '') return '0';
      const num = parseFloat(value);
      if (isNaN(num)) throw new Error(`${fieldName}: قيمة غير صحيحة "${value}"`);
      if (num < 0) throw new Error(`${fieldName}: يجب أن تكون قيمة موجبة أو صفر`);
      return num.toString();
    };

    const sanitizedData = {
      ...validatedData,
      baseFee: validateNumber(validatedData.baseFee, 'الرسوم الأساسية'),
      perKmFee: validateNumber(validatedData.perKmFee, 'رسوم لكل كيلومتر'),
      minFee: validateNumber(validatedData.minFee, 'الحد الأدنى'),
      maxFee: validateNumber(validatedData.maxFee, 'الحد الأقصى'),
      freeDeliveryThreshold: validateNumber(validatedData.freeDeliveryThreshold, 'حد التوصيل المجاني'),
    };

    const minFeeNum = parseFloat(sanitizedData.minFee || '0');
    const maxFeeNum = parseFloat(sanitizedData.maxFee || '1000');

    if (maxFeeNum < minFeeNum) {
      return res.status(400).json({
        success: false,
        error: "بيانات غير صحيحة",
        message: `الحد الأقصى (${maxFeeNum}) يجب أن يكون أكبر من أو يساوي الحد الأدنى (${minFeeNum})`
      });
    }

    const existing = await storage.getDeliveryFeeSettings(sanitizedData.restaurantId);

    if (existing) {
      const updated = await storage.updateDeliveryFeeSettings(existing.id, sanitizedData);
      deliveryFeeCache.clear();
      broadcastSettingsChanged('delivery_fee_settings');
      return res.json({
        success: true,
        message: 'تم تحديث الإعدادات بنجاح',
        settings: updated
      });
    }

    const newSettings = await storage.createDeliveryFeeSettings(sanitizedData);
    deliveryFeeCache.clear();
    broadcastSettingsChanged('delivery_fee_settings');
    res.status(201).json({
      success: true,
      message: 'تم حفظ الإعدادات بنجاح',
      settings: newSettings
    });
  } catch (error: any) {
    console.error('[DeliveryFee] Error saving settings:', error.message);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "خطأ في البيانات المدخلة",
        validationErrors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }

    return res.status(400).json({
      success: false,
      error: "خطأ في حفظ الإعدادات",
      message: error.message || "حدث خطأ غير متوقع"
    });
  }
});

// جلب مناطق التوصيل
router.get("/zones", async (req, res) => {
  try {
    const zones = await storage.getDeliveryZones();
    res.json(zones);
  } catch (error) {
    console.error('خطأ في جلب مناطق التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إضافة منطقة توصيل جديدة
router.post("/zones", async (req, res) => {
  try {
    const zoneSchema = z.object({
      name: z.string().min(1, "اسم المنطقة مطلوب"),
      description: z.string().optional(),
      minDistance: z.string().optional(),
      maxDistance: z.string(),
      deliveryFee: z.string(),
      estimatedTime: z.string().optional()
    });

    const validatedData = zoneSchema.parse(req.body);
    const newZone = await storage.createDeliveryZone(validatedData);
    
    res.status(201).json({ success: true, zone: newZone });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "بيانات غير صحيحة",
        details: error.errors
      });
    }
    console.error('خطأ في إضافة منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث منطقة توصيل
router.put("/zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await storage.updateDeliveryZone(id, req.body);
    
    if (!updated) {
      return res.status(404).json({ error: "المنطقة غير موجودة" });
    }

    res.json({ success: true, zone: updated });
  } catch (error) {
    console.error('خطأ في تحديث منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// حذف منطقة توصيل
router.delete("/zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteDeliveryZone(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "المنطقة غير موجودة" });
    }

    res.json({ success: true, message: "تم حذف المنطقة بنجاح" });
  } catch (error) {
    console.error('خطأ في حذف منطقة التوصيل:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// --- Geo-Zones (Polygons) ---

router.get("/geo-zones", async (req, res) => {
  try {
    const zones = await storage.getGeoZones();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: "خطأ في جلب المناطق الجغرافية" });
  }
});

router.post("/geo-zones", async (req, res) => {
  try {
    const validatedData = insertGeoZoneSchema.parse(req.body);
    const zone = await storage.createGeoZone(validatedData);
    res.status(201).json(zone);
  } catch (error) {
    res.status(400).json({ error: "بيانات المنطقة غير صحيحة" });
  }
});

router.patch("/geo-zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertGeoZoneSchema.partial().parse(req.body);
    const zone = await storage.updateGeoZone(id, validatedData);
    if (!zone) return res.status(404).json({ error: "المنطقة غير موجودة" });
    res.json(zone);
  } catch (error) {
    res.status(400).json({ error: "بيانات المنطقة غير صحيحة" });
  }
});

router.delete("/geo-zones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteGeoZone(id);
    if (!success) return res.status(404).json({ error: "المنطقة غير موجودة" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "فشل حذف المنطقة" });
  }
});

// --- Delivery Rules ---

router.get("/rules", async (req, res) => {
  try {
    const rules = await storage.getDeliveryRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: "خطأ في جلب القواعد" });
  }
});

router.post("/rules", async (req, res) => {
  try {
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryRuleSchema.parse(coercedData);
    const rule = await storage.createDeliveryRule(validatedData);
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ error: "بيانات القاعدة غير صحيحة" });
  }
});

router.patch("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryRuleSchema.partial().parse(coercedData);
    const rule = await storage.updateDeliveryRule(id, validatedData);
    if (!rule) return res.status(404).json({ error: "القاعدة غير موجودة" });
    res.json(rule);
  } catch (error) {
    res.status(400).json({ error: "بيانات القاعدة غير صحيحة" });
  }
});

router.delete("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteDeliveryRule(id);
    if (!success) return res.status(404).json({ error: "القاعدة غير موجودة" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "فشل حذف القاعدة" });
  }
});

// --- Delivery Discounts ---

router.get("/discounts", async (req, res) => {
  try {
    const discounts = await storage.getDeliveryDiscounts();
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ error: "خطأ في جلب الخصومات" });
  }
});

router.post("/discounts", async (req, res) => {
  try {
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryDiscountSchema.parse(coercedData);
    const discount = await storage.createDeliveryDiscount(validatedData);
    res.status(201).json(discount);
  } catch (error) {
    res.status(400).json({ error: "بيانات الخصم غير صحيحة" });
  }
});

router.patch("/discounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const coercedData = coerceRequestData(req.body);
    const validatedData = insertDeliveryDiscountSchema.partial().parse(coercedData);
    const discount = await storage.updateDeliveryDiscount(id, validatedData);
    if (!discount) return res.status(404).json({ error: "الخصم غير موجود" });
    res.json(discount);
  } catch (error) {
    res.status(400).json({ error: "بيانات الخصم غير صحيحة" });
  }
});

router.delete("/discounts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.deleteDeliveryDiscount(id);
    if (!success) return res.status(404).json({ error: "الخصم غير موجود" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "فشل حذف الخصم" });
  }
});

export default router;

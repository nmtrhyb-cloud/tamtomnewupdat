import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Clock, Save, AlertCircle, Calendar, Info } from 'lucide-react';

interface BusinessHoursSettings {
  opening_time: string;
  closing_time: string;
  store_status: string;
  store_close_message: string;
  allow_scheduled_orders_when_closed: string;
}

// تحويل من 24 ساعة إلى 12 ساعة + صباح/مساء
function to12h(time24: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = mStr || '00';
  const period: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: String(h), minute: m, period };
}

// تحويل من 12 ساعة + صباح/مساء إلى 24 ساعة
function to24h(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour, 10) || 12;
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

// عرض الوقت بصيغة 12h للمعاينة
function formatTime12h(time24: string): string {
  const { hour, minute, period } = to12h(time24);
  const periodAr = period === 'AM' ? 'صباحاً' : 'مساءً';
  return `${hour}:${minute} ${periodAr}`;
}

// مكوّن اختيار الوقت بنظام 12 ساعة
function TimePicker({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (val: string) => void;
  id?: string;
}) {
  const { hour, minute, period } = to12h(value);

  const handleHour = (h: string) => onChange(to24h(h, minute, period));
  const handleMinute = (m: string) => onChange(to24h(hour, m, period));
  const handlePeriod = (p: 'AM' | 'PM') => onChange(to24h(hour, minute, p));

  const selectClass =
    'border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer';

  return (
    <div id={id} className="flex items-center gap-1 rtl">
      {/* الساعة */}
      <select className={selectClass} value={hour} onChange={(e) => handleHour(e.target.value)}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={String(h)}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>

      <span className="text-gray-500 font-bold text-sm">:</span>

      {/* الدقيقة */}
      <select className={selectClass} value={minute} onChange={(e) => handleMinute(e.target.value)}>
        {['00', '15', '30', '45'].map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {/* صباح / مساء */}
      <select
        className={`${selectClass} font-semibold ${period === 'AM' ? 'text-amber-600' : 'text-indigo-600'}`}
        value={period}
        onChange={(e) => handlePeriod(e.target.value as 'AM' | 'PM')}
      >
        <option value="AM">صباحاً</option>
        <option value="PM">مساءً</option>
      </select>
    </div>
  );
}

export default function AdminBusinessHours() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<BusinessHoursSettings>({
    opening_time: '08:00',
    closing_time: '23:00',
    store_status: 'open',
    store_close_message: 'عذراً، المتجر مغلق حالياً. سنعود قريباً إن شاء الله.',
    allow_scheduled_orders_when_closed: 'true',
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/ui-settings'],
    select: (data: any[]) => {
      const result: BusinessHoursSettings = {
        opening_time: '08:00',
        closing_time: '23:00',
        store_status: 'open',
        store_close_message: 'عذراً، المتجر مغلق حالياً. سنعود قريباً إن شاء الله.',
        allow_scheduled_orders_when_closed: 'true',
      };

      data?.forEach((setting) => {
        if (setting.key === 'opening_time') result.opening_time = setting.value;
        if (setting.key === 'closing_time') result.closing_time = setting.value;
        if (setting.key === 'store_status') result.store_status = setting.value;
        if (setting.key === 'store_close_message') result.store_close_message = setting.value;
        if (setting.key === 'allow_scheduled_orders_when_closed') result.allow_scheduled_orders_when_closed = setting.value;
      });

      return result;
    }
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateBusinessHours = useMutation({
    mutationFn: async (data: BusinessHoursSettings) => {
      const updates = [
        apiRequest('PUT', `/api/admin/ui-settings/opening_time`, { value: data.opening_time }),
        apiRequest('PUT', `/api/admin/ui-settings/closing_time`, { value: data.closing_time }),
        apiRequest('PUT', `/api/admin/ui-settings/store_status`, { value: data.store_status }),
        apiRequest('PUT', `/api/admin/ui-settings/store_close_message`, { value: data.store_close_message }),
        apiRequest('PUT', `/api/admin/ui-settings/allow_scheduled_orders_when_closed`, { value: data.allow_scheduled_orders_when_closed }),
      ];

      await Promise.all(updates);
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث إعدادات المتجر وأوقات العمل",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ui-settings'] });
    },
    onError: (error) => {
      console.error('خطأ في تحديث إعدادات المتجر:', error);
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث الإعدادات",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.opening_time || !formData.closing_time) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    updateBusinessHours.mutate(formData);
  };

  const handleInputChange = (field: keyof BusinessHoursSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="page-admin-business-hours">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="page-admin-business-hours">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">إدارة أوقات العمل</h1>
        </div>
        <p className="text-gray-600">تحديد أوقات فتح وإغلاق المتجر وضبط خدمة الطلبات المجدولة</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* حالة المتجر */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              حالة المتجر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
              <div>
                <Label className="text-base font-semibold">وضع المتجر</Label>
                <p className="text-sm text-gray-500 mt-0.5">اختر كيف يتحدد فتح أو إغلاق المتجر</p>
              </div>
              <select
                value={formData.store_status}
                onChange={(e) => handleInputChange('store_status', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                data-testid="select-store-status"
              >
                <option value="open">مفتوح دائماً</option>
                <option value="auto">تلقائي (حسب الوقت)</option>
                <option value="closed">مغلق يدوياً</option>
              </select>
            </div>

            {/* رسالة الإغلاق — تظهر فقط عند الإغلاق اليدوي */}
            {formData.store_status === 'closed' && (
              <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">المتجر مغلق حالياً — العملاء لن يتمكنوا من الطلب</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">رسالة سبب الإغلاق</Label>
                  <Textarea
                    value={formData.store_close_message}
                    onChange={(e) => handleInputChange('store_close_message', e.target.value)}
                    placeholder="عذراً، المتجر مغلق مؤقتاً. سنعود قريباً إن شاء الله."
                    rows={2}
                    className="resize-none border-red-200 focus:border-red-400"
                    data-testid="input-store-close-message"
                  />
                  <p className="text-xs text-red-600">هذه الرسالة ستظهر للعملاء كنافذة منبثقة عند محاولة الطلب</p>
                </div>
              </div>
            )}

            {/* أوقات العمل — محدد AM/PM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening_time" className="text-sm font-medium">
                  وقت الفتح
                  {formData.store_status === 'auto' && <span className="text-blue-500 mr-1">*</span>}
                </Label>
                <TimePicker
                  id="opening_time"
                  value={formData.opening_time}
                  onChange={(val) => handleInputChange('opening_time', val)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing_time" className="text-sm font-medium">
                  وقت الإغلاق
                  {formData.store_status === 'auto' && <span className="text-blue-500 mr-1">*</span>}
                </Label>
                <TimePicker
                  id="closing_time"
                  value={formData.closing_time}
                  onChange={(val) => handleInputChange('closing_time', val)}
                />
              </div>
            </div>

            {/* معاينة */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-1">معاينة الحالة</p>
              <p className="text-sm text-blue-800">
                {formData.store_status === 'open'
                  ? '✅ المتجر مفتوح دائماً — الطلبات مقبولة في أي وقت'
                  : formData.store_status === 'auto'
                  ? `⏰ تلقائي — يفتح ${formatTime12h(formData.opening_time)} ويغلق ${formatTime12h(formData.closing_time)} يومياً (توقيت اليمن)`
                  : '🔴 المتجر مغلق يدوياً — لن يتمكن العملاء من الطلب'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* الطلبات المجدولة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              الطلبات المجدولة عند الإغلاق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
              <Info className="h-4 w-4 inline ml-1" />
              عند تفعيل هذه الخاصية، يستطيع العملاء إضافة منتجات وجدولة طلباتهم لوقت الفتح حتى لو كان المتجر مغلقاً
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
              <div>
                <Label className="text-base font-semibold">السماح بالطلبات المجدولة</Label>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formData.allow_scheduled_orders_when_closed === 'true'
                    ? '✅ العملاء يستطيعون جدولة طلباتهم عند الإغلاق'
                    : '🔴 العملاء لا يستطيعون الطلب أو الجدولة عند الإغلاق'}
                </p>
              </div>
              <Switch
                checked={formData.allow_scheduled_orders_when_closed === 'true'}
                onCheckedChange={(checked) => handleInputChange('allow_scheduled_orders_when_closed', checked ? 'true' : 'false')}
                data-testid="switch-allow-scheduled"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={updateBusinessHours.isPending}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-save-business-hours"
          >
            {updateBusinessHours.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                حفظ التغييرات
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

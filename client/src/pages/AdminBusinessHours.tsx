import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

            {/* أوقات العمل — تظهر دائماً (مرجع للوضع التلقائي) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="opening_time" className="text-sm font-medium">
                  وقت الفتح
                  {formData.store_status === 'auto' && <span className="text-blue-500 mr-1">*</span>}
                </Label>
                <Input
                  id="opening_time"
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => handleInputChange('opening_time', e.target.value)}
                  data-testid="input-opening-time"
                />
                {formData.opening_time && (
                  <p className="text-xs font-semibold text-blue-600">
                    {parseInt(formData.opening_time.split(':')[0]) < 12 ? '☀️ صباحاً' : '🌙 مساءً'}
                    {' — '}
                    {(() => {
                      const [h, m] = formData.opening_time.split(':').map(Number);
                      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                      return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
                    })()}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closing_time" className="text-sm font-medium">
                  وقت الإغلاق
                  {formData.store_status === 'auto' && <span className="text-blue-500 mr-1">*</span>}
                </Label>
                <Input
                  id="closing_time"
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => handleInputChange('closing_time', e.target.value)}
                  data-testid="input-closing-time"
                />
                {formData.closing_time && (
                  <p className="text-xs font-semibold text-orange-600">
                    {parseInt(formData.closing_time.split(':')[0]) < 12 ? '☀️ صباحاً' : '🌙 مساءً'}
                    {' — '}
                    {(() => {
                      const [h, m] = formData.closing_time.split(':').map(Number);
                      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                      return `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
                    })()}
                  </p>
                )}
              </div>
            </div>

            {/* معاينة */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-700 mb-1">معاينة الحالة</p>
              <p className="text-sm text-blue-800">
                {formData.store_status === 'open'
                  ? '✅ المتجر مفتوح دائماً — الطلبات مقبولة في أي وقت'
                  : formData.store_status === 'auto'
                  ? `⏰ تلقائي — يفتح ${formData.opening_time} ويغلق ${formData.closing_time} يومياً (توقيت اليمن)`
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

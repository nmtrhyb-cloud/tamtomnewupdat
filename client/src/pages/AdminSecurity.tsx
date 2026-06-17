import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, UserCheck, Eye, EyeOff, 
  RefreshCw, Users, Globe, Smartphone,
  Mail, Phone, MapPin, Calendar, Clock,
  Lock, Unlock, Bell, MessageSquare, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordComplexity: 'low' | 'medium' | 'high';
  ipWhitelist: string[];
  lastAudit: string;
}

interface SecurityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  ipAddress: string;
  device: string;
  location: string;
  createdAt: string;
  status: 'success' | 'failure' | 'warning';
}

export default function AdminSecurity() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showIps, setShowIps] = useState(false);
  const [phoneVerificationEnabled, setPhoneVerificationEnabled] = useState(false);

  const { data: securitySettings } = useQuery<SecuritySettings>({
    queryKey: ['/api/admin/security/settings'],
  });

  const { data: securityLogs } = useQuery<SecurityLog[]>({
    queryKey: ['/api/admin/security/logs'],
  });

  // قراءة إعداد التحقق من الهاتف من إعدادات الواجهة
  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  useEffect(() => {
    if (uiSettings) {
      const setting = uiSettings.find((s: any) => s.key === 'phone_verification_enabled');
      setPhoneVerificationEnabled(setting?.value === 'true');
    }
  }, [uiSettings]);

  // حفظ إعداد التحقق من الهاتف
  const savePhoneVerification = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest('PUT', '/api/admin/ui-settings/phone_verification_enabled', {
        value: enabled ? 'true' : 'false',
      });
    },
    onSuccess: (_, enabled) => {
      toast({
        title: 'تم الحفظ',
        description: enabled
          ? 'تم تفعيل التحقق من رقم الهاتف عبر رسالة نصية'
          : 'تم إلغاء التحقق من رقم الهاتف',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });
    },
    onError: () => {
      toast({
        title: 'خطأ',
        description: 'فشل حفظ الإعداد، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
      // إعادة القيمة إلى ما كانت عليه عند الفشل
      setPhoneVerificationEnabled((prev) => !prev);
    },
  });

  const handlePhoneVerificationToggle = (checked: boolean) => {
    setPhoneVerificationEnabled(checked);
    savePhoneVerification.mutate(checked);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الأمن والخصوصية</h1>
          <p className="text-gray-500 mt-1">إدارة إعدادات الأمان ومراقبة سجلات الوصول</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Shield className="w-4 h-4" />
          تحديث إعدادات الأمان
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>سجلات الوصول الحديثة</CardTitle>
            <CardDescription>متابعة آخر عمليات تسجيل الدخول والأنشطة الحساسة</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>IP / الجهاز</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.userName}</div>
                      <div className="text-xs text-gray-500">{log.location}</div>
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>
                      <div className="text-xs">{log.ipAddress}</div>
                      <div className="text-[10px] text-gray-500">{log.device}</div>
                    </TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString('ar-YE')}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'}>
                        {log.status === 'success' ? 'ناجح' : log.status === 'failure' ? 'فشل' : 'تحذير'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* إعدادات الحماية الأساسية */}
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الحماية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>المصادقة الثنائية (2FA)</Label>
                  <p className="text-xs text-gray-500">تطلب رمزاً إضافياً عند الدخول</p>
                </div>
                <Switch checked={securitySettings?.twoFactorEnabled ?? false} />
              </div>
              <div className="space-y-2">
                <Label>تعقيد كلمة المرور</Label>
                <Select value={securitySettings?.passwordComplexity ?? 'medium'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">مرتفع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مدة الجلسة (دقائق)</Label>
                <Input type="number" value={securitySettings?.sessionTimeout ?? 60} readOnly />
              </div>
            </CardContent>
          </Card>

          {/* التحقق من رقم الهاتف */}
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="w-4 h-4 text-blue-600" />
                التحقق من رقم الهاتف
              </CardTitle>
              <CardDescription className="text-xs">
                عند التفعيل، يُرسل الخادم رمز تحقق نصي (OTP) لرقم الهاتف عند التسجيل
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">التحقق عبر رسالة نصية</Label>
                  <p className="text-xs text-gray-500">
                    {phoneVerificationEnabled
                      ? '✅ يُطلب رمز OTP عند تسجيل كل عميل جديد'
                      : '🔓 التسجيل بدون تحقق من رقم الهاتف'}
                  </p>
                </div>
                <Switch
                  checked={phoneVerificationEnabled}
                  onCheckedChange={handlePhoneVerificationToggle}
                  disabled={savePhoneVerification.isPending}
                />
              </div>

              {phoneVerificationEnabled ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <p className="text-xs font-medium text-blue-800">🔒 التحقق مفعّل</p>
                  <p className="text-xs text-blue-700">
                    سيتلقى العملاء الجدد رمز تحقق على هاتفهم قبل إتمام التسجيل.
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    ملاحظة: يتطلب ربط خدمة SMS (مثل Unifonic / Twilio) لإرسال الرسائل الفعلية.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-800">⚠️ التحقق معطل</p>
                  <p className="text-xs text-amber-700">
                    يمكن للعملاء التسجيل بأي رقم هاتف دون التحقق من صحته.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">حالة النظام</CardTitle>
              <Shield className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-2xl font-bold text-green-600">
                <Shield className="w-6 h-6" />
                محمي
              </div>
              <p className="text-xs text-gray-500 mt-2">آخر فحص أمني: {securitySettings?.lastAudit}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Shield, Truck, Users, Package,
  Tag, Filter, RefreshCw, ChevronDown, Download,
  User, Clock, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  adminType: string;
  action: string;
  actionLabel: string;
  entityType: string;
  entityLabel: string;
  entityId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create_sub_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  update_sub_admin: 'bg-blue-100 text-blue-800 border-blue-200',
  delete_sub_admin: 'bg-red-100 text-red-800 border-red-200',
  create_driver: 'bg-green-100 text-green-800 border-green-200',
  update_driver: 'bg-blue-100 text-blue-800 border-blue-200',
  delete_driver: 'bg-red-100 text-red-800 border-red-200',
  update_order_status: 'bg-orange-100 text-orange-800 border-orange-200',
  create_menu_item: 'bg-green-100 text-green-800 border-green-200',
  update_menu_item: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  delete_menu_item: 'bg-red-100 text-red-800 border-red-200',
  create_category: 'bg-green-100 text-green-800 border-green-200',
  update_category: 'bg-blue-100 text-blue-800 border-blue-200',
  delete_category: 'bg-red-100 text-red-800 border-red-200',
  login: 'bg-teal-100 text-teal-800 border-teal-200',
  logout: 'bg-gray-100 text-gray-700 border-gray-200',
};

const ENTITY_ICONS: Record<string, any> = {
  order: Package,
  driver: Truck,
  sub_admin: Shield,
  menu_item: Tag,
  category: Tag,
  auth: User,
};

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getAdminTypeBadge(type: string) {
  if (type === 'admin') return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">مدير رئيسي</Badge>;
  return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">مشرف فرعي</Badge>;
}

export default function AdminActivityLogs() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');

  const { data, isLoading, refetch } = useQuery<{ logs: ActivityLog[]; total: number }>({
    queryKey: ['/api/admin/activity-logs'],
    refetchInterval: 30_000,
  });

  const logs = data?.logs || [];

  const filteredLogs = logs.filter(log => {
    if (entityFilter !== 'all' && log.entityType !== entityFilter) return false;
    if (adminFilter !== 'all' && log.adminId !== adminFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        log.adminName.toLowerCase().includes(s) ||
        log.actionLabel.includes(s) ||
        log.details.toLowerCase().includes(s) ||
        log.entityLabel.includes(s)
      );
    }
    return true;
  });

  const uniqueAdmins = [...new Map(logs.map(l => [l.adminId, { id: l.adminId, name: l.adminName }])).values()];

  const stats = {
    total: logs.length,
    today: logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length,
    admins: new Set(logs.map(l => l.adminId)).size,
    orders: logs.filter(l => l.entityType === 'order').length,
  };

  const handleExportCSV = () => {
    const rows = [
      ['التاريخ والوقت', 'المسؤول', 'النوع', 'الإجراء', 'الكيان', 'التفاصيل', 'IP'],
      ...filteredLogs.map(l => [
        formatDateTime(l.createdAt),
        l.adminName,
        l.adminType === 'admin' ? 'مدير رئيسي' : 'مشرف فرعي',
        l.actionLabel,
        l.entityLabel,
        l.details,
        l.ipAddress || '',
      ]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-red-500" />
            سجل أنشطة المسؤولين
          </h1>
          <p className="text-gray-500 mt-1">تتبع جميع الإجراءات التي يقوم بها المديرون والمشرفون بالتفصيل</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            تحديث
          </Button>
          <Button size="sm" onClick={handleExportCSV} className="gap-2 bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأنشطة', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'أنشطة اليوم', value: stats.today, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'عدد المسؤولين النشطين', value: stats.admins, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'تحديثات الطلبات', value: stats.orders, icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.bg} p-2.5 rounded-xl`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* فلاتر البحث */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ابحث بالاسم أو الإجراء أو التفاصيل..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="نوع الكيان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="order">الطلبات</SelectItem>
                <SelectItem value="driver">السائقون</SelectItem>
                <SelectItem value="sub_admin">المشرفون الفرعيون</SelectItem>
                <SelectItem value="menu_item">المنتجات</SelectItem>
                <SelectItem value="category">التصنيفات</SelectItem>
                <SelectItem value="auth">تسجيل الدخول</SelectItem>
              </SelectContent>
            </Select>
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="المسؤول" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المسؤولين</SelectItem>
                {uniqueAdmins.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || entityFilter !== 'all' || adminFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setEntityFilter('all'); setAdminFilter('all'); }}>
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* جدول السجلات */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            السجلات ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin ml-2" />
              جاري تحميل السجلات...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد سجلات أنشطة حتى الآن</p>
              <p className="text-sm mt-1">ستظهر هنا أنشطة المديرين والمشرفين بمجرد تنفيذها</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                    <TableHead className="text-right">المسؤول</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                    <TableHead className="text-right">الكيان</TableHead>
                    <TableHead className="text-right">التفاصيل</TableHead>
                    <TableHead className="text-right">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => {
                    const EntityIcon = ENTITY_ICONS[log.entityType] || Activity;
                    return (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatDateTime(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm text-gray-900">{log.adminName}</div>
                            {getAdminTypeBadge(log.adminType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs font-semibold border ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                          >
                            {log.actionLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <EntityIcon className="w-3.5 h-3.5 text-gray-400" />
                            {log.entityLabel}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{log.details || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-400 font-mono">{log.ipAddress || '—'}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

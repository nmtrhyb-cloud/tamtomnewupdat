import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Package, Save, X, Search, Tag, Store } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { MenuItem, Restaurant, Category } from '@shared/schema';

const UNIT_OPTIONS = [
  { value: 'كجم', label: 'كيلوغرام (كجم)' },
  { value: 'غرام', label: 'غرام' },
  { value: 'رطل', label: 'رطل' },
  { value: 'قطعة', label: 'قطعة' },
  { value: 'حزمة', label: 'حزمة' },
  { value: 'علبة', label: 'علبة / صندوق' },
  { value: 'كرتون', label: 'كرتون' },
  { value: 'لتر', label: 'لتر' },
  { value: 'دزينة', label: 'دزينة' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  image: '',
  category: '',
  unit: 'كجم',
  isAvailable: true,
  isSpecialOffer: false,
  restaurantId: '',
  brand: '',
  sizes: '',
  colors: '',
  salesCount: '0',
  rating: '5',
  isFeatured: false,
  isNew: true,
};

export default function AdminMenuItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/categories');
      return res.json();
    },
  });

  const activeCategories = categoriesData.filter((c: Category) => c.isActive);

  const { data: restaurantsData } = useQuery<{ restaurants: Restaurant[] }>({
    queryKey: ['/api/admin/restaurants'],
  });

  const restaurants = restaurantsData?.restaurants || [];

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/admin/menu-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/menu-items');
      if (!response.ok) throw new Error('فشل في جلب المنتجات');
      return response.json();
    },
  });

  const buildSubmitData = (data: typeof formData) => {
    const price = parseFloat(data.price);
    if (isNaN(price) || price <= 0) throw new Error('سعر المنتج يجب أن يكون رقماً أكبر من صفر');

    let originalPrice: string | null = null;
    if (data.originalPrice?.trim()) {
      const op = parseFloat(data.originalPrice);
      if (isNaN(op) || op <= 0) throw new Error('السعر الأصلي يجب أن يكون رقماً أكبر من صفر');
      originalPrice = op.toString();
    }

    return {
      ...data,
      name: data.name.trim(),
      description: data.description.trim(),
      image: data.image.trim(),
      category: data.category.trim(),
      unit: data.unit?.trim() || 'كجم',
      price: price.toString(),
      originalPrice,
      brand: data.brand.trim() || '',
      sizes: data.sizes.trim(),
      colors: data.colors.trim(),
      salesCount: parseInt(data.salesCount) || 0,
      rating: parseFloat(data.rating) || 5,
      restaurantId: data.restaurantId || null,
    };
  };

  const createMenuItemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.name.trim()) throw new Error('اسم المنتج مطلوب');
      if (!data.price.trim()) throw new Error('سعر المنتج مطلوب');
      if (!data.image.trim()) throw new Error('صورة المنتج مطلوبة');
      if (!data.category.trim()) throw new Error('التصنيف مطلوب');
      const submitData = buildSubmitData(data);
      const response = await apiRequest('POST', '/api/admin/menu-items', submitData);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'فشل في إضافة المنتج');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({ title: 'تم إضافة المنتج', description: 'تم إضافة المنتج الجديد بنجاح' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'خطأ في إضافة المنتج', description: error.message });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      if (!data.name.trim()) throw new Error('اسم المنتج مطلوب');
      if (!data.price.trim()) throw new Error('سعر المنتج مطلوب');
      if (!data.image.trim()) throw new Error('صورة المنتج مطلوبة');
      if (!data.category.trim()) throw new Error('التصنيف مطلوب');
      const submitData = buildSubmitData(data);
      const response = await apiRequest('PUT', `/api/admin/menu-items/${id}`, submitData);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'فشل في تحديث المنتج');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({ title: 'تم تحديث المنتج', description: 'تم تحديث المنتج بنجاح' });
      resetForm();
      setEditingItem(null);
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'خطأ في تحديث المنتج', description: error.message });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/menu-items/${id}`);
      if (!response.ok) throw new Error('فشل في حذف المنتج');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/menu-items'] });
      toast({ title: 'تم حذف المنتج', description: 'تم حذف المنتج بنجاح' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'خطأ في الحذف', description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      originalPrice: item.originalPrice?.toString() || '',
      image: item.image || '',
      category: item.category || '',
      unit: item.unit || 'كجم',
      isAvailable: item.isAvailable ?? true,
      isSpecialOffer: item.isSpecialOffer ?? false,
      restaurantId: item.restaurantId || '',
      brand: item.brand || '',
      sizes: item.sizes || '',
      colors: item.colors || '',
      salesCount: item.salesCount?.toString() || '0',
      rating: item.rating?.toString() || '5',
      isFeatured: item.isFeatured ?? false,
      isNew: item.isNew ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMenuItemMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMenuItemMutation.mutate(formData);
    }
  };

  const toggleItemStatus = (item: any, field: 'isAvailable' | 'isSpecialOffer' | 'isFeatured' | 'isNew') => {
    updateMenuItemMutation.mutate({
      id: item.id,
      data: {
        name: item.name,
        description: item.description || '',
        price: item.price || '',
        originalPrice: item.originalPrice || '',
        image: item.image,
        category: item.category || '',
        unit: item.unit || 'كجم',
        isAvailable: field === 'isAvailable' ? !item[field] : item.isAvailable,
        isSpecialOffer: field === 'isSpecialOffer' ? !item[field] : item.isSpecialOffer,
        isFeatured: field === 'isFeatured' ? !item[field] : (item.isFeatured ?? false),
        isNew: field === 'isNew' ? !item[field] : (item.isNew ?? true),
        restaurantId: item.restaurantId || '',
        brand: item.brand || '',
        sizes: item.sizes || '',
        colors: item.colors || '',
        salesCount: item.salesCount?.toString() || '0',
        rating: item.rating?.toString() || '5',
      },
    });
  };

  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const getCategoryName = (catValue: string) => {
    const found = activeCategories.find((c) => c.name === catValue);
    return found?.name || catValue;
  };

  const getRestaurantName = (id: string) => restaurants.find((r) => r.id === id)?.name || '';

  const filteredMenuItems = menuItems?.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isPending = createMenuItemMutation.isPending || updateMenuItemMutation.isPending;

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Package className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">إدارة المنتجات</h1>
              <p className="text-sm text-muted-foreground">إضافة وتعديل المنتجات حسب التصنيف</p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            data-testid="button-add-menu-item"
          >
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        </div>
      </div>

      {/* ───── نافذة الإضافة / التعديل ───── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* اسم المنتج */}
            <div>
              <Label htmlFor="name">اسم المنتج *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="أدخل اسم المنتج"
                required
              />
            </div>

            {/* الوصف */}
            <div>
              <Label htmlFor="description">وصف المنتج</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="وصف المنتج"
                rows={2}
              />
            </div>

            {/* صورة المنتج */}
            <div>
              <ImageUpload
                label="صورة المنتج *"
                value={formData.image}
                onChange={(url) => setFormData((p) => ({ ...p, image: url }))}
                bucket="menu-items"
                required={true}
              />
            </div>

            {/* التصنيف والسعر والوحدة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* التصنيف — مرتبط بجدول categories */}
              <div>
                <Label htmlFor="category" className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  التصنيف *
                </Label>
                {activeCategories.length > 0 ? (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((p) => ({ ...p, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    placeholder="أدخل اسم التصنيف"
                    required
                  />
                )}
              </div>

              {/* السعر */}
              <div>
                <Label htmlFor="price">السعر (ريال) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* وحدة القياس */}
              <div>
                <Label htmlFor="unit">وحدة القياس</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData((p) => ({ ...p, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* المتجر — اختياري */}
            <div>
              <Label htmlFor="restaurantId" className="flex items-center gap-1">
                <Store className="h-4 w-4" />
                المتجر (اختياري)
              </Label>
              <Select
                value={formData.restaurantId || 'none'}
                onValueChange={(value) =>
                  setFormData((p) => ({ ...p, restaurantId: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون متجر محدد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون متجر محدد</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                المنتج سيظهر في التصنيف المختار بغض النظر عن المتجر
              </p>
            </div>

            {/* السعر الأصلي، المبيعات، التقييم */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="originalPrice">السعر الأصلي (قبل الخصم)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData((p) => ({ ...p, originalPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="salesCount">عدد المبيعات</Label>
                <Input
                  id="salesCount"
                  type="number"
                  min="0"
                  value={formData.salesCount}
                  onChange={(e) => setFormData((p) => ({ ...p, salesCount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="rating">التقييم (1-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData((p) => ({ ...p, rating: e.target.value }))}
                />
              </div>
            </div>

            {/* الحالات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'isAvailable', label: 'متوفر' },
                { key: 'isSpecialOffer', label: 'عرض خاص' },
                { key: 'isFeatured', label: 'مميز' },
                { key: 'isNew', label: 'جديد' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <Switch
                    id={key}
                    checked={formData[key as keyof typeof formData] as boolean}
                    onCheckedChange={(checked) => setFormData((p) => ({ ...p, [key]: checked }))}
                  />
                </div>
              ))}
            </div>

            {/* أزرار */}
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isPending}
                data-testid="button-save-menu-item"
              >
                <Save className="h-4 w-4" />
                {isPending ? 'جاري الحفظ...' : editingItem ? 'تحديث' : 'إضافة'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); setIsDialogOpen(false); }}
                data-testid="button-cancel-menu-item"
              >
                <X className="h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───── شريط البحث والفلترة ───── */}
      <Card className="m-4">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المنتجات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="جميع التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {activeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ───── قائمة المنتجات ───── */}
      <div className="px-4 pb-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : filteredMenuItems?.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد منتجات</p>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              إضافة أول منتج
            </Button>
          </div>
        ) : (
          filteredMenuItems?.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {item.category && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {getCategoryName(item.category)}
                            </span>
                          )}
                          {item.restaurantId && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Store className="h-3 w-3" />
                              {getRestaurantName(item.restaurantId)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-primary">{parseDecimal(item.price).toFixed(2)} ريال</div>
                        {item.originalPrice && parseDecimal(item.originalPrice) > 0 && (
                          <div className="text-xs text-muted-foreground line-through">
                            {parseDecimal(item.originalPrice).toFixed(2)} ريال
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleItemStatus(item, 'isAvailable')}
                          className="scale-75"
                        />
                        <span className="text-xs">{item.isAvailable ? 'متوفر' : 'غير متوفر'}</span>
                      </div>
                      {item.isSpecialOffer && <Badge variant="secondary" className="text-xs">عرض خاص</Badge>}
                      {item.isFeatured && <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">مميز</Badge>}
                      {item.isNew && <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">جديد</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      data-testid={`button-edit-menu-item-${item.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف المنتج</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف منتج "{item.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMenuItemMutation.mutate(item.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

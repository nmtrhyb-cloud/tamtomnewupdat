import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, Trash2, Percent, Save, X, Calendar, DollarSign, Store, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { SpecialOffer, Restaurant, Category } from '@shared/schema';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const EMPTY_FORM = {
  title: '',
  description: '',
  image: '',
  discountPercent: '',
  discountAmount: '',
  minimumOrder: '',
  validUntil: '',
  isActive: true,
  categoryId: '',
  restaurantId: '',
};

export default function AdminOffers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const { data: offers, isLoading } = useQuery<SpecialOffer[]>({
    queryKey: ['/api/admin/special-offers'],
  });

  const { data: restaurantsResponse } = useQuery<{ restaurants: Restaurant[] }>({
    queryKey: ['/api/admin/restaurants'],
  });
  const restaurants = restaurantsResponse?.restaurants || [];

  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  const activeCategories = categoriesData.filter((c) => c.isActive);

  // ─── Mutations ───────────────────────────────────────────
  const buildPayload = (data: typeof formData) => ({
    ...data,
    discountPercent: data.discountPercent ? parseInt(data.discountPercent) : null,
    discountAmount: data.discountAmount ? parseFloat(data.discountAmount) : null,
    minimumOrder: data.minimumOrder ? parseFloat(data.minimumOrder) : null,
    validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
    restaurantId: data.restaurantId || null,
    categoryId: data.categoryId || null,
  });

  const createOfferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/special-offers', buildPayload(data));
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.details?.join?.(', ') || 'فشل إنشاء العرض');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      toast({ title: 'تم إنشاء العرض', description: 'تم إضافة العرض الجديد بنجاح' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: 'خطأ في إضافة العرض',
        description: err?.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    },
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await apiRequest('PUT', `/api/admin/special-offers/${id}`, buildPayload(data));
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.details?.join?.(', ') || 'فشل تحديث العرض');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      toast({ title: 'تم تحديث العرض' });
      resetForm();
      setEditingOffer(null);
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: 'خطأ في تحديث العرض',
        description: err?.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/special-offers/${id}`);
      if (!response.ok) throw new Error('فشل حذف العرض');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      toast({ title: 'تم حذف العرض' });
    },
    onError: (err: any) => {
      toast({ title: 'خطأ في الحذف', description: err?.message, variant: 'destructive' });
    },
  });

  // ─── Helpers ─────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingOffer(null);
  };

  const handleEdit = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      image: offer.image,
      discountPercent: offer.discountPercent?.toString() || '',
      discountAmount: offer.discountAmount || '',
      minimumOrder: offer.minimumOrder || '',
      validUntil: offer.validUntil
        ? new Date(offer.validUntil).toISOString().slice(0, 16)
        : '',
      isActive: offer.isActive,
      categoryId: offer.categoryId || '',
      restaurantId: offer.restaurantId || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'خطأ', description: 'يرجى إدخال عنوان ووصف العرض', variant: 'destructive',
      });
      return;
    }
    if (!formData.image.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إضافة صورة للعرض', variant: 'destructive' });
      return;
    }
    if (editingOffer) {
      updateOfferMutation.mutate({ id: editingOffer.id, data: formData });
    } else {
      createOfferMutation.mutate(formData);
    }
  };

  const toggleOfferStatus = (offer: SpecialOffer) => {
    updateOfferMutation.mutate({
      id: offer.id,
      data: {
        title: offer.title,
        description: offer.description,
        image: offer.image,
        discountPercent: offer.discountPercent?.toString() || '',
        discountAmount: offer.discountAmount || '',
        minimumOrder: offer.minimumOrder || '',
        validUntil: offer.validUntil
          ? new Date(offer.validUntil).toISOString().slice(0, 16)
          : '',
        isActive: !offer.isActive,
        categoryId: offer.categoryId || '',
        restaurantId: offer.restaurantId || '',
      },
    });
  };

  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  };

  const getCategoryName = (id?: string | null) =>
    activeCategories.find((c) => c.id === id)?.name || null;

  const getRestaurantName = (id?: string | null) =>
    restaurants.find((r) => r.id === id)?.name || null;

  const isPending = createOfferMutation.isPending || updateOfferMutation.isPending;

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Percent className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">إدارة العروض الخاصة</h1>
              <p className="text-sm text-muted-foreground">إنشاء وإدارة العروض والخصومات</p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            data-testid="button-add-offer"
          >
            <Plus className="h-4 w-4" />
            إضافة عرض جديد
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ─── Dialog ─── */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger className="hidden" />
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* العنوان */}
              <div>
                <Label htmlFor="title">عنوان العرض *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="مثال: خصم 30% على جميع المنتجات"
                  required
                  data-testid="input-offer-title"
                />
              </div>

              {/* الوصف */}
              <div>
                <Label htmlFor="description">وصف العرض *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="تفاصيل العرض وشروطه"
                  rows={3}
                  required
                  data-testid="input-offer-description"
                />
              </div>

              {/* ─── نطاق العرض ─── */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-primary">نطاق العرض (اختياري)</p>

                {/* التصنيف — الأولوية */}
                <div>
                  <Label htmlFor="categoryId" className="flex items-center gap-1 mb-1">
                    <Tag className="h-4 w-4 text-primary" />
                    ربط بتصنيف
                  </Label>
                  <Select
                    value={formData.categoryId || 'none'}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, categoryId: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="— بدون تصنيف (عرض عام) —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون تصنيف (عرض عام) —</SelectItem>
                      {activeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    إذا لم تختر تصنيفاً، سيُوضع العرض في تصنيف "العروض" تلقائياً.
                  </p>
                </div>

                {/* المتجر — ثانوي اختياري */}
                <div>
                  <Label htmlFor="restaurantId" className="flex items-center gap-1 mb-1">
                    <Store className="h-4 w-4 text-blue-500" />
                    ربط بمتجر (اختياري)
                  </Label>
                  <Select
                    value={formData.restaurantId || 'none'}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, restaurantId: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger id="restaurantId">
                      <SelectValue placeholder="— بدون متجر (عرض عام) —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون متجر (عرض عام) —</SelectItem>
                      {restaurants.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* الصورة */}
              <div>
                <Label htmlFor="image">رابط صورة العرض *</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData((p) => ({ ...p, image: e.target.value }))}
                    placeholder="https://example.com/offer-image.jpg"
                    required
                    data-testid="input-offer-image"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('offer-file-upload')?.click()}
                  >
                    اختيار صورة
                  </Button>
                  <input
                    id="offer-file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) =>
                          setFormData((p) => ({ ...p, image: ev.target?.result as string }));
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              {/* الخصم */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountPercent">نسبة الخصم (%)</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, discountPercent: e.target.value, discountAmount: '' }))
                    }
                    placeholder="مثال: 20"
                    data-testid="input-offer-discount-percent"
                  />
                </div>
                <div>
                  <Label htmlFor="discountAmount">مبلغ الخصم (ريال)</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountAmount}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, discountAmount: e.target.value, discountPercent: '' }))
                    }
                    placeholder="مثال: 15"
                    data-testid="input-offer-discount-amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال)</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumOrder}
                    onChange={(e) => setFormData((p) => ({ ...p, minimumOrder: e.target.value }))}
                    data-testid="input-offer-minimum-order"
                  />
                </div>
                <div>
                  <Label htmlFor="validUntil">صالح حتى</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) => setFormData((p) => ({ ...p, validUntil: e.target.value }))}
                    data-testid="input-offer-valid-until"
                  />
                </div>
              </div>

              {/* النشاط */}
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">العرض نشط</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))}
                />
              </div>

              {/* أزرار */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isPending}
                  data-testid="button-save-offer"
                >
                  <Save className="h-4 w-4" />
                  {isPending ? 'جاري الحفظ...' : editingOffer ? 'تحديث' : 'إضافة'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { resetForm(); setIsDialogOpen(false); }}
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── Offers Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-48 bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : offers?.length ? (
            offers.map((offer) => {
              const catName = getCategoryName(offer.categoryId);
              const storeName = getRestaurantName(offer.restaurantId);
              return (
                <Card key={offer.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    {offer.image ? (
                      <img
                        src={offer.image}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Percent className="h-16 w-16 text-primary/50" />
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-2 truncate">{offer.title}</CardTitle>
                        <p className="text-xs text-muted-foreground line-clamp-2">{offer.description}</p>
                      </div>
                      <Badge variant={offer.isActive ? 'default' : 'outline'} className="flex-shrink-0">
                        {offer.isActive ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4" dir="rtl">
                    {/* الارتباط */}
                    <div className="flex flex-wrap gap-1">
                      {catName && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Tag className="h-3 w-3" />
                          {catName}
                        </Badge>
                      )}
                      {storeName && (
                        <Badge variant="outline" className="gap-1 text-xs text-blue-700">
                          <Store className="h-3 w-3" />
                          {storeName}
                        </Badge>
                      )}
                      {!catName && !storeName && (
                        <Badge variant="secondary" className="text-xs">عرض عام</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {offer.discountPercent && (
                        <div className="flex items-center gap-1">
                          <Percent className="h-4 w-4 text-green-500" />
                          <span>{offer.discountPercent}% خصم</span>
                        </div>
                      )}
                      {offer.discountAmount && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span>{parseDecimal(offer.discountAmount)} ريال خصم</span>
                        </div>
                      )}
                      {offer.minimumOrder && parseDecimal(offer.minimumOrder) > 0 && (
                        <div className="text-xs text-muted-foreground col-span-2">
                          أقل طلب: {parseDecimal(offer.minimumOrder)} ريال
                        </div>
                      )}
                      {offer.validUntil && (
                        <div className="flex items-center gap-1 col-span-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">
                            {new Date(offer.validUntil).toLocaleDateString('ar-YE')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">تفعيل العرض</span>
                      <Switch
                        checked={offer.isActive}
                        onCheckedChange={() => toggleOfferStatus(offer)}
                        data-testid={`switch-offer-active-${offer.id}`}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleEdit(offer)}
                        data-testid={`button-edit-offer-${offer.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-offer-${offer.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف العرض</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteOfferMutation.mutate(offer.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-16 text-center">
              <Percent className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">لا توجد عروض بعد</h3>
              <p className="text-sm text-muted-foreground">
                أضف أول عرض خاص للعملاء بالضغط على "إضافة عرض جديد"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

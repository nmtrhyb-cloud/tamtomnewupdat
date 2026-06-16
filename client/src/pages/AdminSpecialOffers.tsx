import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Edit, Trash2, Save, X, Percent, Tag, Store } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { SpecialOffer, Restaurant, Category } from '@shared/schema';

type DiscountType = 'percent' | 'amount' | 'none';

const EMPTY_FORM = {
  title: '',
  description: '',
  image: '',
  discountType: 'percent' as DiscountType,
  discountPercent: '',
  discountAmount: '',
  minimumOrder: '',
  validUntil: '',
  showBadge: true,
  badgeText1: 'طازج يومياً',
  badgeText2: 'عروض حصرية',
  isActive: true,
  restaurantId: '',
  categoryId: '',
};

export function AdminSpecialOffers() {
  const [, setLocation] = useLocation();
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // العروض الحالية
  const { data: offers, isLoading } = useQuery<any[]>({
    queryKey: ['/api/special-offers'],
  });

  // قائمة التصنيفات الرئيسية
  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      if (!res.ok) return [];
      return res.json();
    },
  });
  const activeCategories = categoriesData.filter((c) => c.isActive);

  // قائمة المتاجر (اختيارية)
  const { data: restaurantsResp } = useQuery<{ restaurants: Restaurant[] } | Restaurant[]>({
    queryKey: ['/api/admin/restaurants'],
  });
  const restaurants: Restaurant[] = Array.isArray(restaurantsResp)
    ? (restaurantsResp as Restaurant[])
    : (restaurantsResp?.restaurants || []);

  // إنشاء عرض
  const createOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/special-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || err?.details?.join?.(', ') || 'فشل في إنشاء العرض');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      setShowAddForm(false);
      resetForm();
      toast({ title: 'تم إنشاء العرض بنجاح' });
    },
    onError: (err: any) => {
      toast({ title: 'فشل في إنشاء العرض', description: err?.message, variant: 'destructive' });
    },
  });

  // تحديث عرض
  const updateOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/special-offers/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || err?.details?.join?.(', ') || 'فشل في تحديث العرض');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      setEditingOffer(null);
      setShowAddForm(false);
      resetForm();
      toast({ title: 'تم تحديث العرض بنجاح' });
    },
    onError: (err: any) => {
      toast({ title: 'فشل في تحديث العرض', description: err?.message, variant: 'destructive' });
    },
  });

  // حذف عرض
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/special-offers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('فشل في حذف العرض');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      toast({ title: 'تم حذف العرض بنجاح' });
    },
    onError: () => {
      toast({ title: 'فشل في حذف العرض', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingOffer(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({ title: 'يرجى إدخال عنوان العرض', variant: 'destructive' });
      return;
    }
    if (!formData.description.trim()) {
      toast({ title: 'يرجى إدخال وصف العرض', variant: 'destructive' });
      return;
    }

    const dataToSubmit: any = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      image: formData.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
      discountPercent:
        formData.discountType === 'percent' && formData.discountPercent
          ? parseInt(formData.discountPercent)
          : null,
      discountAmount:
        formData.discountType === 'amount' && formData.discountAmount
          ? parseFloat(formData.discountAmount)
          : null,
      minimumOrder: formData.minimumOrder ? parseFloat(formData.minimumOrder) : 0,
      validUntil: formData.validUntil ? new Date(formData.validUntil) : null,
      showBadge: formData.showBadge,
      badgeText1: formData.badgeText1,
      badgeText2: formData.badgeText2,
      isActive: formData.isActive,
      restaurantId: formData.restaurantId || null,
      categoryId: formData.categoryId || null,
    };

    if (editingOffer) {
      updateOfferMutation.mutate({ ...dataToSubmit, id: editingOffer.id });
    } else {
      createOfferMutation.mutate(dataToSubmit);
    }
  };

  const startEdit = (offer: any) => {
    setEditingOffer(offer);
    const discountType: DiscountType = offer.discountPercent
      ? 'percent'
      : offer.discountAmount
      ? 'amount'
      : 'none';
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      image: offer.image || '',
      discountType,
      discountPercent: offer.discountPercent?.toString() || '',
      discountAmount: offer.discountAmount?.toString() || '',
      minimumOrder: offer.minimumOrder?.toString() || '',
      validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 16) : '',
      showBadge: offer.showBadge ?? true,
      badgeText1: offer.badgeText1 || 'طازج يومياً',
      badgeText2: offer.badgeText2 || 'عروض حصرية',
      isActive: offer.isActive ?? true,
      restaurantId: offer.restaurantId || '',
      categoryId: offer.categoryId || '',
    });
    setShowAddForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingOffer(null);
    setShowAddForm(false);
    resetForm();
  };

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });

  const getDiscountText = (offer: any) => {
    if (offer.discountPercent) return `${offer.discountPercent}%`;
    if (offer.discountAmount) return `${offer.discountAmount} ريال`;
    return 'عرض ترويجي';
  };

  const getOfferStatus = (offer: any) => {
    if (!offer.isActive) return { text: 'غير نشط', color: 'bg-gray-100 text-gray-700' };
    const now = new Date();
    const validUntil = offer.validUntil ? new Date(offer.validUntil) : null;
    if (validUntil && now > validUntil)
      return { text: 'منتهي الصلاحية', color: 'bg-red-100 text-red-700' };
    return { text: 'نشط', color: 'bg-green-100 text-green-700' };
  };

  const getRestaurantName = (id?: string | null) => {
    if (!id) return null;
    return restaurants.find((r) => r.id === id)?.name || null;
  };

  const getCategoryName = (id?: string | null) => {
    if (!id) return null;
    return activeCategories.find((c) => c.id === id)?.name || null;
  };

  const isPending = createOfferMutation.isPending || updateOfferMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إدارة العروض الخاصة</h1>
            <p className="text-muted-foreground">إنشاء وإدارة عروض الخصم — مرتبطة بتصنيف أو عامة</p>
          </div>
        </div>

        <Button
          onClick={() => {
            setShowAddForm(true);
            setEditingOffer(null);
            resetForm();
          }}
          className="gap-2"
          data-testid="button-add-offer"
        >
          <Plus className="h-4 w-4" />
          إضافة عرض جديد
        </Button>
      </div>

      {/* ───── فورم الإضافة / التعديل ───── */}
      {(showAddForm || editingOffer) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">

              {/* العنوان والوصف */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">عنوان العرض *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: خصم 20% على جميع الطلبات"
                    required
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <ImageUpload
                    label="صورة العرض (اختياري)"
                    value={formData.image}
                    onChange={(url) => setFormData({ ...formData, image: url })}
                    bucket="offers"
                    required={false}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">وصف العرض *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف تفصيلي للعرض"
                  rows={3}
                  required
                />
              </div>

              {/* ───── التصنيف والمتجر ───── */}
              <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground">نطاق العرض (اختياري)</p>

                {/* التصنيف — الأولوية */}
                <div>
                  <Label className="flex items-center gap-1">
                    <Tag className="h-4 w-4 text-primary" />
                    ربط بتصنيف (اختياري)
                  </Label>
                  <Select
                    value={formData.categoryId || 'none'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, categoryId: v === 'none' ? '' : v })
                    }
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="بدون تصنيف محدد (عام)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون تصنيف (عرض عام) —</SelectItem>
                      {activeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    إذا لم تختر تصنيفاً، سيُوضع العرض في تصنيف "العروض" تلقائياً.
                  </p>
                </div>

                {/* المتجر — ثانوي */}
                <div>
                  <Label className="flex items-center gap-1">
                    <Store className="h-4 w-4 text-blue-500" />
                    ربط بمتجر (اختياري)
                  </Label>
                  <Select
                    value={formData.restaurantId || 'none'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, restaurantId: v === 'none' ? '' : v })
                    }
                  >
                    <SelectTrigger data-testid="select-restaurant">
                      <SelectValue placeholder="بدون متجر محدد" />
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

              {/* نوع الخصم */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>نوع الخصم</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(v: DiscountType) =>
                      setFormData({
                        ...formData,
                        discountType: v,
                        discountPercent: v === 'percent' ? formData.discountPercent : '',
                        discountAmount: v === 'amount' ? formData.discountAmount : '',
                      })
                    }
                  >
                    <SelectTrigger data-testid="select-discount-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">نسبة مئوية (%)</SelectItem>
                      <SelectItem value="amount">مبلغ محدد (ريال)</SelectItem>
                      <SelectItem value="none">بدون خصم (عرض ترويجي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.discountType === 'percent' && (
                  <div>
                    <Label htmlFor="discountPercent">نسبة الخصم (%)</Label>
                    <Input
                      id="discountPercent"
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                      placeholder="20"
                      data-testid="input-discount-percent"
                    />
                  </div>
                )}

                {formData.discountType === 'amount' && (
                  <div>
                    <Label htmlFor="discountAmount">مبلغ الخصم (ريال)</Label>
                    <Input
                      id="discountAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                      placeholder="50"
                      data-testid="input-discount-amount"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال)</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minimumOrder}
                    onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value })}
                    placeholder="100"
                  />
                </div>
              </div>

              {/* تاريخ الانتهاء */}
              <div>
                <Label htmlFor="validUntil">تاريخ الانتهاء (اختياري)</Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>

              {/* الملصقات */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/20">
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="showBadge"
                    checked={formData.showBadge}
                    onCheckedChange={(checked) => setFormData({ ...formData, showBadge: checked })}
                  />
                  <Label htmlFor="showBadge">إظهار الملصقات</Label>
                </div>
                <div>
                  <Label htmlFor="badgeText1">نص الملصق 1</Label>
                  <Input
                    id="badgeText1"
                    value={formData.badgeText1}
                    onChange={(e) => setFormData({ ...formData, badgeText1: e.target.value })}
                    placeholder="طازج يومياً"
                    disabled={!formData.showBadge}
                  />
                </div>
                <div>
                  <Label htmlFor="badgeText2">نص الملصق 2</Label>
                  <Input
                    id="badgeText2"
                    value={formData.badgeText2}
                    onChange={(e) => setFormData({ ...formData, badgeText2: e.target.value })}
                    placeholder="عروض حصرية"
                    disabled={!formData.showBadge}
                  />
                </div>
              </div>

              {/* حالة النشر */}
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">نشط (ظهور العرض للعملاء)</Label>
              </div>

              {/* أزرار */}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="gap-2"
                  data-testid="button-save-offer"
                >
                  <Save className="h-4 w-4" />
                  {isPending ? 'جاري الحفظ...' : editingOffer ? 'تحديث' : 'حفظ'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} className="gap-2">
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ───── قائمة العروض ───── */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !offers?.length ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              لا توجد عروض خاصة. أضف أول عرض بالضغط على "إضافة عرض جديد".
            </CardContent>
          </Card>
        ) : (
          offers.map((offer) => {
            const status = getOfferStatus(offer);
            const restaurantName = getRestaurantName(offer.restaurantId);
            const categoryName = getCategoryName(offer.categoryId);

            return (
              <Card key={offer.id}>
                <CardContent className="p-6" dir="rtl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1 min-w-0">
                      {offer.image && (
                        <img
                          src={offer.image}
                          alt={offer.title}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{offer.title}</h3>
                          <Badge className={status.color}>{status.text}</Badge>
                          <Badge variant="outline" className="gap-1">
                            <Percent className="h-3 w-3" />
                            {getDiscountText(offer)}
                          </Badge>
                          {categoryName && (
                            <Badge variant="secondary" className="gap-1">
                              <Tag className="h-3 w-3" />
                              {categoryName}
                            </Badge>
                          )}
                          {restaurantName && (
                            <Badge variant="outline" className="gap-1 text-blue-700">
                              <Store className="h-3 w-3" />
                              {restaurantName}
                            </Badge>
                          )}
                          {!categoryName && !restaurantName && (
                            <Badge variant="secondary">عرض عام</Badge>
                          )}
                        </div>

                        {offer.description && (
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{offer.description}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="font-medium text-muted-foreground">الحد الأدنى</p>
                            <p>{offer.minimumOrder ? `${offer.minimumOrder} ريال` : 'بدون حد أدنى'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">صالح حتى</p>
                            <p>{offer.validUntil ? formatDate(offer.validUntil) : 'غير محدد'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">تاريخ الإنشاء</p>
                            <p>{formatDate(offer.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(offer)}
                        className="gap-1"
                        data-testid={`button-edit-${offer.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من حذف هذا العرض؟')) {
                            deleteOfferMutation.mutate(offer.id);
                          }
                        }}
                        className="gap-1 text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${offer.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AdminSpecialOffers;

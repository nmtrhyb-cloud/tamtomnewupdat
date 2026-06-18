import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Star, Heart, Plus, ShoppingCart, Scale } from 'lucide-react';
import type { MenuItem } from '@shared/schema';
import { useCart } from '../context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface MenuItemCardProps {
  item: any;
  disabled?: boolean;
  disabledMessage?: string;
  restaurantId?: string;
  restaurantName?: string;
}

export default function MenuItemCard({ 
  item, 
  disabled = false, 
  disabledMessage, 
  restaurantId = 'unknown', 
  restaurantName = 'طمطوم'
}: MenuItemCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isOnline } = useNetworkStatus();

  const { data: favoriteStatus } = useQuery<{ isFavorite: boolean }>({
    queryKey: ['/api/favorites/check', user?.id, item.id],
    queryFn: async () => {
      if (!user?.id || item.isBannerOffer) return { isFavorite: false };
      const res = await fetch(`/api/favorites/check?userId=${user.id}&menuItemId=${item.id}`);
      if (!res.ok) return { isFavorite: false };
      return res.json();
    },
    enabled: !!user?.id && !item.isBannerOffer,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (item.isBannerOffer) return;
      if (!isAuthenticated) throw new Error('not_authenticated');
      if (!isOnline) throw new Error('no_connection');
      if (favoriteStatus?.isFavorite) {
        await apiRequest('DELETE', `/api/favorites?userId=${user?.id}&menuItemId=${item.id}`);
      } else {
        await apiRequest('POST', '/api/favorites', { userId: user?.id, menuItemId: item.id });
      }
    },
    onSuccess: () => {
      if (item.isBannerOffer) return;
      queryClient.invalidateQueries({ queryKey: ['/api/favorites/check', user?.id, item.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/favorites/products', user?.id] });
      toast({
        title: favoriteStatus?.isFavorite ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة",
        description: favoriteStatus?.isFavorite ? `تمت إزالة ${item.name}` : `تم إضافة ${item.name} إلى مفضلاتك`,
      });
    },
    onError: (error: any) => {
      if (error?.message === 'not_authenticated') {
        toast({ title: "يجب تسجيل الدخول", description: "يرجى إنشاء حساب لإضافة المنتجات إلى المفضلة", variant: "destructive" });
        return;
      }
      toast({ title: "خطأ في المفضلة", description: "حدث خطأ أثناء تحديث المفضلة", variant: "destructive" });
    },
  });

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isOnline) {
      toast({ title: "لا يوجد اتصال", description: "تحقق من اتصالك بالإنترنت", variant: "destructive" });
      return;
    }

    // عند الضغط على عرض banner نضيف المنتج المرتبط مباشرةً للسلة
    if (item.isBannerOffer) {
      if (item.menuItemId) {
        try {
          const res = await fetch(`/api/products/${item.menuItemId}`);
          if (res.ok) {
            const product = await res.json();
            if (product && product.id) {
              await addItem(product);
            } else {
              setLocation(`/product/${item.menuItemId}`);
            }
          } else {
            setLocation(`/product/${item.menuItemId}`);
          }
        } catch {
          setLocation(`/product/${item.menuItemId}`);
        }
      } else {
        // لا يوجد منتج مرتبط — نفتح صفحة العروض
        setLocation('/category/العروض');
      }
      return;
    }

    if (disabled && disabledMessage) {
      toast({ title: "لا يمكن الطلب", description: disabledMessage, variant: "destructive" });
      return;
    }
    await addItem(item);
  };

  const handleClick = () => {
    if (item.isBannerOffer) {
      if (item.menuItemId) setLocation(`/product/${item.menuItemId}`);
    } else {
      setLocation(`/product/${item.id}`);
    }
  };

  // ← إصلاح: حساب السعر بأمان مع معالجة القيم غير الصالحة
  const rawPrice = parseFloat(String(item.price ?? '0'));
  const displayPrice = isNaN(rawPrice) ? 0 : rawPrice;
  const rawOriginalPrice = item.originalPrice ? parseFloat(String(item.originalPrice)) : null;
  const discountPercent = rawOriginalPrice && rawOriginalPrice > displayPrice && displayPrice > 0
    ? Math.round((1 - displayPrice / rawOriginalPrice) * 100)
    : 0;

  const isUnavailable = !item.isAvailable && !item.isBannerOffer;
  const unit = item.unit || 'كجم';

  return (
    <div 
      id={item.isBannerOffer ? `offer-${item.id}` : `product-${item.id}`}
      className={`group relative bg-white cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isUnavailable ? 'opacity-60' : ''}`}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
      onClick={handleClick}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-lime-50" style={{ aspectRatio: '1/1' }}>
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500"
          style={{ transform: 'scale(1)' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        />
        
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Badges top-right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {item.isBannerOffer && (
            <Badge className="bg-[#E53225] text-white border-none text-[9px] px-2 py-0.5 font-black rounded-lg shadow-md">
              🔥 عرض
            </Badge>
          )}
          {discountPercent > 0 && (
            <Badge className="bg-[#E53225] text-white border-none text-[9px] px-2 py-0.5 font-black rounded-lg shadow-md">
              -{discountPercent}%
            </Badge>
          )}
          {item.isNew && !item.isBannerOffer && (
            <Badge className="bg-[#5BB827] text-white border-none text-[9px] px-2 py-0.5 font-black rounded-lg shadow-md">
              جديد
            </Badge>
          )}
          {item.isFeatured && (
            <Badge className="bg-amber-500 text-white border-none text-[9px] px-2 py-0.5 font-black rounded-lg shadow-md">
              ⭐ مميز
            </Badge>
          )}
        </div>

        {/* Favorite button top-left */}
        {!item.isBannerOffer && (
          <button 
            className={`absolute top-2 left-2 p-1.5 rounded-full transition-all shadow-md ${
              favoriteStatus?.isFavorite 
                ? 'bg-red-50 text-[#E53225]' 
                : 'bg-white/80 text-gray-400 hover:text-[#E53225] hover:bg-red-50'
            }`}
            onClick={e => { e.stopPropagation(); toggleFavorite.mutate(); }}
          >
            <Heart className={`h-3.5 w-3.5 ${favoriteStatus?.isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Add to cart button - slides up on hover */}
        <div className="absolute bottom-2 left-2 right-2 translate-y-12 group-hover:translate-y-0 transition-transform duration-300">
          <Button
            className="w-full h-8 rounded-xl bg-[#E53225] hover:bg-[#c42b1f] text-white text-xs font-black shadow-lg gap-1.5"
            onClick={handleAddToCart}
            disabled={isUnavailable || disabled}
          >
            {item.isBannerOffer ? <ShoppingBag className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            {item.isBannerOffer ? 'أضف للسلة' : 'أضف للسلة'}
          </Button>
        </div>

        {/* Unavailable overlay */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-700 text-white text-xs font-black px-3 py-1 rounded-full">غير متوفر</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2.5">
        <h4 className="text-[12px] md:text-sm font-bold text-gray-800 line-clamp-2 mb-1 leading-tight group-hover:text-[#E53225] transition-colors">
          {item.name}
        </h4>

        {/* Unit badge */}
        {!item.isBannerOffer && (
          <div className="flex items-center gap-1 mb-1">
            <Scale className="h-2.5 w-2.5 text-[#5BB827]" />
            <span className="text-[9px] text-[#5BB827] font-bold bg-green-50 px-1.5 py-0.5 rounded-full">{unit}</span>
          </div>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1">
            {displayPrice > 0 ? (
              <>
                <span className="text-sm md:text-base font-black text-[#E53225] leading-none">
                  {displayPrice.toFixed(0)}
                </span>
                <span className="text-[9px] text-gray-500 font-bold">ريال</span>
                {rawOriginalPrice && rawOriginalPrice > displayPrice && (
                  <span className="text-[9px] text-gray-400 line-through">{rawOriginalPrice.toFixed(0)}</span>
                )}
              </>
            ) : (
              <span className="text-[10px] text-gray-400 font-bold">السعر غير محدد</span>
            )}
          </div>
          
          {/* Quick add circle button */}
          <button
            className="h-7 w-7 rounded-full bg-[#5BB827] hover:bg-[#4a9a20] text-white flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 shrink-0"
            onClick={handleAddToCart}
            disabled={isUnavailable || disabled}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Rating & Sales */}
        <div className="flex items-center gap-1 mt-1">
          <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[9px] text-gray-500 font-bold">{item.rating || '4.8'}</span>
          {item.salesCount > 0 && (
            <span className="text-[9px] text-gray-400 mr-1">· {item.salesCount}+ طلب</span>
          )}
        </div>
      </div>
    </div>
  );
}

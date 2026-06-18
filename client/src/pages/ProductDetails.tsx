import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft,
  Star, 
  Heart, 
  ShoppingCart,
  Truck, 
  Leaf,
  Scale,
  Minus,
  Plus,
  ArrowRight,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '../context/CartContext';
import { useToast } from '@/hooks/use-toast';
import type { MenuItem } from '@shared/schema';
import MenuItemCard from '@/components/MenuItemCard';

export default function ProductDetails() {
  const [, params] = useRoute('/product/:id');
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery<MenuItem>({
    queryKey: [`/api/products/${params?.id}`],
  });

  const { data: relatedProducts } = useQuery<MenuItem[]>({
    queryKey: [`/api/products`],
    enabled: !!product,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-12 bg-gray-200 rounded w-1/2" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🥦</div>
        <h2 className="text-2xl font-bold mb-4">المنتج غير موجود</h2>
        <Button onClick={() => setLocation('/')} className="bg-[#E53225] hover:bg-[#c42b1f]">
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  const discountPercent = product.originalPrice 
    ? Math.round((1 - parseFloat(String(product.price)) / parseFloat(String(product.originalPrice))) * 100)
    : 0;

  const unit = (product as any).unit || 'كجم';

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    toast({
      title: "✅ تمت الإضافة للسلة",
      description: `${quantity} ${unit} من ${product.name}`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <main className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 overflow-x-auto whitespace-nowrap">
          <button onClick={() => setLocation('/')} className="hover:text-[#E53225] transition-colors font-medium">الرئيسية</button>
          <ChevronLeft className="h-4 w-4 text-gray-300" />
          <button onClick={() => setLocation(`/category/${product.category}`)} className="hover:text-[#E53225] transition-colors">{product.category}</button>
          <ChevronLeft className="h-4 w-4 text-gray-300" />
          <span className="text-[#E53225] font-bold">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Product Image */}
          <div className="space-y-3">
            <div className="relative aspect-square bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 rounded-2xl overflow-hidden shadow-md">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              {discountPercent > 0 && (
                <div className="absolute top-4 right-4 bg-[#E53225] text-white px-3 py-1.5 rounded-xl font-black text-sm shadow-lg">
                  خصم {discountPercent}%
                </div>
              )}
              {product.isNew && (
                <div className="absolute top-4 left-4 bg-[#5BB827] text-white px-3 py-1.5 rounded-xl font-black text-sm shadow-lg">
                  🌱 جديد
                </div>
              )}
              {product.isFeatured && !product.isNew && (
                <div className="absolute top-4 left-4 bg-amber-500 text-white px-3 py-1.5 rounded-xl font-black text-sm shadow-lg">
                  ⭐ مميز
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-white rounded-xl p-3 shadow-sm border border-green-100">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Leaf className="h-4 w-4 text-[#5BB827]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">منتج طازج</p>
                  <p className="text-[10px] text-gray-500">جودة مضمونة</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl p-3 shadow-sm border border-red-100">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4 text-[#E53225]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">توصيل سريع</p>
                  <p className="text-[10px] text-gray-500">لباب بيتك</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col space-y-4">
            {/* Category badge */}
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#5BB827]" />
              <span className="text-sm font-bold text-[#5BB827] bg-green-50 px-3 py-1 rounded-full">
                {product.category}
              </span>
            </div>

            {/* Name */}
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(parseFloat(product.rating || '4.5')) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`} />
                ))}
                <span className="text-sm font-bold text-amber-600 mr-1">{product.rating || '4.8'}</span>
              </div>
              {(product.salesCount ?? 0) > 0 && (
                <span className="text-sm text-gray-500">+{product.salesCount} طلب</span>
              )}
            </div>

            {/* Unit + Price */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4 text-[#5BB827]" />
                <span className="text-sm font-bold text-gray-600">السعر لكل</span>
                <span className="text-sm font-black text-[#5BB827] bg-green-50 px-2 py-0.5 rounded-lg">{unit}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-[#E53225]">{parseFloat(String(product.price)).toFixed(2)}</span>
                <span className="text-lg font-bold text-gray-500">ريال</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through font-medium">{parseFloat(String(product.originalPrice)).toFixed(2)}</span>
                )}
              </div>
              {discountPercent > 0 && (
                <p className="text-sm text-[#E53225] font-bold mt-1">توفير {discountPercent}%</p>
              )}
            </div>

            <Separator />

            {/* Quantity */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">الكمية ({unit}):</p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-[#E53225] hover:text-[#E53225] flex items-center justify-center transition-colors font-bold text-lg"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-xl font-black text-gray-800">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full bg-[#5BB827] hover:bg-[#4a9a20] text-white flex items-center justify-center transition-colors shadow-md"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-500 font-medium">{unit}</span>
              </div>
            </div>

            {/* Add to cart button */}
            <Button 
              className="w-full h-14 rounded-2xl bg-[#E53225] hover:bg-[#c42b1f] text-white font-black text-lg gap-3 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
              onClick={handleAddToCart}
              disabled={!product.isAvailable}
            >
              <ShoppingCart className="h-6 w-6" />
              {product.isAvailable 
                ? `أضف ${quantity} ${unit} للسلة — ${(parseFloat(String(product.price)) * quantity).toFixed(2)} ريال`
                : 'غير متوفر حالياً'
              }
            </Button>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#5BB827] rounded-full inline-block" />
                  وصف المنتج
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Specs */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#E53225] rounded-full inline-block" />
                المواصفات
              </h3>
              <ul className="space-y-2">
                <li className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">وحدة القياس</span>
                  <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5 text-[#5BB827]" />
                    {unit}
                  </span>
                </li>
                <li className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">التصنيف</span>
                  <span className="text-sm font-bold text-gray-800">{product.category}</span>
                </li>
                <li className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-gray-500">الحالة</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${product.isAvailable ? 'bg-green-50 text-[#5BB827]' : 'bg-red-50 text-[#E53225]'}`}>
                    {product.isAvailable ? '✓ متوفر' : '✗ غير متوفر'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 1 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span className="w-1 h-6 bg-[#E53225] rounded-full inline-block" />
                منتجات مشابهة
              </h2>
              <button 
                onClick={() => setLocation(`/category/${product.category}`)}
                className="flex items-center gap-1 text-sm font-bold text-[#E53225] hover:text-[#c42b1f]"
              >
                عرض الكل
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {relatedProducts
                .filter(p => p.id !== product.id)
                .slice(0, 5)
                .map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                  />
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-3 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="text-right">
          <p className="text-xs text-gray-500">{quantity} {unit}</p>
          <p className="text-base font-black text-[#E53225]">{(parseFloat(String(product.price)) * quantity).toFixed(2)} ريال</p>
        </div>
        <Button 
          className="flex-1 h-12 rounded-xl bg-[#E53225] hover:bg-[#c42b1f] text-white font-black gap-2"
          onClick={handleAddToCart}
          disabled={!product.isAvailable}
        >
          <ShoppingCart className="h-5 w-5" />
          {product.isAvailable ? 'أضف للسلة' : 'غير متوفر'}
        </Button>
      </div>
    </div>
  );
}

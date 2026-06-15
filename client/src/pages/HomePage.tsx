import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Menu,
  Tag,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShoppingBasket,
  Flame,
  Sparkles,
  Star,
  Package,
  Plus,
} from 'lucide-react';
import MenuItemCard from '@/components/MenuItemCard';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import type { Category, SpecialOffer, MenuItem } from '@shared/schema';
import { getAppStatus } from '@/utils/restaurantHours';

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { getSetting } = useUiSettings();
  const { user } = useAuth();
  const isAdmin = user?.userType === 'admin';

  const [offerIndex, setOfferIndex] = useState(0);
  const sliderTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const getS = (key: string, defaultValue: string) => getSetting(key) || defaultValue;
  const showSection = (key: string) => getSetting(key) !== 'false';

  const appStatus = useMemo(() => {
    const openingTime = getSetting('opening_time') || '08:00';
    const closingTime = getSetting('closing_time') || '23:00';
    const storeStatus = getSetting('store_status') || 'open';
    return getAppStatus(openingTime, closingTime, storeStatus);
  }, [getSetting]);

  const { data: categories } = useQuery<Category[]>({ queryKey: ['/api/categories'] });
  const { data: offers } = useQuery<SpecialOffer[]>({ queryKey: ['/api/special-offers'] });
  const { data: allProducts, isLoading: productsLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  // Get default restaurantId for cart operations
  const { data: restaurantsData } = useQuery<any>({ queryKey: ['/api/restaurants'] });
  const defaultRestaurantId = Array.isArray(restaurantsData) ? restaurantsData[0]?.id : restaurantsData?.restaurants?.[0]?.id || 'tamtom';
  const storeName = getS('app_name', 'طمطوم');

  const activeOffers = (offers || []).filter(o => o.isActive);

  const startSlider = useCallback(() => {
    if (sliderTimer.current) clearInterval(sliderTimer.current);
    if (activeOffers.length > 1) {
      sliderTimer.current = setInterval(() => {
        setOfferIndex(prev => (prev + 1) % activeOffers.length);
      }, 4000);
    }
  }, [activeOffers.length]);

  useEffect(() => {
    startSlider();
    return () => { if (sliderTimer.current) clearInterval(sliderTimer.current); };
  }, [startSlider]);

  const prevOffer = () => { setOfferIndex(prev => (prev - 1 + activeOffers.length) % activeOffers.length); startSlider(); };
  const nextOffer = () => { setOfferIndex(prev => (prev + 1) % activeOffers.length); startSlider(); };

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    const available = allProducts.filter(p => p.isAvailable !== false);
    if (selectedCategory === 'all') return available;
    if (selectedCategory === 'offers') return available.filter(p => p.isSpecialOffer);
    return available.filter(p => {
      const catId = p.category?.trim().toLowerCase();
      const selCat = selectedCategory.trim().toLowerCase();
      // Match by name or by category slug
      const catObj = categories?.find(c => c.id === selectedCategory);
      if (catObj) return catId === catObj.name.trim().toLowerCase();
      return catId === selCat || catId?.includes(selCat) || selCat.includes(catId || '');
    });
  }, [allProducts, selectedCategory, categories]);

  const featuredProducts = useMemo(() => (allProducts || []).filter(p => p.isFeatured && p.isAvailable !== false).slice(0, 6), [allProducts]);
  const newProducts = useMemo(() => (allProducts || []).filter(p => p.isNew && p.isAvailable !== false).slice(0, 6), [allProducts]);

  const currentOffer = activeOffers[offerIndex];

  const ProductGrid = ({ items, loading }: { items: MenuItem[], loading?: boolean }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {loading ? Array(8).fill(0).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl overflow-hidden">
          <div className="aspect-square bg-gray-100" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      )) : items.map(item => (
        <MenuItemCard
          key={item.id}
          item={item}
          restaurantId={defaultRestaurantId}
          restaurantName={storeName}
        />
      ))}
    </div>
  );

  const SectionHeader = ({ icon, title, subtitle, onSeeAll }: { icon: React.ReactNode; title: string; subtitle?: string; onSeeAll?: () => void }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-base font-black text-gray-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {onSeeAll && (
        <button onClick={onSeeAll} className="text-xs font-bold text-[#E53225] flex items-center gap-0.5 hover:opacity-80">
          الكل <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Categories ─────────────────────────────────────── */}
      {showSection('show_categories') && (
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
          <div className="flex overflow-x-auto no-scrollbar px-4 py-3 gap-3">
            {/* All */}
            <div
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 min-w-[64px]"
              onClick={() => setSelectedCategory('all')}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${selectedCategory === 'all' ? 'bg-[#E53225]/10 border-[#E53225] shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                <Menu className={`h-6 w-6 ${selectedCategory === 'all' ? 'text-[#E53225]' : 'text-gray-500'}`} />
              </div>
              <span className={`text-[10px] font-bold text-center ${selectedCategory === 'all' ? 'text-[#E53225]' : 'text-gray-600'}`}>
                {getS('text_all_categories', 'الكل')}
              </span>
            </div>

            {/* وصل لي */}
            {showSection('show_wasalni_service') && (
              <div
                className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 min-w-[64px]"
                onClick={() => setLocation('/wasalni')}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 bg-gradient-to-br from-orange-400 to-orange-600 border-transparent shadow-sm">
                  <span className="text-2xl">🛵</span>
                </div>
                <span className="text-[10px] font-bold text-center text-orange-600">
                  {getS('wasalni_service_name', 'وصل لي')}
                </span>
              </div>
            )}

            {/* Dynamic categories */}
            {categories?.filter(c => c.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(cat => (
              <div
                key={cat.id}
                className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 min-w-[64px]"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all overflow-hidden ${selectedCategory === cat.id ? 'border-[#E53225] shadow-sm ring-2 ring-[#E53225]/20' : 'bg-gray-50 border-gray-100'}`}>
                  {cat.image
                    ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    : cat.icon
                      ? <span className="text-2xl">{cat.icon}</span>
                      : <ShoppingBasket className={`h-6 w-6 ${selectedCategory === cat.id ? 'text-[#E53225]' : 'text-gray-500'}`} />
                  }
                </div>
                <span className={`text-[10px] font-bold text-center leading-tight ${selectedCategory === cat.id ? 'text-[#E53225]' : 'text-gray-600'}`}>
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Offers Slider ────────────────────────────────────── */}
      {showSection('show_hero_section') && activeOffers.length > 0 && currentOffer && (
        <div className="px-4 pt-4 pb-2">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-lg" style={{ height: 180 }}>
            {currentOffer.image
              ? <img src={currentOffer.image} alt={currentOffer.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-[#E53225] to-[#9B1C15]" />
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {currentOffer.showBadge !== false && (
              <div className="absolute top-3 right-3 flex gap-1.5">
                <span className="bg-[#E53225] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                  {currentOffer.badgeText1 || 'عرض خاص'}
                </span>
                {currentOffer.badgeText2 && (
                  <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {currentOffer.badgeText2}
                  </span>
                )}
              </div>
            )}

            <div className="absolute bottom-0 right-0 left-0 p-3 text-right">
              <h3 className="text-white font-black text-sm leading-snug line-clamp-2 mb-1">{currentOffer.title}</h3>
              {currentOffer.description && (
                <p className="text-white/80 text-[11px] line-clamp-1 mb-2">{currentOffer.description}</p>
              )}
              <div className="flex items-center justify-between">
                <button
                  className="bg-white text-[#E53225] text-[11px] font-black px-4 py-1.5 rounded-full flex items-center gap-1 shadow"
                  onClick={() => {
                    if (currentOffer.menuItemId) setLocation(`/product/${currentOffer.menuItemId}`);
                    else setLocation('/category/العروض');
                  }}
                >
                  {getS('btn_shop_now', 'تسوق الآن')}
                  <ChevronLeft className="h-3 w-3" />
                </button>
                {(currentOffer.discountPercent || currentOffer.discountAmount) && (
                  <span className="bg-[#E53225] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    {currentOffer.discountPercent ? `خصم ${currentOffer.discountPercent}%` : `خصم ${currentOffer.discountAmount} ر.ي`}
                  </span>
                )}
              </div>
            </div>

            {activeOffers.length > 1 && (
              <>
                <button onClick={nextOffer} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={prevOffer} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {activeOffers.map((_, i) => (
                    <button key={i} onClick={() => { setOfferIndex(i); startSlider(); }}
                      className={`rounded-full transition-all ${i === offerIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                    />
                  ))}
                </div>
                <button
                  className="absolute top-3 left-3 text-white/80 text-[10px] font-bold flex items-center gap-0.5 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full"
                  onClick={() => setLocation('/category/العروض')}
                >
                  كل العروض <ChevronLeft className="h-2.5 w-2.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-24 space-y-6">

        {/* Global closed banner */}
        {!appStatus.isOpen && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-right">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 font-bold">{appStatus.message || 'المتجر مغلق حالياً، نعود قريباً'}</p>
          </div>
        )}

        {/* When a specific category is selected */}
        {selectedCategory !== 'all' ? (
          <div>
            <SectionHeader
              icon={<div className="w-8 h-8 bg-[#E53225]/10 rounded-xl flex items-center justify-center"><ShoppingBasket className="h-4 w-4 text-[#E53225]" /></div>}
              title={categories?.find(c => c.id === selectedCategory)?.name || 'المنتجات'}
              subtitle={`${filteredProducts.length} منتج`}
            />
            {filteredProducts.length === 0 && !productsLoading ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold text-base">لا توجد منتجات في هذا التصنيف</p>
                <button onClick={() => setSelectedCategory('all')} className="mt-3 text-[#E53225] text-sm font-bold underline">
                  عرض كل المنتجات
                </button>
              </div>
            ) : (
              <ProductGrid items={filteredProducts} loading={productsLoading} />
            )}
          </div>
        ) : (
          <>
            {/* ── Featured Products ─────────────────────────── */}
            {showSection('show_featured_products') && featuredProducts.length > 0 && (
              <div>
                <SectionHeader
                  icon={<div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /></div>}
                  title="منتجات مميزة"
                  subtitle="الأكثر طلباً"
                  onSeeAll={() => setLocation('/category/مميز')}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {featuredProducts.map(item => (
                    <MenuItemCard key={item.id} item={item} restaurantId={defaultRestaurantId} restaurantName={storeName} />
                  ))}
                </div>
              </div>
            )}

            {/* ── New Arrivals ──────────────────────────────── */}
            {newProducts.length > 0 && (
              <div>
                <SectionHeader
                  icon={<div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center"><Sparkles className="h-4 w-4 text-[#5BB827]" /></div>}
                  title="وصل حديثاً"
                  subtitle="أحدث المنتجات"
                />
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {newProducts.map(item => (
                    <div key={item.id} className="shrink-0 w-40">
                      <MenuItemCard item={item} restaurantId={defaultRestaurantId} restaurantName={storeName} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── All Products by Category ──────────────────── */}
            {categories?.filter(c => c.isActive !== false).map(cat => {
              const catProducts = (allProducts || []).filter(p => {
                if (p.isAvailable === false) return false;
                const catName = cat.name.trim().toLowerCase();
                const itemCat = (p.category || '').trim().toLowerCase();
                return itemCat === catName || itemCat.includes(catName) || catName.includes(itemCat);
              });
              if (catProducts.length === 0) return null;
              return (
                <div key={cat.id}>
                  <SectionHeader
                    icon={
                      <div className="w-8 h-8 rounded-xl overflow-hidden border border-gray-100">
                        {cat.image
                          ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-green-50 flex items-center justify-center"><ShoppingBasket className="h-4 w-4 text-green-600" /></div>
                        }
                      </div>
                    }
                    title={cat.name}
                    subtitle={`${catProducts.length} منتج`}
                    onSeeAll={() => setSelectedCategory(cat.id)}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {catProducts.slice(0, 6).map(item => (
                      <MenuItemCard key={item.id} item={item} restaurantId={defaultRestaurantId} restaurantName={storeName} />
                    ))}
                  </div>
                  {catProducts.length > 6 && (
                    <button
                      onClick={() => setSelectedCategory(cat.id)}
                      className="w-full mt-3 py-2.5 rounded-2xl border-2 border-[#E53225]/30 text-[#E53225] text-sm font-bold hover:bg-[#E53225]/5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      عرض كل منتجات {cat.name} ({catProducts.length})
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* ── All products if no categories match ─────── */}
            {(allProducts || []).filter(p => p.isAvailable !== false && !categories?.some(cat => {
              const catName = cat.name.trim().toLowerCase();
              const itemCat = (p.category || '').trim().toLowerCase();
              return itemCat === catName || itemCat.includes(catName) || catName.includes(itemCat);
            })).length > 0 && (
              <div>
                <SectionHeader
                  icon={<div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"><Flame className="h-4 w-4 text-gray-600" /></div>}
                  title="منتجات متنوعة"
                />
                <ProductGrid
                  items={(allProducts || []).filter(p => p.isAvailable !== false && !categories?.some(cat => {
                    const catName = cat.name.trim().toLowerCase();
                    const itemCat = (p.category || '').trim().toLowerCase();
                    return itemCat === catName || itemCat.includes(catName) || catName.includes(itemCat);
                  }))}
                  loading={productsLoading}
                />
              </div>
            )}

            {/* Empty state */}
            {!productsLoading && (allProducts || []).filter(p => p.isAvailable !== false).length === 0 && (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBasket className="h-12 w-12 text-[#5BB827]" />
                </div>
                <p className="text-gray-700 font-black text-xl">لا توجد منتجات بعد</p>
                <p className="text-gray-400 text-sm mt-2">سيتم إضافة المنتجات قريباً</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* زر إضافة منتج للمدير */}
      {isAdmin && (
        <button
          onClick={() => setLocation('/admin/menu-items')}
          className="fixed bottom-24 left-4 z-50 w-14 h-14 rounded-full bg-[#E53225] text-white shadow-2xl flex items-center justify-center hover:bg-[#c02a1f] active:scale-95 transition-all"
          title="إضافة منتج جديد"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}
    </div>
  );
}

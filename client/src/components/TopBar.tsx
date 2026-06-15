import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Heart, 
  User, 
  Search,
  Menu as MenuIcon,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { CustomerNotificationsPanel } from './CustomerNotificationsPanel';

const WorkingHoursIndicator: React.FC = () => {
  const { getSetting } = useUiSettings();
  const storeStatus = getSetting('store_status') || 'auto';
  const openingTime = getSetting('opening_time') || '08:00';
  const closingTime = getSetting('closing_time') || '23:00';

  const computeIsOpen = (): boolean => {
    if (storeStatus === 'open') return true;
    if (storeStatus === 'closed') return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const open = toMin(openingTime);
    const close = toMin(closingTime);
    if (close > open) return currentMinutes >= open && currentMinutes < close;
    return currentMinutes >= open || currentMinutes < close;
  };

  const [isOpen, setIsOpen] = React.useState(computeIsOpen);

  React.useEffect(() => {
    setIsOpen(computeIsOpen());
    const t = setInterval(() => setIsOpen(computeIsOpen()), 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeStatus, openingTime, closingTime]);

  const format12 = (t: string): string => {
    if (!t || !t.includes(':')) return t;
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = (mStr || '00').padStart(2, '0');
    if (isNaN(h)) return t;
    const suffix = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${suffix}`;
  };

  return (
    <div className="relative px-3 pb-2.5">
      <div
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-sm border transition-colors ${
          isOpen
            ? 'bg-green-500/15 border-green-400/30'
            : 'bg-red-500/15 border-red-400/30'
        }`}
      >
        <div className="relative">
          <span className={`absolute inset-0 rounded-full ${isOpen ? 'bg-green-400 animate-ping' : 'bg-red-400'} opacity-60`} />
          <span className={`relative block w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
        <Clock className={`h-3.5 w-3.5 ${isOpen ? 'text-green-300' : 'text-red-300'}`} />
        <div className="flex-1 text-right">
          <div className="text-[9px] font-bold text-white/60 leading-none">
            {isOpen ? 'المتجر مفتوح الآن' : 'المتجر مغلق حالياً'}
          </div>
          <div className="text-xs font-bold text-white truncate leading-tight mt-0.5">
            ساعات العمل: {format12(openingTime)} - {format12(closingTime)}
          </div>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
          isOpen
            ? 'bg-green-400/20 text-green-300 border border-green-400/30'
            : 'bg-red-400/20 text-red-300 border border-red-400/30'
        }`}>
          {isOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </div>
    </div>
  );
};

export const TopBar: React.FC = () => {
  const [, setLocation] = useLocation();
  const { state } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { getSetting, loading: settingsLoading } = useUiSettings();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const logoUrl = getSetting('header_logo_url') || getSetting('logo_url') || '/tamtom-logo.png';
  const appName = getSetting('app_name') || 'طمطوم';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleOpenCart = () => {
    window.dispatchEvent(new CustomEvent('openCart'));
  };

  const getItemCount = () => state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="bg-gradient-to-r from-[#1A3A1A] via-[#1E4D1E] to-[#1A3A1A] border-b border-white/10 hidden md:block shadow-lg">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-8">
          <div 
            className="cursor-pointer shrink-0 flex items-center gap-3 group"
            onClick={() => setLocation('/')}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#E53225] rounded-full blur-xl opacity-20 group-hover:opacity-35 transition-opacity" />
              {settingsLoading ? (
                <div className="h-14 w-14 bg-white/10 animate-pulse rounded-full" />
              ) : (
                <img src={logoUrl} alt={appName} className="relative h-14 w-auto object-contain transition-transform group-hover:scale-105" />
              )}
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-black text-white tracking-tight">{appName}</span>
              <span className="text-[10px] font-bold text-[#5BB827] tracking-[0.3em] mt-1">TAM TOM</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl">
            <form onSubmit={handleSearch} className="relative group">
              <Input 
                className="w-full pr-12 pl-4 h-12 bg-white/10 border-2 border-white/20 focus:border-[#E53225]/60 focus:bg-white/15 rounded-xl transition-all text-base font-bold text-white placeholder:text-white/50"
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors">
                <Search className="h-6 w-6" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLocation(user ? '/profile' : '/auth')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            >
              <User className="h-7 w-7 text-white/80" />
            </button>
            
            <button 
              onClick={() => setLocation('/favorites')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            >
              <Heart className="h-7 w-7 text-white/80" />
            </button>

            <button 
              onClick={handleOpenCart}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            >
              <div className="relative">
                <ShoppingCart className="h-7 w-7 text-white/80" />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#E53225] text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-[#1A3A1A]">
                    {getItemCount()}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A3A1A 0%, #2A5228 50%, #1C4A1C 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#E53225] opacity-15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#5BB827] opacity-10 blur-2xl pointer-events-none" />

        <div className="relative px-3 py-2.5 flex items-center justify-between gap-2">
          {/* Left side (RTL): Menu + Notifications */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-white hover:bg-white/15 shrink-0 rounded-xl" 
              onClick={() => document.getElementById('sidebar-trigger')?.click()}
            >
              <MenuIcon className="h-6 w-6" />
            </Button>
            <CustomerNotificationsPanel />
          </div>

          {/* Center: Brand pill */}
          <div 
            className="flex-1 flex items-center justify-center cursor-pointer"
            onClick={() => setLocation('/')}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 backdrop-blur-sm">
              <div className="relative">
                <div className="absolute inset-0 bg-[#E53225] rounded-full blur-md opacity-40" />
                {settingsLoading ? (
                  <div className="relative h-9 w-9 bg-white/10 rounded-full animate-pulse" />
                ) : (
                  <img src={logoUrl} alt={appName} className="relative h-9 w-9 object-contain" />
                )}
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-white font-black text-base">{appName}</span>
                <span className="text-[8px] font-bold text-[#5BB827] tracking-[0.25em] mt-0.5">TAM TOM</span>
              </div>
            </div>
          </div>

          {/* Right side (RTL): Search + Cart */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-10 w-10 flex items-center justify-center text-white hover:bg-white/15 rounded-xl transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={handleOpenCart}
              className="h-10 w-10 flex items-center justify-center text-white hover:bg-white/15 rounded-xl transition-colors relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {getItemCount() > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#E53225] text-white text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-black ring-2 ring-[#1A3A1A] shadow-lg">
                  {getItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Working Hours Indicator */}
        <WorkingHoursIndicator />

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="relative px-3 pb-3 -mt-1">
            <form onSubmit={handleSearch} className="relative">
              <input
                autoFocus
                className="w-full bg-white/95 text-slate-900 placeholder-slate-400 border border-white/30 rounded-2xl px-4 py-2.5 pr-11 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E53225] shadow-lg"
                placeholder="ابحث عن منتج أو صنف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#E53225] text-white flex items-center justify-center shadow-md">
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* Bottom curved decoration */}
        <div className="relative h-3 bg-background rounded-t-3xl -mb-px" />
      </div>
    </div>
  );
};

export default TopBar;

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUiSettings } from '@/context/UiSettingsContext';
import { getAppStatus } from '@/utils/restaurantHours';

export function StoreStatusNotifier() {
  const { toast } = useToast();
  const { getSetting } = useUiSettings();
  const initialized = useRef(false);

  useEffect(() => {
    const handleStoreStatusChanged = (event: Event) => {
      const e = event as CustomEvent;
      const { storeStatus, openingTime, closingTime } = e.detail;

      const appStatus = getAppStatus(openingTime, closingTime, storeStatus);

      if (appStatus.isOpen) {
        toast({
          title: '✅ المتجر مفتوح الآن',
          description: `المتجر متاح للطلب حتى الساعة ${closingTime}`,
          duration: 5000,
        });
      } else {
        toast({
          title: '🔴 المتجر مغلق الآن',
          description: appStatus.message || `المتجر مغلق حالياً. يفتح الساعة ${openingTime}`,
          variant: 'destructive',
          duration: 6000,
        });
      }
    };

    window.addEventListener('storeStatusChanged', handleStoreStatusChanged);
    initialized.current = true;

    return () => {
      window.removeEventListener('storeStatusChanged', handleStoreStatusChanged);
    };
  }, [toast]);

  const openingTime = getSetting('opening_time') || '08:00';
  const closingTime = getSetting('closing_time') || '23:00';
  const storeStatus = getSetting('store_status') || 'auto';
  const appStatus = getAppStatus(openingTime, closingTime, storeStatus);

  if (!appStatus.isOpen) {
    return (
      <div className="bg-red-600 text-white text-center py-1.5 px-4 text-sm font-bold flex items-center justify-center gap-2 z-50">
        <span>🔴</span>
        <span>{appStatus.message || `المتجر مغلق حالياً - يفتح الساعة ${openingTime}`}</span>
      </div>
    );
  }

  return null;
}

export default StoreStatusNotifier;

import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { MenuItem } from '../../../shared/schema.js';
import { useToast } from '@/hooks/use-toast';
import { useUiSettings } from './UiSettingsContext';
import { getAppStatus, canOrderFromRestaurant } from '../utils/restaurantHours';
import { useQuery } from '@tanstack/react-query';
import type { Restaurant } from '../../../shared/schema.js';

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  restaurantId?: string;
  restaurantName?: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  distance?: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: MenuItem; restaurantId: string; restaurantName: string }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'UPDATE_QUANTITY'; itemId: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_DELIVERY_FEE'; fee: number }
  | { type: 'SET_DISTANCE'; distance: number }
  | { type: 'ADD_NOTES'; itemId: string; notes: string }
  | { type: 'RESTORE_CART'; cartState: CartState };

const initialState: CartState = {
  items: [],
  total: 0,
  subtotal: 0,
  deliveryFee: 0,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // إذا كان المطعم مختلفاً، امسح السلة
      if (state.restaurantId && state.restaurantId !== action.restaurantId) {
        if (!confirm('إضافة عناصر من مطعم آخر سيمسح السلة الحالية. هل تريد المتابعة؟')) {
          return state;
        }
        state = { ...initialState };
      }

      const existingItem = state.items.find(item => item.id === action.item.id);
      let newItems;

      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === action.item.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.items, { ...action.item, quantity: 1 }];
      }

      const subtotal = newItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const total = subtotal + state.deliveryFee;

      return {
        ...state,
        items: newItems,
        restaurantId: action.restaurantId,
        restaurantName: action.restaurantName,
        subtotal,
        total,
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.itemId);
      const subtotal = newItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const total = subtotal + state.deliveryFee;
      
      return {
        ...state,
        items: newItems,
        subtotal,
        total,
        restaurantId: newItems.length === 0 ? undefined : state.restaurantId,
        restaurantName: newItems.length === 0 ? undefined : state.restaurantName,
      };
    }

    case 'UPDATE_QUANTITY': {
      if (action.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', itemId: action.itemId });
      }

      const newItems = state.items.map(item =>
        item.id === action.itemId
          ? { ...item, quantity: action.quantity }
          : item
      );

      const subtotal = newItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const total = subtotal + state.deliveryFee;

      return {
        ...state,
        items: newItems,
        subtotal,
        total,
      };
    }

    case 'ADD_NOTES': {
      const newItems = state.items.map(item =>
        item.id === action.itemId
          ? { ...item, notes: action.notes }
          : item
      );

      return {
        ...state,
        items: newItems,
      };
    }

    case 'SET_DELIVERY_FEE': {
      const total = state.subtotal + action.fee;
      return {
        ...state,
        deliveryFee: action.fee,
        total,
      };
    }

    case 'SET_DISTANCE': {
      return {
        ...state,
        distance: action.distance,
      };
    }

    case 'CLEAR_CART':
      return initialState;

    case 'RESTORE_CART': {
      // Restore the complete cart state from localStorage
      return {
        ...action.cartState,
        // Recalculate totals to ensure consistency
        subtotal: action.cartState.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
        total: action.cartState.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0) + action.cartState.deliveryFee,
      };
    }

    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string) => Promise<void>;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  addNotes: (itemId: string, notes: string) => void;
  setDeliveryFee: (fee: number) => void;
  setDistance: (distance: number) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { toast } = useToast();
  const { getSetting } = useUiSettings();

  const appStatus = useMemo(() => {
    const openingTime = getSetting('opening_time') || '08:00';
    const closingTime = getSetting('closing_time') || '23:00';
    const storeStatus = getSetting('store_status') || 'open';
    return getAppStatus(openingTime, closingTime, storeStatus);
  }, [getSetting]);

  // هل خدمة الطلبات المؤجلة عند الإغلاق مفعّلة من لوحة التحكم؟
  const allowScheduledWhenClosed = useMemo(() => {
    return getSetting('allow_scheduled_orders_when_closed') !== 'false';
  }, [getSetting]);

  // حفظ السلة في localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  // تحميل السلة من localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        if (cartData.items?.length > 0) {
          // استخدام RESTORE_CART لحفظ الحالة بالكامل
          dispatch({
            type: 'RESTORE_CART',
            cartState: cartData
          });
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('cart'); // إزالة البيانات المعطوبة
      }
    }
  }, []);

  const addItem = async (item: MenuItem, restaurantId: string, restaurantName: string) => {
    // 1. فحص حالة التطبيق — إذا كان المتجر مغلقاً
    if (!appStatus.isOpen) {
      if (!allowScheduledWhenClosed) {
        // خدمة الطلبات المؤجلة معطّلة → منع الإضافة كلياً
        toast({
          title: "🔴 المتجر مغلق حالياً",
          description: appStatus.message
            ? `${appStatus.message}. لا تتوفر خدمة الطلبات المؤجلة حالياً.`
            : `المتجر مغلق ولا تتوفر خدمة الطلبات المؤجلة. يفتح الساعة ${appStatus.openingTime}`,
          variant: "destructive",
          duration: 6000,
        });
        return;
      }

      // خدمة الطلبات المؤجلة مفعّلة → السماح بالإضافة مع إشعار تنبيهي
      dispatch({ type: 'ADD_ITEM', item, restaurantId, restaurantName });
      toast({
        title: "📅 تمت الإضافة — سيُجدَّل طلبك",
        description: `المتجر مغلق حالياً. "${item.name}" في سلتك وسيُرسل كطلب مجدول. يفتح المتجر الساعة ${appStatus.openingTime}`,
        duration: 6000,
      });
      return;
    }

    // 2. فحص حالة المطعم/المتجر إذا كان معروفاً (المتجر مفتوح)
    if (restaurantId && restaurantId !== 'unknown') {
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}`);
        if (response.ok) {
          const restaurant = await response.json();
          const orderStatus = canOrderFromRestaurant(restaurant, true);
          if (!orderStatus.canOrder) {
            toast({
              title: "🔴 المتجر مغلق حالياً",
              description: orderStatus.message || "عذراً، لا يمكنك الطلب من هذا المتجر لأنه مغلق حالياً.",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error checking restaurant status:", error);
      }
    }

    // 3. إضافة العنصر — المتجر مفتوح
    const existingItem = state.items.find(cartItem => cartItem.id === item.id);
    dispatch({ type: 'ADD_ITEM', item, restaurantId, restaurantName });

    if (existingItem) {
      toast({
        title: "✅ تم زيادة الكمية",
        description: `تم زيادة كمية "${item.name}" في السلة`,
        duration: 2500,
      });
    } else {
      toast({
        title: "✅ تمت الإضافة للسلة",
        description: `تم إضافة "${item.name}" إلى سلتك`,
        duration: 2500,
      });
    }
  };

  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', itemId });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', itemId, quantity });
  };

  const addNotes = (itemId: string, notes: string) => {
    dispatch({ type: 'ADD_NOTES', itemId, notes });
  };

  const setDeliveryFee = (fee: number) => {
    dispatch({ type: 'SET_DELIVERY_FEE', fee });
  };

  const setDistance = (distance: number) => {
    dispatch({ type: 'SET_DISTANCE', distance });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getItemQuantity = (itemId: string): number => {
    const item = state.items.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        addNotes,
        setDeliveryFee,
        setDistance,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
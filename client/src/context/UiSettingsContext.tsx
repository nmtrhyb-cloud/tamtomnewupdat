import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SETTINGS_CACHE_KEY = 'ui_settings_cache';
const SETTINGS_CACHE_TTL = 2 * 60 * 1000;

interface UiSetting {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UiSettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  getSetting: (key: string, defaultValue?: string) => string;
  isFeatureEnabled: (key: string) => boolean;
  refreshSettings: () => Promise<void>;
}

const UiSettingsContext = createContext<UiSettingsContextType | undefined>(undefined);

function loadCachedSettings(): Record<string, string> | null {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < SETTINGS_CACHE_TTL) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedSettings(settings: Record<string, string>) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
      data: settings,
      timestamp: Date.now(),
    }));
  } catch {
  }
}

const SETTINGS_ENDPOINT = '/api/ui-settings';

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    return loadCachedSettings() || {};
  });
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false);
  const prevSettingsRef = useRef<Record<string, string> | null>(null);
  const isInitialLoadRef = useRef(true);

  const loadSettings = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const response = await fetch(SETTINGS_ENDPOINT);
      if (response.ok) {
        const settingsData: UiSetting[] = await response.json();
        const settingsMap = settingsData.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, string>);

        if (!isInitial && !isInitialLoadRef.current && prevSettingsRef.current !== null) {
          const prev = prevSettingsRef.current;
          const prevStatus = prev.store_status;
          const newStatus = settingsMap.store_status;
          const prevOpen = prev.opening_time;
          const newOpen = settingsMap.opening_time;
          const prevClose = prev.closing_time;
          const newClose = settingsMap.closing_time;

          if (prevStatus !== newStatus || prevOpen !== newOpen || prevClose !== newClose) {
            window.dispatchEvent(new CustomEvent('storeStatusChanged', {
              detail: {
                storeStatus: newStatus || 'auto',
                openingTime: newOpen || '08:00',
                closingTime: newClose || '23:00',
                prevStoreStatus: prevStatus,
              }
            }));
          }
        }

        prevSettingsRef.current = settingsMap;
        if (isInitial) isInitialLoadRef.current = false;

        setSettings(settingsMap);
        saveCachedSettings(settingsMap);
      }
    } catch {
    } finally {
      isFetchingRef.current = false;
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (
            message.type === 'settings_updated' ||
            message.type === 'ui_settings_changed' ||
            message.type === 'admin_update' ||
            message.type === 'settings_changed'
          ) {
            localStorage.removeItem(SETTINGS_CACHE_KEY);
            loadSettings(false);
          }
        } catch {
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
    }
  }, [loadSettings]);

  const updateSetting = async (key: string, value: string) => {
    try {
      const adminToken = localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      const response = await fetch(`/api/admin/ui-settings/${key}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        saveCachedSettings(newSettings);
      }
    } catch (error) {
      console.error('خطأ في تحديث الإعداد:', error);
    }
  };

  const getSetting = (key: string, defaultValue: string = '') => {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  };

  const isFeatureEnabled = (key: string) => {
    const value = getSetting(key);
    if (value === '') return true;
    return value !== 'false';
  };

  const refreshSettings = async () => {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
    setLoading(true);
    await loadSettings(true);
  };

  useEffect(() => {
    loadSettings(true);
    connectWebSocket();

    const interval = setInterval(() => loadSettings(false), 15000);

    return () => {
      clearInterval(interval);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [loadSettings, connectWebSocket]);

  return (
    <UiSettingsContext.Provider value={{
      settings,
      loading,
      updateSetting,
      getSetting,
      isFeatureEnabled,
      refreshSettings
    }}>
      {children}
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings() {
  const context = useContext(UiSettingsContext);
  if (context === undefined) {
    throw new Error('useUiSettings must be used within a UiSettingsProvider');
  }
  return context;
}

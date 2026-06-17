// Shared broadcast module for WebSocket events
// This allows routes to broadcast events without direct dependency on the WS server
import { invalidateStoreCache } from './utils/cache.js';

type BroadcastFn = (type: string, payload: any) => void;

let _broadcast: BroadcastFn | null = null;
let _settingsVersion = Date.now();

export function registerBroadcast(fn: BroadcastFn) {
  _broadcast = fn;
}

export function broadcastEvent(type: string, payload: any) {
  if (_broadcast) {
    _broadcast(type, payload);
  }
}

export function broadcastSettingsChanged(changedKey?: string) {
  _settingsVersion = Date.now();
  // إبطال كاش الإعدادات عند كل تغيير
  invalidateStoreCache();
  broadcastEvent('settings_changed', {
    version: _settingsVersion,
    changedKey,
    timestamp: new Date().toISOString(),
  });
}

export function getSettingsVersion(): number {
  return _settingsVersion;
}

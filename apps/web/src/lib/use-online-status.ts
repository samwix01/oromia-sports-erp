'use client';
import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/**
 * Number of offline changes waiting to sync. The IndexedDB outbox arrives with M4-T08;
 * until then nothing is queued, and the indicator still shows so users learn where to look.
 */
export function usePendingSyncCount(): number {
  return 0;
}

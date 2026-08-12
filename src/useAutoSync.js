import { useEffect, useRef, useState } from 'react';
import { api } from './api';

const POLL_MS = 10000;
let started = false;
let lastSyncSeen = null;
let syncedSeen = null;

async function tick() {
  try {
    const s = await api.get('/sync/status');
    const first = lastSyncSeen === null && !syncedSeen;
    const changed = lastSyncSeen !== null && s.lastSync !== lastSyncSeen;
    const firstSync = !syncedSeen && s.synced && s.lastSync;
    lastSyncSeen = s.lastSync;
    syncedSeen = !!s.synced;
    if (!first && (changed || firstSync)) {
      window.dispatchEvent(new CustomEvent('invoix:synced', { detail: s }));
    }
  } catch (e) {
    if (e && e.status === 401) {
      api.clearSession();
      window.location.href = '/login';
    }
  }
}

export function startAutoSync() {
  if (started) return;
  started = true;
  tick();
  setInterval(tick, POLL_MS);
}

export function forceSyncCheck() {
  tick();
}

export function useSyncStatus() {
  const [status, setStatus] = useState({ loading: true, synced: null, lastSync: null });
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      api.get('/sync/status')
        .then((s) => {
          if (!alive) return;
          setStatus({ loading: false, synced: !!s.synced, lastSync: s.lastSync });
          lastSyncSeen = s.lastSync;
          syncedSeen = !!s.synced;
        })
        .catch((e) => {
          if (!alive) return;
          if (e && e.status === 401) {
            api.clearSession();
            window.location.href = '/login';
          } else {
            setStatus((p) => ({ ...p, loading: false }));
          }
        });
    };
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return status;
}

export function useAutoRefresh(fetcher) {
  const ref = useRef(fetcher);
  ref.current = fetcher;
  useEffect(() => {
    const onSync = () => {
      if (typeof ref.current === 'function') ref.current();
    };
    window.addEventListener('invoix:synced', onSync);
    return () => window.removeEventListener('invoix:synced', onSync);
  }, []);
}

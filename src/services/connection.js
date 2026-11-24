// navigator.onLine бывает true и без интернета (Wi-Fi без доступа), поэтому статус
// подтверждается реальным запросом к серверу.

const PING_URL = `${import.meta.env.BASE_URL}manifest.json`;
const RECHECK_MS = 5_000;

let online = typeof navigator === 'undefined' ? true : navigator.onLine;
let recheckTimer = null;
const listeners = new Set();

function setOnline(value) {
  if (value === online) return;
  online = value;
  listeners.forEach((listener) => listener());
}

// Запрос с ?ping Service Worker не перехватывает — он всегда идёт в сеть
export async function checkConnection(timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${PING_URL}?ping=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function recheckConnection() {
  const ok = navigator.onLine && (await checkConnection());
  setOnline(ok);
  clearTimeout(recheckTimer);
  if (!ok && navigator.onLine) recheckTimer = setTimeout(recheckConnection, RECHECK_MS);
  return ok;
}

let pendingCheck = null;

// Вызывается из tmdb.js при сетевой ошибке или ответе из кэша SW
export function reportNetworkFailure() {
  if (!pendingCheck) pendingCheck = recheckConnection().finally(() => (pendingCheck = null));
  return pendingCheck;
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    clearTimeout(recheckTimer);
    setOnline(false);
  });
  window.addEventListener('online', () => {
    recheckConnection();
  });
  if (navigator.onLine) setTimeout(reportNetworkFailure, 0);
}

export const getOnlineStatus = () => online;

export function subscribeToOnlineStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* eslint-disable no-restricted-globals */
// vite-plugin-pwa подставляет сюда список файлов сборки: [{ url, revision }]
const PRECACHE_MANIFEST = self.__WB_MANIFEST;
const SCOPE = self.registration.scope;

// Версия оболочки считается из списка файлов сборки: каждый деплой → новое имя кэша.
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
const BUILD_VERSION = hashString(PRECACHE_MANIFEST.map((e) => `${e.url}@${e.revision ?? ''}`).join('|'));

const RUNTIME_VERSION = 'v1';
const PREFIX = 'kadr';

const CACHES = {
  shell: `${PREFIX}-shell-${BUILD_VERSION}`,
  images: `${PREFIX}-images-${RUNTIME_VERSION}`,
  fonts: `${PREFIX}-fonts-${RUNTIME_VERSION}`,
  api: `${PREFIX}-api-${RUNTIME_VERSION}`,
  pages: `${PREFIX}-pages-${RUNTIME_VERSION}`, // только отметки «эта страница уже открывалась»
};

const DAY = 24 * 60 * 60 * 1000;
const LIMITS = {
  images: { maxEntries: 150, maxAgeMs: 30 * DAY },
  fonts: { maxEntries: 30, maxAgeMs: 365 * DAY },
  api: { maxEntries: 120, maxAgeMs: 3 * DAY },
  pages: { maxEntries: 80, maxAgeMs: 30 * DAY },
};

const NETWORK_TIMEOUT_MS = { navigation: 5000, api: 6000 };

const toAbsolute = (url) => new URL(url, SCOPE).href;
const PRECACHE_URLS = [...new Set(PRECACHE_MANIFEST.map((e) => toAbsolute(e.url)))];
const PRECACHE_SET = new Set(PRECACHE_URLS);
const APP_SHELL_URL = toAbsolute('index.html');
const OFFLINE_URL = toAbsolute('offline.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHES.shell);
      // cache: 'reload' — мимо HTTP-кэша браузера, иначе можно закэшировать старые файлы
      await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })));
    })(),
  );
  // skipWaiting() не вызываем: новая версия ждёт кнопку «Обновить» (сообщение SKIP_WAITING)
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const current = new Set(Object.values(CACHES));
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith(`${PREFIX}-`) && !current.has(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

const TMDB_PRIVATE = /^\/3\/(authentication|account|guest_session|session)/;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    if (url.href.startsWith(SCOPE)) event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (!url.search && PRECACHE_SET.has(url.href)) {
      event.respondWith(cacheFirst(request, CACHES.shell));
    } else if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname)) {
      event.respondWith(cacheFirst(request, CACHES.images, LIMITS.images));
    }
    return; // остальное (например ?ping для проверки связи) — прямо в сеть
  }

  switch (url.hostname) {
    case 'image.tmdb.org':
      event.respondWith(cacheFirst(request, CACHES.images, { ...LIMITS.images, preferCors: true }));
      return;
    case 'fonts.gstatic.com':
      event.respondWith(cacheFirst(request, CACHES.fonts, LIMITS.fonts));
      return;
    case 'fonts.googleapis.com':
      event.respondWith(staleWhileRevalidate(event, CACHES.fonts, LIMITS.fonts));
      return;
    case 'api.themoviedb.org':
      if (url.pathname.startsWith('/3/') && !TMDB_PRIVATE.test(url.pathname)) {
        event.respondWith(networkFirstApi(request));
      }
      return;
    default:
      // Firebase Auth, Firestore и т. п.: без respondWith запрос идёт в сеть и не кэшируется
      return;
  }
});

async function handleNavigation(request) {
  const url = new URL(request.url);
  const pageKey = url.origin + url.pathname;

  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS.navigation);
    // GitHub Pages отдаёт маршруты SPA через 404.html со статусом 404 — это рабочая страница
    if (response.ok || response.status === 404) rememberPage(pageKey);
    return response;
  } catch {
    const shell = await caches.match(APP_SHELL_URL, { cacheName: CACHES.shell });
    const isHome = pageKey === SCOPE || pageKey === APP_SHELL_URL;
    const isOfflineRoute = pageKey === toAbsolute('offline');
    // Отдаём оболочку текущей версии, а не сохранённый HTML: тот мог ссылаться на удалённые JS-файлы
    if (shell && (isHome || isOfflineRoute || (await wasVisited(pageKey)))) return shell;
    return offlinePage();
  }
}

async function offlinePage() {
  const cached = await caches.match(OFFLINE_URL, { cacheName: CACHES.shell });
  if (!cached) {
    return new Response('<h1>Нет подключения к интернету</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
  const html = (await cached.text()).replaceAll('__KADR_SCOPE__', SCOPE);
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function rememberPage(pageKey) {
  try {
    const cache = await caches.open(CACHES.pages);
    await cache.put(pageKey, withTimestamp(new Response('1')));
    await trimCache(CACHES.pages, LIMITS.pages.maxEntries);
  } catch {}
}

async function wasVisited(pageKey) {
  const cache = await caches.open(CACHES.pages);
  return Boolean(await matchFresh(cache, pageKey, LIMITS.pages.maxAgeMs));
}

async function cacheFirst(request, cacheName, { maxEntries, maxAgeMs, preferCors } = {}) {
  const cache = await caches.open(cacheName);
  const cached = await matchFresh(cache, request.url, maxAgeMs);
  if (cached) return cached;

  try {
    const response = await fetchForCache(request, preferCors);
    if (response.ok || response.type === 'opaque') {
      const copy = response.clone();
      cache
        .put(request.url, response.type === 'opaque' ? copy : withTimestamp(copy))
        .then(() => maxEntries && trimCache(cacheName, maxEntries))
        .catch(() => {});
    }
    return response;
  } catch {
    const stale = await cache.match(request.url);
    return stale ?? Response.error();
  }
}

async function staleWhileRevalidate(event, cacheName, { maxEntries } = {}) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request.url);

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request.url, withTimestamp(response.clone()));
        if (maxEntries) await trimCache(cacheName, maxEntries);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) ?? Response.error();
}

// При ответе из кэша добавляем X-Kadr-Cache — это offline flag для UI
async function networkFirstApi(request) {
  const cache = await caches.open(CACHES.api);
  const key = apiCacheKey(request.url);

  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS.api);
    if (response.ok) {
      await cache.put(key, withTimestamp(response.clone(), { cors: true }));
      trimCache(CACHES.api, LIMITS.api.maxEntries).catch(() => {});
      return response;
    }
    if (response.status < 500) return response;
    throw new Error(`TMDB ${response.status}`);
  } catch {
    const cached = await matchFresh(cache, key, LIMITS.api.maxAgeMs);
    if (cached) return markAsCached(cached);
    return Response.error();
  }
}

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// <img> грузится в режиме no-cors, и ответ opaque: Chrome считает каждый такой ответ в квоте
// за несколько МБ. image.tmdb.org поддерживает CORS, поэтому запрашиваем картинку в режиме cors.
async function fetchForCache(request, preferCors) {
  if (preferCors && request.mode === 'no-cors') {
    try {
      return await fetch(request.url, { mode: 'cors', credentials: 'omit' });
    } catch {
      // без CORS-заголовков — обычный запрос
    }
  }
  return fetch(request);
}

// api_key не должен попадать в кэш
function apiCacheKey(href) {
  const url = new URL(href);
  url.searchParams.delete('api_key');
  url.searchParams.sort();
  return url.href;
}

// Без Expose-Headers приложение не сможет прочитать эти заголовки у ответа с другого домена
const CACHE_HEADERS = 'X-Kadr-Cache, X-Kadr-Cached-At';

function withTimestamp(response, { cors = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set('X-Kadr-Cached-At', String(Date.now()));
  if (cors) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', CACHE_HEADERS);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function markAsCached(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Kadr-Cache', 'hit');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', CACHE_HEADERS);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function matchFresh(cache, key, maxAgeMs) {
  const response = await cache.match(key);
  if (!response || !maxAgeMs) return response;
  const cachedAt = Number(response.headers.get('X-Kadr-Cached-At'));
  if (!cachedAt) return response; // opaque-ответ: отметку времени не добавить, живёт до вытеснения по лимиту
  if (Date.now() - cachedAt > maxAgeMs) {
    await cache.delete(key);
    return undefined;
  }
  return response;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const extra = keys.length - maxEntries;
  if (extra > 0) await Promise.all(keys.slice(0, extra).map((key) => cache.delete(key)));
}

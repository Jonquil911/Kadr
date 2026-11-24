/**
 * Общие кирпичики для серверных данных в Redux.
 *
 * Каждый загружаемый ресурс хранится как «запись» (entry):
 *   { data, status: 'idle' | 'loading' | 'succeeded' | 'failed', error, fetchedAt, requestId, invalidated }
 *
 * - status и error — состояния загрузки и ошибки для UI;
 * - fetchedAt — когда данные пришли, по нему считается свежесть (TTL);
 * - requestId — id последнего запроса: ответ более старого запроса игнорируется (stale requests);
 * - invalidated — данные помечены устаревшими и будут перезапрошены (после мутации, возврата сети).
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { getOnlineStatus } from '../services/connection';

/** Сколько данные считаются свежими. */
export const TTL = {
  catalog: 5 * 60 * 1000, // списки TMDB — 5 минут
  details: 30 * 60 * 1000, // карточка фильма меняется редко
  genres: 24 * 60 * 60 * 1000, // справочник жанров — сутки
  user: 60 * 1000, // личные данные — минута + обновление при возвращении на вкладку
};

export const createEntry = () => ({
  data: undefined,
  status: 'idle',
  error: null,
  fetchedAt: 0,
  requestId: null,
  invalidated: false,
});

/**
 * Нужен ли запрос. Используется в `condition` каждого thunk:
 * если вернуть false, thunk не запускается вообще — так нет дублей и лишних запросов.
 */
export function shouldFetch(entry, { ttl, force = false, requiresOnline = false }) {
  if (requiresOnline && !getOnlineStatus()) return false; // личные данные офлайн не запрашиваем
  if (!entry) return true;
  if (entry.status === 'loading') return false; // такой же запрос уже идёт
  if (force || entry.invalidated) return true;
  if (entry.status !== 'succeeded') return true; // idle или failed — пробуем снова
  if (entry.data?.cache) return true; // ответ из кэша Service Worker — сразу считается устаревшим
  return Date.now() - entry.fetchedAt > ttl;
}

/** Ошибка в Redux должна быть простым объектом. status нужен для 404, code — для текстов ошибок Firebase. */
export const serializeError = (error) => ({
  name: error?.name ?? 'Error',
  message: error?.message ?? 'Неизвестная ошибка',
  code: error?.code,
  status: error?.status,
});

// повтор бессмыслен: нет сети/ключа, неверный ключ, нет прав, не найдено
const NO_RETRY_STATUS = [0, 401, 403, 404];
const NO_RETRY_CODES = ['permission-denied', 'app/not-configured', 'not-found', 'failed-precondition'];

/** Автоматический повтор временных ошибок: до 2 раз, с паузой 1 и 2 секунды. */
export async function withRetry(fn, { signal, retries = 2 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const fatal =
        signal?.aborted ||
        error?.name === 'AbortError' ||
        NO_RETRY_STATUS.includes(error?.status) ||
        NO_RETRY_CODES.includes(error?.code);
      if (fatal || attempt >= retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Thunk загрузки с кэшем: condition решает, нужен ли запрос, signal позволяет его отменить,
 * withRetry повторяет временные ошибки. В payload — данные и время получения.
 */
export function createCachedThunk(typePrefix, { fetcher, selectEntry, ttl, requiresOnline = false }) {
  return createAsyncThunk(
    typePrefix,
    async (arg, { signal }) => {
      const data = await withRetry(() => fetcher(arg, signal), { signal });
      return { data, fetchedAt: Date.now() };
    },
    {
      condition: (arg, { getState }) =>
        shouldFetch(selectEntry(getState(), arg), { ttl, force: arg?.force, requiresOnline }),
      serializeError,
    },
  );
}

/* ---------- Обработка pending / fulfilled / rejected для записи ---------- */

export function markPending(entry, action) {
  entry.status = 'loading';
  entry.requestId = action.meta.requestId;
  entry.invalidated = false;
  entry.error = null;
}

/** Возвращает false, если ответ устарел: пришёл не от последнего запроса. */
export function markFulfilled(entry, action) {
  if (!entry || entry.requestId !== action.meta.requestId) return false;
  entry.status = 'succeeded';
  entry.data = action.payload.data;
  entry.fetchedAt = action.payload.fetchedAt;
  entry.requestId = null;
  entry.error = null;
  return true;
}

export function markRejected(entry, action) {
  if (!entry || entry.requestId !== action.meta.requestId) return;
  entry.requestId = null;
  if (action.meta.aborted) {
    // запрос отменён (пользователь ушёл к другим фильтрам) — это не ошибка
    entry.status = entry.data === undefined ? 'idle' : 'succeeded';
    return;
  }
  entry.status = 'failed';
  entry.error = action.error;
}

/** Отменить учёт идущего запроса: его ответ будет проигнорирован (аналог cancelQueries). */
export function cancelInFlight(entry) {
  if (entry.status !== 'loading') return;
  entry.requestId = null;
  entry.status = entry.data === undefined ? 'idle' : 'succeeded';
}

/** После возврата сети: всё, что пришло из кэша SW или упало с ошибкой, перезапросить. */
export function invalidateIfNeeded(entry) {
  if (entry.status === 'failed' || entry.data?.cache) entry.invalidated = true;
}

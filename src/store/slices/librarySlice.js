/**
 * Библиотека пользователя: статусы, оценки, рецензии, избранное (Firestore users/{uid}/library).
 * Мутация saveLibraryEntry обновляет данные оптимистично:
 *   pending   — сразу меняем список и запоминаем снимок «как было»;
 *   rejected  — возвращаем снимок;
 *   в конце   — перечитываем библиотеку с сервера.
 */
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { getLibrary, removeLibraryItem, saveLibraryItem } from '../../services/userDataService';
import { mediaKey } from '../../utils/media';
import { computeStats } from '../../utils/stats';
import {
  TTL,
  cancelInFlight,
  createCachedThunk,
  createEntry,
  markFulfilled,
  markPending,
  markRejected,
  serializeError,
} from '../requestState';
import { clearUserData, invalidateUserData, revalidateAfterReconnect } from '../sessionActions';

export const isEmptyEntry = (entry) => !entry.status && entry.rating == null && !entry.favorite && !entry.review;

const initialState = { ...createEntry(), uid: null, snapshots: {} };

/* ---------- Thunks ---------- */

export const fetchLibrary = createCachedThunk('library/fetch', {
  fetcher: ({ uid }) => getLibrary(uid),
  selectEntry: (state, { uid }) => (state.library.uid === uid ? state.library : undefined),
  ttl: TTL.user,
  requiresOnline: true,
});

/** Создание, изменение или удаление записи — одна мутация на всё. */
export const saveLibraryEntry = createAsyncThunk(
  'library/saveEntry',
  async ({ uid, media, patch, current }, { dispatch }) => {
    try {
      const next = { ...current, ...patch };
      if (isEmptyEntry(next)) {
        if (current) await removeLibraryItem(uid, mediaKey(media.mediaType, media.id));
        return { removed: true };
      }
      await saveLibraryItem(uid, media, patch);
      return { removed: false };
    } finally {
      dispatch(fetchLibrary({ uid, force: true })); // перечитать данные после мутации при любом исходе
    }
  },
  { serializeError },
);

/* ---------- Slice ---------- */

function buildOptimisticItem({ media, patch, current, now }) {
  const base = current ?? {
    id: mediaKey(media.mediaType, media.id),
    mediaId: media.id,
    mediaType: media.mediaType,
    title: media.title,
    posterPath: media.posterPath,
    year: media.year,
    genres: media.genres?.map((g) => g.name ?? g) ?? [],
    runtime: media.runtime ?? 0,
    status: null,
    rating: null,
    review: '',
    favorite: false,
    addedAt: now,
  };
  const next = { ...base, ...patch, updatedAt: now };
  if (patch.status === 'watched' && !base.watchedAt) next.watchedAt = now;
  return next;
}

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLibrary.pending, (state, action) => {
        if (state.uid !== action.meta.arg.uid) Object.assign(state, initialState, { uid: action.meta.arg.uid });
        markPending(state, action);
      })
      .addCase(fetchLibrary.fulfilled, (state, action) => {
        markFulfilled(state, action);
      })
      .addCase(fetchLibrary.rejected, (state, action) => {
        markRejected(state, action);
      })

      .addCase(saveLibraryEntry.pending, (state, action) => {
        const { requestId, arg } = action.meta;
        // идущая загрузка библиотеки принесла бы старые данные — её ответ игнорируем
        cancelInFlight(state);
        const items = state.data ?? [];
        state.snapshots[requestId] = items;
        const next = buildOptimisticItem(arg);
        const rest = items.filter((item) => item.id !== next.id);
        state.data = isEmptyEntry(next) ? rest : [next, ...rest];
      })
      .addCase(saveLibraryEntry.fulfilled, (state, action) => {
        delete state.snapshots[action.meta.requestId];
      })
      .addCase(saveLibraryEntry.rejected, (state, action) => {
        const snapshot = state.snapshots[action.meta.requestId];
        if (snapshot) state.data = snapshot; // откат оптимистичного изменения
        delete state.snapshots[action.meta.requestId];
      })

      .addCase(clearUserData, () => initialState)
      .addCase(invalidateUserData, (state, action) => {
        if (state.status === 'succeeded' && action.payload.now - state.fetchedAt >= action.payload.olderThan) {
          state.invalidated = true;
        }
      })
      .addCase(revalidateAfterReconnect, (state) => {
        if (state.status === 'failed') state.invalidated = true;
      });
  },
});

export default librarySlice.reducer;

/* ---------- Селекторы ---------- */

const EMPTY = [];

/** Запись библиотеки целиком (данные + статус загрузки). */
export const selectLibraryState = (state) => state.library;

/** Список фильмов в библиотеке; пустой массив всегда один и тот же — без лишних перерисовок. */
export const selectLibraryItems = (state) => state.library.data ?? EMPTY;

/** Мемоизированный: Map «ключ фильма → запись», чтобы отмечать фильмы на карточках каталога. */
export const selectLibraryIndex = createSelector([selectLibraryItems], (items) => new Map(items.map((i) => [i.id, i])));

/** Запись одного фильма по ключу `${mediaType}_${id}`. */
export const selectLibraryEntry = (state, key) => (key ? (selectLibraryIndex(state).get(key) ?? null) : null);

/** Мемоизированный: список «Хочу посмотреть» для полки на главной. */
export const selectWatchlist = createSelector([selectLibraryItems], (items) =>
  items.filter((i) => i.status === 'watchlist'),
);

/** Мемоизированный: вся статистика кабинета — пересчитывается только при изменении библиотеки. */
export const selectLibraryStats = createSelector([selectLibraryItems], computeStats);

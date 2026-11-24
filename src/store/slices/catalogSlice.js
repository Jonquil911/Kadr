/**
 * Каталог TMDB: списки по фильтрам, тренды, подборки главной и жанры.
 * Каждый набор параметров — отдельная запись в entries под своим ключом,
 * поэтому каждая комбинация фильтров и каждая страница кэшируется отдельно.
 */
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { fetchCollectionList, fetchGenres, fetchMediaList, fetchTrending } from '../../services/tmdb';
import {
  TTL,
  createCachedThunk,
  createEntry,
  invalidateIfNeeded,
  markFulfilled,
  markPending,
  markRejected,
} from '../requestState';
import { revalidateAfterReconnect } from '../sessionActions';

const MAX_ENTRIES = 80; // старые неиспользуемые списки вытесняются, чтобы память не росла бесконечно

const stableStringify = (obj) =>
  JSON.stringify(Object.keys(obj).sort().reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {}));

export const catalogKeys = {
  list: (filters) => `list:${stableStringify(filters)}`,
  trending: (mediaType) => `trending:${mediaType}`,
  collection: (mediaType, list) => `collection:${mediaType}:${list}`,
  genres: (mediaType) => `genres:${mediaType}`,
};

export const selectCatalogEntry = (state, key) => state.catalog.entries[key];

/* ---------- Thunks ---------- */

export const fetchCatalogList = createCachedThunk('catalog/fetchList', {
  fetcher: ({ filters }, signal) => fetchMediaList(filters, signal),
  selectEntry: (state, { filters }) => selectCatalogEntry(state, catalogKeys.list(filters)),
  ttl: TTL.catalog,
});

export const fetchTrendingList = createCachedThunk('catalog/fetchTrending', {
  fetcher: ({ mediaType }, signal) => fetchTrending(mediaType, signal),
  selectEntry: (state, { mediaType }) => selectCatalogEntry(state, catalogKeys.trending(mediaType)),
  ttl: TTL.catalog,
});

export const fetchCollectionShelf = createCachedThunk('catalog/fetchCollection', {
  fetcher: ({ mediaType, list }, signal) => fetchCollectionList(mediaType, list, signal),
  selectEntry: (state, { mediaType, list }) => selectCatalogEntry(state, catalogKeys.collection(mediaType, list)),
  ttl: TTL.catalog,
});

export const fetchGenreList = createCachedThunk('catalog/fetchGenres', {
  fetcher: ({ mediaType }, signal) => fetchGenres(mediaType, signal),
  selectEntry: (state, { mediaType }) => selectCatalogEntry(state, catalogKeys.genres(mediaType)),
  ttl: TTL.genres,
});

const thunks = [fetchCatalogList, fetchTrendingList, fetchCollectionShelf, fetchGenreList];

/** Ключ записи по действию любого из четырёх thunks. */
function keyOf(action) {
  const arg = action.meta.arg;
  const is = (thunk) => action.type.startsWith(`${thunk.typePrefix}/`);
  if (is(fetchCatalogList)) return catalogKeys.list(arg.filters);
  if (is(fetchTrendingList)) return catalogKeys.trending(arg.mediaType);
  if (is(fetchCollectionShelf)) return catalogKeys.collection(arg.mediaType, arg.list);
  return catalogKeys.genres(arg.mediaType);
}

function prune(entries) {
  const keys = Object.keys(entries);
  if (keys.length <= MAX_ENTRIES) return;
  keys
    .filter((key) => entries[key].status !== 'loading')
    .sort((a, b) => entries[a].fetchedAt - entries[b].fetchedAt)
    .slice(0, keys.length - MAX_ENTRIES)
    .forEach((key) => delete entries[key]);
}

const catalogSlice = createSlice({
  name: 'catalog',
  initialState: { entries: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(revalidateAfterReconnect, (state) => {
        Object.values(state.entries).forEach(invalidateIfNeeded);
      })
      .addMatcher(isAnyOf(...thunks.map((t) => t.pending)), (state, action) => {
        const key = keyOf(action);
        state.entries[key] ??= createEntry();
        markPending(state.entries[key], action);
      })
      .addMatcher(isAnyOf(...thunks.map((t) => t.fulfilled)), (state, action) => {
        if (markFulfilled(state.entries[keyOf(action)], action)) prune(state.entries);
      })
      .addMatcher(isAnyOf(...thunks.map((t) => t.rejected)), (state, action) => {
        markRejected(state.entries[keyOf(action)], action);
      });
  },
});

export default catalogSlice.reducer;

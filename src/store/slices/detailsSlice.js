/** Карточки фильмов и сериалов TMDB по ключу `${mediaType}:${id}`. */
import { createSlice } from '@reduxjs/toolkit';
import { fetchMediaDetails } from '../../services/tmdb';
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

const MAX_ENTRIES = 60;

export const detailsKey = (mediaType, id) => `${mediaType}:${id}`;

export const selectDetailsEntry = (state, mediaType, id) => state.details.entries[detailsKey(mediaType, id)];

export const fetchDetails = createCachedThunk('details/fetch', {
  fetcher: ({ mediaType, id }, signal) => fetchMediaDetails(mediaType, id, signal),
  selectEntry: (state, { mediaType, id }) => selectDetailsEntry(state, mediaType, id),
  ttl: TTL.details,
});

const keyOf = (action) => detailsKey(action.meta.arg.mediaType, action.meta.arg.id);

const detailsSlice = createSlice({
  name: 'details',
  initialState: { entries: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDetails.pending, (state, action) => {
        const key = keyOf(action);
        state.entries[key] ??= createEntry();
        markPending(state.entries[key], action);
      })
      .addCase(fetchDetails.fulfilled, (state, action) => {
        if (!markFulfilled(state.entries[keyOf(action)], action)) return;
        const keys = Object.keys(state.entries);
        if (keys.length > MAX_ENTRIES) {
          keys
            .filter((k) => state.entries[k].status !== 'loading')
            .sort((a, b) => state.entries[a].fetchedAt - state.entries[b].fetchedAt)
            .slice(0, keys.length - MAX_ENTRIES)
            .forEach((k) => delete state.entries[k]);
        }
      })
      .addCase(fetchDetails.rejected, (state, action) => {
        markRejected(state.entries[keyOf(action)], action);
      })
      .addCase(revalidateAfterReconnect, (state) => {
        Object.values(state.entries).forEach(invalidateIfNeeded);
      });
  },
});

export default detailsSlice.reducer;

/** История просмотренных страниц (Firestore users/{uid}/history). */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { addHistoryEntry, clearHistory, getHistory, removeHistoryEntry } from '../../services/userDataService';
import { getOnlineStatus } from '../../services/connection';
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

const initialState = { ...createEntry(), uid: null, snapshots: {} };

export const fetchHistory = createCachedThunk('history/fetch', {
  fetcher: ({ uid }) => getHistory(uid),
  selectEntry: (state, { uid }) => (state.history.uid === uid ? state.history : undefined),
  ttl: TTL.user,
  requiresOnline: true,
});

/** Запись открытой страницы фильма. История лишь помечается устаревшей и обновится, когда её откроют. */
export const trackView = createAsyncThunk('history/trackView', ({ uid, media }) => addHistoryEntry(uid, media), {
  condition: () => getOnlineStatus(),
  serializeError,
});

export const removeHistoryItem = createAsyncThunk(
  'history/remove',
  async ({ uid, key }, { dispatch }) => {
    try {
      await removeHistoryEntry(uid, key);
    } finally {
      dispatch(fetchHistory({ uid, force: true }));
    }
  },
  { serializeError },
);

export const clearHistoryThunk = createAsyncThunk(
  'history/clear',
  async ({ uid }, { dispatch }) => {
    try {
      await clearHistory(uid);
    } finally {
      dispatch(fetchHistory({ uid, force: true }));
    }
  },
  { serializeError },
);

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHistory.pending, (state, action) => {
        if (state.uid !== action.meta.arg.uid) Object.assign(state, initialState, { uid: action.meta.arg.uid });
        markPending(state, action);
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        markFulfilled(state, action);
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        markRejected(state, action);
      })
      .addCase(trackView.fulfilled, (state) => {
        if (state.status === 'succeeded') state.invalidated = true;
      })
      // удаление одной записи — оптимистично
      .addCase(removeHistoryItem.pending, (state, action) => {
        cancelInFlight(state);
        state.snapshots[action.meta.requestId] = state.data ?? [];
        state.data = (state.data ?? []).filter((e) => e.id !== action.meta.arg.key);
      })
      .addCase(removeHistoryItem.rejected, (state, action) => {
        const snapshot = state.snapshots[action.meta.requestId];
        if (snapshot) state.data = snapshot;
        delete state.snapshots[action.meta.requestId];
      })
      .addCase(removeHistoryItem.fulfilled, (state, action) => {
        delete state.snapshots[action.meta.requestId];
      })
      .addCase(clearHistoryThunk.pending, (state) => {
        cancelInFlight(state);
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

export default historySlice.reducer;

const EMPTY = [];
export const selectHistoryState = (state) => state.history;
export const selectHistoryItems = (state) => state.history.data ?? EMPTY;

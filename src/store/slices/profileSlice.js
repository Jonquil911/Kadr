/** Документ профиля в Firestore users/{uid}: о себе, цель на год, цвет аватара, любимые жанры. */
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getUserProfile, updateUserProfileDoc } from '../../services/userDataService';
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

export const fetchUserProfile = createCachedThunk('profile/fetch', {
  fetcher: ({ uid }) => getUserProfile(uid),
  selectEntry: (state, { uid }) => (state.profile.uid === uid ? state.profile : undefined),
  ttl: TTL.user,
  requiresOnline: true,
});

/** Изменение документа профиля. optimistic: true — интерфейс меняется до ответа сервера. */
export const updateProfileDoc = createAsyncThunk(
  'profile/update',
  async ({ uid, patch }, { dispatch }) => {
    try {
      await updateUserProfileDoc(uid, patch);
    } finally {
      dispatch(fetchUserProfile({ uid, force: true }));
    }
  },
  { serializeError },
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state, action) => {
        if (state.uid !== action.meta.arg.uid) Object.assign(state, initialState, { uid: action.meta.arg.uid });
        markPending(state, action);
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        markFulfilled(state, action);
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        markRejected(state, action);
      })
      .addCase(updateProfileDoc.pending, (state, action) => {
        cancelInFlight(state);
        if (!action.meta.arg.optimistic) return;
        state.snapshots[action.meta.requestId] = state.data ?? null;
        state.data = { ...state.data, ...action.meta.arg.patch };
      })
      .addCase(updateProfileDoc.rejected, (state, action) => {
        if (action.meta.requestId in state.snapshots) state.data = state.snapshots[action.meta.requestId];
        delete state.snapshots[action.meta.requestId];
      })
      .addCase(updateProfileDoc.fulfilled, (state, action) => {
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

export default profileSlice.reducer;

export const selectProfileState = (state) => state.profile;

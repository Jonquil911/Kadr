/** Пользовательские подборки (Firestore users/{uid}/collections). */
import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import {
  createCollection,
  deleteCollection,
  getCollections,
  toggleCollectionItem,
  updateCollection,
} from '../../services/userDataService';
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

export const fetchCollections = createCachedThunk('collections/fetch', {
  fetcher: ({ uid }) => getCollections(uid),
  selectEntry: (state, { uid }) => (state.collections.uid === uid ? state.collections : undefined),
  ttl: TTL.user,
  requiresOnline: true,
});

/** Мутация подборки: после выполнения (успех или ошибка) список перечитывается с сервера. */
const collectionMutation = (name, run) =>
  createAsyncThunk(
    `collections/${name}`,
    async (arg, { dispatch }) => {
      try {
        return await run(arg);
      } finally {
        dispatch(fetchCollections({ uid: arg.uid, force: true }));
      }
    },
    { serializeError },
  );

export const createCollectionThunk = collectionMutation('create', ({ uid, data }) => createCollection(uid, data));
export const updateCollectionThunk = collectionMutation('update', ({ uid, id, patch }) => updateCollection(uid, id, patch));
export const deleteCollectionThunk = collectionMutation('delete', ({ uid, id }) => deleteCollection(uid, id));
export const toggleCollectionItemThunk = collectionMutation('toggleItem', ({ uid, collectionId, media }) =>
  toggleCollectionItem(uid, collectionId, media),
);

const collectionsSlice = createSlice({
  name: 'collections',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollections.pending, (state, action) => {
        if (state.uid !== action.meta.arg.uid) Object.assign(state, initialState, { uid: action.meta.arg.uid });
        markPending(state, action);
      })
      .addCase(fetchCollections.fulfilled, (state, action) => {
        markFulfilled(state, action);
      })
      .addCase(fetchCollections.rejected, (state, action) => {
        markRejected(state, action);
      })

      // удаление — оптимистично: подборка сразу исчезает из списка, при ошибке возвращается
      .addCase(deleteCollectionThunk.pending, (state, action) => {
        cancelInFlight(state);
        state.snapshots[action.meta.requestId] = state.data ?? [];
        state.data = (state.data ?? []).filter((c) => c.id !== action.meta.arg.id);
      })
      .addCase(deleteCollectionThunk.rejected, (state, action) => {
        const snapshot = state.snapshots[action.meta.requestId];
        if (snapshot) state.data = snapshot;
        delete state.snapshots[action.meta.requestId];
      })
      .addCase(deleteCollectionThunk.fulfilled, (state, action) => {
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
      })
      // остальные мутации: идущая загрузка устарела, её ответ игнорируем — сразу после мутации будет новая
      .addMatcher(
        isAnyOf(createCollectionThunk.pending, updateCollectionThunk.pending, toggleCollectionItemThunk.pending),
        (state) => {
          cancelInFlight(state);
        },
      );
  },
});

export default collectionsSlice.reducer;

const EMPTY = [];
export const selectCollectionsState = (state) => state.collections;
export const selectCollectionsList = (state) => state.collections.data ?? EMPTY;

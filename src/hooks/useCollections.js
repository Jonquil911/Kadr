import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  createCollectionThunk,
  deleteCollectionThunk,
  fetchCollections,
  selectCollectionsState,
  toggleCollectionItemThunk,
  updateCollectionThunk,
} from '../store/slices/collectionsSlice';
import { getErrorMessage } from '../utils/errors';
import { useAsyncAction, useCachedQuery } from './useStoreQuery';

export function useCollections() {
  const { user } = useAuth();
  const uid = user?.uid;
  const state = useSelector(selectCollectionsState);
  return useCachedQuery({
    key: uid,
    entry: state.uid === uid ? state : undefined,
    enabled: Boolean(uid),
    requiresOnline: true,
    request: (options) => fetchCollections({ uid, ...options }),
  });
}

/** Мутация подборки: thunk сам перечитывает список после выполнения. */
function useCollectionMutation(makeAction, successMessage) {
  const { user } = useAuth();
  const dispatch = useDispatch();
  return useAsyncAction((vars) => dispatch(makeAction(user.uid, vars)).unwrap(), {
    onSuccess: (result, vars) => {
      const message = typeof successMessage === 'function' ? successMessage(result, vars) : successMessage;
      if (message) toast.success(message);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export const useCreateCollection = () =>
  useCollectionMutation(
    (uid, data) => createCollectionThunk({ uid, data }),
    (_, vars) => `Подборка «${vars.name}» создана`,
  );

export const useUpdateCollection = () =>
  useCollectionMutation((uid, { id, ...patch }) => updateCollectionThunk({ uid, id, patch }), 'Подборка обновлена');

export const useDeleteCollection = () =>
  useCollectionMutation((uid, { id }) => deleteCollectionThunk({ uid, id }), 'Подборка удалена');

export const useToggleCollectionItem = () =>
  useCollectionMutation(
    (uid, { collectionId, media }) => toggleCollectionItemThunk({ uid, collectionId, media }),
    (added, vars) => (added ? `Добавлено в «${vars.collectionName}»` : `Убрано из «${vars.collectionName}»`),
  );

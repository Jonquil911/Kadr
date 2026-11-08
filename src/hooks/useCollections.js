import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { CACHE_TIME, queryKeys } from '../services/queryKeys';
import {
  createCollection,
  deleteCollection,
  getCollections,
  toggleCollectionItem,
  updateCollection,
} from '../services/userDataService';
import { getErrorMessage } from '../utils/errors';

export function useCollections() {
  const { user } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: queryKeys.user.collections(uid),
    queryFn: () => getCollections(uid),
    enabled: Boolean(uid),
    staleTime: CACHE_TIME.user,
    refetchOnWindowFocus: true,
  });
}

/** Все мутации подборок после завершения инвалидируют ключ ['user', uid, 'collections']. */
function useCollectionMutation(mutationFn, successMessage) {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => mutationFn(uid, vars),
    onSuccess: (result, vars) => {
      const message = typeof successMessage === 'function' ? successMessage(result, vars) : successMessage;
      if (message) toast.success(message);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.user.collections(uid) }),
  });
}

export const useCreateCollection = () =>
  useCollectionMutation((uid, data) => createCollection(uid, data), (_, vars) => `Подборка «${vars.name}» создана`);

export const useUpdateCollection = () =>
  useCollectionMutation((uid, { id, ...patch }) => updateCollection(uid, id, patch), 'Подборка обновлена');

export const useDeleteCollection = () =>
  useCollectionMutation((uid, { id }) => deleteCollection(uid, id), 'Подборка удалена');

export const useToggleCollectionItem = () =>
  useCollectionMutation(
    (uid, { collectionId, media }) => toggleCollectionItem(uid, collectionId, media),
    (added, vars) => (added ? `Добавлено в «${vars.collectionName}»` : `Убрано из «${vars.collectionName}»`),
  );

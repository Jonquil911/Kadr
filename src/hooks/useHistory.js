import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { CACHE_TIME, queryKeys } from '../services/queryKeys';
import { addHistoryEntry, clearHistory, getHistory, removeHistoryEntry } from '../services/userDataService';
import { getErrorMessage } from '../utils/errors';

export function useHistory() {
  const { user } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: queryKeys.user.history(uid),
    queryFn: () => getHistory(uid),
    enabled: Boolean(uid),
    staleTime: CACHE_TIME.user,
  });
}

/** Записывает открытую страницу фильма в историю (только для вошедших пользователей). */
export function useTrackView(media) {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const id = media?.id;
  const type = media?.mediaType;

  useEffect(() => {
    if (!uid || !media) return;
    addHistoryEntry(uid, media)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.user.history(uid) }))
      .catch(() => {}); // история — второстепенная функция, ошибку не показываем
    // запись нужна один раз на открытие конкретного фильма
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, id, type]);
}

export function useHistoryActions() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const key = queryKeys.user.history(uid);
  const options = {
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  };

  const remove = useMutation({
    mutationFn: (entryKey) => removeHistoryEntry(uid, entryKey),
    onMutate: async (entryKey) => {
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData(key, (old = []) => old.filter((e) => e.id !== entryKey));
    },
    ...options,
  });

  const clear = useMutation({
    mutationFn: () => clearHistory(uid),
    onSuccess: () => toast.success('История очищена'),
    ...options,
  });

  return { remove, clear };
}

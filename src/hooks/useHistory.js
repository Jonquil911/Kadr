import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  clearHistoryThunk,
  fetchHistory,
  removeHistoryItem,
  selectHistoryState,
  trackView,
} from '../store/slices/historySlice';
import { getErrorMessage } from '../utils/errors';
import { useAsyncAction, useCachedQuery } from './useStoreQuery';

export function useHistory() {
  const { user } = useAuth();
  const uid = user?.uid;
  const state = useSelector(selectHistoryState);
  return useCachedQuery({
    key: uid,
    entry: state.uid === uid ? state : undefined,
    enabled: Boolean(uid),
    requiresOnline: true,
    request: (options) => fetchHistory({ uid, ...options }),
  });
}

/** Записывает открытую страницу фильма в историю (только для вошедших пользователей). */
export function useTrackView(media) {
  const { user } = useAuth();
  const uid = user?.uid;
  const dispatch = useDispatch();
  const id = media?.id;
  const type = media?.mediaType;

  useEffect(() => {
    if (!uid || !media) return;
    dispatch(trackView({ uid, media })); // история — второстепенная функция, ошибку не показываем
    // запись нужна один раз на открытие конкретного фильма
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, id, type]);
}

export function useHistoryActions() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const onError = (error) => toast.error(getErrorMessage(error));

  const remove = useAsyncAction((key) => dispatch(removeHistoryItem({ uid: user.uid, key })).unwrap(), { onError });
  const clear = useAsyncAction(() => dispatch(clearHistoryThunk({ uid: user.uid })).unwrap(), {
    onSuccess: () => toast.success('История очищена'),
    onError,
  });

  return { remove, clear };
}

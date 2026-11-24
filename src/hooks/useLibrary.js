import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  fetchLibrary,
  saveLibraryEntry,
  selectLibraryEntry,
  selectLibraryIndex,
  selectLibraryState,
} from '../store/slices/librarySlice';
import { getErrorMessage } from '../utils/errors';
import { mediaKey } from '../utils/media';
import { useAsyncAction, useCachedQuery } from './useStoreQuery';

/** Вся библиотека пользователя одним запросом — общий источник для всех экранов. */
export function useLibrary() {
  const { user } = useAuth();
  const uid = user?.uid;
  const state = useSelector(selectLibraryState);
  return useCachedQuery({
    key: uid,
    entry: state.uid === uid ? state : undefined,
    enabled: Boolean(uid),
    requiresOnline: true, // офлайн личные данные не загружаются
    request: (options) => fetchLibrary({ uid, ...options }),
  });
}

/** Map «ключ фильма → запись библиотеки» для отметок на карточках. */
export function useLibraryIndex() {
  useLibrary();
  return useSelector(selectLibraryIndex);
}

/** Оптимистичная мутация библиотеки (см. librarySlice). */
function useSaveLibraryEntry() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  return useAsyncAction(
    ({ media, patch, current }) =>
      dispatch(saveLibraryEntry({ uid: user.uid, media, patch, current, now: Date.now() })).unwrap(),
    { onError: (error) => toast.error(getErrorMessage(error)) },
  );
}

/** Удобный набор действий для одного фильма. */
export function useLibraryEntry(media) {
  const { isLoading } = useLibrary();
  const id = media ? mediaKey(media.mediaType, media.id) : null;
  const entry = useSelector((state) => selectLibraryEntry(state, id));
  const mutation = useSaveLibraryEntry();

  const apply = useCallback(
    (patch, message) =>
      mutation.mutate({ media, patch, current: entry }, { onSuccess: () => message && toast.success(message) }),
    [mutation, media, entry],
  );

  return {
    entry,
    isLoading,
    isSaving: mutation.isPending,
    toggleWatchlist: () =>
      entry?.status === 'watchlist'
        ? apply({ status: null }, 'Убрано из списка «Хочу посмотреть»')
        : apply({ status: 'watchlist' }, 'Добавлено в «Хочу посмотреть»'),
    toggleWatched: () =>
      entry?.status === 'watched'
        ? apply({ status: null, rating: null }, 'Отметка «Просмотрено» снята')
        : apply({ status: 'watched' }, 'Отмечено как просмотренное'),
    toggleFavorite: () =>
      apply({ favorite: !entry?.favorite }, entry?.favorite ? 'Убрано из любимых' : 'Добавлено в любимые'),
    // оценка автоматически отмечает фильм просмотренным
    setRating: (rating) => apply({ rating, status: 'watched' }, `Ваша оценка: ${rating}`),
    saveReview: (review) =>
      apply(
        { review: review.trim(), status: entry?.status ?? 'watched' },
        review.trim() ? 'Рецензия сохранена' : 'Рецензия удалена',
      ),
    removeAll: () => apply({ status: null, rating: null, favorite: false, review: '' }, 'Удалено из библиотеки'),
  };
}

/** Действия над записью из кабинета, когда полных данных TMDB нет — хватает сохранённых полей. */
export function useLibraryItemActions() {
  const mutation = useSaveLibraryEntry();
  return useCallback(
    (entry, patch, message) => {
      const media = {
        id: entry.mediaId,
        mediaType: entry.mediaType,
        title: entry.title,
        posterPath: entry.posterPath,
        year: entry.year,
        genres: entry.genres,
        runtime: entry.runtime,
      };
      mutation.mutate({ media, patch, current: entry }, { onSuccess: () => message && toast.success(message) });
    },
    [mutation],
  );
}

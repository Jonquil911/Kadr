import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { CACHE_TIME, queryKeys } from '../services/queryKeys';
import { getLibrary, removeLibraryItem, saveLibraryItem } from '../services/userDataService';
import { mediaKey } from '../utils/media';
import { getErrorMessage } from '../utils/errors';

/** Вся библиотека пользователя одним запросом (кэшируется и переиспользуется всеми экранами кабинета). */
export function useLibrary(options = {}) {
  const { user } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: queryKeys.user.library(uid),
    queryFn: () => getLibrary(uid),
    enabled: Boolean(uid),
    staleTime: CACHE_TIME.user,
    refetchOnWindowFocus: true, // данные могли измениться на другом устройстве
    ...options,
  });
}

const isEmptyEntry = (entry) => !entry.status && entry.rating == null && !entry.favorite && !entry.review;

/**
 * Мутации библиотеки с оптимистичным обновлением:
 * 1) отменяем текущие запросы библиотеки, чтобы их устаревший ответ не перезаписал изменение;
 * 2) сразу меняем кэш — интерфейс реагирует мгновенно;
 * 3) при ошибке откатываем снимок; в любом случае инвалидируем ключ и перечитываем данные.
 */
export function useLibraryMutation() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const key = queryKeys.user.library(uid);

  return useMutation({
    mutationFn: async ({ media, patch, current }) => {
      const next = { ...current, ...patch };
      if (isEmptyEntry(next)) {
        if (current) await removeLibraryItem(uid, mediaKey(media.mediaType, media.id));
        return;
      }
      await saveLibraryItem(uid, media, patch);
    },
    onMutate: async ({ media, patch, current }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      const id = mediaKey(media.mediaType, media.id);
      const now = Date.now();
      queryClient.setQueryData(key, (old = []) => {
        const base = current ?? {
          id,
          mediaId: media.id,
          mediaType: media.mediaType,
          title: media.title,
          posterPath: media.posterPath,
          year: media.year,
          genres: media.genres?.map((g) => g.name ?? g) ?? [],
          runtime: media.runtime ?? 0,
          status: null,
          rating: null,
          review: '',
          favorite: false,
          addedAt: now,
        };
        const next = { ...base, ...patch, updatedAt: now };
        if (patch.status === 'watched' && !base.watchedAt) next.watchedAt = now;
        const rest = old.filter((item) => item.id !== id);
        return isEmptyEntry(next) ? rest : [next, ...rest];
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error(getErrorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Удобный набор действий для одного фильма. */
export function useLibraryEntry(media) {
  const { data: library = [], isLoading } = useLibrary();
  const mutation = useLibraryMutation();
  const id = media ? mediaKey(media.mediaType, media.id) : null;
  const entry = useMemo(() => library.find((item) => item.id === id) ?? null, [library, id]);

  const apply = useCallback(
    (patch, message) =>
      mutation.mutate(
        { media, patch, current: entry },
        { onSuccess: () => message && toast.success(message) },
      ),
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
  const mutation = useLibraryMutation();
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

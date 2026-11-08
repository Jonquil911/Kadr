import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  fetchCollectionList,
  fetchGenres,
  fetchMediaDetails,
  fetchMediaList,
  fetchTrending,
} from '../services/tmdb';
import { CACHE_TIME, queryKeys } from '../services/queryKeys';

/**
 * Каталог с фильтрами. Ключ кэша включает все фильтры, поэтому каждая комбинация
 * (тип, поиск, жанр, год, рейтинг, сортировка, страница) кэшируется отдельно.
 * signal от TanStack Query отменяет устаревший запрос, когда фильтры меняются быстрее,
 * чем приходит ответ, — старый ответ не перезапишет новый.
 */
export function useMediaList(filters) {
  return useQuery({
    queryKey: queryKeys.tmdb.list(filters),
    queryFn: ({ signal }) => fetchMediaList(filters, signal),
    staleTime: CACHE_TIME.catalog,
    placeholderData: keepPreviousData, // при смене страницы старый список виден, пока грузится новый
  });
}

export function useTrending(mediaType = 'all') {
  return useQuery({
    queryKey: queryKeys.tmdb.trending(mediaType),
    queryFn: ({ signal }) => fetchTrending(mediaType, signal),
    staleTime: CACHE_TIME.catalog,
  });
}

export function useMediaCollection(mediaType, list) {
  return useQuery({
    queryKey: queryKeys.tmdb.collection(mediaType, list),
    queryFn: ({ signal }) => fetchCollectionList(mediaType, list, signal),
    staleTime: CACHE_TIME.catalog,
  });
}

export function useGenres(mediaType) {
  return useQuery({
    queryKey: queryKeys.tmdb.genres(mediaType),
    queryFn: ({ signal }) => fetchGenres(mediaType, signal),
    staleTime: CACHE_TIME.genres,
    gcTime: CACHE_TIME.genres,
  });
}

export function useMediaDetails(mediaType, id) {
  return useQuery({
    queryKey: queryKeys.tmdb.details(mediaType, id),
    queryFn: ({ signal }) => fetchMediaDetails(mediaType, id, signal),
    staleTime: CACHE_TIME.details,
    enabled: Boolean(id) && (mediaType === 'movie' || mediaType === 'tv'),
  });
}

/** Предзагрузка карточки при наведении — переход на страницу фильма получается мгновенным. */
export function usePrefetchDetails() {
  const queryClient = useQueryClient();
  return useCallback(
    (mediaType, id) =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.tmdb.details(mediaType, id),
        queryFn: ({ signal }) => fetchMediaDetails(mediaType, id, signal),
        staleTime: CACHE_TIME.details,
      }),
    [queryClient],
  );
}

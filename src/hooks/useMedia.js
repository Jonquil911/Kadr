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

/*
 * PWA: запросы к публичному TMDB выполняются и офлайн (networkMode: 'offlineFirst') —
 * ответ может прийти из кэша Service Worker. Данные, пришедшие из кэша (флаг cache),
 * сразу считаются устаревшими, чтобы при возвращении сети они перезапросились.
 */
const OFFLINE_FIRST = { networkMode: 'offlineFirst' };
const staleUnlessCached = (ms) => (query) => (query.state.data?.cache ? 0 : ms);

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
    staleTime: staleUnlessCached(CACHE_TIME.catalog),
    ...OFFLINE_FIRST,
    placeholderData: keepPreviousData, // при смене страницы старый список виден, пока грузится новый
  });
}

export function useTrending(mediaType = 'all') {
  return useQuery({
    queryKey: queryKeys.tmdb.trending(mediaType),
    queryFn: ({ signal }) => fetchTrending(mediaType, signal),
    staleTime: staleUnlessCached(CACHE_TIME.catalog),
    ...OFFLINE_FIRST,
  });
}

export function useMediaCollection(mediaType, list) {
  return useQuery({
    queryKey: queryKeys.tmdb.collection(mediaType, list),
    queryFn: ({ signal }) => fetchCollectionList(mediaType, list, signal),
    staleTime: staleUnlessCached(CACHE_TIME.catalog),
    ...OFFLINE_FIRST,
  });
}

export function useGenres(mediaType) {
  return useQuery({
    queryKey: queryKeys.tmdb.genres(mediaType),
    queryFn: ({ signal }) => fetchGenres(mediaType, signal),
    staleTime: CACHE_TIME.genres,
    gcTime: CACHE_TIME.genres,
    ...OFFLINE_FIRST,
  });
}

export function useMediaDetails(mediaType, id) {
  return useQuery({
    queryKey: queryKeys.tmdb.details(mediaType, id),
    queryFn: ({ signal }) => fetchMediaDetails(mediaType, id, signal),
    staleTime: staleUnlessCached(CACHE_TIME.details),
    ...OFFLINE_FIRST,
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
        staleTime: staleUnlessCached(CACHE_TIME.details),
        ...OFFLINE_FIRST,
      }),
    [queryClient],
  );
}

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  catalogKeys,
  fetchCatalogList,
  fetchCollectionShelf,
  fetchGenreList,
  fetchTrendingList,
  selectCatalogEntry,
} from '../store/slices/catalogSlice';
import { fetchDetails, selectDetailsEntry } from '../store/slices/detailsSlice';
import { useCachedQuery } from './useStoreQuery';

/*
 * Данные TMDB из Redux. Запросы идут и офлайн: Service Worker может ответить из своего кэша,
 * а такие данные (флаг cache) считаются устаревшими и перезапрашиваются при возврате сети.
 */

/**
 * Каталог с фильтрами. Ключ записи включает все фильтры, поэтому каждая комбинация
 * кэшируется отдельно. При смене фильтров прошлый запрос отменяется.
 */
export function useMediaList(filters) {
  const key = catalogKeys.list(filters);
  const entry = useSelector((state) => selectCatalogEntry(state, key));
  const query = useCachedQuery({
    key,
    entry,
    abortOnKeyChange: true,
    request: (options) => fetchCatalogList({ filters, ...options }),
  });

  // при смене страницы старый список виден (приглушённым), пока грузится новый
  const previous = useRef(undefined);
  useEffect(() => {
    if (query.data) previous.current = query.data;
  }, [query.data]);
  const isPlaceholderData = query.data === undefined && previous.current !== undefined && !query.isError;
  const data = query.data ?? (query.isError ? undefined : previous.current);

  return { ...query, data, isPlaceholderData, isPending: data === undefined && !query.isError };
}

export function useTrending(mediaType = 'all') {
  const key = catalogKeys.trending(mediaType);
  const entry = useSelector((state) => selectCatalogEntry(state, key));
  return useCachedQuery({ key, entry, request: (options) => fetchTrendingList({ mediaType, ...options }) });
}

export function useMediaCollection(mediaType, list) {
  const key = catalogKeys.collection(mediaType, list);
  const entry = useSelector((state) => selectCatalogEntry(state, key));
  return useCachedQuery({ key, entry, request: (options) => fetchCollectionShelf({ mediaType, list, ...options }) });
}

export function useGenres(mediaType) {
  const key = catalogKeys.genres(mediaType);
  const entry = useSelector((state) => selectCatalogEntry(state, key));
  return useCachedQuery({ key, entry, request: (options) => fetchGenreList({ mediaType, ...options }) });
}

export function useMediaDetails(mediaType, id) {
  const valid = Boolean(id) && (mediaType === 'movie' || mediaType === 'tv');
  const entry = useSelector((state) => selectDetailsEntry(state, mediaType, String(id)));
  return useCachedQuery({
    key: `${mediaType}:${id}`,
    entry,
    enabled: valid,
    abortOnKeyChange: true,
    request: (options) => fetchDetails({ mediaType, id: String(id), ...options }),
  });
}

/** Предзагрузка карточки при наведении: если данные свежие или уже грузятся, thunk не запустится. */
export function usePrefetchDetails() {
  const dispatch = useDispatch();
  return useCallback((mediaType, id) => dispatch(fetchDetails({ mediaType, id: String(id) })), [dispatch]);
}

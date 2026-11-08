import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TMDB_MAX_PAGES } from '../utils/media';

const URL_NAMES = { query: 'q', minRating: 'rating' };

/**
 * Фильтры каталога живут в URL (?q=&genre=&year=&rating=&sort=&page=),
 * поэтому ими можно поделиться ссылкой, а кнопка «Назад» работает как ожидается.
 */
export function useCatalogFilters(mediaType) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const page = Math.min(Math.max(Number(params.get('page')) || 1, 1), TMDB_MAX_PAGES);
    return {
      mediaType,
      query: params.get('q')?.trim() ?? '',
      genre: params.get('genre') ?? '',
      year: params.get('year') ?? '',
      minRating: params.get('rating') ?? '',
      sort: params.get('sort') ?? 'popularity.desc',
      page,
    };
  }, [params, mediaType]);

  const update = useCallback(
    (patch, { resetPage = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([key, value]) => {
            const name = URL_NAMES[key] ?? key;
            if (value === '' || value == null || (name === 'sort' && value === 'popularity.desc')) next.delete(name);
            else next.set(name, String(value));
          });
          if (resetPage && !('page' in patch)) next.delete('page');
          if (next.get('page') === '1') next.delete('page');
          return next;
        },
        { replace: 'query' in patch }, // ввод в поиске не засоряет историю браузера
      );
    },
    [setParams],
  );

  const reset = useCallback(() => setParams({}), [setParams]);

  const activeCount = [filters.genre, filters.year, filters.minRating].filter(Boolean).length +
    (filters.sort !== 'popularity.desc' ? 1 : 0);

  return { filters, update, reset, activeCount };
}

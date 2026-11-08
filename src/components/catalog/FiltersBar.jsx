import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useGenres } from '../../hooks/useMedia';
import { SORT_OPTIONS } from '../../utils/media';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 2 - 1950 }, (_, i) => CURRENT_YEAR + 1 - i);
const RATINGS = [9, 8, 7, 6, 5];

export default function FiltersBar({ filters, update, reset, activeCount }) {
  const { data: genres = [] } = useGenres(filters.mediaType);
  const [search, setSearch] = useState(filters.query);
  const debounced = useDebouncedValue(search, 450);

  // URL → поле (например, при переходе «Назад» или сбросе)
  useEffect(() => setSearch(filters.query), [filters.query]);

  // поле → URL, с задержкой, чтобы не отправлять запрос на каждую букву
  useEffect(() => {
    if (debounced.trim() !== filters.query) update({ query: debounced.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const searching = Boolean(filters.query);
  const noun = filters.mediaType === 'tv' ? 'сериалов' : 'фильмов';

  return (
    <div className="filters">
      <div className="filters__search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Поиск ${noun} по названию`}
          aria-label="Поиск по названию"
        />
        {search && (
          <button type="button" className="icon-btn icon-btn--sm" onClick={() => setSearch('')} aria-label="Очистить поиск">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="filters__row">
        <label className="select">
          <span>Жанр</span>
          <select value={filters.genre} onChange={(e) => update({ genre: e.target.value })} disabled={searching}>
            <option value="">Все жанры</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name[0].toUpperCase() + g.name.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          <span>Год</span>
          <select value={filters.year} onChange={(e) => update({ year: e.target.value })} disabled={searching}>
            <option value="">Любой</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          <span>Рейтинг</span>
          <select value={filters.minRating} onChange={(e) => update({ minRating: e.target.value })} disabled={searching}>
            <option value="">Любой</option>
            {RATINGS.map((r) => (
              <option key={r} value={r}>
                от {r}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          <span>Порядок</span>
          <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} disabled={searching}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {(activeCount > 0 || searching) && (
          <button type="button" className="btn btn--ghost btn--sm filters__reset" onClick={reset}>
            Сбросить {activeCount + (searching ? 1 : 0) > 1 ? 'всё' : ''}
          </button>
        )}
      </div>
      {searching && (
        <p className="filters__note">При поиске по названию фильтры не применяются — так устроен поиск TMDB.</p>
      )}
    </div>
  );
}

import { Bookmark, Check, Heart, Library, Search, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Poster } from '../../components/media/MediaCard';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import Pagination from '../../components/ui/Pagination';
import { useLibrary, useLibraryItemActions } from '../../hooks/useLibrary';
import { formatRelative, mediaPath, mediaTypeLabel } from '../../utils/format';

const PAGE_SIZE = 12;

const TABS = [
  { id: 'all', label: 'Всё' },
  { id: 'watchlist', label: 'Хочу посмотреть' },
  { id: 'watched', label: 'Просмотрено' },
  { id: 'favorites', label: 'Любимое' },
];

const SORTS = {
  recent: { label: 'Недавно изменённые', fn: (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) },
  added: { label: 'Давно добавленные', fn: (a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0) },
  rating: { label: 'Моя оценка', fn: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  title: { label: 'По названию', fn: (a, b) => a.title.localeCompare(b.title, 'ru') },
  year: { label: 'По году выхода', fn: (a, b) => (b.year ?? 0) - (a.year ?? 0) },
};

const EMPTY_COPY = {
  all: ['Библиотека пуста', 'Добавляйте фильмы и сериалы со страницы каталога — они появятся здесь.'],
  watchlist: ['Планов пока нет', 'Нажмите «Хочу посмотреть» на странице фильма, чтобы не забыть о нём.'],
  watched: ['Здесь появятся просмотренные', 'Отметьте фильм просмотренным или поставьте ему оценку.'],
  favorites: ['Любимых пока нет', 'Нажмите на сердечко на странице фильма, который хочется пересматривать.'],
};

export default function LibraryPage() {
  const { data = [], isPending, isError, error, refetch } = useLibrary();
  const act = useLibraryItemActions();
  const [params, setParams] = useSearchParams();

  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'all';
  const type = params.get('type') ?? '';
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'recent';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const set = (patch) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      if (!('page' in patch)) next.delete('page');
      return next;
    }, { replace: 'q' in patch });

  const counts = useMemo(
    () => ({
      all: data.length,
      watchlist: data.filter((i) => i.status === 'watchlist').length,
      watched: data.filter((i) => i.status === 'watched').length,
      favorites: data.filter((i) => i.favorite).length,
    }),
    [data],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data
      .filter((i) => (tab === 'all' ? true : tab === 'favorites' ? i.favorite : i.status === tab))
      .filter((i) => (type ? i.mediaType === type : true))
      .filter((i) => (needle ? i.title.toLowerCase().includes(needle) : true))
      .sort(SORTS[sort].fn);
  }, [data, tab, type, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="stack-lg">
      <header className="cabinet-head">
        <h1>Библиотека</h1>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tabs__tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => set({ tab: t.id === 'all' ? '' : t.id })}
          >
            {t.label}
            <span className="tabs__count">{counts[t.id]}</span>
          </button>
        ))}
      </div>

      <div className="filters filters--compact">
        <div className="filters__search">
          <Search size={18} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => set({ q: e.target.value })} placeholder="Найти в библиотеке" aria-label="Поиск в библиотеке" />
        </div>
        <div className="filters__row">
          <label className="select">
            <span>Тип</span>
            <select value={type} onChange={(e) => set({ type: e.target.value })}>
              <option value="">Фильмы и сериалы</option>
              <option value="movie">Только фильмы</option>
              <option value="tv">Только сериалы</option>
            </select>
          </label>
          <label className="select">
            <span>Порядок</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value === 'recent' ? '' : e.target.value })}>
              {Object.entries(SORTS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isPending && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isPending && !isError && filtered.length === 0 && (
        <EmptyState
          icon={Library}
          title={q || type ? 'Ничего не найдено' : EMPTY_COPY[tab][0]}
          text={q || type ? 'Измените запрос или тип.' : EMPTY_COPY[tab][1]}
          action={
            <Link to="/movie" className="btn btn--primary">
              Открыть каталог
            </Link>
          }
        />
      )}

      {visible.length > 0 && (
        <ul className="lib-list">
          {visible.map((entry) => (
            <li key={entry.id} className="lib-item">
              <Link to={mediaPath(entry)} className="lib-item__poster">
                <Poster path={entry.posterPath} title={entry.title} size="w154" />
              </Link>
              <div className="lib-item__body">
                <Link to={mediaPath(entry)} className="lib-item__title">
                  {entry.title}
                </Link>
                <p className="muted">
                  {mediaTypeLabel(entry.mediaType)}
                  {entry.year ? `, ${entry.year}` : ''}
                  {entry.genres?.length ? ` — ${entry.genres.slice(0, 3).join(', ')}` : ''}
                </p>
                <p className="lib-item__time">Изменено {formatRelative(entry.updatedAt)}</p>
              </div>
              <div className="lib-item__rating">
                {entry.rating ? <span className="rating-badge rating-badge--mine">{entry.rating}</span> : null}
              </div>
              <div className="lib-item__actions">
                <button
                  type="button"
                  className={`icon-btn ${entry.status === 'watchlist' ? 'is-on' : ''}`}
                  title="Хочу посмотреть"
                  aria-label="Хочу посмотреть"
                  aria-pressed={entry.status === 'watchlist'}
                  onClick={() => act(entry, { status: entry.status === 'watchlist' ? null : 'watchlist' })}
                >
                  <Bookmark size={18} />
                </button>
                <button
                  type="button"
                  className={`icon-btn ${entry.status === 'watched' ? 'is-on' : ''}`}
                  title="Просмотрено"
                  aria-label="Просмотрено"
                  aria-pressed={entry.status === 'watched'}
                  onClick={() =>
                    act(entry, entry.status === 'watched' ? { status: null, rating: null } : { status: 'watched' })
                  }
                >
                  <Check size={18} />
                </button>
                <button
                  type="button"
                  className={`icon-btn icon-btn--heart ${entry.favorite ? 'is-on' : ''}`}
                  title="Любимое"
                  aria-label="Любимое"
                  aria-pressed={entry.favorite}
                  onClick={() => act(entry, { favorite: !entry.favorite })}
                >
                  <Heart size={18} fill={entry.favorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  title="Удалить из библиотеки"
                  aria-label="Удалить из библиотеки"
                  onClick={() =>
                    act(entry, { status: null, rating: null, favorite: false, review: '' }, `«${entry.title}» удалён из библиотеки`)
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={safePage} totalPages={totalPages} onChange={(p) => set({ page: String(p) })} />
    </div>
  );
}

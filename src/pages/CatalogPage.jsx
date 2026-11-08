import { SearchX } from 'lucide-react';
import FiltersBar from '../components/catalog/FiltersBar';
import MediaGrid from '../components/media/MediaGrid';
import { EmptyState, ErrorState, MediaGridSkeleton, Spinner } from '../components/ui/Feedback';
import Pagination from '../components/ui/Pagination';
import { useCatalogFilters } from '../hooks/useCatalogFilters';
import { useMediaList } from '../hooks/useMedia';
import { pluralize } from '../utils/format';

const COPY = {
  movie: { title: 'Фильмы', forms: ['фильм', 'фильма', 'фильмов'] },
  tv: { title: 'Сериалы', forms: ['сериал', 'сериала', 'сериалов'] },
};

export default function CatalogPage({ mediaType }) {
  const { filters, update, reset, activeCount } = useCatalogFilters(mediaType);
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useMediaList(filters);
  const copy = COPY[mediaType];

  const goToPage = (page) => {
    update({ page }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container page">
      <header className="page-head">
        <h1>{copy.title}</h1>
        <p className="page-head__meta">
          {data && !isPending && `${pluralize(data.totalResults, copy.forms)}`}
          {isFetching && !isPending && <Spinner size={14} label="Обновляем" />}
        </p>
      </header>

      <FiltersBar filters={filters} update={update} reset={reset} activeCount={activeCount} />

      {isPending && <MediaGridSkeleton />}
      {isError && !data && <ErrorState error={error} onRetry={refetch} />}
      {data && data.results.length === 0 && (
        <EmptyState
          icon={SearchX}
          title={filters.query ? `По запросу «${filters.query}» ничего нет` : 'Под эти фильтры ничего не подходит'}
          text="Попробуйте другое название или ослабьте фильтры: например, уберите год или снизьте рейтинг."
          action={
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Сбросить фильтры
            </button>
          }
        />
      )}
      {data && data.results.length > 0 && (
        <>
          <MediaGrid items={data.results} dimmed={isPlaceholderData} />
          <Pagination
            page={filters.page}
            totalPages={data.totalPages}
            onChange={goToPage}
            disabled={isPlaceholderData}
          />
        </>
      )}
    </div>
  );
}

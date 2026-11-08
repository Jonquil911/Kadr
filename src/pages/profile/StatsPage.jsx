import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { useStats } from '../../hooks/useStats';
import { plural, pluralize } from '../../utils/format';

function Columns({ data, valueKey = 'count', labelKey = 'label', caption }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <figure className="columns">
      <div className="columns__plot">
        {data.map((d) => (
          <div key={d[labelKey]} className="columns__col" title={`${d[labelKey]}: ${d[valueKey]}`}>
            <span className="columns__value">{d[valueKey] || ''}</span>
            <span className="columns__bar" style={{ height: `${(d[valueKey] / max) * 100}%` }} />
            <span className="columns__label">{d[labelKey]}</span>
          </div>
        ))}
      </div>
      {caption && <figcaption className="sr-only">{caption}</figcaption>}
    </figure>
  );
}

function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="bars">
      {data.map((d) => (
        <li key={d.name}>
          <span className="bars__label">{d.name}</span>
          <span className="bars__track">
            <span style={{ width: `${(d.count / max) * 100}%` }} />
          </span>
          <span className="bars__value">{d.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function StatsPage() {
  const { stats, isPending, isError, error, refetch } = useStats();

  if (isPending) return <Spinner />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (stats.watchedCount === 0)
    return (
      <div className="stack-lg">
        <header className="cabinet-head">
          <h1>Статистика</h1>
        </header>
        <EmptyState
          icon={BarChart3}
          title="Статистика появится после первых просмотров"
          text="Отметьте несколько фильмов просмотренными — и здесь появятся часы у экрана, любимые жанры и график по месяцам."
          action={
            <Link to="/movie" className="btn btn--primary">
              Открыть каталог
            </Link>
          }
        />
      </div>
    );

  const hours = Math.round(stats.totalMinutes / 60);
  const days = (stats.totalMinutes / 60 / 24).toLocaleString('ru-RU', { maximumFractionDigits: 1 });

  return (
    <div className="stack-lg">
      <header className="cabinet-head">
        <h1>Статистика</h1>
      </header>

      <section className="stats-hero">
        <p className="stats-hero__number">{hours.toLocaleString('ru-RU')}</p>
        <p className="stats-hero__text">
          {plural(hours, ['час', 'часа', 'часов'])} у экрана — это {days} суток без перерыва.
          {' '}
          {pluralize(stats.moviesWatched, ['фильм', 'фильма', 'фильмов'])} и {pluralize(stats.showsWatched, ['сериал', 'сериала', 'сериалов'])}.
        </p>
      </section>

      <section className="tiles">
        <div className="tile">
          <strong>{stats.watchedCount}</strong>
          <span>просмотрено</span>
        </div>
        <div className="tile">
          <strong>{stats.averageRating ?? '—'}</strong>
          <span>средняя оценка</span>
        </div>
        <div className="tile">
          <strong>{stats.reviewsCount}</strong>
          <span>{plural(stats.reviewsCount, ['рецензия', 'рецензии', 'рецензий'])}</span>
        </div>
        <div className="tile">
          <strong>{stats.favoritesCount}</strong>
          <span>в любимых</span>
        </div>
      </section>

      <section className="panel">
        <h2>Просмотры за 12 месяцев</h2>
        <Columns data={stats.byMonth} caption="Количество просмотров по месяцам" />
      </section>

      <div className="panel-grid">
        <section className="panel">
          <h2>Любимые жанры</h2>
          {stats.topGenres.length ? <Bars data={stats.topGenres} /> : <p className="muted">Жанров пока нет.</p>}
        </section>
        <section className="panel">
          <h2>Как вы оцениваете</h2>
          {stats.ratedCount ? (
            <Columns data={stats.ratingDistribution} labelKey="rating" caption="Распределение оценок" />
          ) : (
            <p className="muted">Поставьте хотя бы одну оценку.</p>
          )}
        </section>
      </div>

      {stats.decades.length > 0 && (
        <section className="panel">
          <h2>По десятилетиям</h2>
          <Bars data={stats.decades.map((d) => ({ name: `${d.decade}-е`, count: d.count }))} />
        </section>
      )}
    </div>
  );
}

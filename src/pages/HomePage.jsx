import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MediaRow } from '../components/media/MediaGrid';
import CachedDataNotice from '../components/pwa/CachedDataNotice';
import { ErrorState, Spinner } from '../components/ui/Feedback';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../hooks/useLibrary';
import { useMediaCollection, useTrending } from '../hooks/useMedia';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { imageUrl } from '../utils/media';
import { mediaTypeLabel } from '../utils/format';

function Hero({ item }) {
  const backdrop = imageUrl(item.backdropPath, 'original');
  return (
    <section className="hero" style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined}>
      <div className="hero__shade" />
      <div className="container hero__content">
        <p className="hero__kicker">
          {mediaTypeLabel(item.mediaType)} недели{item.year ? `, ${item.year}` : ''}
        </p>
        <h1 className="hero__title">{item.title}</h1>
        {item.overview && <p className="hero__overview">{item.overview}</p>}
        <div className="hero__actions">
          <Link to={`/${item.mediaType}/${item.id}`} className="btn btn--primary btn--lg">
            <Info size={18} /> Подробнее
          </Link>
          <Link to="/movie" className="btn btn--ghost btn--lg">
            Весь каталог
          </Link>
        </div>
      </div>
    </section>
  );
}

function Shelf({ title, query, link, showType }) {
  const { data, isPending, isError, error, refetch } = query;
  return (
    <section className="shelf">
      <div className="shelf__head">
        <h2>{title}</h2>
        {link && (
          <Link to={link.to} className="link-inline">
            {link.label}
          </Link>
        )}
      </div>
      {isPending && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {data && <MediaRow items={data.results ?? data} showType={showType} />}
    </section>
  );
}

function WatchlistShelf() {
  const { data = [] } = useLibrary();
  const items = data
    .filter((i) => i.status === 'watchlist')
    .slice(0, 16)
    .map((i) => ({ ...i, id: i.mediaId, rating: i.tmdbRating }));
  if (!items.length) return null;
  return (
    <Shelf
      title="Вы хотели посмотреть"
      query={{ data: items, isPending: false }}
      link={{ to: '/profile/library?tab=watchlist', label: 'Весь список' }}
      showType
    />
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const trending = useTrending('all');
  const popularTv = useMediaCollection('tv', 'popular');
  const topRated = useMediaCollection('movie', 'top_rated');
  const upcoming = useMediaCollection('movie', 'upcoming');
  const featured = trending.data?.results.find((i) => i.backdropPath);
  const cache = [trending, popularTv, topRated, upcoming].map((q) => q.data?.cache);

  return (
    <div className="home">
      {featured ? <Hero item={featured} /> : <div className="hero hero--placeholder" />}
      <div className="container">
        <CachedDataNotice cache={cache} />
        {trending.isError && <ErrorState error={trending.error} onRetry={trending.refetch} />}
        {user && online && <WatchlistShelf />}
        {!trending.isError && (
          <Shelf title="В тренде на этой неделе" query={trending} showType />
        )}
        {!user && (
          <section className="pitch">
            <div>
              <h2>Ваш кинодневник</h2>
              <p>
                Отмечайте, что посмотрели, ставьте оценки от 1 до 10, пишите короткие рецензии и собирайте
                подборки. Статистика покажет, сколько часов вы провели в кино и какие жанры любите больше всего.
              </p>
            </div>
            <Link to="/signup" className="btn btn--primary btn--lg">
              Завести дневник
            </Link>
          </section>
        )}
        <Shelf title="Скоро в кино" query={upcoming} link={{ to: '/movie?sort=primary_release_date.desc', label: 'Новинки' }} />
        <Shelf title="Популярные сериалы" query={popularTv} link={{ to: '/tv', label: 'Все сериалы' }} />
        <Shelf title="Лучшие фильмы по оценкам зрителей" query={topRated} link={{ to: '/movie?sort=vote_average.desc', label: 'Весь рейтинг' }} />
      </div>
    </div>
  );
}

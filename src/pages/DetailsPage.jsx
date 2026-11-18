import { ArrowLeft, ExternalLink, Play } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LibraryActions from '../components/media/LibraryActions';
import { Poster } from '../components/media/MediaCard';
import { MediaRow } from '../components/media/MediaGrid';
import CachedDataNotice from '../components/pwa/CachedDataNotice';
import { ErrorState, FullPageLoader } from '../components/ui/Feedback';
import Modal from '../components/ui/Modal';
import { useTrackView } from '../hooks/useHistory';
import { useMediaDetails } from '../hooks/useMedia';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { imageUrl } from '../utils/media';
import { formatDate, formatRuntime, pluralize } from '../utils/format';
import NotFoundPage from './NotFoundPage';

export default function DetailsPage({ mediaType }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: media, isPending, isError, error, refetch } = useMediaDetails(mediaType, id);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const online = useOnlineStatus();
  useTrackView(media);

  if (isPending) return <FullPageLoader />;
  if (isError && error?.status === 404) return <NotFoundPage />;
  if (isError)
    return (
      <div className="container page">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );

  const backdrop = imageUrl(media.backdropPath, 'w1280');
  const facts = [
    media.year && { label: mediaType === 'tv' ? 'Премьера' : 'Выход', value: formatDate(media.date) },
    mediaType === 'movie' && media.runtime > 0 && { label: 'Длительность', value: formatRuntime(media.runtime) },
    mediaType === 'tv' && media.seasons && {
      label: 'Сезоны',
      value: `${pluralize(media.seasons, ['сезон', 'сезона', 'сезонов'])}, ${pluralize(media.episodes ?? 0, ['эпизод', 'эпизода', 'эпизодов'])}`,
    },
    media.makers.length > 0 && { label: mediaType === 'tv' ? 'Создатели' : 'Режиссёр', value: media.makers.join(', ') },
    media.countries.length > 0 && { label: 'Страна', value: media.countries.slice(0, 3).join(', ') },
    media.rating > 0 && {
      label: 'TMDB',
      value: `${media.rating.toFixed(1)} из 10, ${pluralize(media.votes, ['голос', 'голоса', 'голосов'])}`,
    },
  ].filter(Boolean);

  return (
    <article className="details">
      <div className="details__backdrop" style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined} />
      <div className="container details__inner">
        <button type="button" className="btn btn--ghost btn--sm details__back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Назад
        </button>
        <CachedDataNotice cache={media.cache} />

        <div className="details__layout">
          <div className="details__poster">
            <Poster path={media.posterPath} title={media.title} size="w500" />
            {media.trailerKey && (
              <button type="button" className="btn btn--primary details__trailer" onClick={() => setTrailerOpen(true)}>
                <Play size={18} fill="currentColor" /> Смотреть трейлер
              </button>
            )}
          </div>

          <div className="details__info">
            <h1 className="details__title">{media.title}</h1>
            {media.originalTitle && media.originalTitle !== media.title && (
              <p className="details__original">{media.originalTitle}</p>
            )}
            {media.tagline && <p className="details__tagline">{media.tagline}</p>}

            <ul className="tag-list">
              {media.genres.map((g) => (
                <li key={g.id}>
                  <Link to={`/${mediaType}?genre=${g.id}`}>{g.name}</Link>
                </li>
              ))}
            </ul>

            {online ? (
              <LibraryActions media={media} />
            ) : (
              <p className="diary-panel diary-panel--offline">
                Отметки, оценки и подборки доступны, когда есть подключение к интернету.
              </p>
            )}

            {media.overview && (
              <section className="details__section">
                <h2>О чём</h2>
                <p className="details__overview">{media.overview}</p>
              </section>
            )}

            <dl className="facts">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            {media.homepage && (
              <a className="link-inline" href={media.homepage} target="_blank" rel="noreferrer">
                Официальный сайт <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        {media.cast.length > 0 && (
          <section className="details__section">
            <h2>В ролях</h2>
            <ul className="cast">
              {media.cast.map((person) => (
                <li key={person.id} className="cast__person">
                  {person.profilePath ? (
                    <img src={imageUrl(person.profilePath, 'w185')} alt="" loading="lazy" />
                  ) : (
                    <span className="cast__placeholder" aria-hidden="true">
                      {person.name[0]}
                    </span>
                  )}
                  <strong>{person.name}</strong>
                  {person.character && <span>{person.character}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {media.recommendations.length > 0 && (
          <section className="details__section">
            <h2>Похожее</h2>
            <MediaRow items={media.recommendations} />
          </section>
        )}
      </div>

      <Modal open={trailerOpen} onClose={() => setTrailerOpen(false)} title={`Трейлер: ${media.title}`} size="lg">
        <div className="video-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${media.trailerKey}?autoplay=1`}
            title={`Трейлер ${media.title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Modal>
    </article>
  );
}

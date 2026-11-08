import { Bookmark, Check, Heart, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePrefetchDetails } from '../../hooks/useMedia';
import { imageUrl } from '../../utils/media';
import { mediaTypeLabel, ratingTone } from '../../utils/format';

export function Poster({ path, title, size = 'w342', className = '' }) {
  const src = imageUrl(path, size);
  return src ? (
    <img className={`poster ${className}`} src={src} alt={title} loading="lazy" decoding="async" />
  ) : (
    <div className={`poster poster--empty ${className}`} aria-label={title}>
      <Film size={28} strokeWidth={1.4} />
      <span>{title}</span>
    </div>
  );
}

export function RatingBadge({ value, label = 'Рейтинг TMDB', mine }) {
  if (value == null || value === 0) return null;
  return (
    <span className={`rating-badge rating-badge--${mine ? 'mine' : ratingTone(value)}`} title={label}>
      {Number(value).toFixed(mine ? 0 : 1)}
    </span>
  );
}

/** entry — запись из библиотеки пользователя (если фильм уже в ней). */
export default function MediaCard({ item, entry, showType }) {
  const prefetch = usePrefetchDetails();
  const id = item.mediaId ?? item.id;

  return (
    <article className="media-card">
      <Link
        to={`/${item.mediaType}/${id}`}
        className="media-card__link"
        onMouseEnter={() => prefetch(item.mediaType, id)}
        onFocus={() => prefetch(item.mediaType, id)}
      >
        <div className="media-card__poster">
          <Poster path={item.posterPath} title={item.title} />
          <div className="media-card__badges">
            <RatingBadge value={entry?.rating ?? item.rating} mine={entry?.rating != null} label={entry?.rating != null ? 'Ваша оценка' : 'Рейтинг TMDB'} />
          </div>
          {entry && (
            <div className="media-card__status" aria-label="В вашей библиотеке">
              {entry.status === 'watched' && <Check size={14} aria-label="Просмотрено" />}
              {entry.status === 'watchlist' && <Bookmark size={14} aria-label="Хочу посмотреть" />}
              {entry.favorite && <Heart size={14} aria-label="Любимое" />}
            </div>
          )}
        </div>
        <h3 className="media-card__title">{item.title}</h3>
        <p className="media-card__meta">
          {item.year ?? 'Дата неизвестна'}
          {showType && <span>, {mediaTypeLabel(item.mediaType).toLowerCase()}</span>}
        </p>
      </Link>
    </article>
  );
}

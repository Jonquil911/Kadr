import { Bookmark, BookmarkCheck, Check, Heart, ListPlus, PenLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLibraryEntry } from '../../hooks/useLibrary';
import RatingPicker from '../ui/RatingPicker';
import CollectionPicker from './CollectionPicker';
import ReviewModal from './ReviewModal';

export default function LibraryActions({ media }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <div className="diary-panel diary-panel--guest">
        <p>Отмечайте просмотренное, ставьте оценки и собирайте подборки.</p>
        <Link to="/login" state={{ from: location }} className="btn btn--primary">
          Войти и вести дневник
        </Link>
      </div>
    );
  }
  return <LibraryActionsInner media={media} />;
}

function LibraryActionsInner({ media }) {
  const actions = useLibraryEntry(media);
  const { entry } = actions;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  const isWatchlist = entry?.status === 'watchlist';
  const isWatched = entry?.status === 'watched';

  return (
    <div className="diary-panel">
      <div className="diary-panel__buttons">
        <button
          type="button"
          className={`chip-btn ${isWatchlist ? 'is-on' : ''}`}
          onClick={actions.toggleWatchlist}
          aria-pressed={isWatchlist}
        >
          {isWatchlist ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          Хочу посмотреть
        </button>
        <button
          type="button"
          className={`chip-btn ${isWatched ? 'is-on' : ''}`}
          onClick={actions.toggleWatched}
          aria-pressed={isWatched}
        >
          <Check size={18} />
          Просмотрено
        </button>
        <button
          type="button"
          className={`chip-btn chip-btn--heart ${entry?.favorite ? 'is-on' : ''}`}
          onClick={actions.toggleFavorite}
          aria-pressed={Boolean(entry?.favorite)}
          aria-label="Любимое"
          title="Любимое"
        >
          <Heart size={18} fill={entry?.favorite ? 'currentColor' : 'none'} />
        </button>
        <button type="button" className="chip-btn" onClick={() => setCollectionsOpen(true)}>
          <ListPlus size={18} />В подборку
        </button>
      </div>

      <div className="diary-panel__rating">
        <span className="diary-panel__label">{entry?.rating ? `Ваша оценка: ${entry.rating}` : 'Оцените'}</span>
        <RatingPicker value={entry?.rating} onChange={actions.setRating} />
      </div>

      <div className="diary-panel__review">
        {entry?.review ? (
          <blockquote>
            <p>{entry.review}</p>
          </blockquote>
        ) : null}
        <div className="diary-panel__review-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReviewOpen(true)}>
            <PenLine size={16} />
            {entry?.review ? 'Изменить рецензию' : 'Написать рецензию'}
          </button>
          {entry && (
            <button type="button" className="btn btn--ghost btn--sm btn--quiet" onClick={actions.removeAll}>
              <Trash2 size={16} />
              Убрать из дневника
            </button>
          )}
        </div>
      </div>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={media.title}
        initialValue={entry?.review ?? ''}
        onSave={(text) => {
          actions.saveReview(text);
          setReviewOpen(false);
        }}
      />
      <CollectionPicker open={collectionsOpen} onClose={() => setCollectionsOpen(false)} media={media} />
    </div>
  );
}

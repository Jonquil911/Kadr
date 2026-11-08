import { MessageSquareText, PenLine, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Poster } from '../../components/media/MediaCard';
import ReviewModal from '../../components/media/ReviewModal';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useLibrary, useLibraryItemActions } from '../../hooks/useLibrary';
import { formatDate, mediaPath, pluralize } from '../../utils/format';

export default function ReviewsPage() {
  const { data = [], isPending, isError, error, refetch } = useLibrary();
  const act = useLibraryItemActions();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [onlyRated, setOnlyRated] = useState(false);

  const reviews = useMemo(
    () =>
      data
        .filter((e) => e.review || (onlyRated && e.rating))
        .sort((a, b) => (b.reviewedAt ?? b.updatedAt ?? 0) - (a.reviewedAt ?? a.updatedAt ?? 0)),
    [data, onlyRated],
  );

  return (
    <div className="stack-lg">
      <header className="cabinet-head">
        <div>
          <h1>Рецензии</h1>
          <p className="muted">{pluralize(data.filter((e) => e.review).length, ['рецензия', 'рецензии', 'рецензий'])}</p>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={onlyRated} onChange={(e) => setOnlyRated(e.target.checked)} />
          <span>Показать и оценки без текста</span>
        </label>
      </header>

      {isPending && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isPending && !isError && reviews.length === 0 && (
        <EmptyState
          icon={MessageSquareText}
          title="Рецензий пока нет"
          text="На странице любого фильма нажмите «Написать рецензию» — пара строк поможет вспомнить впечатления."
        />
      )}

      <ul className="reviews">
        {reviews.map((entry) => (
          <li key={entry.id} className="review">
            <Link to={mediaPath(entry)} className="review__poster">
              <Poster path={entry.posterPath} title={entry.title} size="w154" />
            </Link>
            <div className="review__body">
              <div className="review__head">
                <Link to={mediaPath(entry)}>
                  <h3>{entry.title}</h3>
                </Link>
                {entry.rating && <span className="rating-badge rating-badge--mine">{entry.rating}</span>}
              </div>
              {entry.review ? <p className="review__text">{entry.review}</p> : <p className="muted">Без текста</p>}
              <div className="review__foot">
                <time className="muted">{formatDate(entry.reviewedAt ?? entry.updatedAt)}</time>
                <div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(entry)}>
                    <PenLine size={15} /> {entry.review ? 'Изменить' : 'Добавить текст'}
                  </button>
                  {entry.review && (
                    <button type="button" className="btn btn--ghost btn--sm btn--quiet" onClick={() => setDeleting(entry)}>
                      <Trash2 size={15} /> Удалить
                    </button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ReviewModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.title ?? ''}
        initialValue={editing?.review ?? ''}
        onSave={(text) => {
          act(editing, { review: text.trim() }, text.trim() ? 'Рецензия сохранена' : 'Рецензия удалена');
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Удалить рецензию?"
        text={`Текст рецензии на «${deleting?.title}» будет удалён. Оценка и статус останутся.`}
        confirmLabel="Удалить рецензию"
        danger
        onConfirm={() => {
          act(deleting, { review: '' }, 'Рецензия удалена');
          setDeleting(null);
        }}
      />
    </div>
  );
}

import { History, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Poster } from '../../components/media/MediaCard';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { useHistory, useHistoryActions } from '../../hooks/useHistory';
import { formatRelative, mediaPath, mediaTypeLabel } from '../../utils/format';

export default function HistoryPage() {
  const { data = [], isPending, isError, error, refetch } = useHistory();
  const { remove, clear } = useHistoryActions();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="stack-lg">
      <header className="cabinet-head">
        <div>
          <h1>История</h1>
          <p className="muted">Страницы фильмов и сериалов, которые вы открывали. Хранятся последние 60.</p>
        </div>
        {data.length > 0 && (
          <button type="button" className="btn btn--ghost btn--quiet" onClick={() => setConfirmOpen(true)}>
            Очистить историю
          </button>
        )}
      </header>

      {isPending && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isPending && !isError && data.length === 0 && (
        <EmptyState icon={History} title="История пуста" text="Здесь появятся фильмы, страницы которых вы открывали." />
      )}

      {data.length > 0 && (
        <ul className="activity">
          {data.map((entry) => (
            <li key={entry.id} className="activity__row">
              <Link to={mediaPath(entry)} className="activity__item">
                <Poster path={entry.posterPath} title={entry.title} size="w92" className="poster--thumb" />
                <span className="activity__text">
                  <strong>{entry.title}</strong>
                  <span>
                    {mediaTypeLabel(entry.mediaType)}
                    {entry.year ? `, ${entry.year}` : ''}
                  </span>
                </span>
                <time className="muted">{formatRelative(entry.viewedAt)}</time>
              </Link>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => remove.mutate(entry.id)}
                aria-label={`Удалить «${entry.title}» из истории`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Очистить историю?"
        text="Список недавно открытых страниц будет удалён. Библиотека и подборки не пострадают."
        confirmLabel="Очистить историю"
        danger
        loading={clear.isPending}
        onConfirm={() => clear.mutate(undefined, { onSuccess: () => setConfirmOpen(false) })}
      />
    </div>
  );
}

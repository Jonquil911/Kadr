import { ArrowLeft, Film, PenLine, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Poster } from '../../components/media/MediaCard';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import {
  useCollections,
  useDeleteCollection,
  useToggleCollectionItem,
  useUpdateCollection,
} from '../../hooks/useCollections';
import { mediaPath, pluralize } from '../../utils/format';
import CollectionForm from './CollectionForm';

export default function CollectionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch } = useCollections();
  const update = useUpdateCollection();
  const remove = useDeleteCollection();
  const toggle = useToggleCollectionItem();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isPending) return <Spinner />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const collection = data.find((c) => c.id === id);
  if (!collection)
    return (
      <EmptyState
        icon={Film}
        title="Подборка не найдена"
        text="Возможно, её удалили на другом устройстве."
        action={
          <Link to="/profile/collections" className="btn btn--ghost">
            Ко всем подборкам
          </Link>
        }
      />
    );

  const items = collection.items ?? [];

  return (
    <div className="stack-lg">
      <Link to="/profile/collections" className="link-inline">
        <ArrowLeft size={15} /> Все подборки
      </Link>
      <header className="cabinet-head">
        <div>
          <h1>
            <span aria-hidden="true">{collection.emoji}</span> {collection.name}
          </h1>
          {collection.description && <p className="collection-desc">{collection.description}</p>}
          <p className="muted">{pluralize(items.length, ['фильм', 'фильма', 'фильмов'])}</p>
        </div>
        <div className="cabinet-head__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setEditOpen(true)}>
            <PenLine size={16} /> Изменить
          </button>
          <button type="button" className="btn btn--ghost btn--quiet" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={16} /> Удалить
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Film}
          title="В подборке пока пусто"
          text="Откройте фильм и нажмите «В подборку», чтобы добавить его сюда."
          action={
            <Link to="/movie" className="btn btn--primary">
              Открыть каталог
            </Link>
          }
        />
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <article key={item.key} className="media-card">
              <Link to={mediaPath(item)} className="media-card__link">
                <div className="media-card__poster">
                  <Poster path={item.posterPath} title={item.title} />
                </div>
                <h3 className="media-card__title">{item.title}</h3>
                <p className="media-card__meta">{item.year ?? ''}</p>
              </Link>
              <button
                type="button"
                className="media-card__remove icon-btn icon-btn--sm"
                aria-label={`Убрать «${item.title}» из подборки`}
                title="Убрать из подборки"
                onClick={() =>
                  toggle.mutate({
                    collectionId: collection.id,
                    collectionName: collection.name,
                    media: { id: item.mediaId, mediaType: item.mediaType, title: item.title },
                  })
                }
              >
                <X size={16} />
              </button>
            </article>
          ))}
        </div>
      )}

      <CollectionForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={collection}
        loading={update.isPending}
        onSubmit={(values) => update.mutate({ id: collection.id, ...values }, { onSuccess: () => setEditOpen(false) })}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Удалить подборку?"
        text={`Подборка «${collection.name}» исчезнет навсегда. Сами фильмы останутся в библиотеке.`}
        confirmLabel="Удалить подборку"
        danger
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate({ id: collection.id }, { onSuccess: () => navigate('/profile/collections', { replace: true }) })
        }
      />
    </div>
  );
}

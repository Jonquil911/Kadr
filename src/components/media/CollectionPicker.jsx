import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useCollections, useCreateCollection, useToggleCollectionItem } from '../../hooks/useCollections';
import { mediaKey } from '../../utils/media';
import { pluralize } from '../../utils/format';
import { ErrorState, Spinner } from '../ui/Feedback';
import Modal from '../ui/Modal';

export default function CollectionPicker({ open, onClose, media }) {
  const { data: collections = [], isLoading, isError, error, refetch } = useCollections();
  const toggle = useToggleCollectionItem();
  const create = useCreateCollection();
  const [name, setName] = useState('');
  const key = mediaKey(media.mediaType, media.id);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: (id) => {
          toggle.mutate({ collectionId: id, collectionName: name.trim(), media });
          setName('');
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Добавить в подборку" size="sm">
      {isLoading && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isLoading && !isError && (
        <ul className="picker-list">
          {collections.length === 0 && <li className="muted">Подборок пока нет. Создайте первую ниже.</li>}
          {collections.map((c) => {
            const included = c.items?.some((i) => i.key === key);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`picker-list__item ${included ? 'is-on' : ''}`}
                  onClick={() => toggle.mutate({ collectionId: c.id, collectionName: c.name, media })}
                  disabled={toggle.isPending}
                  aria-pressed={included}
                >
                  <span className="picker-list__emoji">{c.emoji}</span>
                  <span className="picker-list__name">
                    {c.name}
                    <small>{pluralize(c.items?.length ?? 0, ['фильм', 'фильма', 'фильмов'])}</small>
                  </span>
                  <span className="picker-list__check">{included && <Check size={16} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form className="inline-form" onSubmit={submit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Новая подборка, например «На Новый год»"
          maxLength={60}
          aria-label="Название новой подборки"
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={!name.trim() || create.isPending}>
          <Plus size={16} /> Создать
        </button>
      </form>
    </Modal>
  );
}

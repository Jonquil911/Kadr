import { BookMarked, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { useCollections, useCreateCollection } from '../../hooks/useCollections';
import { imageUrl } from '../../utils/media';
import { formatRelative, pluralize } from '../../utils/format';
import CollectionForm from './CollectionForm';

export function CollageCover({ items }) {
  const posters = items.filter((i) => i.posterPath).slice(0, 4);
  return (
    <div className={`collage collage--${posters.length}`}>
      {posters.map((p) => (
        <img key={p.key} src={imageUrl(p.posterPath, 'w185')} alt="" loading="lazy" />
      ))}
    </div>
  );
}

export default function CollectionsPage() {
  const { data = [], isPending, isError, error, refetch } = useCollections();
  const create = useCreateCollection();
  const [formOpen, setFormOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="stack-lg">
      <header className="cabinet-head">
        <div>
          <h1>Подборки</h1>
          <p className="muted">Собирайте фильмы по настроению, поводу или компании.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> Новая подборка
        </button>
      </header>

      {isPending && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isPending && !isError && data.length === 0 && (
        <EmptyState
          icon={BookMarked}
          title="Подборок пока нет"
          text="Создайте первую — например, «Фильмы на дождливый вечер» — и добавляйте в неё фильмы с их страниц."
          action={
            <button type="button" className="btn btn--primary" onClick={() => setFormOpen(true)}>
              Создать подборку
            </button>
          }
        />
      )}

      <div className="collections">
        {data.map((c) => (
          <Link key={c.id} to={`/profile/collections/${c.id}`} className="collection-card">
            <CollageCover items={c.items ?? []} />
            <div className="collection-card__body">
              <h3>
                <span aria-hidden="true">{c.emoji}</span> {c.name}
              </h3>
              <p className="muted">
                {pluralize(c.items?.length ?? 0, ['фильм', 'фильма', 'фильмов'])}, обновлена {formatRelative(c.updatedAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <CollectionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        loading={create.isPending}
        onSubmit={(values) =>
          create.mutate(values, {
            onSuccess: (id) => {
              setFormOpen(false);
              navigate(`/profile/collections/${id}`);
            },
          })
        }
      />
    </div>
  );
}

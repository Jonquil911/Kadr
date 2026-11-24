import { useLibraryIndex } from '../../hooks/useLibrary';
import { mediaKey } from '../../utils/media';
import MediaCard from './MediaCard';

// Map «ключ → запись библиотеки» — мемоизированный селектор selectLibraryIndex
export { useLibraryIndex };

export default function MediaGrid({ items, showType, dimmed }) {
  const index = useLibraryIndex();
  return (
    <div className={`media-grid ${dimmed ? 'is-dimmed' : ''}`}>
      {items.map((item) => (
        <MediaCard
          key={`${item.mediaType}-${item.mediaId ?? item.id}`}
          item={item}
          entry={index.get(mediaKey(item.mediaType, item.mediaId ?? item.id))}
          showType={showType}
        />
      ))}
    </div>
  );
}

export function MediaRow({ items, showType }) {
  const index = useLibraryIndex();
  return (
    <div className="media-row" tabIndex={0} aria-label="Прокручиваемый список">
      {items.map((item) => (
        <MediaCard
          key={`${item.mediaType}-${item.id}`}
          item={item}
          entry={index.get(mediaKey(item.mediaType, item.id))}
          showType={showType}
        />
      ))}
    </div>
  );
}

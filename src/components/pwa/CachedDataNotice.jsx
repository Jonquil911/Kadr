import { History } from 'lucide-react';

const formatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

// cache — offline flag из tmdb.js; можно передать массив, тогда покажется самое старое время
export default function CachedDataNotice({ cache }) {
  const list = (Array.isArray(cache) ? cache : [cache]).filter((c) => c?.fromCache);
  if (!list.length) return null;

  const times = list.map((c) => c.cachedAt).filter(Boolean);
  const oldest = times.length ? Math.min(...times) : null;

  return (
    <div className="cached-notice" role="status">
      <History size={16} aria-hidden="true" />
      <p>
        <strong>Показаны сохранённые данные</strong>
        {oldest && <> от {formatter.format(oldest)}</>}. Нет связи с сервером, информация может быть
        устаревшей.
      </p>
    </div>
  );
}

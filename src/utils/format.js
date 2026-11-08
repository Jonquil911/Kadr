export function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const pluralize = (n, forms) => `${n.toLocaleString('ru-RU')} ${plural(n, forms)}`;

export function formatRuntime(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU', options);
}

export function formatRelative(value) {
  if (!value) return '';
  const diff = Date.now() - value;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${pluralize(minutes, ['минуту', 'минуты', 'минут'])} назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${pluralize(hours, ['час', 'часа', 'часов'])} назад`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'вчера' : `${pluralize(days, ['день', 'дня', 'дней'])} назад`;
  return formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const mediaTypeLabel = (type) => (type === 'tv' ? 'Сериал' : 'Фильм');

export const mediaPath = (item) => `/${item.mediaType}/${item.mediaId ?? item.id}`;

export function getInitials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function ratingTone(rating) {
  if (rating == null) return 'none';
  if (rating >= 7.5) return 'high';
  if (rating >= 6) return 'mid';
  return 'low';
}

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function imageUrl(path, size = 'w500') {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export const mediaKey = (mediaType, mediaId) => `${mediaType}_${mediaId}`;

export const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Сначала популярные' },
  { value: 'vote_average.desc', label: 'Высокий рейтинг' },
  { value: 'primary_release_date.desc', label: 'Сначала новые' },
  { value: 'primary_release_date.asc', label: 'Сначала старые' },
];

/** TMDB отдаёт не больше 500 страниц на любой список. */
export const TMDB_MAX_PAGES = 500;
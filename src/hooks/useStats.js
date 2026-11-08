import { useMemo } from 'react';
import { useLibrary } from './useLibrary';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** Статистика считается из закэшированной библиотеки — без дополнительных запросов. */
export function computeStats(library) {
  const watched = library.filter((i) => i.status === 'watched');
  const watchlist = library.filter((i) => i.status === 'watchlist');
  const rated = library.filter((i) => i.rating != null);
  const reviews = library.filter((i) => i.review);
  const favorites = library.filter((i) => i.favorite);

  const totalMinutes = watched.reduce((sum, i) => sum + (i.runtime || 0), 0);
  const averageRating = rated.length
    ? Math.round((rated.reduce((s, i) => s + i.rating, 0) / rated.length) * 10) / 10
    : null;

  const genreCounts = {};
  watched.forEach((i) => (i.genres ?? []).forEach((g) => (genreCounts[g] = (genreCounts[g] ?? 0) + 1)));
  const topGenres = Object.entries(genreCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const ratingDistribution = Array.from({ length: 10 }, (_, idx) => ({
    rating: idx + 1,
    count: rated.filter((i) => i.rating === idx + 1).length,
  }));

  const now = new Date();
  const byMonth = Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + idx, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], year: d.getFullYear(), count: 0 };
  });
  watched.forEach((i) => {
    if (!i.watchedAt) return;
    const d = new Date(i.watchedAt);
    const bucket = byMonth.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.count += 1;
  });

  const thisYear = watched.filter((i) => i.watchedAt && new Date(i.watchedAt).getFullYear() === now.getFullYear());

  const decades = {};
  watched.forEach((i) => {
    if (!i.year) return;
    const decade = Math.floor(i.year / 10) * 10;
    decades[decade] = (decades[decade] ?? 0) + 1;
  });

  return {
    total: library.length,
    watchedCount: watched.length,
    watchlistCount: watchlist.length,
    moviesWatched: watched.filter((i) => i.mediaType === 'movie').length,
    showsWatched: watched.filter((i) => i.mediaType === 'tv').length,
    ratedCount: rated.length,
    reviewsCount: reviews.length,
    favoritesCount: favorites.length,
    totalMinutes,
    averageRating,
    topGenres,
    ratingDistribution,
    byMonth,
    thisYearCount: thisYear.length,
    decades: Object.entries(decades)
      .map(([decade, count]) => ({ decade: Number(decade), count }))
      .sort((a, b) => a.decade - b.decade),
  };
}

export function useStats() {
  const query = useLibrary();
  const stats = useMemo(() => computeStats(query.data ?? []), [query.data]);
  return { ...query, stats };
}

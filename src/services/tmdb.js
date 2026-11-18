/**
 * Сервис для работы с TMDB API.
 * Компоненты никогда не вызывают fetch напрямую — только через хуки из src/hooks/useMedia.js,
 * которые, в свою очередь, используют функции этого модуля.
 */
import { TMDB_MAX_PAGES } from '../utils/media';
import { reportNetworkFailure } from './connection';

const BASE_URL = 'https://api.themoviedb.org/3';
const CREDENTIAL = import.meta.env.VITE_TMDB_API_KEY ?? '';
const LANGUAGE = import.meta.env.VITE_TMDB_LANGUAGE || 'ru-RU';

export const isTmdbConfigured = Boolean(CREDENTIAL);

// v4 Read Access Token — это JWT (начинается с "eyJ"), v3 API Key — короткая hex-строка.
const isBearerToken = CREDENTIAL.startsWith('eyJ');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildUrl(path, params = {}) {
  const url = new URL(BASE_URL + path);
  url.searchParams.set('language', LANGUAGE);
  if (!isBearerToken) url.searchParams.set('api_key', CREDENTIAL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url;
}

async function request(path, { params, signal } = {}) {
  if (!isTmdbConfigured) {
    throw new ApiError('Не задан ключ TMDB. Добавьте VITE_TMDB_API_KEY в .env.local и перезапустите dev-сервер.', 0);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      signal,
      headers: isBearerToken ? { Authorization: `Bearer ${CREDENTIAL}`, accept: 'application/json' } : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error; // отменённый запрос — TanStack Query обработает сам
    reportNetworkFailure();
    throw new ApiError('Не удалось связаться с TMDB. Проверьте подключение к интернету.', 0);
  }

  if (!response.ok) {
    const messages = {
      401: 'TMDB отклонил ключ доступа. Проверьте VITE_TMDB_API_KEY.',
      404: 'Ничего не нашлось — возможно, страница была удалена.',
      429: 'Слишком много запросов к TMDB. Подождите пару секунд.',
    };
    throw new ApiError(messages[response.status] ?? `Ошибка TMDB (${response.status}).`, response.status);
  }
  const data = await response.json();
  // Offline flag: Service Worker помечает ответы, взятые из кэша, заголовком X-Kadr-Cache.
  // Флаг доезжает до UI в поле cache, и страница показывает «это сохранённые данные».
  if (response.headers.get('X-Kadr-Cache') === 'hit') {
    reportNetworkFailure();
    data.__cache = { fromCache: true, cachedAt: Number(response.headers.get('X-Kadr-Cached-At')) || null };
  }
  return data;
}

/* ---------- Нормализация: фильмы и сериалы приводятся к одному виду ---------- */

export function normalizeMedia(raw, fallbackType) {
  const mediaType = raw.media_type === 'tv' || raw.media_type === 'movie' ? raw.media_type : fallbackType;
  const date = mediaType === 'tv' ? raw.first_air_date : raw.release_date;
  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? 'Без названия',
    originalTitle: raw.original_title ?? raw.original_name ?? '',
    overview: raw.overview ?? '',
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    date: date || null,
    year: date ? Number(date.slice(0, 4)) : null,
    rating: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    votes: raw.vote_count ?? 0,
    genreIds: raw.genre_ids ?? raw.genres?.map((g) => g.id) ?? [],
  };
}

function normalizeList(data, mediaType) {
  return {
    page: data.page,
    totalPages: Math.min(data.total_pages ?? 1, TMDB_MAX_PAGES),
    totalResults: data.total_results ?? 0,
    cache: data.__cache ?? null,
    results: (data.results ?? [])
      .filter((item) => item.media_type !== 'person')
      .map((item) => normalizeMedia(item, mediaType)),
  };
}

function normalizeDetails(raw, mediaType) {
  const base = normalizeMedia(raw, mediaType);
  const videos = raw.videos?.results ?? [];
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ??
    videos.find((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));

  const crew = raw.credits?.crew ?? [];
  const makers =
    mediaType === 'tv'
      ? (raw.created_by ?? []).map((p) => p.name)
      : crew.filter((p) => p.job === 'Director').map((p) => p.name);

  const episodeRuntime = raw.episode_run_time?.[0] ?? raw.last_episode_to_air?.runtime ?? 45;
  const runtime =
    mediaType === 'tv' ? (raw.number_of_episodes ?? 0) * episodeRuntime : raw.runtime ?? 0;

  const recommendations = raw.recommendations?.results?.length
    ? raw.recommendations.results
    : raw.similar?.results ?? [];

  return {
    ...base,
    cache: raw.__cache ?? null,
    genres: raw.genres ?? [],
    tagline: raw.tagline ?? '',
    status: raw.status ?? '',
    runtime, // для сериалов — суммарная длительность всех эпизодов, минут
    episodeRuntime: mediaType === 'tv' ? episodeRuntime : null,
    seasons: raw.number_of_seasons ?? null,
    episodes: raw.number_of_episodes ?? null,
    countries: (raw.production_countries ?? []).map((c) => c.name),
    makers,
    homepage: raw.homepage || null,
    trailerKey: trailer?.key ?? null,
    cast: (raw.credits?.cast ?? []).slice(0, 14).map((p) => ({
      id: p.id,
      name: p.name,
      character: p.character,
      profilePath: p.profile_path,
    })),
    recommendations: recommendations.slice(0, 12).map((item) => normalizeMedia(item, mediaType)),
  };
}

/* ---------- Публичные функции API ---------- */


function mapSortForType(sort, mediaType) {
  if (mediaType === 'tv') return sort.replace('primary_release_date', 'first_air_date');
  return sort;
}

/**
 * Список фильмов/сериалов с фильтрами.
 * Если задан поисковый запрос — используется /search (TMDB не умеет совмещать поиск с фильтрами).
 */
export async function fetchMediaList({ mediaType, query, genre, year, minRating, sort, page }, signal) {
  if (query) {
    const data = await request(`/search/${mediaType}`, {
      params: { query, page, include_adult: false },
      signal,
    });
    return normalizeList(data, mediaType);
  }

  const sortBy = mapSortForType(sort || 'popularity.desc', mediaType);
  const params = {
    page,
    sort_by: sortBy,
    with_genres: genre,
    'vote_average.gte': minRating,
    include_adult: false,
    // для сортировки по рейтингу отсекаем фильмы с парой голосов
    'vote_count.gte': sortBy.startsWith('vote_average') ? 300 : 20,
  };
  if (year) {
    if (mediaType === 'tv') params.first_air_date_year = year;
    else params.primary_release_year = year;
  }
  const data = await request(`/discover/${mediaType}`, { params, signal });
  return normalizeList(data, mediaType);
}

export async function fetchTrending(mediaType = 'all', signal) {
  const data = await request(`/trending/${mediaType}/week`, { signal });
  return normalizeList(data, mediaType === 'all' ? 'movie' : mediaType);
}

export async function fetchCollectionList(mediaType, list, signal) {
  // list: popular | top_rated | upcoming | now_playing | on_the_air
  const data = await request(`/${mediaType}/${list}`, { signal });
  return normalizeList(data, mediaType);
}

export async function fetchGenres(mediaType, signal) {
  const data = await request(`/genre/${mediaType}/list`, { signal });
  return data.genres ?? [];
}

export async function fetchMediaDetails(mediaType, id, signal) {
  const data = await request(`/${mediaType}/${id}`, {
    params: { append_to_response: 'credits,videos,recommendations,similar', include_video_language: 'ru,en' },
    signal,
  });
  return normalizeDetails(data, mediaType);
}

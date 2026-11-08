/**
 * Фабрика ключей кэша TanStack Query.
 * Иерархия ключей позволяет инвалидировать данные точечно или целыми ветками:
 *   invalidateQueries({ queryKey: queryKeys.user.library(uid) }) — обновит библиотеку пользователя,
 *   removeQueries({ queryKey: queryKeys.user.all })              — очистит все личные данные при выходе.
 */
export const queryKeys = {
  tmdb: {
    all: ['tmdb'],
    lists: () => ['tmdb', 'list'],
    list: (filters) => ['tmdb', 'list', filters],
    trending: (mediaType) => ['tmdb', 'trending', mediaType],
    collection: (mediaType, list) => ['tmdb', 'collection', mediaType, list],
    genres: (mediaType) => ['tmdb', 'genres', mediaType],
    details: (mediaType, id) => ['tmdb', 'details', mediaType, String(id)],
  },
  user: {
    all: ['user'],
    root: (uid) => ['user', uid],
    profile: (uid) => ['user', uid, 'profile'],
    library: (uid) => ['user', uid, 'library'],
    collections: (uid) => ['user', uid, 'collections'],
    history: (uid) => ['user', uid, 'history'],
  },
};

/** Время жизни кэша для разных типов данных. */
export const CACHE_TIME = {
  catalog: 5 * 60 * 1000, // списки TMDB считаются свежими 5 минут
  details: 30 * 60 * 1000, // карточка фильма меняется редко
  genres: 24 * 60 * 60 * 1000, // справочник жанров — сутки
  user: 60 * 1000, // личные данные — минута + ревалидация при фокусе окна
};

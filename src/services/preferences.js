/**
 * Единственное место в приложении, которое обращается к localStorage.
 * Хранит только UI-настройки устройства (тема); всё остальное лежит в Firestore.
 */
const THEME_KEY = 'kadr:theme';

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* приватный режим или переполненное хранилище — просто не запоминаем */
  }
}

export function getStoredTheme() {
  const value = safeGet(THEME_KEY);
  if (value === 'light' || value === 'dark') return value;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function storeTheme(theme) {
  safeSet(THEME_KEY, theme);
}

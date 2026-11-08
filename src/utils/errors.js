const AUTH_MESSAGES = {
  'auth/invalid-email': 'Похоже, в адресе почты опечатка.',
  'auth/missing-email': 'Введите адрес почты.',
  'auth/missing-password': 'Введите пароль.',
  'auth/user-disabled': 'Этот аккаунт заблокирован.',
  'auth/user-not-found': 'Аккаунт с такой почтой не найден.',
  'auth/wrong-password': 'Неверный пароль.',
  'auth/invalid-credential': 'Неверная почта или пароль.',
  'auth/invalid-login-credentials': 'Неверная почта или пароль.',
  'auth/email-already-in-use': 'Эта почта уже зарегистрирована. Войдите или восстановите пароль.',
  'auth/weak-password': 'Пароль слишком простой: нужно минимум 6 символов.',
  'auth/too-many-requests': 'Слишком много попыток. Подождите несколько минут и попробуйте снова.',
  'auth/network-request-failed': 'Нет соединения с сервером. Проверьте интернет.',
  'auth/popup-closed-by-user': 'Окно входа через Google закрыто до завершения.',
  'auth/cancelled-popup-request': 'Окно входа уже открыто.',
  'auth/popup-blocked': 'Браузер заблокировал окно входа. Разрешите всплывающие окна для сайта.',
  'auth/unauthorized-domain':
    'Этот домен не разрешён в Firebase. Добавьте его в Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': 'Этот способ входа выключен в консоли Firebase.',
  'auth/requires-recent-login': 'Для этого действия нужно заново подтвердить вход.',
  'auth/no-current-user': 'Сессия истекла. Войдите снова.',
  'auth/user-mismatch': 'Подтвердите вход тем же аккаунтом Google.',
  'auth/account-exists-with-different-credential':
    'Аккаунт с этой почтой уже существует с другим способом входа.',
  'auth/invalid-api-key': 'Неверный API-ключ Firebase. Проверьте .env.local.',
  'app/not-configured': 'Firebase не настроен: заполните .env.local.',
  'permission-denied': 'Нет доступа к данным. Проверьте правила Firestore (firestore.rules).',
  'unavailable': 'Firestore недоступен. Проверьте интернет.',
  'failed-precondition': 'База Firestore не создана. Создайте её в консоли Firebase.',
  'not-found': 'Запись не найдена — возможно, её уже удалили.',
};

/** Превращает любую ошибку (Firebase, TMDB, сеть) в понятный текст. */
export function getErrorMessage(error) {
  if (!error) return '';
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (error.name === 'ApiError') return error.message;
  return error.message || 'Что-то пошло не так. Попробуйте ещё раз.';
}

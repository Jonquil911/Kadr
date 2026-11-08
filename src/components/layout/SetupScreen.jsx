/** Показывается вместо приложения, если не заполнен .env.local — подсказывает, что сделать. */
export default function SetupScreen() {
  return (
    <div className="setup">
      <div className="setup__card">
        <h1>Почти готово: подключите Firebase</h1>
        <p>Приложение не нашло настройки Firebase. Чтобы запустить его:</p>
        <ol>
          <li>
            Скопируйте <code>.env.example</code> в <code>.env.local</code> в корне проекта.
          </li>
          <li>Вставьте значения из Firebase Console → Project settings → Your apps → Web app.</li>
          <li>
            Добавьте ключ TMDB в <code>VITE_TMDB_API_KEY</code>.
          </li>
          <li>
            Перезапустите <code>npm run dev</code> — Vite читает переменные только при старте.
          </li>
        </ol>
        <p className="setup__hint">Подробная инструкция — в README.md.</p>
      </div>
    </div>
  );
}

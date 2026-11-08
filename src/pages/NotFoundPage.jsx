import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container page not-found">
      <p className="not-found__code" aria-hidden="true">
        404
      </p>
      <h1>Эта сцена не вошла в финальный монтаж</h1>
      <p className="muted">Страницы по этому адресу нет. Проверьте ссылку или вернитесь к каталогу.</p>
      <div className="not-found__actions">
        <Link to="/" className="btn btn--primary">
          На главную
        </Link>
        <Link to="/movie" className="btn btn--ghost">
          Каталог фильмов
        </Link>
      </div>
    </div>
  );
}

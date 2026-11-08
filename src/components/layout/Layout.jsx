import { Outlet, ScrollRestoration } from 'react-router-dom';
import NavBar from './NavBar';

export default function Layout() {
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Перейти к содержимому
      </a>
      <NavBar />
      <main id="main" className="app__main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <p>Кадр — личный кинодневник.</p>
          <p className="muted">
            Данные о фильмах предоставлены{' '}
            <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
              TMDB
            </a>
            . Этот продукт использует TMDB API, но не одобрен и не сертифицирован TMDB.
          </p>
        </div>
      </footer>
      <ScrollRestoration getKey={(location) => location.pathname} />
    </div>
  );
}

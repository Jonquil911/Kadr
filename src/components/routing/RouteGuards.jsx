import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageLoader } from '../ui/Feedback';

/** Пускает только вошедших пользователей; остальных отправляет на /login и запоминает, откуда пришли. */
export function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageLoader text="Проверяем вход…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Страницы входа и регистрации не нужны тому, кто уже вошёл. */
export function GuestRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageLoader text="Проверяем вход…" />;
  if (user) {
    const from = location.state?.from;
    const target = from ? `${from.pathname}${from.search ?? ''}` : '/profile';
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}

import { LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUserProfile } from '../../hooks/useAccount';
import Avatar from '../ui/Avatar';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Кадр — на главную">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="3" y="7" width="26" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="16" cy="16" r="4.5" fill="var(--accent)" />
      </svg>
      <span>Кадр</span>
    </Link>
  );
}

export default function NavBar() {
  const { user, logout, pending } = useAuth();
  const { data: profile } = useUserProfile();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Вы вышли из аккаунта');
      navigate('/');
    } catch (e) {
      toast.error(e.userMessage);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Logo />
        <nav className={`navbar__links ${open ? 'is-open' : ''}`} aria-label="Основная навигация">
          <NavLink to="/" end>
            Главная
          </NavLink>
          <NavLink to="/movie">Фильмы</NavLink>
          <NavLink to="/tv">Сериалы</NavLink>
          {user && <NavLink to="/profile/library">Мой дневник</NavLink>}

          <div className="navbar__auth navbar__auth--mobile">
            {user ? (
              <>
                <NavLink to="/profile">Профиль</NavLink>
                <button type="button" className="btn btn--ghost" onClick={handleLogout} disabled={pending}>
                  <LogOut size={16} /> Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">Войти</NavLink>
                <NavLink to="/signup">Регистрация</NavLink>
              </>
            )}
          </div>
        </nav>

        <div className="navbar__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <div className="navbar__auth navbar__auth--desktop">
            {user ? (
              <>
                <Link to="/profile" className="navbar__profile" title={user.displayName || user.email}>
                  <Avatar
                    name={user.displayName}
                    email={user.email}
                    photoURL={user.photoURL}
                    color={profile?.avatarColor}
                    size={34}
                  />
                  <span>Профиль</span>
                </Link>
                <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout} disabled={pending}>
                  <LogOut size={16} /> Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" state={{ from: location }} className="btn btn--ghost btn--sm">
                  <LogIn size={16} /> Войти
                </Link>
                <Link to="/signup" className="btn btn--primary btn--sm">
                  Регистрация
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="icon-btn navbar__burger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

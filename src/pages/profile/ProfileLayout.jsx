import { BarChart3, BookMarked, History, LayoutDashboard, Library, MessageSquareText, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../hooks/useAccount';

const LINKS = [
  { to: '/profile', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/profile/library', label: 'Библиотека', icon: Library },
  { to: '/profile/reviews', label: 'Рецензии', icon: MessageSquareText },
  { to: '/profile/collections', label: 'Подборки', icon: BookMarked },
  { to: '/profile/stats', label: 'Статистика', icon: BarChart3 },
  { to: '/profile/history', label: 'История', icon: History },
  { to: '/profile/settings', label: 'Настройки', icon: Settings },
];

export default function ProfileLayout() {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();

  return (
    <div className="container cabinet">
      <aside className="cabinet__side">
        <div className="cabinet__user">
          <Avatar
            name={user.displayName}
            email={user.email}
            photoURL={user.photoURL}
            color={profile?.avatarColor}
            size={56}
          />
          <div>
            <strong>{user.displayName || 'Без имени'}</strong>
            <span>{user.email}</span>
          </div>
        </div>
        <nav className="cabinet__nav" aria-label="Разделы кабинета">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="cabinet__content">
        <Outlet />
      </section>
    </div>
  );
}

import { Clapperboard, Copy, LogOut, MailWarning, RefreshCw, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Poster } from '../../components/media/MediaCard';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useRefreshVerification, useResendVerification, useUserProfile } from '../../hooks/useAccount';
import { useStats } from '../../hooks/useStats';
import { getProviderIds } from '../../utils/providers';
import { formatDate, formatRelative, mediaPath } from '../../utils/format';

const PROVIDER_LABELS = { password: 'Почта и пароль', 'google.com': 'Google' };

function describeChange(entry) {
  if (entry.review) return 'рецензия';
  if (entry.rating) return `оценка ${entry.rating}`;
  if (entry.status === 'watched') return 'просмотрено';
  if (entry.status === 'watchlist') return 'в планах';
  if (entry.favorite) return 'в любимых';
  return '';
}

export default function ProfileOverview() {
  const { user, logout, pending } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { data: library, stats, isPending, isError, error, refetch } = useStats();
  const resend = useResendVerification();
  const refreshVerification = useRefreshVerification();

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      toast.success('UID скопирован');
    } catch {
      toast.error('Не удалось скопировать — выделите UID вручную');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Вы вышли из аккаунта');
      navigate('/login');
    } catch (e) {
      toast.error(e.userMessage);
    }
  };

  const goal = profile?.yearlyGoal || 50;
  const goalPercent = Math.min(100, Math.round((stats.thisYearCount / goal) * 100));
  const hasPassword = getProviderIds(user).includes('password');
  const recent = (library ?? []).slice(0, 6);

  return (
    <div className="stack-lg">
      <header className="cabinet-head">
        <div>
          <h1>Привет, {user.displayName || 'киноман'}</h1>
          <p className="muted">
            В дневнике с {formatDate(profile?.createdAt ?? Date.parse(user.metadata.creationTime))}
          </p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={handleLogout} disabled={pending}>
          <LogOut size={16} /> Выйти
        </button>
      </header>

      {hasPassword && !user.emailVerified && (
        <div className="notice notice--warning">
          <MailWarning size={22} />
          <div>
            <p>
              <strong>Почта не подтверждена.</strong> Подтвердите её, чтобы можно было восстановить доступ к аккаунту.
            </p>
            <div className="notice__actions">
              <button type="button" className="btn btn--sm btn--primary" onClick={() => resend.mutate()} disabled={resend.isPending}>
                Отправить письмо ещё раз
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => refreshVerification.mutate()}
                disabled={refreshVerification.isPending}
              >
                <RefreshCw size={14} /> Я подтвердил
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="account-card" aria-label="Данные аккаунта">
        <dl>
          <div>
            <dt>Почта</dt>
            <dd>
              {user.email}
              {user.emailVerified && (
                <span className="pill pill--ok">
                  <ShieldCheck size={13} /> подтверждена
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>UID</dt>
            <dd className="account-card__uid">
              <code>{user.uid}</code>
              <button type="button" className="icon-btn icon-btn--sm" onClick={copyUid} aria-label="Скопировать UID">
                <Copy size={15} />
              </button>
            </dd>
          </div>
          <div>
            <dt>Способ входа</dt>
            <dd>{getProviderIds(user).map((id) => PROVIDER_LABELS[id] ?? id).join(', ')}</dd>
          </div>
          <div>
            <dt>Последний вход</dt>
            <dd>{formatDate(Date.parse(user.metadata.lastSignInTime), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</dd>
          </div>
        </dl>
      </section>

      {isPending && <Spinner />}
      {isError && <ErrorState error={error} onRetry={refetch} />}
      {!isPending && !isError && (
        <>
          <section className="tiles">
            <Link to="/profile/library?tab=watched" className="tile">
              <strong>{stats.watchedCount}</strong>
              <span>просмотрено</span>
            </Link>
            <Link to="/profile/library?tab=watchlist" className="tile">
              <strong>{stats.watchlistCount}</strong>
              <span>в планах</span>
            </Link>
            <Link to="/profile/stats" className="tile">
              <strong>{Math.round(stats.totalMinutes / 60)}</strong>
              <span>часов у экрана</span>
            </Link>
            <Link to="/profile/reviews" className="tile">
              <strong>{stats.averageRating ?? '—'}</strong>
              <span>средняя оценка</span>
            </Link>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Цель на {new Date().getFullYear()} год</h2>
              <Link to="/profile/settings#goal" className="link-inline">
                Изменить цель
              </Link>
            </div>
            <div className="goal">
              <div className="goal__bar" role="progressbar" aria-valuenow={goalPercent} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${goalPercent}%` }} />
              </div>
              <p>
                <strong>{stats.thisYearCount}</strong> из {goal} — {goalPercent}%
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Недавние изменения</h2>
              <Link to="/profile/library" className="link-inline">
                Вся библиотека
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                icon={Clapperboard}
                title="Дневник пока пуст"
                text="Откройте любой фильм и отметьте его просмотренным или добавьте в планы."
                action={
                  <Link to="/movie" className="btn btn--primary">
                    Найти фильм
                  </Link>
                }
              />
            ) : (
              <ul className="activity">
                {recent.map((entry) => (
                  <li key={entry.id}>
                    <Link to={mediaPath(entry)} className="activity__item">
                      <Poster path={entry.posterPath} title={entry.title} size="w92" className="poster--thumb" />
                      <span className="activity__text">
                        <strong>{entry.title}</strong>
                        <span>{describeChange(entry)}</span>
                      </span>
                      <time className="muted">{formatRelative(entry.updatedAt)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

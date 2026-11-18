import { Lock, RotateCcw, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { recheckConnection } from '../../services/connection';

const COPY = {
  page: {
    icon: WifiOff,
    title: 'Нет подключения к интернету',
    text: 'Эта страница ещё не сохранена для просмотра офлайн. Проверьте Wi-Fi или мобильный интернет и попробуйте снова. Фильмы и страницы, которые вы уже открывали, доступны и без сети.',
  },
  private: {
    icon: Lock,
    title: 'Личный дневник доступен только онлайн',
    text: 'Оценки, рецензии, подборки и история хранятся в облаке и не сохраняются на устройстве, чтобы личные данные не оставались в кэше браузера. Раздел откроется, как только вернётся связь.',
  },
};

// onRetry вызывается, когда связь подтвердилась; по умолчанию — перезагрузка страницы
export default function OfflineView({ variant = 'page', onRetry, compact = false }) {
  const online = useOnlineStatus();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const { icon: Icon, title, text } = COPY[variant] ?? COPY.page;
  const Heading = compact ? 'h2' : 'h1';

  const retry = async () => {
    setChecking(true);
    setMessage('');
    const ok = await recheckConnection();
    setChecking(false);
    if (!ok) {
      setMessage('Связь пока не появилась. Попробуйте ещё раз чуть позже.');
      return;
    }
    if (onRetry) onRetry();
    else window.location.reload();
  };

  return (
    <section className={`offline-view ${compact ? 'offline-view--compact' : ''}`} aria-labelledby="offline-title">
      <div className="offline-view__icon" aria-hidden="true">
        <Icon size={compact ? 26 : 34} strokeWidth={1.7} />
      </div>
      <Heading id="offline-title" className="offline-view__title">
        {title}
      </Heading>
      <p className="offline-view__text">{text}</p>
      <div className="offline-view__actions">
        <button type="button" className="btn btn--primary" onClick={retry} disabled={checking}>
          <RotateCcw size={16} className={checking ? 'is-spinning' : undefined} />
          {checking ? 'Проверяем…' : 'Повторить подключение'}
        </button>
        {!compact && (
          <Link to="/" className="btn btn--ghost">
            На главную
          </Link>
        )}
      </div>
      <p className={`offline-view__status ${online ? 'is-online' : ''}`} role="status" aria-live="polite">
        <span className="net-status__dot" aria-hidden="true" />
        {message || (online ? 'Сеть есть — можно повторить' : 'Офлайн')}
      </p>
    </section>
  );
}

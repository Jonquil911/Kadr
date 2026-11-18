import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getErrorMessage } from '../../utils/errors';
import OfflineView from '../pwa/OfflineView';

export function Spinner({ size = 20, label = 'Загрузка' }) {
  return <span className="spinner" style={{ width: size, height: size }} role="status" aria-label={label} />;
}

export function FullPageLoader({ text = 'Загружаем…' }) {
  return (
    <div className="full-loader">
      <Spinner size={32} />
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="state-view">
      {Icon && (
        <div className="state-view__icon">
          <Icon size={28} strokeWidth={1.6} />
        </div>
      )}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div className="state-view__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Не удалось загрузить данные' }) {
  const online = useOnlineStatus();
  // офлайн и данных нет в кэше — вместо «ошибки» показываем понятный офлайн-экран
  if (!online) return <OfflineView compact onRetry={onRetry ? () => onRetry() : undefined} />;
  return (
    <div className="state-view state-view--error" role="alert">
      <div className="state-view__icon">
        <AlertTriangle size={28} strokeWidth={1.6} />
      </div>
      <h3>{title}</h3>
      <p>{getErrorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={() => onRetry()}>
          <RotateCcw size={16} /> Повторить
        </button>
      )}
    </div>
  );
}

export function MediaGridSkeleton({ count = 12 }) {
  return (
    <div className="media-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="media-card media-card--skeleton">
          <div className="media-card__poster skeleton" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--short" />
        </div>
      ))}
    </div>
  );
}

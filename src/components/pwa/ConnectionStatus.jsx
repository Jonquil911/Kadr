import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { queryKeys } from '../../services/queryKeys';

export function ConnectionIndicator() {
  const online = useOnlineStatus();
  const label = online ? 'Онлайн' : 'Офлайн';
  return (
    <span
      className={`net-status ${online ? 'is-online' : 'is-offline'}`}
      role="status"
      aria-live="polite"
      aria-label={`Статус сети: ${label}`}
      title={online ? 'Подключение к сети есть' : 'Нет подключения к сети'}
    >
      <span className="net-status__dot" aria-hidden="true" />
      <span className="net-status__label">{label}</span>
    </span>
  );
}

// Уходя офлайн, сбрасываем из памяти личные данные — офлайн видны только публичные данные TMDB
export function OfflineBanner() {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const wasOffline = useRef(!online);

  useEffect(() => {
    if (!online) {
      queryClient.resetQueries({ queryKey: queryKeys.user.all });
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      toast.success('Соединение восстановлено', { description: 'Обновляем данные.' });
    }
  }, [online, queryClient]);

  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      <div className="container offline-banner__inner">
        <WifiOff size={16} aria-hidden="true" />
        <span>
          Вы офлайн. Открываются сохранённые страницы и каталог, а личный дневник — когда вернётся связь.
        </span>
      </div>
    </div>
  );
}

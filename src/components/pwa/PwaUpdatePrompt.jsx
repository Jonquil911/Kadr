import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

// updateServiceWorker(true) отправляет ожидающему SW сообщение SKIP_WAITING и перезагружает страницу
export default function PwaUpdatePrompt() {
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // браузер сам проверяет обновления только при навигации — установленный PWA может их не увидеть
      const check = () => {
        if (navigator.onLine && !registration.installing) registration.update().catch(() => {});
      };
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onOfflineReady() {
      toast.success('Кадр готов к работе офлайн', {
        description: 'Открытые страницы и каталог будут доступны без интернета.',
      });
    },
    onRegisterError(error) {
      console.error('Не удалось зарегистрировать Service Worker', error);
    },
  });

  if (!needRefresh) return null;

  const update = async () => {
    setUpdating(true);
    try {
      await updateServiceWorker(true);
    } catch {
      setUpdating(false);
      toast.error('Не удалось обновить приложение. Перезагрузите страницу.');
    }
  };

  return (
    <div className="pwa-update" role="alertdialog" aria-labelledby="pwa-update-title" aria-live="polite">
      <div className="pwa-update__text">
        <strong id="pwa-update-title">Доступна новая версия</strong>
        <span>Обновите, чтобы получить последние исправления.</span>
      </div>
      <div className="pwa-update__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={update} disabled={updating}>
          <RefreshCw size={16} className={updating ? 'is-spinning' : undefined} />
          {updating ? 'Обновляем…' : 'Обновить'}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setNeedRefresh(false)}
          aria-label="Напомнить позже"
          title="Позже"
          disabled={updating}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

import { QueryClient } from '@tanstack/react-query';
import './connection'; // связывает onlineManager TanStack Query с проверенным статусом сети

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000, // неиспользуемые записи удаляются из памяти через 10 минут
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // нет смысла повторять запрос с неверным ключом, к несуществующей странице или без прав
        if ([0, 401, 403, 404].includes(error?.status)) return false;
        if (error?.code === 'permission-denied') return false;
        return failureCount < 2;
      },
    },
  },
});

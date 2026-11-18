import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import SetupScreen from './components/layout/SetupScreen';
import PwaUpdatePrompt from './components/pwa/PwaUpdatePrompt';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { isFirebaseConfigured } from './firebase';
import { router } from './router';
import { queryClient } from './services/queryClient';

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors closeButton />;
}

export default function App() {
  if (!isFirebaseConfigured) return <SetupScreen />;

  // Service Worker регистрируется только в production-сборке (npm run build / деплой)

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <ThemedToaster />
          {import.meta.env.PROD && <PwaUpdatePrompt />}
        </AuthProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}

import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import SetupScreen from './components/layout/SetupScreen';
import PwaUpdatePrompt from './components/pwa/PwaUpdatePrompt';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { isFirebaseConfigured } from './firebase';
import { router } from './router';
import { store } from './store';

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors closeButton />;
}

export default function App() {
  if (!isFirebaseConfigured) return <SetupScreen />;

  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <ThemedToaster />
          {/* Service Worker регистрируется только в production-сборке */}
          {import.meta.env.PROD && <PwaUpdatePrompt />}
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

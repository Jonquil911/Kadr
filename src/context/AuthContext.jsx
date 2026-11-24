import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  completeRedirectSignIn,
  reloadCurrentUser,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
  subscribeToAuthChanges,
} from '../services/authService';
import { clearUserData, invalidateUserData } from '../store/sessionActions';
import { getErrorMessage } from '../utils/errors';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true); // ждём первый ответ onAuthStateChanged
  const [pending, setPending] = useState(false); // идёт вход/регистрация/выход
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0); // меняется после updateProfile, чтобы перерисовать UI
  const previousUid = useRef(null);

  useEffect(() => {
    // Firebase сам восстанавливает сессию из IndexedDB после перезагрузки страницы
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (previousUid.current && previousUid.current !== firebaseUser?.uid) {
        // сменился пользователь или выход — личные данные прошлого пользователя не должны остаться в хранилище
        dispatch(clearUserData());
      }
      previousUid.current = firebaseUser?.uid ?? null;
      setUser(firebaseUser);
      setInitializing(false);
    });
    completeRedirectSignIn().catch((e) => setError(getErrorMessage(e)));
    return unsubscribe;
  }, [dispatch]);

  /** Обёртка для действий: единый индикатор загрузки и понятные тексты ошибок. */
  const run = useCallback(async (action) => {
    setPending(true);
    setError('');
    try {
      return await action();
    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);
      throw Object.assign(e, { userMessage: message });
    } finally {
      setPending(false);
    }
  }, []);

  const signup = useCallback(
    (data) =>
      run(async () => {
        const created = await signUpWithEmail(data);
        // onAuthStateChanged сработал раньше, чем updateProfile задал имя, — обновляем вручную
        setUser(created);
        setVersion((v) => v + 1);
        dispatch(invalidateUserData());
        return created;
      }),
    [run, dispatch],
  );
  const login = useCallback((data) => run(() => signInWithEmail(data)), [run]);
  const loginWithGoogle = useCallback((options) => run(() => signInWithGoogle(options)), [run]);
  const resetPassword = useCallback((email) => run(() => sendPasswordReset(email)), [run]);
  const logout = useCallback(
    () =>
      run(async () => {
        await signOutUser();
        dispatch(clearUserData());
      }),
    [run, dispatch],
  );

  const refreshUser = useCallback(async () => {
    const fresh = await reloadCurrentUser();
    setUser(fresh);
    setVersion((v) => v + 1);
    return fresh;
  }, []);

  const clearError = useCallback(() => setError(''), []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      pending,
      error,
      clearError,
      signup,
      login,
      loginWithGoogle,
      logout,
      resetPassword,
      refreshUser,
      version,
    }),
    [user, initializing, pending, error, clearError, signup, login, loginWithGoogle, logout, resetPassword, refreshUser, version],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth должен вызываться внутри <AuthProvider>');
  return context;
}

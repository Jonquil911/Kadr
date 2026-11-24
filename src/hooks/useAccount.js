import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  changePassword,
  deleteAccount,
  resendVerificationEmail,
  updateAccountProfile,
} from '../services/authService';
import { exportUserData } from '../services/userDataService';
import { clearUserData } from '../store/sessionActions';
import { fetchUserProfile, selectProfileState, updateProfileDoc } from '../store/slices/profileSlice';
import { getErrorMessage } from '../utils/errors';
import { useAsyncAction, useCachedQuery } from './useStoreQuery';

export function useUserProfile() {
  const { user } = useAuth();
  const uid = user?.uid;
  const state = useSelector(selectProfileState);
  return useCachedQuery({
    key: uid,
    entry: state.uid === uid ? state : undefined,
    enabled: Boolean(uid),
    requiresOnline: true,
    request: (options) => fetchUserProfile({ uid, ...options }),
  });
}

const notifyError = (error) => toast.error(getErrorMessage(error));

/** Имя и фото меняются и в Firebase Auth, и в документе профиля. */
export function useUpdateAccount() {
  const { user, refreshUser } = useAuth();
  const dispatch = useDispatch();
  return useAsyncAction(
    async ({ displayName, photoURL, ...profilePatch }) => {
      await updateAccountProfile({ displayName, photoURL });
      if (Object.keys(profilePatch).length) {
        await dispatch(updateProfileDoc({ uid: user.uid, patch: profilePatch })).unwrap();
      }
      await refreshUser();
    },
    { onSuccess: () => toast.success('Профиль сохранён'), onError: notifyError },
  );
}

/** Настройки, которые хранятся только в Firestore (цель на год и т. п.) — оптимистично. */
export function useUpdatePreferences() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  return useAsyncAction(
    (patch) => dispatch(updateProfileDoc({ uid: user.uid, patch, optimistic: true })).unwrap(),
    { onError: notifyError },
  );
}

/*
 * Операции ниже — работа с аккаунтом Firebase Auth, а не с данными в хранилище,
 * поэтому они остаются локальными действиями без Redux (авторизация живёт в AuthContext).
 */

export function useChangePassword() {
  return useAsyncAction(({ currentPassword, newPassword }) => changePassword(currentPassword, newPassword), {
    onSuccess: () => toast.success('Пароль изменён'),
    onError: notifyError,
  });
}

export function useResendVerification() {
  const { refreshUser } = useAuth();
  return useAsyncAction(
    async () => {
      try {
        await resendVerificationEmail();
      } finally {
        refreshUser().catch(() => {});
      }
    },
    { onSuccess: () => toast.success('Письмо отправлено. Проверьте почту и папку «Спам».'), onError: notifyError },
  );
}

export function useRefreshVerification() {
  const { refreshUser } = useAuth();
  return useAsyncAction(refreshUser, {
    onSuccess: (fresh) =>
      fresh?.emailVerified ? toast.success('Почта подтверждена') : toast.info('Почта пока не подтверждена'),
    onError: notifyError,
  });
}

export function useExportData() {
  const { user } = useAuth();
  return useAsyncAction(() => exportUserData(user.uid), {
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kadr-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Файл с данными скачан');
    },
    onError: notifyError,
  });
}

export function useDeleteAccount() {
  const dispatch = useDispatch();
  return useAsyncAction((password) => deleteAccount(password), {
    onSuccess: () => {
      dispatch(clearUserData());
      toast.success('Аккаунт и все данные удалены');
    },
    onError: notifyError,
  });
}

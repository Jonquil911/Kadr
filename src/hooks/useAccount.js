import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  changePassword,
  deleteAccount,
  resendVerificationEmail,
  updateAccountProfile,
} from '../services/authService';
import { CACHE_TIME, queryKeys } from '../services/queryKeys';
import { exportUserData, getUserProfile, updateUserProfileDoc } from '../services/userDataService';
import { getErrorMessage } from '../utils/errors';

export function useUserProfile() {
  const { user } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: queryKeys.user.profile(uid),
    queryFn: () => getUserProfile(uid),
    enabled: Boolean(uid),
    staleTime: CACHE_TIME.user,
  });
}

const notifyError = (error) => toast.error(getErrorMessage(error));

/** Имя и фото меняются и в Firebase Auth, и в документе профиля. */
export function useUpdateAccount() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ displayName, photoURL, ...profilePatch }) => {
      await updateAccountProfile({ displayName, photoURL });
      if (Object.keys(profilePatch).length) await updateUserProfileDoc(user.uid, profilePatch);
      await refreshUser();
    },
    onSuccess: () => toast.success('Профиль сохранён'),
    onError: notifyError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(user?.uid) }),
  });
}

/** Настройки, которые хранятся только в Firestore (цель на год, любимые жанры и т. п.). */
export function useUpdatePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.user.profile(user?.uid);
  return useMutation({
    mutationFn: (patch) => updateUserProfileDoc(user.uid, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) => ({ ...old, ...patch }));
      return { previous };
    },
    onError: (error, _patch, context) => {
      queryClient.setQueryData(key, context?.previous);
      notifyError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) => changePassword(currentPassword, newPassword),
    onSuccess: () => toast.success('Пароль изменён'),
    onError: notifyError,
  });
}

export function useResendVerification() {
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => toast.success('Письмо отправлено. Проверьте почту и папку «Спам».'),
    onError: notifyError,
    onSettled: () => refreshUser().catch(() => {}),
  });
}

export function useRefreshVerification() {
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: refreshUser,
    onSuccess: (fresh) =>
      fresh?.emailVerified ? toast.success('Почта подтверждена') : toast.info('Почта пока не подтверждена'),
    onError: notifyError,
  });
}

export function useExportData() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => exportUserData(user.uid),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password) => deleteAccount(password),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.user.all });
      toast.success('Аккаунт и все данные удалены');
    },
    onError: notifyError,
  });
}

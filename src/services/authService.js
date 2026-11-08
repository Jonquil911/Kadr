import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { hasPasswordProvider } from '../utils/providers';
import { deleteAllUserData, ensureUserProfile, updateUserProfileDoc } from './userDataService';

function requireAuth() {
  if (!auth) throw Object.assign(new Error('Firebase не настроен'), { code: 'app/not-configured' });
  return auth;
}

function requireUser() {
  const user = requireAuth().currentUser;
  if (!user) throw Object.assign(new Error('Нужно войти заново'), { code: 'auth/no-current-user' });
  return user;
}

/** «Запомнить меня»: local — сессия переживает закрытие браузера, session — только до закрытия вкладки. */
async function applyPersistence(remember) {
  await setPersistence(requireAuth(), remember ? browserLocalPersistence : browserSessionPersistence);
}

export function subscribeToAuthChanges(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signUpWithEmail({ email, password, displayName }) {
  await applyPersistence(true);
  const { user } = await createUserWithEmailAndPassword(requireAuth(), email, password);
  if (displayName) await updateProfile(user, { displayName });
  await ensureUserProfile(user, { displayName });
  // письмо подтверждения — не критично, если не отправилось
  sendEmailVerification(user).catch(() => {});
  return user;
}

export async function signInWithEmail({ email, password, remember = true }) {
  await applyPersistence(remember);
  const { user } = await signInWithEmailAndPassword(requireAuth(), email, password);
  await ensureUserProfile(user);
  return user;
}

export async function signInWithGoogle({ remember = true } = {}) {
  await applyPersistence(remember);
  try {
    const { user } = await signInWithPopup(requireAuth(), googleProvider);
    await ensureUserProfile(user);
    return user;
  } catch (error) {
    // в некоторых браузерах всплывающие окна заблокированы — переходим на redirect-поток
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(requireAuth(), googleProvider);
      return null;
    }
    throw error;
  }
}

/** Завершает вход через redirect (вызывается один раз при старте приложения). */
export async function completeRedirectSignIn() {
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  if (result?.user) await ensureUserProfile(result.user);
  return result?.user ?? null;
}

export function signOutUser() {
  return signOut(requireAuth());
}

export function sendPasswordReset(email) {
  return sendPasswordResetEmail(requireAuth(), email);
}

export function resendVerificationEmail() {
  return sendEmailVerification(requireUser());
}

export async function reloadCurrentUser() {
  const user = requireUser();
  await user.reload();
  return requireAuth().currentUser;
}

export async function updateAccountProfile({ displayName, photoURL }) {
  const user = requireUser();
  await updateProfile(user, { displayName, photoURL: photoURL || null });
  await updateUserProfileDoc(user.uid, { displayName, photoURL: photoURL || null });
  return reloadCurrentUser();
}

/** Повторная проверка личности перед опасными действиями (смена пароля, удаление). */
export async function reauthenticate(password) {
  const user = requireUser();
  if (hasPasswordProvider(user)) {
    const credential = EmailAuthProvider.credential(user.email, password ?? '');
    await reauthenticateWithCredential(user, credential);
  } else {
    await reauthenticateWithPopup(user, googleProvider);
  }
  return user;
}

export async function changePassword(currentPassword, newPassword) {
  const user = await reauthenticate(currentPassword);
  await updatePassword(user, newPassword);
}

export async function deleteAccount(password) {
  const user = await reauthenticate(password);
  await deleteAllUserData(user.uid);
  await deleteUser(user);
}

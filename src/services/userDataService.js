/**
 * Личные данные пользователя в Cloud Firestore.
 *
 * users/{uid}                    — профиль (имя, о себе, цель на год, цвет аватара)
 * users/{uid}/library/{key}      — фильм/сериал в библиотеке: статус, оценка, рецензия, избранное
 * users/{uid}/collections/{id}   — пользовательские подборки
 * users/{uid}/history/{key}      — недавно просмотренные страницы
 *
 * key = `${mediaType}_${mediaId}`, например "movie_550".
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

import { mediaKey } from '../utils/media';

export { mediaKey };

const HISTORY_LIMIT = 60;

function requireDb() {
  if (!db) throw Object.assign(new Error('Firebase не настроен'), { code: 'app/not-configured' });
  return db;
}

/** Firestore Timestamp → миллисекунды, чтобы в кэше лежали простые сериализуемые данные. */
function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return null;
}

function fromSnapshot(snapshot) {
  const data = snapshot.data();
  const result = { id: snapshot.id, ...data };
  ['createdAt', 'updatedAt', 'addedAt', 'watchedAt', 'viewedAt', 'reviewedAt'].forEach((field) => {
    if (field in result) result[field] = toMillis(result[field]);
  });
  return result;
}

const userDoc = (uid) => doc(requireDb(), 'users', uid);
const sub = (uid, name) => collection(requireDb(), 'users', uid, name);

/* ---------------------------- Профиль ---------------------------- */

export async function ensureUserProfile(user, extra = {}) {
  const ref = userDoc(user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return fromSnapshot(snapshot);
  const profile = {
    displayName: extra.displayName ?? user.displayName ?? '',
    photoURL: user.photoURL ?? null,
    email: user.email,
    bio: '',
    yearlyGoal: 50,
    avatarColor: 'amber',
    favoriteGenres: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: user.uid, ...profile, createdAt: Date.now(), updatedAt: Date.now() };
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(userDoc(uid));
  return snapshot.exists() ? fromSnapshot(snapshot) : null;
}

export async function updateUserProfileDoc(uid, patch) {
  await setDoc(userDoc(uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

/* ---------------------------- Библиотека ---------------------------- */

export async function getLibrary(uid) {
  const snapshot = await getDocs(query(sub(uid, 'library'), orderBy('updatedAt', 'desc')));
  return snapshot.docs.map(fromSnapshot);
}

/**
 * Создаёт или обновляет запись библиотеки.
 * media — краткие данные о фильме (сохраняются, чтобы кабинет работал без запросов к TMDB).
 */
export async function saveLibraryItem(uid, media, patch) {
  const key = mediaKey(media.mediaType, media.id);
  const ref = doc(sub(uid, 'library'), key);
  const snapshot = await getDoc(ref);
  const now = serverTimestamp();
  const payload = {
    mediaId: media.id,
    mediaType: media.mediaType,
    title: media.title,
    posterPath: media.posterPath ?? null,
    year: media.year ?? null,
    genres: media.genres?.map((g) => g.name ?? g) ?? [],
    runtime: media.runtime ?? 0,
    tmdbRating: media.rating ?? null,
    ...patch,
    updatedAt: now,
  };
  if (!snapshot.exists()) {
    payload.addedAt = now;
    payload.status = patch.status ?? null;
    payload.rating = patch.rating ?? null;
    payload.review = patch.review ?? '';
    payload.favorite = patch.favorite ?? false;
  }
  if (patch.status === 'watched' && !snapshot.data()?.watchedAt) payload.watchedAt = now;
  if ('status' in patch && patch.status !== 'watched') payload.watchedAt = null;
  if ('review' in patch) payload.reviewedAt = patch.review ? now : null;
  await setDoc(ref, payload, { merge: true });
}

export function removeLibraryItem(uid, key) {
  return deleteDoc(doc(sub(uid, 'library'), key));
}

/* ---------------------------- Подборки ---------------------------- */

export async function getCollections(uid) {
  const snapshot = await getDocs(query(sub(uid, 'collections'), orderBy('updatedAt', 'desc')));
  return snapshot.docs.map(fromSnapshot);
}

export async function createCollection(uid, { name, description = '', emoji = '🎬' }) {
  const ref = await addDoc(sub(uid, 'collections'), {
    name,
    description,
    emoji,
    items: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateCollection(uid, id, patch) {
  return updateDoc(doc(sub(uid, 'collections'), id), { ...patch, updatedAt: serverTimestamp() });
}

export function deleteCollection(uid, id) {
  return deleteDoc(doc(sub(uid, 'collections'), id));
}

export async function toggleCollectionItem(uid, collectionId, media) {
  const ref = doc(sub(uid, 'collections'), collectionId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw Object.assign(new Error('Подборка не найдена'), { code: 'not-found' });
  const items = snapshot.data().items ?? [];
  const key = mediaKey(media.mediaType, media.id);
  const exists = items.some((item) => item.key === key);
  const nextItems = exists
    ? items.filter((item) => item.key !== key)
    : [
        ...items,
        {
          key,
          mediaId: media.id,
          mediaType: media.mediaType,
          title: media.title,
          posterPath: media.posterPath ?? null,
          year: media.year ?? null,
          addedAt: Date.now(),
        },
      ];
  await updateDoc(ref, { items: nextItems, updatedAt: serverTimestamp() });
  return !exists;
}

/* ---------------------------- История ---------------------------- */

export async function getHistory(uid) {
  const snapshot = await getDocs(query(sub(uid, 'history'), orderBy('viewedAt', 'desc'), limit(HISTORY_LIMIT)));
  return snapshot.docs.map(fromSnapshot);
}

export function addHistoryEntry(uid, media) {
  return setDoc(doc(sub(uid, 'history'), mediaKey(media.mediaType, media.id)), {
    mediaId: media.id,
    mediaType: media.mediaType,
    title: media.title,
    posterPath: media.posterPath ?? null,
    year: media.year ?? null,
    viewedAt: serverTimestamp(),
  });
}

export function removeHistoryEntry(uid, key) {
  return deleteDoc(doc(sub(uid, 'history'), key));
}

async function deleteSubcollection(uid, name) {
  const snapshot = await getDocs(sub(uid, name));
  // batch ограничен 500 операциями
  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(requireDb());
    snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export function clearHistory(uid) {
  return deleteSubcollection(uid, 'history');
}

/* ---------------------------- Экспорт и удаление ---------------------------- */

export async function exportUserData(uid) {
  const [profile, library, collections, history] = await Promise.all([
    getUserProfile(uid),
    getLibrary(uid),
    getCollections(uid),
    getHistory(uid),
  ]);
  return { exportedAt: new Date().toISOString(), profile, library, collections, history };
}

export async function deleteAllUserData(uid) {
  await Promise.all(['library', 'collections', 'history'].map((name) => deleteSubcollection(uid, name)));
  await deleteDoc(userDoc(uid));
}

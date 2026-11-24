import { configureStore } from '@reduxjs/toolkit';
import { getOnlineStatus, subscribeToOnlineStatus } from '../services/connection';
import { TTL } from './requestState';
import { invalidateUserData, revalidateAfterReconnect } from './sessionActions';
import catalogReducer from './slices/catalogSlice';
import collectionsReducer from './slices/collectionsSlice';
import detailsReducer from './slices/detailsSlice';
import historyReducer from './slices/historySlice';
import libraryReducer from './slices/librarySlice';
import profileReducer from './slices/profileSlice';

export const store = configureStore({
  reducer: {
    catalog: catalogReducer, // TMDB: каталог, тренды, подборки главной, жанры
    details: detailsReducer, // TMDB: карточки фильмов
    library: libraryReducer, // Firestore: библиотека пользователя
    collections: collectionsReducer, // Firestore: подборки
    history: historyReducer, // Firestore: история просмотров
    profile: profileReducer, // Firestore: документ профиля
  },
  // Redux DevTools включаются автоматически в режиме разработки
});

// Сеть вернулась (подтверждено пингом в connection.js) — перезапросить сохранённые офлайн-данные
let wasOnline = getOnlineStatus();
subscribeToOnlineStatus(() => {
  const online = getOnlineStatus();
  if (online && !wasOnline) store.dispatch(revalidateAfterReconnect());
  wasOnline = online;
});

// Вернулись на вкладку — личные данные старше минуты обновятся (могли измениться на другом устройстве)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getOnlineStatus()) {
      store.dispatch(invalidateUserData(TTL.user));
    }
  });
}

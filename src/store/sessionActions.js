import { createAction } from '@reduxjs/toolkit';

/**
 * Общие действия, на которые реагируют сразу несколько слайсов (через extraReducers).
 */

/** Выход, смена аккаунта, удаление аккаунта, уход в офлайн: стереть все личные данные. */
export const clearUserData = createAction('session/clearUserData');

/** Пометить личные данные устаревшими (после регистрации, при возвращении на вкладку). */
export const invalidateUserData = createAction('session/invalidateUserData', (olderThan = 0) => ({
  payload: { olderThan, now: Date.now() },
}));

/** Сеть вернулась: перезапросить данные, пришедшие из кэша Service Worker, и упавшие запросы. */
export const revalidateAfterReconnect = createAction('session/revalidateAfterReconnect');

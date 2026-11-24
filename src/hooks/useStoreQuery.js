import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Подключает компонент к записи серверных данных в Redux.
 *
 * - при монтировании и смене key отправляет thunk; condition внутри thunk решает,
 *   нужен ли запрос (дубли и свежие данные отсекаются);
 * - если запись помечена устаревшей (invalidated) — перезапрашивает;
 * - abortOnKeyChange: при смене ключа (новые фильтры) прошлый запрос отменяется через AbortController;
 * - возвращает состояния в том же виде, в каком их ждут страницы.
 */
export function useCachedQuery({ key, entry, request, enabled = true, requiresOnline = false, abortOnKeyChange = false }) {
  const dispatch = useDispatch();
  const online = useOnlineStatus();
  const canRun = enabled && (!requiresOnline || online);
  const needsFetch = !entry || entry.invalidated || entry.status === 'idle';

  const requestRef = useRef(request);
  requestRef.current = request;
  const lastRef = useRef(null);

  useEffect(() => {
    if (!canRun) return;
    const promise = dispatch(requestRef.current());
    const last = lastRef.current;
    if (!last || last.key !== key) {
      if (last && abortOnKeyChange) last.promise.abort(); // ответ на старые фильтры уже не нужен
      lastRef.current = { key, promise };
    }
  }, [dispatch, key, canRun, needsFetch, abortOnKeyChange]);

  const refetch = useCallback(() => dispatch(requestRef.current({ force: true })), [dispatch]);

  const status = entry?.status ?? 'idle';
  const data = entry?.data;
  const isPending = data === undefined && status !== 'failed';
  return {
    data,
    error: entry?.error ?? null,
    status,
    isPending,
    isLoading: isPending && status === 'loading',
    isFetching: status === 'loading',
    isError: status === 'failed',
    isSuccess: data !== undefined && status !== 'failed',
    refetch,
  };
}

/**
 * Состояние одной операции (сохранить, удалить, сменить пароль) — временное состояние UI,
 * поэтому оно локальное, а не в Redux. API как у мутаций: mutate(vars, { onSuccess }), isPending.
 */
export function useAsyncAction(action, { onSuccess, onError } = {}) {
  const [isPending, setPending] = useState(false);
  const mounted = useRef(true);
  const handlers = useRef({ action, onSuccess, onError });
  handlers.current = { action, onSuccess, onError };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const mutateAsync = useCallback(async (vars) => {
    setPending(true);
    try {
      const result = await handlers.current.action(vars);
      handlers.current.onSuccess?.(result, vars);
      return result;
    } catch (error) {
      handlers.current.onError?.(error, vars);
      throw error;
    } finally {
      if (mounted.current) setPending(false);
    }
  }, []);

  const mutate = useCallback(
    (vars, options = {}) => {
      mutateAsync(vars).then(
        (result) => options.onSuccess?.(result, vars),
        () => {}, // ошибка уже обработана в onError
      );
    },
    [mutateAsync],
  );

  return { mutate, mutateAsync, isPending };
}

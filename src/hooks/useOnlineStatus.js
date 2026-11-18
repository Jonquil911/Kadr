import { useSyncExternalStore } from 'react';
import { getOnlineStatus, subscribeToOnlineStatus } from '../services/connection';

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeToOnlineStatus, getOnlineStatus, () => true);
}

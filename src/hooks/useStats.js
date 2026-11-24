import { useSelector } from 'react-redux';
import { selectLibraryStats } from '../store/slices/librarySlice';
import { useLibrary } from './useLibrary';

export { computeStats } from '../utils/stats';

/** Статистика — мемоизированный селектор поверх библиотеки, без дополнительных запросов. */
export function useStats() {
  const query = useLibrary();
  const stats = useSelector(selectLibraryStats);
  return { ...query, stats };
}

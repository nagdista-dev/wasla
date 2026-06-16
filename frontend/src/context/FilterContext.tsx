import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadHiddenCategories, saveHiddenCategories } from '../storage';

export type TimeRange = 'all' | 'hour' | 'today' | 'week' | 'month' | '3months' | 'year';
export type SortBy = 'newest' | 'views' | 'channel' | 'category';

export interface FilterState {
  selectedCategory: string;
  timeRange: TimeRange;
  sortBy: SortBy;
  hiddenCategories: string[];
}

interface FilterContextType {
  filters: FilterState;
  setSelectedCategory: (value: string) => void;
  setTimeRange: (value: TimeRange) => void;
  setSortBy: (value: SortBy) => void;
  setHiddenCategories: (value: string[]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  showFilterModal: boolean;
  setShowFilterModal: (value: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

function loadPref2<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

function savePref2(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* noop */ }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategoryState] = useState<string>(() => loadPref2<string>('wasla_selected_category', ''));
  const [timeRange, setTimeRangeState] = useState<TimeRange>(() => loadPref2<TimeRange>('wasla_time', 'all'));
  const [sortBy, setSortByState] = useState<SortBy>(() => loadPref2<SortBy>('wasla_sort', 'newest'));
  const [hiddenCategories, setHiddenCategoriesState] = useState<string[]>(() => loadHiddenCategories());
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => { savePref2('wasla_selected_category', selectedCategory); }, [selectedCategory]);
  useEffect(() => { savePref2('wasla_time', timeRange); }, [timeRange]);
  useEffect(() => { savePref2('wasla_sort', sortBy); }, [sortBy]);
  useEffect(() => { saveHiddenCategories(hiddenCategories); }, [hiddenCategories]);

  const setSelectedCategory = useCallback((value: string) => setSelectedCategoryState(value), []);
  const setTimeRange = useCallback((value: TimeRange) => setTimeRangeState(value), []);
  const setSortBy = useCallback((value: SortBy) => setSortByState(value), []);
  const setHiddenCategories = useCallback((value: string[]) => setHiddenCategoriesState(value), []);

  const resetFilters = useCallback(() => {
    setSelectedCategoryState('');
    setTimeRangeState('all');
    setSortByState('newest');
    setHiddenCategoriesState([]);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== '') count++;
    if (timeRange !== 'all') count++;
    if (sortBy !== 'newest') count++;
    if (hiddenCategories.length > 0) count++;
    return count;
  }, [selectedCategory, timeRange, sortBy, hiddenCategories]);

  const filters = useMemo<FilterState>(() => ({
    selectedCategory,
    timeRange,
    sortBy,
    hiddenCategories,
  }), [selectedCategory, timeRange, sortBy, hiddenCategories]);

  return (
    <FilterContext.Provider value={{
      filters,
      setSelectedCategory,
      setTimeRange,
      setSortBy,
      setHiddenCategories,
      resetFilters,
      activeFilterCount,
      showFilterModal,
      setShowFilterModal,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}

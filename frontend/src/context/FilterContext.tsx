import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { saveSetting, loadSetting, saveHiddenCategories, loadHiddenCategories } from '../storage';

export type TimeRange = 'all' | 'hour' | 'today' | 'week' | 'month' | '3months' | 'year';
export type SortBy = 'newest' | 'views' | 'channel' | 'category';

export interface FilterState {
  selectedCategory: string;
  timeRange: TimeRange;
  sortBy: SortBy;
  hiddenCategories: string[];
  showLiveOnly: boolean;
}

interface FilterContextType {
  filters: FilterState;
  setSelectedCategory: (value: string) => void;
  setTimeRange: (value: TimeRange) => void;
  setSortBy: (value: SortBy) => void;
  setHiddenCategories: (value: string[]) => void;
  setShowLiveOnly: (value: boolean) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  showFilterModal: boolean;
  setShowFilterModal: (value: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

function syncLoadPref<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

function syncLoadHiddenCategories(): string[] {
  try {
    const stored = localStorage.getItem('wasla_hidden_categories');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === 'string');
  } catch {
    return [];
  }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategoryState] = useState<string>(() => syncLoadPref<string>('wasla_selected_category', ''));
  const [timeRange, setTimeRangeState] = useState<TimeRange>(() => syncLoadPref<TimeRange>('wasla_time', 'all'));
  const [sortBy, setSortByState] = useState<SortBy>(() => syncLoadPref<SortBy>('wasla_sort', 'newest'));
  const [hiddenCategories, setHiddenCategoriesState] = useState<string[]>(() => syncLoadHiddenCategories());
  const [showLiveOnly, setShowLiveOnlyState] = useState<boolean>(() => syncLoadPref<boolean>('wasla_show_live_only', false));
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    loadSetting<string>('wasla_selected_category').then((v) => { if (v !== undefined) setSelectedCategoryState(v); });
    loadSetting<TimeRange>('wasla_time').then((v) => { if (v !== undefined) setTimeRangeState(v); });
    loadSetting<SortBy>('wasla_sort').then((v) => { if (v !== undefined) setSortByState(v); });
    loadSetting<boolean>('wasla_show_live_only').then((v) => { if (v !== undefined) setShowLiveOnlyState(v); });
    loadHiddenCategories().then((v) => { if (v.length > 0) setHiddenCategoriesState(v); });
  }, []);

  useEffect(() => { saveSetting('wasla_selected_category', selectedCategory); }, [selectedCategory]);
  useEffect(() => { saveSetting('wasla_time', timeRange); }, [timeRange]);
  useEffect(() => { saveSetting('wasla_sort', sortBy); }, [sortBy]);
  useEffect(() => { saveHiddenCategories(hiddenCategories); }, [hiddenCategories]);
  useEffect(() => { saveSetting('wasla_show_live_only', showLiveOnly); }, [showLiveOnly]);

  const setSelectedCategory = useCallback((value: string) => setSelectedCategoryState(value), []);
  const setTimeRange = useCallback((value: TimeRange) => setTimeRangeState(value), []);
  const setSortBy = useCallback((value: SortBy) => setSortByState(value), []);
  const setHiddenCategories = useCallback((value: string[]) => setHiddenCategoriesState(value), []);
  const setShowLiveOnly = useCallback((value: boolean) => setShowLiveOnlyState(value), []);

  const resetFilters = useCallback(() => {
    setSelectedCategoryState('');
    setTimeRangeState('all');
    setSortByState('newest');
    setHiddenCategoriesState([]);
    setShowLiveOnlyState(false);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== '') count++;
    if (timeRange !== 'all') count++;
    if (sortBy !== 'newest') count++;
    if (hiddenCategories.length > 0) count++;
    if (showLiveOnly) count++;
    return count;
  }, [selectedCategory, timeRange, sortBy, hiddenCategories, showLiveOnly]);

  const filters = useMemo<FilterState>(() => ({
    selectedCategory,
    timeRange,
    sortBy,
    hiddenCategories,
    showLiveOnly,
  }), [selectedCategory, timeRange, sortBy, hiddenCategories, showLiveOnly]);

  return (
    <FilterContext.Provider value={{
      filters,
      setSelectedCategory,
      setTimeRange,
      setSortBy,
      setHiddenCategories,
      setShowLiveOnly,
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

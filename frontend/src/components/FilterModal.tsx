import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X, Check, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { FilterState, TimeRange, SortBy } from '../context/FilterContext';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  categories: string[];
}

const timeOptions: { value: TimeRange; labelKey: string }[] = [
  { value: 'all', labelKey: 'home.allTime' },
  { value: 'hour', labelKey: 'home.lastHour' },
  { value: 'today', labelKey: 'home.today' },
  { value: 'week', labelKey: 'home.thisWeek' },
  { value: 'month', labelKey: 'home.thisMonth' },
  { value: '3months', labelKey: 'filterModal.last3Months' },
  { value: 'year', labelKey: 'home.thisYear' },
];

const sortOptions: { value: SortBy; labelKey: string }[] = [
  { value: 'newest', labelKey: 'home.newest' },
  { value: 'views', labelKey: 'home.mostViewed' },
  { value: 'channel', labelKey: 'home.channelAZ' },
  { value: 'category', labelKey: 'home.category' },
];

const FilterModal = memo(function FilterModal({ isOpen, onClose, filters, onApply, onReset, categories }: FilterModalProps) {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState(filters.selectedCategory);
  const [timeRange, setTimeRange] = useState(filters.timeRange);
  const [sortBy, setSortBy] = useState(filters.sortBy);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(filters.hiddenCategories);
  const [showLiveOnly, setShowLiveOnly] = useState<boolean>(filters.showLiveOnly);
  const [closing, setClosing] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(filters.selectedCategory);
      setTimeRange(filters.timeRange);
      setSortBy(filters.sortBy);
      setHiddenCategories(filters.hiddenCategories);
      setShowLiveOnly(filters.showLiveOnly);
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => modalRef.current?.focus(), 50);
    }
  }, [isOpen, filters]);

  const handleCancel = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
      previousFocusRef.current?.focus();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleCancel();
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filters, handleCancel]);

  const handleApply = useCallback(() => {
    onApply({ selectedCategory, timeRange, sortBy, hiddenCategories, showLiveOnly });
    onClose();
  }, [onApply, onClose, selectedCategory, timeRange, sortBy, hiddenCategories, showLiveOnly]);

  const handleReset = useCallback(() => {
    setSelectedCategory('');
    setTimeRange('all');
    setSortBy('newest');
    setHiddenCategories([]);
    onReset();
    onClose();
  }, [onReset, onClose]);

  const handleToggleHidden = useCallback((cat: string) => {
    setHiddenCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleClearHidden = useCallback(() => {
    setHiddenCategories([]);
  }, []);

  if (!isOpen && !closing) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-0 ${closing ? 'animate-fadeout' : 'animate-fadein'}`}
      style={{ animationDuration: '0.2s' }}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative z-10 w-full h-screen max-h-screen flex flex-col rounded-none bg-white shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700 ${closing ? 'animate-slide-down' : 'animate-slide-up-fullscreen'}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('filterModal.title')}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-brand-coral" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('filterModal.title')}</h2>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label={t('filterModal.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 modal-scroll">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('filterModal.category')}</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategory('')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  selectedCategory === ''
                    ? 'bg-brand-coral text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                }`}
              >
                {t('home.filterAll')}
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-brand-coral text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('filterModal.liveOnly')}</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setShowLiveOnly(false)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  !showLiveOnly
                    ? 'bg-brand-coral text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                }`}
              >
                {t('home.allVideos')}
              </button>
              <button
                onClick={() => setShowLiveOnly(true)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  showLiveOnly
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                }`}
              >
                {t('home.liveOnly')}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('filterModal.publishedTime')}</label>
            <div className="flex flex-wrap gap-1.5">
              {timeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTimeRange(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    timeRange === opt.value
                      ? 'bg-brand-coral text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('filterModal.sort')}</label>
            <div className="flex flex-wrap gap-1.5">
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    sortBy === opt.value
                      ? 'bg-brand-coral text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('filterModal.hiddenCategories')}</label>
              {hiddenCategories.length > 0 && (
                <button
                  onClick={handleClearHidden}
                  className="text-xs font-medium text-brand-coral hover:text-brand-pink transition"
                >
                  {t('filterModal.clearHidden')}
                </button>
              )}
            </div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{t('filterModal.hiddenCategoriesHint')}</p>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('filterModal.noCategories')}</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto modal-scroll">
                {categories.map(cat => {
                  const isHidden = hiddenCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded border-2 transition ${
                        isHidden
                          ? 'bg-brand-coral border-brand-coral'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isHidden && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isHidden}
                        onChange={() => handleToggleHidden(cat)}
                        className="sr-only"
                      />
                      <span className={`text-sm ${isHidden ? 'text-brand-coral font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleReset}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition"
          >
            {t('filterModal.reset')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition"
            >
              {t('filterModal.cancel')}
            </button>
            <button
              onClick={handleApply}
              className="rounded-lg bg-brand-coral px-5 py-2 text-sm font-medium text-white hover:bg-brand-pink transition shadow-sm"
            >
              {t('filterModal.apply')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FilterModal;

import { useState, useEffect, useCallback } from 'react';
import { Clock, Eye, Play, Trash2, History, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { getAllHistory, removeEntry, clearAllHistory, searchHistory, type WatchHistoryEntry } from '../services/watchHistoryService';
import { removeProgress } from '../services/playbackProgressService';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useToast } from '../components/Toast';
import ConfirmActionModal from '../components/ConfirmActionModal';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';

export default function WatchHistoryPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useMeta({ title: t('watchHistory.title') });

  const loadHistory = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const entries = query ? await searchHistory(query) : await getAllHistory();
      setHistory(entries);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      loadHistory();
      return;
    }
    const timer = setTimeout(() => loadHistory(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadHistory]);

  const handleRemove = async (videoId: string) => {
    await removeEntry(videoId);
    await removeProgress(videoId);
    setHistory((prev) => prev.filter((e) => e.videoId !== videoId));
    showToast(t('watchHistory.clearSingle'), 'info');
  };

  const handleClearAll = async () => {
    await clearAllHistory();
    setHistory([]);
    setShowClearConfirm(false);
    showToast(t('watchHistory.clearAll'), 'info');
  };

  const handlePlay = (entry: WatchHistoryEntry) => {
    const vidId = entry.videoId;
    if (vidId) {
      navigate(`/video/${vidId}`);
    }
  };

  const handleNavigateToChannel = (channelId?: string) => {
    if (channelId) {
      navigate(`/channel/${channelId}`);
    }
  };

  const formatTotalWatchTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
              <History className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('watchHistory.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('watchHistory.videoCount', { count: history.length })}
              </p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition"
            >
              <Trash2 className="h-4 w-4" />
              {t('watchHistory.clearAll')}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('watchHistory.searchPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20 dark:border-gray-700 dark:bg-dark-navy dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-coral"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-dark-navy">
            <History className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {searchQuery ? t('watchHistory.searchPlaceholder') : t('watchHistory.empty')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('watchHistory.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => {
              const totalDuration = entry.durationSeconds || 0;
              const progressPct = totalDuration > 0 ? Math.min(100, Math.round((entry.totalWatchTime / totalDuration) * 100)) : entry.completionPercentage;

              return (
                <div
                  key={entry.videoId}
                  className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md transition dark:bg-dark-navy dark:ring-gray-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                    {/* Thumbnail */}
                    <div className="relative w-full sm:w-40 sm:flex-shrink-0 aspect-video overflow-hidden rounded-t-xl sm:rounded-lg sm:mt-4 sm:ms-4">
                      <ThumbnailWithPlaceholder
                        src={entry.thumbnail}
                        alt={entry.title}
                      />
                      <button
                        onClick={() => handlePlay(entry)}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
                        aria-label={t('course.playVideo')}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg">
                          <Play className="h-5 w-5 pl-0.5" />
                        </span>
                      </button>
                      {/* Progress bar overlay at bottom */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                          <div
                            className="h-full bg-brand-coral transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 p-4 sm:ps-0">
                      <h3
                        className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-brand-coral transition-colors"
                        onClick={() => handlePlay(entry)}
                      >
                        {entry.title}
                      </h3>
                      <button
                        onClick={() => handleNavigateToChannel(entry.channelId)}
                        className="mt-1 text-xs font-medium text-brand-coral hover:underline"
                      >
                        {entry.channelName || 'Unknown'}
                      </button>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(new Date(entry.lastViewedAt).toISOString(), t)}
                        </span>
                        {entry.totalWatchTime > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {formatTotalWatchTime(entry.totalWatchTime)}
                          </span>
                        )}
                        {progressPct > 0 && (
                          <span className="rounded bg-brand-coral/10 px-2 py-0.5 text-xs font-medium text-brand-coral">
                            {t('watchHistory.percentWatched', { percent: progressPct })}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handlePlay(entry)}
                          className="flex items-center gap-1.5 rounded-lg bg-brand-coral/10 px-3 py-1.5 text-xs font-medium text-brand-coral hover:bg-brand-coral/20 transition"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {t('course.playVideo')}
                        </button>
                        <button
                          onClick={() => handleRemove(entry.videoId)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('watchHistory.clearSingle')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clear all confirmation modal */}
        {showClearConfirm && (
          <ConfirmActionModal
            isOpen={showClearConfirm}
            onClose={() => setShowClearConfirm(false)}
            onConfirm={handleClearAll}
            title={t('watchHistory.clearAll')}
            description={t('watchHistory.clearAllConfirm')}
            confirmLabel={t('watchHistory.clearAll')}
          />
        )}
      </div>
    </div>
  );
}

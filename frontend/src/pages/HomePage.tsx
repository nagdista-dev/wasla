import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Clock, Eye, History, LayoutGrid, List, Play, RefreshCw, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EditChannelModal from '../components/EditChannelModal';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import VideoListSkeleton from '../components/VideoListSkeleton';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { useFilters } from '../context/FilterContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useMeta } from '../hooks/useMeta';
import { useDebounce } from '../hooks/useDebounce';
import { saveSetting, loadSetting } from '../storage';
import { useToast } from '../components/Toast';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';
import { parseAndValidateChannelsJson } from '../utils/importChannels';
import { getAllFromIndex } from '../services/indexedDbService';
import { loadHomeFeedFromCache, refreshHomeFeed } from '../services/homeFeedRepository';
import { extractVideoId } from '../utils/videoUtils';
import type { Channel, ChannelLatestVideo, LatestVideo } from '../types';
import type { WatchHistoryEntry } from '../services/watchHistoryService';
import { saveHomeScroll, getHomeScroll, clearHomeScroll } from '../utils/scrollRestoration';

function syncLoadPref<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function HomePage({ channels, onUpdate, onImportChannelsJson, showSearch, onCloseSearch }: { channels: Channel[]; onUpdate?: (id: string, name: string, categories: string[]) => void; onImportChannelsJson?: (channels: Channel[]) => void; showSearch?: boolean; onCloseSearch?: () => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  usePlayer();
  const { showToast } = useToast();
  const { filters, setSelectedCategory, setTimeRange, setSortBy, setHiddenCategories, setShowFilterModal, activeFilterCount } = useFilters();
  const { selectedCategory, timeRange, sortBy, hiddenCategories } = filters;
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  useMeta({ title: t('home.title'), description: t('home.channelsInFeed', { count: channels.length }) });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(syncLoadPref('wasla_viewMode', 'grid'));
  const [continueWatching, setContinueWatching] = useState<WatchHistoryEntry[]>([]);

  useEffect(() => {
    loadSetting<'grid' | 'list'>('wasla_viewMode').then((v) => { if (v) setViewMode(v); });
  }, []);

  useEffect(() => {
    getAllFromIndex<WatchHistoryEntry>('watchHistory', 'lastViewedAt').then((entries) => {
      setContinueWatching(entries.filter((e) => e.completionPercentage > 0 && e.completionPercentage < 100).slice(0, 6));
    }).catch(() => {});
  }, []);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 300);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);
  const [importingJson, setImportingJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleCloseSearch = useCallback(() => {
    setSearchText('');
    onCloseSearch?.();
  }, [onCloseSearch]);
  const itemsRef = useRef<ChannelLatestVideo[]>([]);


  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => { saveSetting('wasla_viewMode', viewMode); }, [viewMode]);

  useEffect(() => {
    const saved = getHomeScroll();
    if (saved > 0 && channels.length > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, saved);
        clearHomeScroll();
      });
    }
  }, [hasLoadedCache, channels.length]);

  useEffect(() => {
    return () => saveHomeScroll();
  }, []);

  const allCategories = Array.from(new Set(channels.flatMap((c) => c.categories))).sort((a, b) => a.localeCompare(b));

  const fetchLatestVideos = useCallback(async () => {
    if (channels.length === 0) {
      setItems([]);
      setHasLoadedCache(true);
      return;
    }

    setIsRefreshing(true);
    try {
      const newItems = await refreshHomeFeed(channels, {
        couldNotFetch: t('home.couldNotFetch'),
        noVideoFound: t('home.noVideoFound'),
      }, itemsRef.current);
      setItems(newItems);
    } finally {
      setIsRefreshing(false);
      setHasLoadedCache(true);
    }
  }, [channels, t]);

  const handleJsonImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast(t('home.invalidJsonFile') || 'Please select a .json file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast(t('home.fileTooLarge') || 'File is too large (max 5MB).', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImportingJson(true);

    try {
      const text = await file.text();
      const result = parseAndValidateChannelsJson(text);

      if (result.channels.length > 0 && onImportChannelsJson) {
        onImportChannelsJson(result.channels);
      }

      if (result.errors.length > 0 && result.channels.length === 0) {
        showToast(result.errors[0], 'error');
      } else if (result.errors.length > 0) {
        showToast(
          t('home.importedWithErrors') || `Imported ${result.channels.length} channels with ${result.errors.length} warnings.`,
          'info',
        );
      } else {
        showToast(
          t('home.importSuccess') || `Successfully imported ${result.channels.length} channels.`,
          'success',
        );
      }
    } catch {
      showToast(t('home.importFailed') || 'Failed to read file.', 'error');
    } finally {
      setImportingJson(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [onImportChannelsJson, showToast, t]);

  useEffect(() => {
    let cancelled = false;

    const loadVideos = async () => {
      if (channels.length === 0) {
        setItems([]);
        setHasLoadedCache(true);
        return;
      }

      setHasLoadedCache(false);

      try {
        const cachedItems = await loadHomeFeedFromCache(channels);
        if (cancelled) return;

        if (cachedItems.length === channels.length) {
          setItems(cachedItems);
          setHasLoadedCache(true);
          return;
        }

        if (cachedItems.length > 0) {
          const cachedByChannel = new Map(cachedItems.map((item) => [item.channel.id, item]));
          setItems(channels.map((channel) => cachedByChannel.get(channel.id) || {
            channel,
            loading: true,
          }));
        } else {
          setItems(channels.map((channel) => ({
            channel,
            loading: true,
          })));
        }

        await fetchLatestVideos();
      } catch {
        if (cancelled) return;
        await fetchLatestVideos();
      }
    };

    void loadVideos();

    return () => {
      cancelled = true;
    };
  }, [channels, fetchLatestVideos]);

  const displayItems = useMemo(() => {
    if (channels.length === 0) return [];
    return items
      .filter((item) => {
        if (item.loading) return true;
        if (item.error) return true;
        return !!item.video;
      })
      .filter((item) => {
        if (hiddenCategories.length > 0) {
          if (item.channel.categories.some(cat => hiddenCategories.includes(cat))) return false;
        }
        return true;
      })
      .filter((item) => {
        if (selectedCategory) {
          if (selectedCategory === '__uncategorized__') {
            return item.channel.categories.length === 0 || (item.channel.categories.length === 1 && item.channel.categories[0] === '');
          }
          if (item.channel.categories.length === 0) return false;
          if (!item.channel.categories.includes(selectedCategory)) return false;
        }
        return true;
      })
      .filter((item) => {
        if (!item.video || timeRange === 'all') return true;
        const now = Date.now();
        const published = new Date(item.video.publishedDate).getTime();
        const diff = now - published;
        switch (timeRange) {
          case 'hour': return diff < 3_600_000;
          case 'today': return diff < 86_400_000;
          case 'week': return diff < 604_800_000;
          case 'month': return diff < 2_592_000_000;
          case '3months': return diff < 7_776_000_000;
          case 'year': return diff < 31_536_000_000;
          default: return true;
        }
      })

      .sort((a, b) => {
        if (!a.video || !b.video) return 0;
        if (sortBy === 'newest') {
          return new Date(b.video.publishedDate).getTime() - new Date(a.video.publishedDate).getTime();
        }
        if (sortBy === 'views') {
          return (b.video.views ?? 0) - (a.video.views ?? 0);
        }
        if (sortBy === 'channel') {
          return a.channel.name.localeCompare(b.channel.name);
        }
        if (sortBy === 'category') {
          const catA = a.channel.categories[0] || '';
          const catB = b.channel.categories[0] || '';
          return catA.localeCompare(catB);
        }
        return 0;
      });
  }, [items, selectedCategory, timeRange, sortBy, hiddenCategories, channels.length]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (selectedCategory) {
      chips.push({ key: `cat:${selectedCategory}`, label: selectedCategory, onRemove: () => setSelectedCategory('') });
    }
    if (timeRange !== 'all') {
      const timeLabels: Record<string, string> = { hour: t('home.lastHour'), today: t('home.today'), week: t('home.thisWeek'), month: t('home.thisMonth'), '3months': t('filterModal.last3Months'), year: t('home.thisYear') };
      chips.push({ key: `time:${timeRange}`, label: timeLabels[timeRange] || timeRange, onRemove: () => setTimeRange('all') });
    }
    if (sortBy !== 'newest') {
      const sortLabels: Record<string, string> = { views: t('home.mostViewed'), channel: t('home.channelAZ'), category: t('home.category') };
      chips.push({ key: `sort:${sortBy}`, label: sortLabels[sortBy] || sortBy, onRemove: () => setSortBy('newest') });
    }
    hiddenCategories.forEach(cat => {
      chips.push({ key: `hidden:${cat}`, label: `${t('filterModal.hiddenCategories')}: ${cat}`, onRemove: () => setHiddenCategories(hiddenCategories.filter(c => c !== cat)) });
    });
    return chips;
  }, [selectedCategory, timeRange, sortBy, hiddenCategories, t, setSelectedCategory, setTimeRange, setSortBy, setHiddenCategories]);

  return (
    <div className="min-h-screen dark:bg-dark-navy overflow-visible">
      <div className="sticky top-16 z-20 border-b border-gray-200 bg-gray-50/95 dark:border-gray-700 dark:bg-dark-navy/95 shadow-sm">
        <div className="flex items-center gap-2 px-4 md:px-6 py-3">
          <button type="button" onClick={() => fetchLatestVideos()} disabled={isRefreshing}
            className="rounded-lg bg-white min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 disabled:opacity-50"
            aria-label={t('home.refresh')}>
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setShowFilterModal(true)}
            className="rounded-lg bg-white min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 relative"
            aria-label={t('filterModal.filter')}>
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand-coral text-[10px] font-bold text-white leading-none px-1 shadow-sm">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex-1" />
          <button type="button" onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
            className="rounded-lg bg-white min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10"
            aria-label={viewMode === 'grid' ? t('home.switchToListView') : t('home.switchToGridView')}>
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
          </button>
        </div>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 md:px-6 pb-3">
            {activeChips.map(chip => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-brand-coral/10 px-2.5 py-1 text-xs font-medium text-brand-coral dark:bg-brand-coral/20"
              >
                {chip.label}
                <button
                  onClick={chip.onRemove}
                  className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-brand-coral/20 transition"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 pt-4">
        {channels.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {items.some((i) => i.loading) || isRefreshing || !hasLoadedCache ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              {isRefreshing ? t('home.refreshing') : t('home.loadingVideos')}
            </span>
            ) : (
              <span>
                {selectedCategory
                  ? t('home.showingWithCategory', { count: displayItems.length, total: items.length, category: selectedCategory })
                  : t('home.showing', { count: displayItems.length, total: items.length })}
              </span>
            )}
          </div>
        )}

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-brand-coral" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('watchHistory.continueWatching')}
              </h2>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {continueWatching.map((entry) => (
                <div
                  key={entry.videoId}
                  onClick={() => navigate(`/video/${entry.videoId}`)}
                  className="group cursor-pointer rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md transition dark:bg-dark-navy dark:ring-gray-700"
                >
                  <div className="relative aspect-video overflow-hidden bg-black">
                    <ThumbnailWithPlaceholder src={entry.thumbnail} alt={entry.title} />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                      <div
                        className="h-full bg-brand-coral transition-all group-hover:opacity-80"
                        style={{ width: `${entry.completionPercentage}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-4 w-4 pl-0.5" />
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug">
                      {entry.title}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {entry.channelName}
                    </p>
                    <p className="mt-0.5 text-[10px] text-brand-coral font-medium">
                      {entry.completionPercentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 sm:p-14 text-center max-w-lg w-full dark:border-gray-600 dark:bg-dark-navy">
              <Play className="mx-auto mb-5 h-14 w-14 text-brand-coral" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('home.addFirstChannel')}</h2>
              <p className="mx-auto mt-3 max-w-md text-gray-500 dark:text-gray-400 leading-relaxed">
                {t('home.addFirstChannelDesc')}
              </p>
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importingJson}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 px-8 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-300 hover:border-brand-coral hover:text-brand-coral transition-all active:scale-95 min-h-[48px] w-full sm:w-auto justify-center disabled:opacity-50"
                >
                  <Upload className="h-5 w-5" />
                  {importingJson
                    ? (t('home.importing') || 'Importing...')
                    : (t('home.importFromJson') || 'Import from JSON')}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleJsonImport}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-full items-stretch">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <div key={channel.id} className="min-w-0 h-full">
                    {loading ? (
                      <VideoCardSkeleton />
                    ) : error ? (
                      <div className="animate-fadein h-full">
                        <article className="rounded-xl overflow-hidden bg-white shadow-md dark:bg-dark-navy p-6 text-center min-h-[280px] flex flex-col items-center justify-center h-full">
                          <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                          <h2 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                        </article>
                      </div>
                    ) : video ? (
                      <div className="animate-fadein h-full">
                        <VideoCard channel={channel} video={video} onEdit={onUpdate ? setEditingChannel : undefined} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <div key={channel.id} className="min-w-0">
                    {loading ? (
                      <VideoListSkeleton />
                    ) : error ? (
                      <div className="animate-fadein">
                        <article className="flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-4 dark:bg-dark-navy dark:ring-gray-700">
                          <div className="flex-1 flex flex-col justify-center text-center">
                            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                            <h2 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
                          </div>
                        </article>
                      </div>
                    ) : video ? (
                      <div className="animate-fadein">
                      <div
                        className="group relative rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md active:scale-[0.99] dark:bg-dark-navy dark:ring-gray-700 cursor-pointer overflow-hidden"
                        onClick={() => {
                          const vidId = extractVideoId(video.link);
                          if (vidId) navigate(`/video/${vidId}`, { state: { video: { ...video, channelName: video.channelName || channel.name }, channelId: channel.id } });
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            const vidId = extractVideoId(video.link);
                            if (vidId) navigate(`/video/${vidId}`, { state: { video: { ...video, channelName: video.channelName || channel.name }, channelId: channel.id } });
                          }
                        }}
                      >
                        <div className="px-4 py-3 flex flex-col gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/channel/${channel.id}`); }}
                                className="flex items-center gap-1.5 min-w-0 group/ch"
                              >
                                <span className="flex justify-center items-center h-7 w-7 rounded-full flex-shrink-0 text-xs font-bold text-white shadow-sm leading-none" style={{ lineHeight: 1, background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}>
                                  {(video.channelName || channel.name).charAt(0).toUpperCase()}
                                </span>
                                <span className="text-xs font-semibold text-brand-coral dark:text-brand-coral group-hover/ch:underline truncate">
                                  {video.channelName || channel.name}
                                </span>
                              </button>
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                              {video.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{formatRelativeTime(video.publishedDate, t)}</span>
                            </span>
                            {video.views !== undefined && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{(() => {
                                  const num = typeof video.views === 'string' ? parseInt(video.views, 10) : video.views!;
                                  if (isNaN(num)) return '—';
                                  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
                                  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
                                  return num.toString();
                                })()}</span>
                              </span>
                            )}
                          </div>
                          {channel.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {channel.categories.map((cat) => (
                                <button
                                  key={cat}
                                  onClick={(e) => { e.stopPropagation(); navigate(`/category/${encodeURIComponent(cat)}`); }}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/15 text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-white/20 truncate max-w-[100px] hover:bg-brand-coral/10 hover:text-brand-coral hover:border-brand-coral/30 transition-colors"
                              >
                                {cat}
                              </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              )}
            </>
          )}
        </div>

            {showSearch && (
              <div className="fixed inset-0 z-[60] flex items-start justify-center p-2 pt-16 sm:p-4 sm:pt-20">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseSearch} />
                <div className="relative z-10 w-full sm:max-w-2xl max-h-[80vh] sm:max-h-[70vh] flex flex-col rounded-xl bg-white shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
                  <div className="flex items-center gap-3 border-b border-gray-200 px-3 py-3 sm:px-4 sm:py-4 dark:border-gray-700">
                    <Search className="h-5 w-5 flex-0 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('home.searchChannels')}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400 dark:text-white text-sm sm:text-base"
                      autoFocus
                    />
                    <button
                      onClick={handleCloseSearch}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2 sm:py-3">
                    {!debouncedSearch ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.searchChannels')}</p>
                      </div>
                    ) : items.some((i) => i.loading) ? (
                      <div className="space-y-2 px-3 sm:px-4">
                        {[1,2,3].map((n) => (
                          <div key={n} className="flex items-center gap-3 p-3 animate-fadein">
                            <div className="w-20 flex-shrink-0 aspect-video rounded-lg skeleton-shimmer" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                              <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                              <div className="h-3 w-1/4 rounded skeleton-shimmer" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (() => {
                      const q = debouncedSearch.toLowerCase().trim();
                      const results = channels.flatMap((ch) => {
                        const item = items.find((i) => i.channel.id === ch.id);
                        const video = item?.video;
                        const loading = item?.loading;
                        const name = ch.name.toLowerCase();
                        const handle = ch.handle?.toLowerCase() || '';
                        const title = video?.title?.toLowerCase() || '';
                        const matchesChannel = name.includes(q) || handle.includes(q);
                        const matchesVideo = title.includes(q);
                        const entries: { channel: Channel; video?: LatestVideo; loading?: boolean; matchType: 'channel' | 'video' }[] = [];
                        if (matchesChannel && video) {
                          entries.push({ channel: ch, video, loading, matchType: 'video' });
                        } else if (matchesChannel) {
                          entries.push({ channel: ch, video, loading, matchType: 'channel' });
                        }
                        if (matchesVideo && video && title.includes(q) && !name.includes(q)) {
                          entries.push({ channel: ch, video, loading, matchType: 'video' });
                        }
                        return entries;
                      });
                      return results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.noVideosMatch')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2 px-3 sm:px-4">
                          {results.map(({ channel, video, loading, matchType }, idx) => (
                            <div
                              key={`${channel.id}-${matchType}-${idx}`}
                              onClick={() => {
                                if (matchType === 'video' && video) {
                                  const vidId = extractVideoId(video.link);
                                  if (vidId) navigate(`/video/${vidId}`, { state: { video, channelId: channel.id } });
                                } else {
                                  navigate(`/channel/${channel.id}`);
                                }
                                handleCloseSearch();
                              }}
                              className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 hover:border-brand-coral/30 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer animate-fadein"
                            >
                              {video ? (
                                <div className="w-20 flex-shrink-0 aspect-video overflow-hidden rounded-lg shadow-sm relative">
                                  <ThumbnailWithPlaceholder src={video.thumbnail} alt="" className="group-hover:scale-105 transition-transform duration-300" />
                                  {video.duration && (
                                    <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded leading-none">
                                      {(() => {
                                        const s = parseInt(video.duration!, 10);
                                        if (isNaN(s)) return null;
                                        const m = Math.floor(s / 60);
                                        const sec = s % 60;
                                        return `${m}:${sec.toString().padStart(2, '0')}`;
                                      })()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-20 flex-shrink-0 aspect-video rounded-lg bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                  {channel.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-brand-coral transition-colors">
                                  {video?.title || channel.name}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="flex justify-center items-center h-5 w-5 rounded-full flex-shrink-0 text-[8px] font-bold text-white shadow-sm leading-none" style={{ lineHeight: 1, background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}>
                                    {(video?.channelName || channel.name).charAt(0).toUpperCase()}
                                  </span>
                                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                                    {video?.channelName || channel.name}
                                    {loading && ' — ...'}
                                  </span>
                                </div>
                                {video && (
                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatRelativeTime(video.publishedDate, t)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      {(() => {
                                        const num = typeof video.views === 'string' ? parseInt(video.views, 10) : video.views!;
                                        if (isNaN(num)) return '—';
                                        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
                                        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
                                        return num.toString();
                                      })()}
                                    </span>
                                  </div>
                                )}
                                {channel.categories.length > 0 && (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    {channel.categories.slice(0, 2).map((cat) => (
                                      <span key={cat} className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/15 text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[80px]">
                                        {cat}
                                      </span>
                                    ))}
                                    {channel.categories.length > 2 && (
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500">+{channel.categories.length - 2}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {matchType === 'channel' && (
                                <span className="flex-shrink-0 text-[10px] font-medium text-brand-coral bg-brand-coral/10 px-2 py-1 rounded-full">
                                  {t('home.channel') || 'Channel'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
            </div>
          </div>
        </div>
      )}

      {channels.length > 0 && items.length > 0 && hasLoadedCache && !isRefreshing && !items.some(i => i.loading) && !items.some(i => i.video) && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importingJson}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-brand-coral hover:text-brand-coral transition-all active:scale-95 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {importingJson
              ? (t('home.importing') || 'Importing...')
              : (t('home.importFromJson') || 'Import from JSON')}
          </button>
        </div>
      )}

      {editingChannel && onUpdate && (
        <EditChannelModal
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
          onUpdate={(name, categories) => {
            onUpdate(editingChannel.id, name, categories);
            setEditingChannel(null);
          }}
          existingCategories={allCategories}
        />
      )}
    </div>
  );
}

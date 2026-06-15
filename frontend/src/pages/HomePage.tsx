import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookmarkCheck, BookmarkPlus, Clock, Eye, LayoutGrid, List, Play, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import EditChannelModal from '../components/EditChannelModal';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import VideoListSkeleton from '../components/VideoListSkeleton';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useMeta } from '../hooks/useMeta';
import { useDebounce } from '../hooks/useDebounce';
import { loadWatchLater, saveWatchLater } from '../storage';
import { useToast } from '../components/Toast';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';
import type { Channel, ChannelLatestVideo, LatestVideo } from '../types';

type ChannelApiResponse = {
  success: boolean;
  data?: {
    latestVideo?: LatestVideo;
    videos?: LatestVideo[];
    title?: string;
    link?: string;
    thumbnail?: string;
    publishedDate?: string;
    published?: string;
    channelName?: string;
  };
  error?: string;
  cached?: boolean;
};

function getLatestVideo(channel: Channel, data: ChannelApiResponse['data']): LatestVideo | undefined {
  if (data?.latestVideo) return data.latestVideo;

  const firstVideo = data?.videos?.[0];
  if (firstVideo) return firstVideo;

  if (data?.title || data?.link) {
    return {
      title: data.title || 'Untitled',
      link: data.link || `https://www.youtube.com/channel/${channel.id}`,
      thumbnail: data.thumbnail,
      publishedDate: data.publishedDate || data.published || '',
      channelName: data.channelName || channel.name,
    };
  }

  return undefined;
}

function loadPref<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* noop */ }
}

export default function HomePage({ channels, onUpdate }: { channels: Channel[]; onUpdate?: (id: string, name: string, categories: string[]) => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  usePlayer();
  const { showToast } = useToast();
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  useMeta({ title: t('home.title'), description: t('home.channelsInFeed', { count: channels.length }) });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadPref('wasla_viewMode', 'grid'));
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 300);
  const [sortBy, setSortBy] = useState<'newest' | 'views' | 'channel' | 'category'>(loadPref<'newest' | 'views' | 'channel' | 'category'>('wasla_sort', 'newest'));
  const [timeRange, setTimeRange] = useState<'all' | 'hour' | 'today' | 'week' | 'month' | 'year'>(loadPref<'all' | 'hour' | 'today' | 'week' | 'month' | 'year'>('wasla_time', 'all'));
  const [selectedCategory, setSelectedCategory] = useState<string>(loadPref<string>('wasla_selected_category', ''));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const filterControlsRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    const el = filterControlsRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setHasOverflow(el.scrollWidth > el.clientWidth);
    });
    observer.observe(el);
    setHasOverflow(el.scrollWidth > el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const allCategories = Array.from(new Set(channels.flatMap((c) => c.categories))).sort((a, b) => a.localeCompare(b));

  useEffect(() => { savePref('wasla_viewMode', viewMode); }, [viewMode]);
  useEffect(() => { savePref('wasla_selected_category', selectedCategory); }, [selectedCategory]);
  useEffect(() => { savePref('wasla_sort', sortBy); }, [sortBy]);
  useEffect(() => { savePref('wasla_time', timeRange); }, [timeRange]);

  // Load cached videos instantly on mount
  useEffect(() => {
    const cached = loadPref<ChannelLatestVideo[] | null>('wasla_videos_cache', null);
    if (cached && cached.length > 0) {
      setItems(cached);
    }
  }, []);

  const fetchLatestVideos = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true);

    const initialItems: ChannelLatestVideo[] = channels.map((channel) => ({
      channel,
      loading: !force,
    }));
    if (!force) setItems(initialItems);

    const results = await Promise.allSettled(
      channels.map((channel) =>
        api.get<ChannelApiResponse>(`/channel/${encodeURIComponent(channel.id)}`).then((response) => ({
          channel,
          response,
        })),
      ),
    );

    const newItems: ChannelLatestVideo[] = results.map((result, index) => {
      if (result.status === 'rejected') {
        return {
          channel: channels[index],
          loading: false,
          error: t('home.couldNotFetch'),
        };
      }

      const data = result.value.response.data.data;

      if (!result.value.response.data.success || !data) {
        return {
          channel: channels[index],
          loading: false,
          error: result.value.response.data.error || t('home.couldNotFetch'),
        };
      }

      return {
        channel: channels[index],
        video: getLatestVideo(channels[index], data),
        loading: false,
        error: data.latestVideo || data.videos?.[0] || data.title ? undefined : t('home.noVideoFound'),
      };
    });

    setItems(newItems);
    savePref('wasla_videos_cache', newItems);
    if (force) setIsRefreshing(false);
  }, [channels, t]);

  useEffect(() => {
    if (channels.length === 0) {
      return;
    }

    const loadVideos = async () => {
      await fetchLatestVideos();
    };

    void loadVideos();
  }, [channels, fetchLatestVideos]);

  const displayItems = useMemo(() => {
    if (channels.length === 0) return [];
    return items
      .filter((item) => !item.loading && item.video)
      .filter((item) => {
        if (selectedCategory) {
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
  }, [items, selectedCategory, timeRange, sortBy, channels.length]);

  return (
    <div className="min-h-screen dark:bg-dark-navy overflow-visible">
      <div className="sticky top-16 z-20 border-b border-gray-200 bg-gray-50/95 dark:border-gray-700 dark:bg-dark-navy/95 shadow-sm">
        <div className="flex items-center gap-2 px-4 md:px-6 py-3">
          <div className="flex items-center gap-1.5 flex-0">
            <button onClick={() => setShowSearch(true)}
              className="rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10"
              aria-label={t('home.search')}>
              <Search className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => fetchLatestVideos(true)} disabled={isRefreshing}
              className="rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 disabled:opacity-50"
              aria-label={t('home.refresh')}>
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div ref={filterControlsRef} className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <CustomFilterDropdown value={selectedCategory} onChange={setSelectedCategory}
              options={[{ value: '', label: t('home.filterAll') }, ...allCategories.map(cat => ({ value: cat, label: cat }))]}
              className="flex-1 min-w-0" placeholder={t('home.filterCategory')} />
            <CustomFilterDropdown value={timeRange} onChange={v => setTimeRange(v as any)}
              options={[{ value: 'all', label: t('home.allTime') }, { value: 'hour', label: t('home.lastHour') }, { value: 'today', label: t('home.today') }, { value: 'week', label: t('home.thisWeek') }, { value: 'month', label: t('home.thisMonth') }, { value: 'year', label: t('home.thisYear') }]} className="flex-1 min-w-0" placeholder={t('home.filterTime')} />
            <CustomFilterDropdown value={sortBy} onChange={v => setSortBy(v as any)}
              options={[{ value: 'newest', label: t('home.newest') }, { value: 'views', label: t('home.mostViewed') }, { value: 'channel', label: t('home.channelAZ') }, { value: 'category', label: t('home.category') }]} className="flex-1 min-w-0" placeholder={t('home.filterSort')} />
            <button type="button" onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
              className="hidden md:flex rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 flex-0"
              aria-label={viewMode === 'grid' ? t('home.switchToListView') : t('home.switchToGridView')}>
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
            </button>
          </div>
          {hasOverflow && (
            <button type="button" onClick={() => setShowAllFilters(true)}
              className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-sm text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 flex-0 md:hidden">
              <span className="text-lg leading-none">…</span>
            </button>
          )}
        </div>
      </div>

        <div className="px-6 pt-4">
          {showAllFilters && (
          <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-20">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAllFilters(false)} />
            <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('home.filters')}</h3>
                <button onClick={() => setShowAllFilters(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('home.filterCategory')}</label>
                  <CustomFilterDropdown
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={[
                      { value: '', label: t('home.filterAll') },
                      ...allCategories.map((cat) => ({ value: cat, label: cat })),
                    ]}
                    placeholder={t('home.filterCategory')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('home.filterTime')}</label>
                  <CustomFilterDropdown
                    value={timeRange}
                    onChange={(v) => setTimeRange(v as 'all' | 'hour' | 'today' | 'week' | 'month' | 'year')}
                    options={[
                      { value: 'all', label: t('home.allTime') },
                      { value: 'hour', label: t('home.lastHour') },
                      { value: 'today', label: t('home.today') },
                      { value: 'week', label: t('home.thisWeek') },
                      { value: 'month', label: t('home.thisMonth') },
                      { value: 'year', label: t('home.thisYear') },
                    ]}
                    placeholder={t('home.filterTime')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('home.sortBy')}</label>
                  <CustomFilterDropdown
                    value={sortBy}
                    onChange={(v) => setSortBy(v as 'newest' | 'views' | 'channel' | 'category')}
                    options={[
                      { value: 'newest', label: t('home.newest') },
                      { value: 'views', label: t('home.mostViewed') },
                      { value: 'channel', label: t('home.channelAZ') },
                      { value: 'category', label: t('home.category') },
                    ]}
                    placeholder={t('home.sortBy')}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'))}
                    className="rounded-lg bg-white px-3 py-2 text-sm text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10"
                  >
                    {viewMode === 'grid' ? t('home.switchToList') : t('home.switchToGrid')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {channels.length > 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {items.some((i) => i.loading) ? (
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

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <Play className="mx-auto mb-4 h-12 w-12 text-brand-coral" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('home.addFirstChannel')}</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
              {t('home.addFirstChannelDesc')}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-full items-stretch">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <div key={channel.id} className="min-w-0 h-full">
                    {loading ? (
                      <VideoCardSkeleton />
                    ) : error ? (
                      <article className="rounded-xl overflow-hidden bg-white shadow-md dark:bg-dark-navy p-6 text-center min-h-[280px] flex flex-col items-center justify-center">
                        <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                      </article>
                    ) : video ? (
                      <VideoCard channel={channel} video={video} onEdit={onUpdate ? setEditingChannel : undefined} />
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
                      <article className="flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-4 dark:bg-dark-navy dark:ring-gray-700">
                        <div className="flex-1 flex flex-col justify-center text-center">
                          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                          <h2 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h2>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
                        </div>
                      </article>
                    ) : video ? (
                      <div
                        className="group relative flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md active:scale-[0.99] dark:bg-dark-navy dark:ring-gray-700 cursor-pointer overflow-hidden"
                        onClick={() => navigate(`/channel/${channel.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/channel/${channel.id}`); }}
                      >
                        <div className="relative w-44 flex-shrink-0">
                          <ThumbnailWithPlaceholder
                            src={video.thumbnail}
                            alt={video.title}
                            className="h-full w-full"
                          />
                          {video.duration && (() => {
                            const total = parseInt(video.duration, 10);
                            const formatted = isNaN(total) ? video.duration : (() => {
                              const hrs = Math.floor(total / 3600);
                              const mins = Math.floor((total % 3600) / 60);
                              const secs = total % 60;
                              if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                              return `${mins}:${secs.toString().padStart(2, '0')}`;
                            })();
                            return (
                              <span className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                                <Clock className="h-3 w-3" />
                                {formatted}
                              </span>
                            );
                          })()}
                          <div className="absolute top-2 right-2 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const items = loadWatchLater();
                                const existing = items.find((item) => item.video.link === video.link);
                                if (existing) {
                                  saveWatchLater(items.filter((item) => item.video.link !== video.link));
                                  showToast(t('watchLater.removed'), 'info');
                                } else {
                                  items.push({
                                    id: `${channel.id}_${Date.now()}`,
                                    video,
                                    channelName: video.channelName || channel.name,
                                    channelId: channel.id,
                                    savedAt: Date.now(),
                                    watched: false,
                                  });
                                  saveWatchLater(items);
                                  showToast(t('watchLater.saved'), 'success');
                                }
                              }}
                              className={`w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center shadow-lg transition-all ${
                                loadWatchLater().some((item) => item.video.link === video.link)
                                  ? 'bg-brand-coral text-white'
                                  : 'bg-white/80 text-gray-600 hover:bg-white'
                              }`}
                              aria-label={loadWatchLater().some((item) => item.video.link === video.link) ? t('videoCard.removeWatchLater') : t('videoCard.watchLater')}
                            >
                              {loadWatchLater().some((item) => item.video.link === video.link) ? (
                                <BookmarkCheck className="h-3.5 w-3.5" />
                              ) : (
                                <BookmarkPlus className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 py-3 pr-4 flex flex-col justify-between gap-2">
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSearch(false); setSearchText(''); }} />
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
                      onClick={() => { setShowSearch(false); setSearchText(''); }}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2 sm:py-3">
                    {!debouncedSearch ? (
                      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('home.searchChannels')}</p>
                    ) : channels
                      .filter((ch) => {
                        const q = debouncedSearch.toLowerCase().trim();
                        const name = ch.name.toLowerCase();
                        const handle = ch.handle?.toLowerCase() || '';
                        return name.includes(q) || handle.includes(q);
                      })
                      .map((ch) => {
                        const item = items.find((i) => i.channel.id === ch.id);
                        const video = item?.video;
                        const loading = item?.loading;
                        return { channel: ch, video, loading };
                      })
                      .filter(({ channel, video }) => {
                        if (!debouncedSearch) return true;
                        const q = debouncedSearch.toLowerCase().trim();
                        const name = channel.name.toLowerCase();
                        const handle = channel.handle?.toLowerCase() || '';
                        const title = video?.title?.toLowerCase() || '';
                        return name.includes(q) || handle.includes(q) || title.includes(q);
                      })
                      .map(({ channel, video, loading }) => (
                        <button
                          key={channel.id}
                          onClick={() => { navigate(`/channel/${channel.id}`); setShowSearch(false); setSearchText(''); }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 text-left transition hover:bg-gray-100 dark:hover:bg-white/10 border-b border-gray-100 dark:border-gray-800 last:border-0"
                        >
                          {video ? (
                            <div className="w-16 sm:w-20 flex-shrink-0 aspect-video overflow-hidden rounded-lg">
                              <ThumbnailWithPlaceholder
                                src={video.thumbnail}
                                alt=""
                              />
                            </div>
                          ) : (
                            <div className="w-16 sm:w-20 flex-shrink-0 aspect-video rounded-lg bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow flex items-center justify-center text-white font-bold text-sm">
                              {channel.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                              {video?.title || channel.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                              {video?.channelName || channel.name}
                              {loading && ' — ...'}
                            </p>
                            {channel.categories.length > 0 && (
                              <div className="mt-1 flex items-center gap-1.5">
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
                        </button>
                      ))}
                    {debouncedSearch && channels.filter((ch) => {
                      const q = debouncedSearch.toLowerCase().trim();
                      const name = ch.name.toLowerCase();
                      const handle = ch.handle?.toLowerCase() || '';
                      return name.includes(q) || handle.includes(q);
                    }).length === 0 && (
                      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t('home.noVideosMatch')}</p>
                    )}
            </div>
          </div>
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

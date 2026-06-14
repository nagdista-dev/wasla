import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, Clock, ExternalLink, Eye, LayoutGrid, List, Play, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import EditChannelModal from '../components/EditChannelModal';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import VideoCard from '../components/VideoCard';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useMeta } from '../hooks/useMeta';
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
  const { play } = usePlayer();
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  useMeta({ title: t('home.title'), description: t('home.channelsInFeed', { count: channels.length }) });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadPref('wasla_viewMode', 'grid'));
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
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

  const displayItems = channels.length === 0 ? [] : items
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
                {isRefreshing ? t('home.refreshing') : t('home.loadingChannels')}
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
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-full">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <div key={channel.id} className="min-w-0 h-full">
                    {loading ? (
                      <article className="rounded-xl overflow-hidden bg-white shadow-md dark:bg-dark-navy animate-pulse">
                        <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
                        <div className="p-4 space-y-3">
                          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                          <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                      </article>
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
                      <article className="flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-4 dark:bg-dark-navy dark:ring-gray-700 animate-pulse">
                        <div className="flex-0 w-48 aspect-video rounded-lg bg-gray-200 dark:bg-gray-700" />
                        <div className="flex-1 min-w-0 space-y-3 py-1">
                          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                          <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                      </article>
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
                        className="group relative flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-dark-navy dark:ring-gray-700 cursor-pointer overflow-hidden"
                        onClick={() => navigate(`/channel/${channel.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/channel/${channel.id}`); }}
                      >
                        <div className="relative w-44 flex-shrink-0">
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow" />
                          )}
                          {video.duration && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {(() => {
                                const total = parseInt(video.duration!, 10);
                                if (isNaN(total)) return video.duration;
                                const hrs = Math.floor(total / 3600);
                                const mins = Math.floor((total % 3600) / 60);
                                const secs = total % 60;
                                if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                              })()}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); play(video); }}
                              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm text-brand-coral flex items-center justify-center hover:bg-white hover:scale-110 shadow-lg transition-all"
                              aria-label={t('videoCard.playVideo')}
                            >
                              <Play className="h-5 w-5 pl-0.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(video.link, '_blank'); }}
                              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm text-red-600 flex items-center justify-center hover:bg-white hover:scale-110 shadow-lg transition-all"
                              aria-label={t('videoCard.watchOnYoutube')}
                            >
                              <ExternalLink className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 py-3 pr-4 flex flex-col justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="flex justify-center items-center h-7 w-7 rounded-full bg-brand-pink text-xs font-bold text-white shadow-sm leading-none flex-shrink-0" style={{ lineHeight: 1, background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}>
                                {(video.channelName || channel.name).charAt(0).toUpperCase()}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/channel/${channel.id}`); }}
                                className="text-xs font-semibold text-brand-coral dark:text-brand-coral hover:underline truncate text-left"
                              >
                                {video.channelName || channel.name}
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
                              {channel.categories.slice(0, 3).map((cat) => (
                                <span
                                  key={cat}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 truncate max-w-[100px]"
                                >
                                  {cat}
                                </span>
                              ))}
                              {channel.categories.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                                  +{channel.categories.length - 3}
                                </span>
                              )}
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
              <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-20">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSearch(false); setSearchText(''); }} />
                <div className="relative z-10 w-full max-w-xl max-h-[70vh] flex flex-col rounded-xl bg-white shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
                  <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
                    <Search className="h-5 w-5 flex-0 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('home.searchChannels')}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => { setShowSearch(false); setSearchText(''); }}
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {items
                      .filter((item) => !item.loading && item.video)
                      .filter((item) => {
                  if (!searchText) return true;
                  const q = searchText.toLowerCase();
                  const name = item.channel.name.toLowerCase();
                  const title = item.video!.title.toLowerCase();
                  return name.includes(q) || title.includes(q);
                })
                .sort((a, b) => {
                  if (!a.video || !b.video) return 0;
                  return new Date(b.video.publishedDate).getTime() - new Date(a.video.publishedDate).getTime();
                })
                .map(({ channel, video }) => (
                  <button
                    key={channel.id}
                    onClick={() => { navigate(`/channel/${channel.id}`); setShowSearch(false); setSearchText(''); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    {video!.thumbnail && (
                      <img src={video!.thumbnail} alt="" className="h-12 w-20 flex-0 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{video!.title}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{video!.channelName || channel.name}</p>
                    </div>
                  </button>
                ))}
              {searchText && items.filter((i) => !i.loading && i.video).filter((item) => {
                const q = searchText.toLowerCase();
                const name = item.channel.name.toLowerCase();
                const title = item.video!.title.toLowerCase();
                return name.includes(q) || title.includes(q);
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

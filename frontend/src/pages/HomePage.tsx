import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, Edit3, Eye, ExternalLink, LayoutGrid, List, RefreshCw, Search, X, Play } from 'lucide-react';
import { api } from '../api';
import EditChannelModal from '../components/EditChannelModal';
import FilterDropdown from '../components/FilterDropdown';
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

function formatViews(views?: number): string | undefined {
  if (views === undefined) return undefined;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
}

function formatDuration(duration?: string): string | undefined {
  if (!duration) return undefined;
  const total = parseInt(duration, 10);
  if (isNaN(total)) return undefined;
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadPref('wasla_viewMode', 'grid'));
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'views' | 'channel' | 'category'>(loadPref<'newest' | 'views' | 'channel' | 'category'>('wasla_sort', 'newest'));
  const [timeRange, setTimeRange] = useState<'all' | 'hour' | 'today' | 'week' | 'month' | 'year'>(loadPref<'all' | 'hour' | 'today' | 'week' | 'month' | 'year'>('wasla_time', 'all'));
  const [selectedCategory, setSelectedCategory] = useState<string>(loadPref<string>('wasla_selected_category', ''));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const filterBarRef = useRef<HTMLDivElement>(null);
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

  const allCategories = Array.from(new Set(channels.flatMap((c) => c.categories)));

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
          error: 'Could not fetch this channel',
        };
      }

      const data = result.value.response.data.data;

      if (!result.value.response.data.success || !data) {
        return {
          channel: channels[index],
          loading: false,
          error: result.value.response.data.error || 'Could not fetch this channel',
        };
      }

      return {
        channel: channels[index],
        video: getLatestVideo(channels[index], data),
        loading: false,
        error: data.latestVideo || data.videos?.[0] || data.title ? undefined : 'No video found for this channel',
      };
    });

    setItems(newItems);
    savePref('wasla_videos_cache', newItems);
    if (force) setIsRefreshing(false);
  }, [channels]);

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
    <div className="min-h-screen">
      <div className="sticky top-0 p-1 z-10 mb-6 border-b border-gray-200 bg-gray-50/95 dark:border-gray-700 dark:bg-dark-navy/95 ">
        <div className="flex items-center gap-2 px-4 md:px-6 py-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setShowSearch(true)}
              className="rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10"
              aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => fetchLatestVideos(true)} disabled={isRefreshing}
              className="rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 disabled:opacity-50"
              aria-label="Refresh videos">
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div ref={filterControlsRef} className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <FilterDropdown value={selectedCategory} onChange={setSelectedCategory}
              options={[{ value: '', label: 'All' }, ...allCategories.map(cat => ({ value: cat, label: cat }))]}
              className="flex-1 min-w-0" />
            <FilterDropdown value={timeRange} onChange={v => setTimeRange(v as any)}
              options={[{ value: 'all', label: 'All Time' }, { value: 'hour', label: 'Last Hour' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'year', label: 'This Year' }]} className="flex-1 min-w-0" />
            <FilterDropdown value={sortBy} onChange={v => setSortBy(v as any)}
              options={[{ value: 'newest', label: 'Newest' }, { value: 'views', label: 'Most Viewed' }, { value: 'channel', label: 'Channel A‑Z' }, { value: 'category', label: 'Category' }]} className="flex-1 min-w-0" />
            <button type="button" onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
              className="hidden md:flex rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 flex-shrink-0"
              aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}>
              {viewMode === 'grid' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
            </button>
          </div>
          {hasOverflow && (
            <button type="button" onClick={() => setShowAllFilters(true)}
              className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-sm text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 flex-shrink-0 md:hidden">
              <span className="text-lg leading-none">…</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-6 ">
        {showAllFilters && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAllFilters(false)} />
            <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                <button onClick={() => setShowAllFilters(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <FilterDropdown
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    options={[
                      { value: '', label: 'All' },
                      ...allCategories.map((cat) => ({ value: cat, label: cat })),
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
                  <FilterDropdown
                    value={timeRange}
                    onChange={(v) => setTimeRange(v as 'all' | 'hour' | 'today' | 'week' | 'month' | 'year')}
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'hour', label: 'Last Hour' },
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' },
                      { value: 'year', label: 'This Year' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sort by</label>
                  <FilterDropdown
                    value={sortBy}
                    onChange={(v) => setSortBy(v as 'newest' | 'views' | 'channel' | 'category')}
                    options={[
                      { value: 'newest', label: 'Newest' },
                      { value: 'views', label: 'Most Viewed' },
                      { value: 'channel', label: 'Channel A-Z' },
                      { value: 'category', label: 'Category' },
                    ]}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'))}
                    className="rounded-lg bg-white px-3 py-2 text-sm text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10"
                  >
                    {viewMode === 'grid' ? 'Switch to list' : 'Switch to grid'}
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
                {isRefreshing ? 'Refreshing...' : 'Loading channels...'}
              </span>
            ) : (
              <span>
                Showing {displayItems.length} of {items.length} channels
                {selectedCategory && ` (${selectedCategory})`}
              </span>
            )}
          </div>
        )}

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <Play className="mx-auto mb-4 h-12 w-12 text-brand-coral" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add your first channel</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
              Use the plus button to add a YouTube channel. Its latest video will appear here.
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <article key={channel.id} className="rounded-lg overflow-hidden bg-white shadow-md dark:bg-dark-navy transition-transform hover:scale-[1.02] cursor-pointer" onClick={() => window.open(video.link, '_blank')} role="button" tabIndex={0}>
                    {loading ? (
                      <div className="p-4 space-y-3">
                        <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center justify-center p-5 text-center min-h-[200px]">
                        <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                      </div>
                    ) : video ? (
                      <div className="group">
                        <div className="relative">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt={video.title} className="aspect-video w-full object-cover" />
                          ) : (
                            <div className="aspect-video bg-gradient-to-br from-brand-pink to-brand-yellow" />
                          )}
                          {formatDuration(video.duration) && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-xs px-1 rounded">
                              {formatDuration(video.duration)}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-brand-pink to-brand-yellow text-xs font-bold text-white">
                              {(video.channelName || channel.name).charAt(0).toUpperCase()}
                            </span>
                            <Link to={`/channel/${channel.id}`} className="text-sm font-medium text-brand-coral hover:underline truncate">
                              {video.channelName || channel.name}
                            </Link>
                            {onUpdate && (
                              <button type="button" onClick={e => { e.stopPropagation(); setEditingChannel(channel); }} className="text-gray-400 hover:text-brand-coral">
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{video.title}</h2>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {formatViews(video.views) && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {formatViews(video.views)}
                              </span>
                            )}
                            {video.relativeTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {video.relativeTime}
                              </span>
                            )}
                          </div>
                          {channel.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {channel.categories.map(cat => (
                                <span key={cat} className="bg-gray-100 dark:bg-white/10 text-xs text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <article key={channel.id} className="flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-4 dark:bg-dark-navy dark:ring-gray-700">
                    {loading ? (
                      <div className="flex-1 space-y-3">
                        <div className="h-20 w-full rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                      </div>
                    ) : error ? (
                      <div className="flex-1 flex flex-col justify-center text-center">
                        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
                      </div>
                    ) : video ? (
                      <>
                        <div className="flex-shrink-0 w-64 aspect-video rounded-lg overflow-hidden relative cursor-pointer" onClick={() => window.open(video.link, '_blank')}>
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-pink to-brand-yellow" />
                          )}
                          {formatDuration(video.duration) && (
                            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                              {formatDuration(video.duration)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink to-brand-yellow text-[10px] font-bold text-white">
                              {(video.channelName || channel.name).charAt(0).toUpperCase()}
                            </span>
                            <Link to={`/channel/${channel.id}`} className="text-sm font-medium text-brand-coral hover:underline truncate">
                              {video.channelName || channel.name}
                            </Link>
                            {onUpdate && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingChannel(channel); }}
                                className="inline-flex items-center rounded p-0.5 text-gray-400 hover:text-brand-coral transition"
                                aria-label="Edit channel"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
                            {video.title}
                          </h2>
                          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            {formatViews(video.views) && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {formatViews(video.views)}
                              </span>
                            )}
                            {video.relativeTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {video.relativeTime}
                              </span>
                            )}
                          </div>
                          {channel.categories.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {channel.categories.map((category) => (
                                <span key={category} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                                  {category}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {showSearch && (
              <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
                <div className="fixed inset-0 bg-black/50" onClick={() => { setShowSearch(false); setSearchText(''); }} />
                <div className="relative z-10 w-full max-w-xl max-h-[70vh] flex flex-col rounded-xl bg-white shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
                  <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
                    <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search channels..."
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
                    onClick={() => { setShowSearch(false); setSearchText(''); }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    {video!.thumbnail && (
                      <img src={video!.thumbnail} alt="" className="h-12 w-20 flex-shrink-0 rounded object-cover" />
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
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No videos match your search.</p>
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

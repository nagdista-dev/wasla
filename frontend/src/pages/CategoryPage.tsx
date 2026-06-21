import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Play, RefreshCw, Share2, Edit2, MoreVertical } from 'lucide-react';
import { api } from '../api';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import EditChannelModal from '../components/EditChannelModal';
import ShareCategoryDialog from '../components/ShareCategoryDialog';
import { createShareUrl } from '../utils/shareUtils';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { saveScrollPosition, getScrollPosition, clearScrollPosition, getRouteScrollKey, wasNavigatedFromVideo, clearNavigatedFromVideo } from '../utils/scrollRestoration';
import { loadCachedHomeVideos, saveHomeVideos } from '../services/videoCacheService';
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

export default function CategoryPage({ channels, onUpdate }: { channels: Channel[], onUpdate?: (id: string, name: string, categories: string[]) => void }) {
  const { t } = useLanguage();
  const { categoryName } = useParams<{ categoryName: string }>();
  const decoded = useMemo(() => categoryName ? decodeURIComponent(categoryName) : '', [categoryName]);
  const navigate = useNavigate();
  
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_viewed' | 'least_viewed'>('newest');
  const [timeRange, setTimeRange] = useState<'all' | 'hour' | 'today' | 'week' | 'month' | 'year'>('all');
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const scrollRestoredRef = useRef(false);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    return () => {
      const key = getRouteScrollKey(window.location.pathname + window.location.search);
      saveScrollPosition(key);
    };
  }, []);

  useEffect(() => {
    if (scrollRestoredRef.current) return;
    const allLoaded = items.length > 0 && !items.some(i => i.loading);
    if (allLoaded) {
      const key = getRouteScrollKey(window.location.pathname + window.location.search);
      const saved = getScrollPosition(key);
      if (saved > 0) {
        requestAnimationFrame(() => {
          window.scrollTo(0, saved);
          clearScrollPosition(key);
        });
      }
      scrollRestoredRef.current = true;
    }
  }, [items]);

  const allCategories = useMemo(
    () => Array.from(new Set(channels.flatMap((c) => c.categories))).sort((a, b) => a.localeCompare(b)),
    [channels]
  );

  const isShared = useMemo(() => {
    try {
      const stored = localStorage.getItem('wasla_shared_categories');
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.includes(decoded);
    } catch {
      return false;
    }
  }, [decoded]);

  const categoryChannels = useMemo(
    () => channels.filter((ch) => ch.categories.includes(decoded)),
    [channels, decoded],
  );

  const handleShareCategory = useCallback(() => {
    if (categoryChannels.length === 0) return;
    const chs = categoryChannels.map(ch => ({ id: ch.id, name: ch.name, handle: ch.handle }));
    const url = createShareUrl(decoded, chs);
    setShareUrl(url);
    setShowShareDialog(true);
  }, [decoded, categoryChannels]);

  useMeta(decoded ? {
    title: decoded,
    description: t('category.channels', { count: categoryChannels.length }),
    url: window.location.href,
  } : undefined);

  const fetchVideos = useCallback(async (force = false) => {
    if (categoryChannels.length === 0) return;
    if (force) setIsRefreshing(true);

    setItems(categoryChannels.map((channel) => ({ channel, loading: !force })));

    const results = await Promise.allSettled(
      categoryChannels.map((channel) =>
        api.get<ChannelApiResponse>(`/channel/${encodeURIComponent(channel.id)}`).then((response) => ({
          channel,
          response,
        })),
      ),
    );

    const newItems: ChannelLatestVideo[] = results.map((result) => {
      if (result.status === 'rejected') {
        return { channel: result.reason.channel, loading: false, error: t('category.couldNotFetch') };
      }
      const data = result.value.response.data.data;
      if (!result.value.response.data.success || !data) {
        return { channel: result.value.channel, loading: false, error: result.value.response.data.error || t('category.couldNotFetch') };
      }
      return {
        channel: result.value.channel,
        video: getLatestVideo(result.value.channel, data),
        loading: false,
        error: data.latestVideo || data.videos?.[0] || data.title ? undefined : t('category.noVideoFound'),
      };
    });

    setItems(newItems);
    saveHomeVideos(newItems).catch(() => {});
    if (force) setIsRefreshing(false);
  }, [categoryChannels, t]);

  useEffect(() => {
    if (categoryChannels.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;

    const initData = async () => {
      const cameFromVideo = wasNavigatedFromVideo();
      if (cameFromVideo) {
        clearNavigatedFromVideo();
      }

      const cachedItems = await loadCachedHomeVideos(categoryChannels);
      if (cancelled) return;

      if (cachedItems.length === categoryChannels.length && cachedItems.length > 0) {
        scrollRestoredRef.current = false;
        dataLoadedRef.current = true;
        setItems(cachedItems);
        return;
      }

      const cachedByChannelId = new Map(cachedItems.map((item) => [item.channel.id, item]));
      const initialItems = categoryChannels.map((channel) =>
        cachedByChannelId.get(channel.id) || { channel, loading: true },
      );
      scrollRestoredRef.current = false;
      dataLoadedRef.current = false;
      setItems(initialItems);

      const missing = categoryChannels.filter((ch) => !cachedByChannelId.has(ch.id));
      if (missing.length > 0) {
        const results = await Promise.allSettled(
          missing.map((channel) =>
            api.get<ChannelApiResponse>(`/channel/${encodeURIComponent(channel.id)}`).then((response) => ({
              channel,
              response,
            })),
          ),
        );

        if (cancelled) return;

        const fetchedMap = new Map<string, ChannelLatestVideo>();
        for (const result of results) {
          if (result.status === 'rejected') {
            fetchedMap.set(result.reason.channel.id, {
              channel: result.reason.channel,
              loading: false,
              error: t('category.couldNotFetch'),
            });
          } else {
            const data = result.value.response.data.data;
            if (!result.value.response.data.success || !data) {
              fetchedMap.set(result.value.channel.id, {
                channel: result.value.channel,
                loading: false,
                error: result.value.response.data.error || t('category.couldNotFetch'),
              });
            } else {
              fetchedMap.set(result.value.channel.id, {
                channel: result.value.channel,
                video: getLatestVideo(result.value.channel, data),
                loading: false,
                error: data.latestVideo || data.videos?.[0] || data.title ? undefined : t('category.noVideoFound'),
              });
            }
          }
        }

        const merged: ChannelLatestVideo[] = categoryChannels.map((ch) =>
          fetchedMap.get(ch.id) || cachedByChannelId.get(ch.id) || { channel: ch, loading: false, error: t('category.couldNotFetch') },
        );

        setItems(merged);
        saveHomeVideos(merged).catch(() => {});
      }

      dataLoadedRef.current = true;
    };

    initData();

    return () => {
      cancelled = true;
    };
  }, [categoryChannels, t]);

  const displayItems = useMemo(() => items
    .filter((item) => !item.loading && item.video)
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
      if (sortBy === 'oldest') {
        return new Date(a.video.publishedDate).getTime() - new Date(b.video.publishedDate).getTime();
      }
      if (sortBy === 'most_viewed') {
        return (b.video.views ?? 0) - (a.video.views ?? 0);
      }
      if (sortBy === 'least_viewed') {
        return (a.video.views ?? 0) - (b.video.views ?? 0);
      }
      return 0;
    }), [items, decoded, timeRange, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-navy pb-20">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* HEADER SECTION */}
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {decoded}
              </h1>
              {isShared && (
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold uppercase tracking-wide border border-blue-200 dark:border-blue-800/50">
                  {t('category.sharedBadge')}
                </span>
              )}
            </div>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400 font-medium">
              {t('category.channels', { count: categoryChannels.length })} • {items.some(i => i.loading) ? t('category.loading') : t('category.videos', { count: displayItems.length })}
            </p>
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleShareCategory}
              disabled={categoryChannels.length === 0}
              className="flex items-center gap-2 rounded-xl bg-brand-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-coral/90 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Share2 className="h-4 w-4" />
              <span>{t('category.share')}</span>
            </button>
            <button
              onClick={() => navigate('/channels')}
              className="flex items-center justify-center rounded-xl bg-white p-2.5 text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5 transition-all active:scale-95 shadow-sm"
              aria-label={t('category.editCategory')}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              className="flex items-center justify-center rounded-xl bg-white p-2.5 text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5 transition-all active:scale-95 shadow-sm"
              aria-label={t('category.moreOptions')}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          {/* MOBILE ACTIONS */}
          <div className="md:hidden flex items-center gap-2 w-full">
            <button
              onClick={handleShareCategory}
              disabled={categoryChannels.length === 0}
              className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-brand-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-coral/90 transition-all active:scale-95 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              <span>{t('category.share')}</span>
            </button>
            <button
              onClick={() => setShowMobileActions(!showMobileActions)}
              className="flex items-center justify-center rounded-xl bg-white p-2.5 text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5 transition-all active:scale-95 shadow-sm"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
          
          {/* MOBILE ACTIONS DROPDOWN */}
          {showMobileActions && (
            <div className="md:hidden w-full flex flex-col gap-2 mt-2 animate-fadein">
              <button onClick={() => navigate('/channels')} className="flex items-center gap-3 w-full rounded-xl bg-white p-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5 shadow-sm">
                <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                {t('category.editCategory')}
              </button>
            </div>
          )}
        </div>


        {categoryChannels.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-dark-navy shadow-sm">
            <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
              <Play className="h-8 w-8 text-gray-400 dark:text-gray-500 ml-1" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('category.noChannels')}</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-500 dark:text-gray-400">
              {t('category.noChannelsDesc', { name: decoded })}
            </p>
          </div>
        ) : (
          <>
            {/* VIDEOS FEED SECTION */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Play className="h-5 w-5 text-brand-coral fill-brand-coral/20" />
                  {t('category.latestVideosTitle')}
                </h2>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <CustomFilterDropdown
                    value={sortBy}
                    onChange={(v) => setSortBy(v as 'newest' | 'oldest' | 'most_viewed' | 'least_viewed')}
                    options={[
                      { value: 'newest', label: t('category.newestFirst') },
                      { value: 'oldest', label: t('category.oldestFirst') },
                      { value: 'most_viewed', label: t('category.mostViewed') },
                      { value: 'least_viewed', label: t('category.leastViewed') },
                    ]}
                    className="min-w-[140px] shadow-sm"
                    placeholder={t('category.sortBy')}
                  />
                  <CustomFilterDropdown
                    value={timeRange}
                    onChange={(v) => setTimeRange(v as 'all' | 'hour' | 'today' | 'week' | 'month' | 'year')}
                    options={[
                      { value: 'all', label: t('category.allTime') },
                      { value: 'hour', label: t('category.lastHour') },
                      { value: 'today', label: t('category.today') },
                      { value: 'week', label: t('category.thisWeek') },
                      { value: 'month', label: t('category.thisMonth') },
                      { value: 'year', label: t('category.thisYear') },
                    ]}
                    className="min-w-[140px] shadow-sm"
                    placeholder={t('category.time')}
                  />
                  <button
                    type="button"
                    onClick={() => fetchVideos(true)}
                    disabled={isRefreshing}
                    className="rounded-xl bg-white p-2.5 text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 disabled:opacity-50 shadow-sm shrink-0"
                    aria-label={t('category.refresh')}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand-coral' : ''}`} />
                  </button>
                </div>
              </div>

              {displayItems.length === 0 && !items.some((i) => i.loading) ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-dark-navy shadow-sm mt-4">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('category.noVideosFound')}</h2>
                  <p className="mx-auto mt-2 max-w-md text-gray-500 dark:text-gray-400">
                    {t('category.noVideosDesc')}
                  </p>
                </div>
              ) : (
                <div className="grid gap-x-5 gap-y-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-full items-stretch">
                  {displayItems.map(({ channel, video, loading, error }) => (
                    <div key={channel.id} className="min-w-0 h-full group/card">
                      {loading ? (
                        <VideoCardSkeleton />
                        ) : error ? (
                          <div className="animate-fadein h-full">
                            <article className="rounded-2xl border border-red-100 bg-red-50/50 shadow-sm dark:border-red-900/30 dark:bg-red-900/10 p-8 text-center min-h-[280px] flex flex-col items-center justify-center h-full transition-all">
                              <AlertCircle className="h-10 w-10 text-red-500/80 mb-3" />
                              <h2 className="font-bold text-gray-900 dark:text-white text-lg">{channel.name}</h2>
                              <p className="text-sm text-red-600 dark:text-red-400 mt-2 max-w-[200px]">{error}</p>
                            </article>
                          </div>
                        ) : video ? (
                          <div className="animate-fadein h-full">
                            <VideoCard channel={channel} video={video} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
              )}
            </div>
          </>
        )}
      </div>
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
      {showShareDialog && (
        <ShareCategoryDialog
          channelCount={categoryChannels.length}
          shareUrl={shareUrl}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  );
}

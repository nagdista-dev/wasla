import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Play, RefreshCw, Share2, Check } from 'lucide-react';
import { api } from '../api';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import { encodeSharePayload } from '../utils/shareUtils';
import { useLanguage } from '../context/LanguageContext';
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

export default function CategoryPage({ channels }: { channels: Channel[] }) {
  const { t } = useLanguage();
  const { categoryName } = useParams<{ categoryName: string }>();
  const decoded = useMemo(() => categoryName ? decodeURIComponent(categoryName) : '', [categoryName]);
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_viewed' | 'least_viewed'>('newest');
  const [timeRange, setTimeRange] = useState<'all' | 'hour' | 'today' | 'week' | 'month' | 'year'>('all');
  const [isCopied, setIsCopied] = useState(false);

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

  const handleShareCategory = useCallback(() => {
    if (channels.filter((ch) => ch.categories.includes(decoded)).length === 0) return;
    
    const payload = {
      c: decoded,
      ch: channels.filter((ch) => ch.categories.includes(decoded)).map(ch => ({ id: ch.id, name: ch.name, handle: ch.handle }))
    };
    
    const base64Data = encodeSharePayload(payload);
    const shareUrl = `${window.location.origin}/import/category?data=${base64Data}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [decoded, channels]);

  const categoryChannels = useMemo(
    () => channels.filter((ch) => ch.categories.includes(decoded)),
    [channels, decoded],
  );

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
    if (force) setIsRefreshing(false);
  }, [categoryChannels, t]);

  useEffect(() => {
    if (categoryChannels.length > 0) {
      void fetchVideos();
    }
  }, [categoryChannels, fetchVideos]);

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
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{decoded}</h1>
              {isShared && (
                <span className="px-2.5 py-1 rounded-full bg-brand-coral/10 text-brand-coral text-xs font-semibold whitespace-nowrap">
                  {t('category.sharedBadge')}
                </span>
              )}
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('category.channels', { count: categoryChannels.length })}
              {items.some((i) => i.loading) ? t('category.loading') : t('category.videos', { count: displayItems.length })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomFilterDropdown
              value={sortBy}
              onChange={(v) => setSortBy(v as 'newest' | 'oldest' | 'most_viewed' | 'least_viewed')}
              options={[
                { value: 'newest', label: t('category.newestFirst') },
                { value: 'oldest', label: t('category.oldestFirst') },
                { value: 'most_viewed', label: t('category.mostViewed') },
                { value: 'least_viewed', label: t('category.leastViewed') },
              ]}
              className="min-w-[140px]"
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
              className="min-w-[140px]"
              placeholder={t('category.time')}
            />
            <button
              type="button"
              onClick={() => fetchVideos(true)}
              disabled={isRefreshing}
              className="rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 disabled:opacity-50"
              aria-label={t('category.refresh')}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleShareCategory}
              disabled={categoryChannels.length === 0}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 disabled:opacity-50"
            >
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isCopied ? t('category.copied') : t('category.share')}
              </span>
            </button>
          </div>
        </div>

        {categoryChannels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <Play className="mx-auto mb-4 h-12 w-12 text-brand-coral" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('category.noChannels')}</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
              {t('category.noChannelsDesc', { name: decoded })}
            </p>
          </div>
        ) : displayItems.length === 0 && !items.some((i) => i.loading) ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('category.noVideosFound')}</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
              {t('category.noVideosDesc')}
            </p>
          </div>
        ) : (
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
                      <VideoCard channel={channel} video={video} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

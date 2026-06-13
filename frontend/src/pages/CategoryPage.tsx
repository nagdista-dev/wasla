import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, Clock, Eye, Play, RefreshCw } from 'lucide-react';
import { api } from '../api';
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

export default function CategoryPage({ channels }: { channels: Channel[] }) {
  const { categoryName } = useParams<{ categoryName: string }>();
  const decoded = useMemo(() => categoryName ? decodeURIComponent(categoryName) : '', [categoryName]);
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_viewed' | 'least_viewed'>('newest');
  const [timeRange, setTimeRange] = useState<'all' | 'hour' | 'today' | 'week' | 'month' | 'year'>('all');

  const categoryChannels = useMemo(
    () => channels.filter((ch) => ch.categories.includes(decoded)),
    [channels, decoded],
  );

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
        return { channel: result.reason.channel, loading: false, error: 'Could not fetch this channel' };
      }
      const data = result.value.response.data.data;
      if (!result.value.response.data.success || !data) {
        return { channel: result.value.channel, loading: false, error: result.value.response.data.error || 'Could not fetch this channel' };
      }
      return {
        channel: result.value.channel,
        video: getLatestVideo(result.value.channel, data),
        loading: false,
        error: data.latestVideo || data.videos?.[0] || data.title ? undefined : 'No video found',
      };
    });

    setItems(newItems);
    if (force) setIsRefreshing(false);
  }, [categoryChannels]);

  useEffect(() => {
    if (categoryChannels.length > 0) {
      void fetchVideos();
    }
  }, [categoryChannels, fetchVideos]);

  const displayItems = items
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
    });

  return (
    <div className="min-h-screen py-15 p-6 md:p-6 dark:bg-dark-navy">
      <div className="px-6 md:px-0">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{decoded}</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {categoryChannels.length} channel{categoryChannels.length !== 1 ? 's' : ''}
                {items.some((i) => i.loading) ? ' — loading...' : ` — ${displayItems.length} video${displayItems.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most_viewed' | 'least_viewed')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="most_viewed">Most viewed</option>
                <option value="least_viewed">Least viewed</option>
              </select>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'all' | 'hour' | 'today' | 'week' | 'month' | 'year')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
              >
                <option value="all">All time</option>
                <option value="hour">Last hour</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
              </select>
              <button
                type="button"
                onClick={() => fetchVideos(true)}
                disabled={isRefreshing}
                className="rounded-lg bg-white p-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

        {categoryChannels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <Play className="mx-auto mb-4 h-12 w-12 text-brand-coral" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No channels in this category</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
              Add a channel with the "{decoded}" category to see videos here.
            </p>
          </div>
        ) : displayItems.length === 0 && !items.some((i) => i.loading) ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No videos found</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
              Videos for these channels could not be loaded.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayItems.map(({ channel, video, loading, error }) => (
              <article key={channel.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
                {loading ? (
                  <div className="space-y-3 p-5">
                    <div className="aspect-video rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ) : error ? (
                  <div className="flex h-full min-h-[220px] flex-col justify-center p-5 text-center">
                    <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">{channel.name}</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
                  </div>
                  ) : video ? (
                    <>
                      <div className="w-full text-left relative">
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt="" className="aspect-video w-full object-cover" />
                        ) : (
                          <div className="aspect-video bg-linear-to-br from-brand-pink to-brand-yellow" />
                        )}
                        {formatDuration(video.duration) && (
                          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                            {formatDuration(video.duration)}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-pink to-brand-yellow text-[10px] font-bold text-white">
                            {(video.channelName || channel.name).charAt(0).toUpperCase()}
                          </span>
                          <Link to={`/channel/${channel.id}`} className="text-sm font-medium text-brand-coral hover:underline truncate">
                            {video.channelName || channel.name}
                          </Link>
                        </div>
                        <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
                          {video.title}
                        </h2>
                        <div className="mt-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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
                      </div>
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

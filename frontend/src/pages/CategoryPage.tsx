import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, Clock, Eye, Play, RefreshCw } from 'lucide-react';
import { api } from '../api';
import VideoPlayerModal from '../components/VideoPlayerModal';
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
  const [selectedVideo, setSelectedVideo] = useState<LatestVideo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const displayItems = items.filter((item) => !item.loading && item.video);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{decoded}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {categoryChannels.length} channel{categoryChannels.length !== 1 ? 's' : ''}
              {items.some((i) => i.loading) ? ' — loading...' : ` — ${displayItems.length} video${displayItems.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                    <button onClick={() => setSelectedVideo(video)} className="group w-full text-left relative">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt="" className="aspect-video w-full object-cover" />
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-brand-pink to-brand-yellow" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brand-coral opacity-0 shadow-lg transition group-hover:opacity-100">
                          <Play className="ml-0.5 h-6 w-6 fill-current" />
                        </span>
                      </div>
                      {formatDuration(video.duration) && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                          {formatDuration(video.duration)}
                        </span>
                      )}
                    </button>
                    <div className="p-5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink to-brand-yellow text-[10px] font-bold text-white">
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
      {selectedVideo && (
        <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
}

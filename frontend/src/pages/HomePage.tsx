import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, LayoutGrid, List, Play } from 'lucide-react';
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

export default function HomePage({ channels }: { channels: Channel[] }) {
  const [items, setItems] = useState<ChannelLatestVideo[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchLatestVideos = useCallback(async () => {
    const initialItems = channels.map((channel) => ({
      channel,
      loading: true,
    }));
    setItems(initialItems);

    const results = await Promise.allSettled(
      channels.map((channel) =>
        api.get<ChannelApiResponse>(`/channel/${encodeURIComponent(channel.id)}`).then((response) => ({
          channel,
          response,
        })),
      ),
    );

    setItems(
      results.map((result, index) => {
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
      }),
    );
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

  const displayItems = channels.length === 0 ? [] : items;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'))}
            className="rounded-lg bg-white px-3 py-2 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition"
            aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
          </button>
        </div>

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Play className="mx-auto mb-4 h-12 w-12 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add your first channel</h2>
            <p className="mx-auto mt-2 max-w-md text-gray-600">
              Use the plus button to add a YouTube channel. Its latest video will appear here.
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <article key={channel.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                    {loading ? (
                      <div className="space-y-3 p-5">
                        <div className="aspect-video rounded-lg bg-gray-200" />
                        <div className="h-5 w-3/4 rounded bg-gray-200" />
                        <div className="h-4 w-1/2 rounded bg-gray-200" />
                      </div>
                    ) : error ? (
                      <div className="flex h-full min-h-[220px] flex-col justify-center p-5 text-center">
                        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                        <h2 className="font-semibold text-gray-900">{channel.name}</h2>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                      </div>
                    ) : video ? (
                      <>
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt="" className="aspect-video w-full object-cover" />
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-blue-600 to-blue-400" />
                        )}
                        <div className="p-5">
                          <p className="text-sm font-medium text-blue-600">{video.channelName || channel.name}</p>
                          <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-gray-900">
                            <a href={video.link} target="_blank" rel="noreferrer" className="hover:underline">
                              {video.title}
                            </a>
                          </h2>
                          {video.relativeTime && (
                            <p className="mt-3 text-sm text-gray-500">{video.relativeTime}</p>
                          )}
                          {channel.categories.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {channel.categories.map((category) => (
                                <span key={category} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
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
            ) : (
              <div className="space-y-4">
                {displayItems.map(({ channel, video, loading, error }) => (
                  <article key={channel.id} className="flex gap-4 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-4">
                    {loading ? (
                      <div className="flex-1 space-y-3 p-5">
                        <div className="h-20 w-full rounded bg-gray-200" />
                        <div className="h-5 w-3/4 rounded bg-gray-200" />
                        <div className="h-4 w-1/2 rounded bg-gray-200" />
                      </div>
                    ) : error ? (
                      <div className="flex-1 flex flex-col justify-center p-5 text-center">
                        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                        <h2 className="font-semibold text-gray-900">{channel.name}</h2>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                      </div>
                    ) : video ? (
                      <>
                        <div className="flex-shrink-0 w-64 aspect-video rounded-lg overflow-hidden">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-sm font-medium text-blue-600">{video.channelName || channel.name}</p>
                          <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-gray-900">
                            <a href={video.link} target="_blank" rel="noreferrer" className="hover:underline">
                              {video.title}
                            </a>
                          </h2>
                          {video.relativeTime && (
                            <p className="mt-2 text-sm text-gray-500">{video.relativeTime}</p>
                          )}
                          {channel.categories.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {channel.categories.map((category) => (
                                <span key={category} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
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
    </div>
  );
}

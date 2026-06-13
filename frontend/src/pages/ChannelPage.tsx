import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Clock, Eye, AlertCircle, ArrowUpDown } from 'lucide-react';
import { api } from '../api';
import VideoPlayerModal from '../components/VideoPlayerModal';
import type { ChannelDetailsData, LatestVideo } from '../types';

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

function hexFromHsl(hsl: string): string {
  const m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return '#E2436A';
  let h = parseInt(m[1]) / 360;
  let s = parseInt(m[2]) / 100;
  let l = parseInt(m[3]) / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
}

function rgba(color: string, alpha: number): string {
  return `rgba(${color}, ${alpha})`;
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

type SortMode = 'newest' | 'oldest' | 'most_viewed' | 'least_viewed';

export default function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const [data, setData] = useState<ChannelDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<LatestVideo | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>('newest');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!channelId) return;
    setLoading(true);
    setError('');
    api.get<{ success: boolean; data?: ChannelDetailsData; error?: string }>(`/channel/${encodeURIComponent(channelId)}/videos`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setData(res.data.data);
        } else {
          setError(res.data.error || 'Failed to load channel');
        }
      })
      .catch(() => setError('Failed to load channel'))
      .finally(() => setLoading(false));
  }, [channelId]);

  const mainColor = useMemo(() => data ? hashColor(data.channelName) : 'hsl(340, 72%, 55%)', [data]);
  const rgb = useMemo(() => hexFromHsl(mainColor), [mainColor]);
  const bannerGradient = `linear-gradient(135deg, ${rgba(rgb, 1)}, ${rgba(rgb, 0.53)} 50%, ${rgba(rgb, 0.27)})`;

  const sortedVideos = useMemo(() => {
    if (!data) return [];
    const videos = [...data.videos];
    switch (sortBy) {
      case 'newest':
        return videos.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      case 'oldest':
        return videos.sort((a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime());
      case 'most_viewed':
        return videos.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      case 'least_viewed':
        return videos.sort((a, b) => (a.views ?? 0) - (b.views ?? 0));
    }
  }, [data, sortBy]);

  return (
    <div className="min-h-screen">
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand-coral" />
        </div>
      ) : error || !data ? (
        <div className="mx-auto max-w-4xl p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{error || 'Channel not found'}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Banner */}
          <div className="relative h-48 sm:h-64 w-full overflow-hidden" style={{ background: bannerGradient }}>
            {data.banner && (
              <img src={data.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </div>

          {/* Channel header */}
          <div className="mx-auto max-w-6xl px-6 pb-6">
            <div className="-mt-12 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
              <div
                className="relative flex h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0 items-center justify-center rounded-full border-4 border-white text-2xl sm:text-4xl font-bold text-white shadow-lg dark:border-dark-navy"
                style={{ backgroundColor: `rgb(${rgb})` }}
              >
                {data.avatar ? (
                  <img src={data.avatar} alt="" className="relative z-10 h-full w-full rounded-full object-cover" />
                ) : (
                  data.channelName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0 pt-2 sm:pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  {data.channelName}
                </h1>
                {data.handle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{data.handle}</p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {data.videos.length} videos
                </p>
              </div>
            </div>

            {/* Sort + section title */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Play className="h-5 w-5 text-brand-coral" />
                Videos
              </h2>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMode)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most_viewed">Most viewed</option>
                  <option value="least_viewed">Least viewed</option>
                </select>
              </div>
            </div>

            {/* Video grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedVideos.map((video) => (
                <article key={video.link} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-dark-navy dark:ring-gray-700">
                  <button onClick={() => setSelectedVideo(video)} className="w-full text-left relative">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video" style={{ background: bannerGradient }} />
                    )}
                    {formatDuration(video.duration) && (
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                        {formatDuration(video.duration)}
                      </span>
                    )}
                  </button>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {video.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatViews(video.views) && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {formatViews(video.views)}
                        </span>
                      )}
                      {video.relativeTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {video.relativeTime}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedVideo && (
        <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
}

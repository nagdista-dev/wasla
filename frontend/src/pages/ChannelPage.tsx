import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, ArrowUpDown, Play } from 'lucide-react';
import { api } from '../api';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import type { Channel, ChannelDetailsData } from '../types';

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
  const h = parseInt(m[1]) / 360;
  const s = parseInt(m[2]) / 100;
  const l = parseInt(m[3]) / 100;
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

type SortMode = 'newest' | 'oldest' | 'most_viewed' | 'least_viewed';

export default function ChannelPage() {
  const { t } = useLanguage();
  const { channelId } = useParams<{ channelId: string }>();
  const [data, setData] = useState<ChannelDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
          setError(res.data.error || t('channel.failedToLoad'));
        }
      })
      .catch(() => setError(t('channel.failedToLoad')))
      .finally(() => setLoading(false));
  }, [channelId, t]);

  useMeta(data ? {
    title: data.channelName,
    description: t('channel.videoCount', { count: data.videos.length }),
    image: data.avatar || data.banner || undefined,
    url: window.location.href,
  } : undefined);

  const mainColor = useMemo(() => data ? hashColor(data.channelName) : 'hsl(340, 72%, 55%)', [data]);
  const rgb = useMemo(() => hexFromHsl(mainColor), [mainColor]);
  const bannerGradient = `linear-gradient(135deg, ${rgba(rgb, 1)}, ${rgba(rgb, 0.53)} 50%, ${rgba(rgb, 0.27)})`;

  const sortedVideos = useMemo(() => {
    if (!data) return [];
    const videos = [...data.videos].slice(0, 15);
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
    <div className="min-h-screen dark:bg-dark-navy">
      {loading ? (
        <div className="mx-auto max-w-6xl px-6 pb-6 pt-6">
          <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-xl skeleton-shimmer mb-8" />
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full skeleton-shimmer flex-shrink-0 border-4 border-white dark:border-gray-300" />
            <div className="flex-1 min-w-0 space-y-3 pb-1">
              <div className="h-8 w-64 rounded skeleton-shimmer" />
              <div className="h-4 w-32 rounded skeleton-shimmer" />
              <div className="h-4 w-48 rounded skeleton-shimmer" />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {Array.from({ length: 6 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : error || !data ? (
        <div className="mx-auto max-w-4xl p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{error || t('channel.notFound')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Banner */}
          <div className="relative h-48 sm:h-64 w-full overflow-hidden" style={{ background: bannerGradient }}>
            {data.banner && (
              <img src={data.banner} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            )}
          </div>

          {/* Channel header */}
          <div className="mx-auto max-w-6xl px-6 pb-6">
            <div className="-mt-12 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
              <div
                className="relative flex h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0 items-center justify-center rounded-full border-4 border-white text-2xl sm:text-4xl font-bold text-white shadow-lg dark:border-gray-300 overflow-hidden"
                style={{ backgroundColor: `rgb(${rgb})` }}
              >
                {data.avatar ? (
                  <img src={data.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span>{data.channelName.charAt(0).toUpperCase()}</span>
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
                  {t('channel.videoCount', { count: data.videos.length })}
                </p>
              </div>
            </div>

            {/* Sort + section title */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Play className="h-5 w-5 text-brand-coral" />
                {t('channel.videos')}
              </h2>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <CustomFilterDropdown
                  value={sortBy}
                  onChange={(v) => setSortBy(v as SortMode)}
                  options={[
                    { value: 'newest', label: t('channel.newest') },
                    { value: 'oldest', label: t('channel.oldest') },
                    { value: 'most_viewed', label: t('channel.mostViewed') },
                    { value: 'least_viewed', label: t('channel.leastViewed') },
                  ]}
                  className="min-w-[130px]"
                  placeholder={t('channel.sort')}
                />
              </div>
            </div>

            {/* Video grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {sortedVideos.map((video) => {
                const channelForVideo: Channel = {
                  id: channelId!,
                  name: data.channelName,
                  handle: data.handle,
                  categories: [],
                };
                return (
                  <VideoCard key={video.link} channel={channelForVideo} video={video} />
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

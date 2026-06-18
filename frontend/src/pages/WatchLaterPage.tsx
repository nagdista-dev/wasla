import { useMemo, useState, useEffect } from 'react';
import { Clock, Eye, Play, Trash2, BookmarkCheck, BookmarkX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { loadWatchLater, saveWatchLater } from '../storage';
import { useToast } from '../components/Toast';
import { useMeta } from '../hooks/useMeta';
import { extractVideoId } from '../utils/videoUtils';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';
import type { WatchLaterItem } from '../types';

function formatViews(views?: number | string): string | undefined {
  if (views === undefined || views === null) return undefined;
  const num = typeof views === 'string' ? parseInt(views, 10) : views;
  if (isNaN(num)) return undefined;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function syncLoadWatchLater(): WatchLaterItem[] {
  try {
    const stored = localStorage.getItem('wasla_watch_later');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: WatchLaterItem) => item && item.id && item.video);
  } catch {
    return [];
  }
}

export default function WatchLaterPage() {
  const { t } = useLanguage();
  const { play } = usePlayer();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [items, setItems] = useState<WatchLaterItem[]>(syncLoadWatchLater);
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all');

  useEffect(() => {
    loadWatchLater().then((loaded) => { if (loaded.length > 0) setItems(loaded); });
  }, []);

  useMeta({ title: t('watchLater.title') });

  const filtered = useMemo(() => {
    if (filter === 'watched') return items.filter((i) => i.watched);
    if (filter === 'unwatched') return items.filter((i) => !i.watched);
    return items;
  }, [items, filter]);

  const handleRemove = async (item: WatchLaterItem) => {
    const updated = items.filter((i) => i.id !== item.id);
    await saveWatchLater(updated);
    setItems(updated);
    showToast(t('watchLater.removed'), 'info');
  };

  const handleToggleWatched = async (item: WatchLaterItem) => {
    const updated = items.map((i) =>
      i.id === item.id ? { ...i, watched: !i.watched } : i
    );
    await saveWatchLater(updated);
    setItems(updated);
  };

  const handlePlay = (item: WatchLaterItem) => {
    play(item.video, item.channelId);
    const vidId = extractVideoId(item.video.link);
    if (vidId) {
      navigate(`/video/${vidId}`, { state: { video: item.video, channelId: item.channelId } });
    }
  };

  const handleNavigateToChannel = (channelId: string) => {
    navigate(`/channel/${channelId}`);
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
              <BookmarkCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('watchLater.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {items.length} {items.length === 1 ? 'video' : 'videos'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {(['all', 'unwatched', 'watched'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === f
                    ? 'bg-brand-coral text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                }`}
              >
                {f === 'all' ? t('home.filterAll') : f === 'watched' ? t('watchLater.watched') : t('watchLater.unwatched')}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-dark-navy">
            <BookmarkX className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {items.length === 0 ? t('watchLater.empty') : t('watchLater.unwatched')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('watchLater.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl transition ${
                  item.watched
                    ? 'bg-gray-50 ring-1 ring-gray-200 dark:bg-white/5 dark:ring-gray-700'
                    : 'bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md dark:bg-dark-navy dark:ring-gray-700'
                }`}
              >
                {/* Layout: vertical on mobile, horizontal on sm+ */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                  {/* Thumbnail */}
                  {item.video.thumbnail && (
                    <div className="relative w-full sm:w-40 sm:flex-shrink-0 aspect-video overflow-hidden rounded-t-xl sm:rounded-lg sm:mt-4 sm:ms-4">
                      <ThumbnailWithPlaceholder
                        src={item.video.thumbnail}
                        alt={item.video.title}
                      />
                      <button
                        onClick={() => handlePlay(item)}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
                        aria-label={t('course.playVideo')}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg">
                          <Play className="h-5 w-5 pl-0.5" />
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Content */}
                  <div className="min-w-0 flex-1 p-4 sm:ps-0">
                    <h3
                      className={`line-clamp-2 text-sm font-semibold ${
                        item.watched
                          ? 'text-gray-500 line-through dark:text-gray-500'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.video.title}
                    </h3>
                    <button
                      onClick={() => handleNavigateToChannel(item.channelId)}
                      className="mt-1 text-xs font-medium text-brand-coral hover:underline"
                    >
                      {item.channelName}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.video.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {item.video.duration}
                        </span>
                      )}
                      {item.video.views !== undefined && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {formatViews(item.video.views) || '—'}
                        </span>
                      )}
                      <span className="text-gray-400 dark:text-gray-500">
                        {t('watchLater.savedAt', { time: formatRelativeTime(new Date(item.savedAt).toISOString(), t) })}
                      </span>
                      {item.watched && (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {t('watchLater.watched')}
                        </span>
                      )}
                    </div>
                    {/* Action buttons — wrap on narrow screens */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handlePlay(item)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-coral/10 px-3 py-1.5 text-xs font-medium text-brand-coral hover:bg-brand-coral/20 transition"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {t('course.playVideo')}
                      </button>
                      <button
                        onClick={() => handleToggleWatched(item)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          item.watched
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                            : 'bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'
                        }`}
                      >
                        <BookmarkCheck className="h-3.5 w-3.5" />
                        {item.watched ? t('watchLater.markUnwatched') : t('watchLater.markWatched')}
                      </button>
                      <button
                        onClick={() => handleRemove(item)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('watchLater.remove')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

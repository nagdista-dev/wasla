import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock, Film, Play } from 'lucide-react';
import { api } from '../api';
import { usePlayer } from '../context/PlayerContext';
import { useLanguage } from '../context/LanguageContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useMeta } from '../hooks/useMeta';
import type { LatestVideo, Playlist } from '../types';

const PROGRESS_KEY = 'wasla_playlist_progress';

type PlaylistProgress = Record<string, string[]>;

function loadProgress(): PlaylistProgress {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return {};
  } catch {
    return {};
  }
}

function saveProgress(progress: PlaylistProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch { /* noop */ }
}

function getVideoId(link: string): string {
  try {
    const url = new URL(link);
    const v = url.searchParams.get('v');
    if (v) return v;
    const pathMatch = link.match(/youtu\.be\/([\w-]+)/);
    if (pathMatch) return pathMatch[1];
  } catch {
    const pathMatch = link.match(/youtu\.be\/([\w-]+)/);
    if (pathMatch) return pathMatch[1];
  }
  return link;
}

function formatDuration(duration?: string): string {
  if (!duration) return '';
  return duration;
}

export default function PlaylistCoursePage() {
  const { t } = useLanguage();
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { play } = usePlayer();
  const playlistFromState = (location.state as { playlist?: Playlist } | null)?.playlist;

  const [videos, setVideos] = useState<LatestVideo[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<PlaylistProgress>(loadProgress);

  const playlistProgress = useMemo(() => {
    if (!playlistId) return [];
    return progress[playlistId] || [];
  }, [progress, playlistId]);

  useMeta(playlistName ? {
    title: playlistName,
    description: playlistFromState?.description || t('course.videosCount', { count: videos.length }),
    url: window.location.href,
  } : undefined);

  const completedCount = playlistProgress.length;
  const totalCount = videos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const fetchPlaylist = useCallback(async () => {
    if (!playlistId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{
        success: boolean;
        data?: {
          playlistId: string;
          playlistName: string;
          channelName?: string;
          videos: LatestVideo[];
        };
        error?: string;
      }>(`/playlist/${encodeURIComponent(playlistId)}`);

      if (res.data.success && res.data.data) {
        setVideos(res.data.data.videos);
        setPlaylistName(res.data.data.playlistName);
        setChannelName(res.data.data.channelName || '');
      } else {
        setError(res.data.error || t('course.failedToLoad'));
      }
    } catch {
      setError(t('course.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [playlistId, t]);

  useEffect(() => {
    void fetchPlaylist();
  }, [fetchPlaylist]);

  const toggleComplete = (videoLink: string) => {
    if (!playlistId) return;
    const videoId = getVideoId(videoLink);
    const current = progress[playlistId] || [];
    const updated = current.includes(videoId)
      ? current.filter((id) => id !== videoId)
      : [...current, videoId];

    const newProgress = { ...progress, [playlistId]: updated };
    setProgress(newProgress);
    saveProgress(newProgress);
  };

  const isCompleted = (videoLink: string) => {
    const videoId = getVideoId(videoLink);
    return playlistProgress.includes(videoId);
  };

  const handlePlayVideo = (video: LatestVideo) => {
    play(video);
  };

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-dark-navy">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-center py-32">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand-coral" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen dark:bg-dark-navy">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('course.back')}
          </button>
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <Film className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('course.backToPlaylists')}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{playlistName}</h1>
          {channelName && (
            <p className="mt-1 text-gray-500 dark:text-gray-400">{channelName}</p>
          )}
          {playlistFromState?.description && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
              {playlistFromState.description}
            </p>
          )}
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
                <Film className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('course.totalVideos')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('course.completed')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
                <Play className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{progressPercent}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('course.progress')}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-pink to-brand-coral transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <Film className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('course.noVideos')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video, index) => {
              const completed = isCompleted(video.link);
              return (
                <div
                  key={video.link}
                  className={`group flex items-start gap-4 rounded-xl p-4 transition ${
                    completed
                      ? 'bg-gray-50 ring-1 ring-gray-200 dark:bg-white/5 dark:ring-gray-700'
                      : 'bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md dark:bg-dark-navy dark:ring-gray-700'
                  }`}
                >
                  <button
                    onClick={() => toggleComplete(video.link)}
                    className={`mt-1 flex-shrink-0 transition ${
                      completed
                        ? 'text-green-500'
                        : 'text-gray-300 hover:text-green-400 dark:text-gray-600 dark:hover:text-green-400'
                    }`}
                    aria-label={completed ? t('course.markIncomplete') : t('course.markComplete')}
                  >
                    {completed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>

                  {video.thumbnail && (
                    <div className="relative aspect-video w-40 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <button
                        onClick={() => handlePlayVideo(video)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100"
                        aria-label={t('course.playVideo')}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg">
                          <Play className="h-5 w-5 pl-0.5" />
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                          {t('course.lesson', { number: index + 1 })}
                        </span>
                        <h3
                          className={`mt-0.5 line-clamp-2 text-sm font-semibold ${
                            completed
                              ? 'text-gray-500 line-through dark:text-gray-500'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {video.title}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {video.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(video.duration)}
                        </span>
                      )}
                      {video.publishedDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(video.publishedDate, t)}
                        </span>
                      )}
                      {video.channelName && (
                        <span className="truncate">{video.channelName}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handlePlayVideo(video)}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-coral hover:text-brand-pink"
                    >
                      <Play className="h-3.5 w-3.5" />
                        {t('course.playVideo')}
                      </button>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

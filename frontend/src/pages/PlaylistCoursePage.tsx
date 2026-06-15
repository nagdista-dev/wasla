import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock, Film, Play, Trophy, Home, RotateCcw, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { usePlayer } from '../context/PlayerContext';
import { useLanguage } from '../context/LanguageContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useMeta } from '../hooks/useMeta';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';
import type { LatestVideo, Playlist, CourseProgress } from '../types';

const PROGRESS_KEY = 'wasla_playlist_progress';

function loadProgress(): Record<string, CourseProgress> {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    // migrate old format (string[]) to new format (CourseProgress)
    const migrated: Record<string, CourseProgress> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        migrated[key] = { completedIds: val as string[] };
      } else if (val && typeof val === 'object' && 'completedIds' in (val as any)) {
        migrated[key] = val as CourseProgress;
      } else {
        migrated[key] = { completedIds: [] };
      }
    }
    return migrated;
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, CourseProgress>): void {
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
  const [progress, setProgress] = useState<Record<string, CourseProgress>>(loadProgress);
  const [showCompletion, setShowCompletion] = useState(false);

  const playlistProgress = useMemo(() => {
    if (!playlistId) return { completedIds: [] as string[], startDate: undefined, completedDate: undefined };
    return progress[playlistId] || { completedIds: [] };
  }, [progress, playlistId]);

  useMeta(playlistName ? {
    title: playlistName,
    description: playlistFromState?.description || t('course.videosCount', { count: videos.length }),
    url: window.location.href,
  } : undefined);

  const completedCount = playlistProgress.completedIds.length;
  const totalCount = videos.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;

  useEffect(() => {
    if (isAllComplete && !playlistProgress.completedDate && totalCount > 0) {
      const updated = {
        ...progress,
        [playlistId!]: {
          ...playlistProgress,
          completedDate: new Date().toISOString(),
        },
      };
      setProgress(updated);
      saveProgress(updated);
      setTimeout(() => setShowCompletion(true), 600);
    }
  }, [isAllComplete]);

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
    const current = playlistProgress.completedIds;
    const wasComplete = current.includes(videoId);
    const updated = wasComplete
      ? current.filter((id) => id !== videoId)
      : [...current, videoId];

    const now = new Date().toISOString();
    const newProgress: CourseProgress = {
      completedIds: updated,
      startDate: playlistProgress.startDate || (updated.length > 0 ? now : undefined),
      completedDate: updated.length === totalCount ? now : undefined,
    };

    const next = { ...progress, [playlistId]: newProgress };
    setProgress(next);
    saveProgress(next);
  };

  const isCompleted = (videoLink: string) => {
    const videoId = getVideoId(videoLink);
    return playlistProgress.completedIds.includes(videoId);
  };

  const handlePlayVideo = (video: LatestVideo) => {
    play(video);
  };

  const handleReplay = () => {
    if (!playlistId) return;
    const next = {
      ...progress,
      [playlistId]: { completedIds: [], startDate: undefined, completedDate: undefined },
    };
    setProgress(next);
    saveProgress(next);
    setShowCompletion(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-dark-navy">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="mb-6 h-4 w-20 rounded skeleton-shimmer" />
          <div className="mb-8 space-y-3">
            <div className="h-9 w-72 rounded skeleton-shimmer" />
            <div className="h-4 w-48 rounded skeleton-shimmer" />
            <div className="h-4 w-96 rounded skeleton-shimmer" />
          </div>
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full skeleton-shimmer" />
                <div className="space-y-1">
                  <div className="h-7 w-12 rounded skeleton-shimmer" />
                  <div className="h-4 w-20 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full skeleton-shimmer" />
                <div className="space-y-1">
                  <div className="h-7 w-12 rounded skeleton-shimmer" />
                  <div className="h-4 w-20 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full skeleton-shimmer" />
                <div className="space-y-1">
                  <div className="h-7 w-12 rounded skeleton-shimmer" />
                  <div className="h-4 w-20 rounded skeleton-shimmer" />
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 w-full rounded-full skeleton-shimmer" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl p-4 bg-white shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
                <div className="h-6 w-6 rounded-full skeleton-shimmer flex-shrink-0 mt-1" />
                <div className="aspect-video w-40 rounded-lg skeleton-shimmer flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3 w-16 rounded skeleton-shimmer" />
                  <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                  <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
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
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${
                completedCount === totalCount && totalCount > 0
                  ? 'bg-yellow-500/10 text-yellow-500'
                  : 'bg-green-500/10 text-green-500'
              }`}>
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
              className={`h-full rounded-full transition-all duration-500 ${
                completedCount === totalCount && totalCount > 0
                  ? 'bg-gradient-to-r from-yellow-400 to-green-400'
                  : 'bg-gradient-to-r from-brand-pink to-brand-coral'
              }`}
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
                  className={`rounded-xl transition ${
                    completed
                      ? 'bg-gray-50 ring-1 ring-gray-200 dark:bg-white/5 dark:ring-gray-700'
                      : 'bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md dark:bg-dark-navy dark:ring-gray-700'
                  }`}
                >
                  {/* Mobile: stack vertically. sm+: horizontal row */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-0 sm:gap-4 sm:p-4">
                    {/* Thumbnail — full width on mobile, fixed width on sm+ */}
                    {video.thumbnail && (
                      <div className="relative w-full sm:w-40 sm:flex-shrink-0 aspect-video overflow-hidden rounded-t-xl sm:rounded-lg">
                        <ThumbnailWithPlaceholder
                          src={video.thumbnail}
                          alt={video.title}
                        />
                        <button
                          onClick={() => handlePlayVideo(video)}
                          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
                          aria-label={t('course.playVideo')}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg">
                            <Play className="h-5 w-5 pl-0.5" />
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Content row: checkbox + text */}
                    <div className="flex items-start gap-3 flex-1 min-w-0 p-3 sm:p-0">
                      <button
                        onClick={() => toggleComplete(video.link)}
                        className={`mt-0.5 flex-shrink-0 transition ${
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

                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                          {t('course.lesson', { number: index + 1 })}
                        </span>
                        <h3
                          className={`mt-0.5 line-clamp-2 text-sm font-semibold leading-snug ${
                            completed
                              ? 'text-gray-500 line-through dark:text-gray-500'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {video.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Course Completion Modal */}
      {showCompletion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg animate-[fadeIn_0.5s_ease-out]">
            {/* Celebration particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-2 w-2 rounded-full animate-[confetti_3s_ease-in-out_infinite]"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    background: ['#b51762', '#e2436a', '#f37345', '#feb144', '#22c55e', '#3b82f6'][i % 6],
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700 text-center relative">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-green-400 shadow-lg animate-[bounceIn_0.6s_ease-out]">
                <Trophy className="h-10 w-10 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('course.completionTitle')}
              </h2>
              <p className="mt-2 text-lg text-brand-coral font-medium">
                {t('course.completionDesc')}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('course.totalVideos')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{completedCount}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('course.completed')}</p>
                </div>
                {playlistProgress.startDate && (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatRelativeTime(playlistProgress.startDate, t)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('course.completionStartDate')}</p>
                  </div>
                )}
                {playlistProgress.completedDate && (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatRelativeTime(playlistProgress.completedDate, t)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('course.completionEndDate')}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handleReplay}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-pink to-brand-coral px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('course.replayCourse')}
                </button>
                <button
                  onClick={() => navigate('/playlists')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-brand-coral px-6 py-3 text-sm font-semibold text-brand-coral hover:bg-brand-coral/5 transition-all"
                >
                  <ArrowRight className="h-4 w-4" />
                  {t('course.nextPlaylist')}
                </button>
                <button
                  onClick={() => { setShowCompletion(false); navigate('/'); }}
                  className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition-all"
                >
                  <Home className="h-4 w-4" />
                  {t('course.backToHome')}
                </button>
              </div>

              <button
                onClick={() => setShowCompletion(false)}
                className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

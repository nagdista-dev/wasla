import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Clock, Eye, ExternalLink, Heart, BookmarkCheck, BookmarkPlus, Share2, ChevronDown, ChevronUp, Headphones } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { useMediaManager } from '../context/MediaContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../components/Toast';
import ConfirmLinkModal from '../components/ConfirmLinkModal';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { extractVideoId, buildWatchUrl } from '../utils/videoUtils';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { formatDescription } from '../utils/formatDescription';
import { loadWatchLater, saveWatchLater } from '../storage';
import { useMeta } from '../hooks/useMeta';
import { usePlaybackResume } from '../hooks/usePlaybackResume';
import { recordWatch } from '../services/watchHistoryService';
import { findCachedHomeVideoById } from '../services/videoCacheService';
import type { LatestVideo } from '../types';

function formatViews(views?: number | string): string | undefined {
  if (views === undefined || views === null) return undefined;
  const num = typeof views === 'string' ? parseInt(views, 10) : views;
  if (isNaN(num)) return undefined;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
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

const DESCRIPTION_COLLAPSED_LINES = 3;

function VideoDescription({ description }: { description: string }) {
  const { t } = useLanguage();
  const { seekTo } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsToggle, setNeedsToggle] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [showDescConfirm, setShowDescConfirm] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      const lineHeight = parseFloat(getComputedStyle(contentRef.current).lineHeight) || 20;
      const maxCollapsedHeight = lineHeight * DESCRIPTION_COLLAPSED_LINES;
      setNeedsToggle(contentRef.current.scrollHeight > maxCollapsedHeight + 4);
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [description]);

  const formattedHtml = formatDescription(description);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const timestampSpan = target.closest('[data-seconds]');
    if (timestampSpan) {
      const seconds = parseInt(timestampSpan.getAttribute('data-seconds') || '', 10);
      if (!isNaN(seconds)) {
        seekTo(seconds);
        return;
      }
    }
    const link = target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('mailto:') || href.startsWith('#')) return;
    if (href.includes('youtube.com') || href.includes('youtu.be')) return;
    e.preventDefault();
    setPendingLink(href);
  };

  const handleConfirmLink = () => {
    if (pendingLink) {
      window.open(pendingLink, '_blank', 'noopener,noreferrer');
      setPendingLink(null);
    }
  };

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: expanded ? `${contentHeight ?? 9999}px` : `${DESCRIPTION_COLLAPSED_LINES * 1.625}em`,
        }}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: formattedHtml }}
      />
      {needsToggle && (
        <button
          onClick={() => {
            if (expanded) {
              setExpanded(false);
            } else {
              setShowDescConfirm(true);
            }
          }}
          className="mt-2 flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-coral hover:text-brand-pink transition-colors"
        >
          {expanded ? (
            <>
              {t('miniPlayer.showLess')}
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              {t('miniPlayer.showMore')}
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
      <ConfirmActionModal
        isOpen={showDescConfirm}
        onClose={() => setShowDescConfirm(false)}
        onConfirm={() => {
          setExpanded(true);
          setShowDescConfirm(false);
        }}
        title={t('videoDesc.confirmTitle')}
        description={t('videoDesc.confirmMessage')}
        confirmLabel={t('confirmAction.confirm')}
      />
      {pendingLink && (
        <ConfirmLinkModal
          url={pendingLink}
          onConfirm={handleConfirmLink}
          onCancel={() => setPendingLink(null)}
        />
      )}
    </div>
  );
}

function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { currentVideo, registerSeekHandler, unregisterSeekHandler } = usePlayer();
  const mediaManager = useMediaManager();
  const { showToast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [video, setVideo] = useState<(LatestVideo & { channelId?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [resumeVideoId, setResumeVideoId] = useState<string | null>(null);
  const [progressCheckedVideoId, setProgressCheckedVideoId] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const historyRecordedRef = useRef(false);
  const trackingStartRef = useRef(0);
  const initialOffsetRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  const {
    loadProgress,
    updatePosition,
    saveOnPause,
  } = usePlaybackResume(video ? extractVideoId(video.link) || videoId : undefined);

  useMeta({ title: video?.title || t('videoPage.loading') });

  useEffect(() => {
    let cancelled = false;
    let found: (LatestVideo & { channelId?: string }) | null = null;

    const resolveVideo = async () => {
      const stateData = location.state as { video?: LatestVideo; channelId?: string } | undefined;
      if (stateData?.video) {
        const extractedId = extractVideoId(stateData.video.link);
        if (extractedId === videoId) {
          found = { ...stateData.video, channelId: stateData.channelId };
        }
      }

      if (!found && currentVideo && currentVideo._videoId === videoId) {
        found = { ...currentVideo };
      }

      if (!found && videoId) {
        found = await findCachedHomeVideoById(videoId);
      }

      if (cancelled) return;
      if (found) {
        setVideo(found);
        mediaManager.requestPlay('video');
      }
      setLoading(false);
    };

    void resolveVideo();

    return () => {
      cancelled = true;
    };
  }, [videoId, currentVideo, location.state, mediaManager]);

  useEffect(() => {
    if (video) {
      loadWatchLater().then((items) => {
        setIsInWatchLater(items.some(item => item.video.link === video.link));
      });
    }
  }, [video]);

  useEffect(() => {
    if (!video) return;
    const vidId = extractVideoId(video.link) || videoId;
    if (!vidId) return;
    let cancelled = false;

    if (!historyRecordedRef.current) {
      historyRecordedRef.current = true;
      recordWatch({
        videoId: vidId,
        title: video.title,
        channelId: video.channelId,
        channelName: video.channelName,
        thumbnail: video.thumbnail,
        duration: video.duration,
        link: video.link,
      });
    }

    loadProgress().then((progress) => {
      if (cancelled) return;
      if (progress && progress.currentTime > 5 && progress.currentTime < progress.duration - 5) {
        setResumeTime(progress.currentTime);
        setResumeVideoId(vidId);
      } else {
        setResumeTime(null);
        setResumeVideoId(null);
      }
      setProgressCheckedVideoId(vidId);
    }).catch(() => {
      if (!cancelled) setProgressCheckedVideoId(vidId);
    });
    return () => {
      cancelled = true;
    };
  }, [video, videoId, loadProgress]);

  const durationSeconds = video ? (parseInt(video.duration || '0', 10) || 0) : 0;
  const embedId = video ? (extractVideoId(video.link) || videoId) : videoId;
  const progressChecked = progressCheckedVideoId === embedId;
  const startParam = resumeTime && resumeVideoId === embedId ? `&start=${Math.floor(resumeTime)}` : '';
  const embedSrc = embedId
    ? `https://www.youtube.com/embed/${embedId}?autoplay=1&enablejsapi=1${startParam}`
    : '';
  const canRenderPlayer = progressChecked;

  useEffect(() => {
    if (!video || !canRenderPlayer || durationSeconds <= 0) return;

    trackingStartRef.current = Date.now();
    initialOffsetRef.current = resumeTime ?? 0;

    const tick = () => {
      const elapsed = (Date.now() - trackingStartRef.current) / 1000;
      const currentTime = initialOffsetRef.current + elapsed;
      const pct = (currentTime / durationSeconds) * 100;

      updatePosition(currentTime, durationSeconds);

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${Math.min(pct, 100)}%`;
      }

      if (currentTime < durationSeconds) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [video, canRenderPlayer, resumeTime, updatePosition, durationSeconds]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveOnPause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveOnPause]);

  useEffect(() => {
    if (!embedSrc) return;

    const currentIframe = iframeRef.current;

    mediaManager.registerVideoCleanup(() => {
      if (currentIframe) {
        currentIframe.src = 'about:blank';
      }
    });

    return () => {
      mediaManager.unregisterVideoCleanup();
      if (currentIframe) {
        currentIframe.src = 'about:blank';
      }
    };
  }, [embedSrc, mediaManager]);

  const seekVideo = useCallback((seconds: number) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true],
      }), '*');
    }
  }, []);

  useEffect(() => {
    registerSeekHandler(seekVideo);
    return () => unregisterSeekHandler();
  }, [seekVideo, registerSeekHandler, unregisterSeekHandler]);

  const handleOpenOnYoutube = useCallback(() => {
    if (!video) return;
    const id = extractVideoId(video.link) || videoId;
    if (id) {
      window.open(buildWatchUrl(id), '_blank');
    } else {
      window.open(video.link, '_blank');
    }
  }, [video, videoId]);

  const handleWatchLater = useCallback(async () => {
    if (!video) return;
    const items = await loadWatchLater();
    if (isInWatchLater) {
      await saveWatchLater(items.filter(item => item.video.link !== video.link));
      setIsInWatchLater(false);
      showToast(t('watchLater.removed'), 'info');
    } else {
      items.push({
        id: `video_${Date.now()}`,
        video,
        channelName: video.channelName,
        channelId: '',
        savedAt: Date.now(),
        watched: false,
      });
      await saveWatchLater(items);
      setIsInWatchLater(true);
      showToast(t('watchLater.saved'), 'success');
    }
  }, [video, isInWatchLater, showToast, t]);

  const handleFavorite = useCallback(() => {
    if (!video) return;
    const wasFav = isFavorite(video.link);
    toggleFavorite(video, video.channelName);
    showToast(wasFav ? t('favorites.removed') : t('favorites.saved'), wasFav ? 'info' : 'success');
  }, [video, isFavorite, toggleFavorite, showToast, t]);

  const handleShare = useCallback(() => {
    if (!video) return;
    if (navigator.share) {
      navigator.share({
        title: video.title,
        url: video.link,
      }).catch(() => { /* cancelled */ });
    } else {
      navigator.clipboard.writeText(video.link).then(() => {
        showToast(t('miniPlayer.linkCopied'), 'success');
      }).catch(() => { /* noop */ });
    }
  }, [video, showToast, t]);

  const handleAudioMode = useCallback(() => {
    if (!video) return;
    navigate(`/audio/${videoId}`, { state: { video, channelId: video.channelId } });
  }, [video, videoId, navigate]);

  const handleChannelClick = useCallback(() => {
    if (!video?.channelId) return;
    navigate(`/channel/${video.channelId}`);
  }, [video, navigate]);

  const isFav = video ? isFavorite(video.link) : false;
  const formattedViews = video ? formatViews(video.views) : undefined;
  const formattedDuration = video ? formatDuration(video.duration) : undefined;
  const channelInitial = video?.channelName?.charAt(0).toUpperCase() || '?';
  const hasChannelRoute = !!video?.channelId;

  const player = (
    <div
      ref={playerContainerRef}
      className="relative aspect-video w-full bg-black overflow-hidden rounded-xl sm:shadow-2xl sm:ring-1 sm:ring-white/5"
    >
      {embedSrc ? (
        <>
          <iframe
            ref={iframeRef}
            key={embedSrc}
            src={embedSrc}
            title={video?.title || 'YouTube video'}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            onLoad={() => setIframeLoaded(true)}
          />
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                <div className="absolute inset-0 rounded-full border-4 border-brand-coral border-t-transparent animate-spin" />
              </div>
            </div>
          )}
          {canRenderPlayer && durationSeconds > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30 z-10">
              <div
                ref={progressBarRef}
                className="h-full bg-brand-coral transition-all duration-[250ms] ease-linear"
                style={{ width: '0%' }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-gray-900">
          <p className="text-sm">{t('miniPlayer.couldNotLoad')}</p>
          {video?.link && (
            <button
              onClick={() => { window.open(video.link, '_blank'); }}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t('miniPlayer.openOnYoutube')}
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-navy pb-safe">
        <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 pt-4 lg:py-6">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl skeleton-shimmer" />
            <div className="px-4 sm:px-0 space-y-5 sm:space-y-6">
              <div className="h-8 w-3/4 rounded skeleton-shimmer" />
              <div className="h-4 w-48 rounded skeleton-shimmer" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="h-4 w-32 rounded skeleton-shimmer" />
                <div className="h-4 w-24 rounded skeleton-shimmer" />
                <div className="h-4 w-20 rounded skeleton-shimmer" />
                <div className="h-4 w-16 rounded skeleton-shimmer" />
              </div>
              <div className="h-px w-full bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-700/50 dark:to-transparent" />
              <div className="rounded-xl bg-gray-50/80 dark:bg-white/[0.04] p-4 sm:p-5 lg:p-6 border border-gray-200/60 dark:border-white/10 space-y-3">
                <div className="h-4 w-full rounded skeleton-shimmer" />
                <div className="h-4 w-full rounded skeleton-shimmer" />
                <div className="h-4 w-2/3 rounded skeleton-shimmer" />
              </div>
              <div className="h-px w-full bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-700/50 dark:to-transparent" />
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <div className="h-10 w-32 rounded-xl skeleton-shimmer" />
                <div className="h-10 w-28 rounded-xl skeleton-shimmer" />
                <div className="h-10 w-28 rounded-xl skeleton-shimmer" />
                <div className="h-10 w-24 rounded-xl skeleton-shimmer" />
                <div className="h-10 w-24 rounded-xl skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-navy pb-safe">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 pt-4 lg:py-6">
        <div className="flex flex-col gap-6 sm:gap-8">

          <div className="w-full">
            {player}
          </div>

          {video ? (
            <div className="px-4 sm:px-0 space-y-5 sm:space-y-6">
              <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold leading-snug text-gray-900 dark:text-white">
                {video.title}
              </h1>

              <div className="h-px w-full bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-700/50 dark:to-transparent" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {hasChannelRoute ? (
                    <button
                      onClick={handleChannelClick}
                      className="flex items-center gap-3 min-w-0 group/channel"
                      aria-label={`${t('miniPlayer.openChannel')}: ${video.channelName}`}
                    >
                      <span className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-brand-pink via-brand-coral to-brand-orange text-sm font-bold text-white shadow-sm flex-shrink-0">
                        {channelInitial}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-brand-coral group-hover/channel:underline truncate">
                        {video.channelName}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-brand-pink via-brand-coral to-brand-orange text-sm font-bold text-white shadow-sm flex-shrink-0">
                        {channelInitial}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-brand-coral truncate">
                        {video.channelName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeTime(video.publishedDate, t)}
                  </span>
                  {formattedViews && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {formattedViews} {t('miniPlayer.views')}
                    </span>
                  )}
                  {formattedDuration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formattedDuration}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-700/50 dark:to-transparent" />

              {video.description && video.description.trim().length > 0 ? (
                <div className="rounded-xl bg-gray-50/80 dark:bg-white/[0.04] p-4 sm:p-5 lg:p-6 border border-gray-200/60 dark:border-white/10">
                  <VideoDescription description={video.description} />
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50/80 dark:bg-white/[0.04] p-4 sm:p-5 lg:p-6 border border-gray-200/60 dark:border-white/10">
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 italic">
                    {t('miniPlayer.noDescription')}
                  </p>
                </div>
              )}

              <div className="h-px w-full bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-700/50 dark:to-transparent" />

              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <div className="group relative">
                  <button
                    onClick={handleOpenOnYoutube}
                    className="flex items-center justify-center rounded-xl bg-red-600 p-3 sm:p-2.5 text-white hover:bg-red-700 transition-all active:scale-95 shadow-sm shadow-red-600/20 min-h-[44px] min-w-[44px]"
                    aria-label={t('miniPlayer.openOnYoutube')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                    {t('miniPlayer.openOnYoutube')}
                  </span>
                </div>

                <div className="group relative">
                  <button
                    onClick={handleWatchLater}
                    className={`flex items-center justify-center rounded-xl p-3 sm:p-2.5 transition-all active:scale-95 border min-h-[44px] min-w-[44px] ${
                      isInWatchLater
                        ? 'bg-brand-coral/10 text-brand-coral border-brand-coral/30 dark:bg-brand-coral/20'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15'
                    }`}
                    aria-label={isInWatchLater ? t('videoCard.removeWatchLater') : t('videoCard.watchLater')}
                  >
                    {isInWatchLater ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                  </button>
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                    {isInWatchLater ? t('watchLater.remove') : t('videoCard.watchLater')}
                  </span>
                </div>

                <div className="group relative">
                  <button
                    onClick={handleFavorite}
                    className={`flex items-center justify-center rounded-xl p-3 sm:p-2.5 transition-all active:scale-95 border min-h-[44px] min-w-[44px] ${
                      isFav
                        ? 'bg-red-500/10 text-red-500 border-red-500/30 dark:bg-red-500/20'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15'
                    }`}
                    aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
                  >
                    <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                    {isFav ? t('favorites.remove') : t('favorites.add')}
                  </span>
                </div>

                <div className="group relative">
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center rounded-xl p-3 sm:p-2.5 bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15 transition-all active:scale-95 min-h-[44px] min-w-[44px]"
                    aria-label={t('miniPlayer.share')}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                    {t('miniPlayer.share')}
                  </span>
                </div>

                <div className="group relative">
                  <button
                    onClick={handleAudioMode}
                    className="flex items-center justify-center rounded-xl p-3 sm:p-2.5 bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15 transition-all active:scale-95 min-h-[44px] min-w-[44px]"
                    aria-label={t('audioPage.listenInAudioMode')}
                  >
                    <Headphones className="h-4 w-4" />
                  </button>
                  <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                    {t('audioPage.listenInAudioMode')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 sm:px-0 py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('videoPage.notFound') || 'Video not found'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(VideoPage);

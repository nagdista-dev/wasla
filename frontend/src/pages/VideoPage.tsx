import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Clock, Eye, ExternalLink, Heart, BookmarkCheck, BookmarkPlus, Maximize2, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../components/Toast';
import { extractVideoId, buildWatchUrl } from '../utils/videoUtils';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { formatDescription } from '../utils/formatDescription';
import { loadWatchLater, saveWatchLater } from '../storage';
import { useMeta } from '../hooks/useMeta';
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
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsToggle, setNeedsToggle] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      const lineHeight = parseFloat(getComputedStyle(contentRef.current).lineHeight) || 20;
      const maxCollapsedHeight = lineHeight * DESCRIPTION_COLLAPSED_LINES;
      setNeedsToggle(contentRef.current.scrollHeight > maxCollapsedHeight + 4);
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [description]);

  const formattedHtml = formatDescription(description);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: expanded ? `${contentHeight ?? 9999}px` : `${DESCRIPTION_COLLAPSED_LINES * 1.625}em`,
        }}
        dangerouslySetInnerHTML={{ __html: formattedHtml }}
      />
      {needsToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
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
    </div>
  );
}

function VideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { currentVideo } = usePlayer();
  const { showToast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [video, setVideo] = useState<(LatestVideo & { channelId?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInWatchLater, setIsInWatchLater] = useState(false);

  useMeta({ title: video?.title || t('videoPage.loading') });

  useEffect(() => {
    let found: (LatestVideo & { channelId?: string }) | null = null;

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

    if (!found) {
      try {
        const cachedVideos = localStorage.getItem('wasla_videos_cache');
        if (cachedVideos) {
          const parsed = JSON.parse(cachedVideos);
          for (const entry of Object.values(parsed) as Array<{ videos?: LatestVideo[] }>) {
            if (entry?.videos) {
              for (const v of entry.videos) {
                const extractedId = extractVideoId(v.link);
                if (extractedId === videoId) {
                  found = v;
                  break;
                }
              }
            }
            if (found) break;
          }
        }
      } catch { /* ignore */ }
    }

    if (found) {
      setVideo(found);
    }
    setLoading(false);
  }, [videoId, currentVideo, location.state]);

  useEffect(() => {
    if (video) {
      setIsInWatchLater(loadWatchLater().some(item => item.video.link === video.link));
    }
  }, [video]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleOpenOnYoutube = useCallback(() => {
    if (!video) return;
    const id = extractVideoId(video.link) || videoId;
    if (id) {
      window.open(buildWatchUrl(id), '_blank');
    } else {
      window.open(video.link, '_blank');
    }
  }, [video, videoId]);

  const handleWatchLater = useCallback(() => {
    if (!video) return;
    if (isInWatchLater) {
      const items = loadWatchLater();
      saveWatchLater(items.filter(item => item.video.link !== video.link));
      setIsInWatchLater(false);
      showToast(t('watchLater.removed'), 'info');
    } else {
      const items = loadWatchLater();
      items.push({
        id: `video_${Date.now()}`,
        video,
        channelName: video.channelName,
        channelId: '',
        savedAt: Date.now(),
        watched: false,
      });
      saveWatchLater(items);
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

  const handleFullscreen = useCallback(() => {
    if (!video) return;
    const id = extractVideoId(video.link) || videoId;
    if (id) {
      window.open(`https://www.youtube.com/embed/${id}`, '_blank');
    }
  }, [video, videoId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-dark-navy">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-gray-200 dark:border-white/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-brand-coral rounded-full animate-spin border-t-transparent" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('miniPlayer.loading')}</p>
        </div>
      </div>
    );
  }

  const embedId = video ? (extractVideoId(video.link) || videoId) : videoId;
  const isFav = video ? isFavorite(video.link) : false;
  const formattedViews = video ? formatViews(video.views) : undefined;
  const formattedDuration = video ? formatDuration(video.duration) : undefined;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-navy">
      <div className="mx-auto max-w-5xl px-0 sm:px-4 lg:px-6 py-0 sm:py-6">
        <div className="px-2 sm:px-0 pt-2 sm:pt-0 pb-2">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg px-2 py-1.5 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('videoPage.back') || 'Back'}
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black rounded-none sm:rounded-xl overflow-hidden shadow-2xl">
          {embedId ? (
            <iframe
              src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
              title={video?.title || 'YouTube video'}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
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

        {video ? (
          <div className="px-4 sm:px-0 py-4 sm:py-6 space-y-4 sm:space-y-5">
            <h1 className="text-xl sm:text-2xl font-bold leading-snug text-gray-900 dark:text-white">
              {video.title}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-brand-coral">
                {video.channelName}
              </span>
              <span className="hidden sm:inline text-gray-300 dark:text-gray-600">•</span>
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

            <div className="border-t border-gray-100 dark:border-white/10" />

            {video.description && video.description.trim().length > 0 ? (
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 sm:p-5 border border-gray-100 dark:border-white/10">
                <VideoDescription description={video.description} />
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 sm:p-5 border border-gray-100 dark:border-white/10">
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 italic">
                  {t('miniPlayer.noDescription')}
                </p>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-white/10" />

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={handleOpenOnYoutube}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 sm:px-5 sm:py-2.5 text-sm sm:text-base font-semibold text-white hover:bg-red-700 transition-all active:scale-95 shadow-sm shadow-red-600/20 min-h-[44px]"
              >
                <ExternalLink className="h-4 w-4" />
                {t('miniPlayer.openOnYoutube')}
              </button>

              <button
                onClick={handleWatchLater}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 sm:px-5 sm:py-2.5 text-sm sm:text-base font-medium transition-all active:scale-95 border min-h-[44px] ${
                  isInWatchLater
                    ? 'bg-brand-coral/10 text-brand-coral border-brand-coral/30 dark:bg-brand-coral/20'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15'
                }`}
                aria-label={isInWatchLater ? t('videoCard.removeWatchLater') : t('videoCard.watchLater')}
              >
                {isInWatchLater ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                {isInWatchLater ? t('watchLater.remove') : t('videoCard.watchLater')}
              </button>

              <button
                onClick={handleFavorite}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 sm:px-5 sm:py-2.5 text-sm sm:text-base font-medium transition-all active:scale-95 border min-h-[44px] ${
                  isFav
                    ? 'bg-red-500/10 text-red-500 border-red-500/30 dark:bg-red-500/20'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15'
                }`}
                aria-label={isFav ? t('favorites.remove') : t('favorites.add')}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? t('favorites.remove') : t('favorites.add')}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 rounded-xl px-4 py-3 sm:px-5 sm:py-2.5 text-sm sm:text-base font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15 transition-all active:scale-95 min-h-[44px]"
                aria-label={t('miniPlayer.share')}
              >
                <Share2 className="h-4 w-4" />
                {t('miniPlayer.share')}
              </button>

              <button
                onClick={handleFullscreen}
                className="flex items-center gap-2 rounded-xl px-4 py-3 sm:px-5 sm:py-2.5 text-sm sm:text-base font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15 transition-all active:scale-95 min-h-[44px]"
                aria-label={t('miniPlayer.fullscreen')}
              >
                <Maximize2 className="h-4 w-4" />
                {t('miniPlayer.fullscreen')}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-0 py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('videoPage.notFound') || 'Video not found'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(VideoPage);

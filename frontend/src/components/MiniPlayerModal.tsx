import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkCheck, BookmarkPlus, ChevronDown, ChevronUp, Clock, ExternalLink, Eye, Heart, Maximize2, Share2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from './Toast';
import { extractVideoId, buildWatchUrl } from '../utils/videoUtils';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { loadWatchLater, saveWatchLater } from '../storage';

// ─── YouTube IFrame API types ─────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          height?: string | number;
          width?: string | number;
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  destroy: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
}

// ─── API loader (singleton) ───────────────────────────────────────────────────

let apiLoaded = false;
let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };
  });
  return apiPromise;
}

loadYouTubeAPI();

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Convert timestamp (HH:MM:SS or MM:SS) to seconds
 */
function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Format timestamp with leading zeros
 */
function formatTimestamp(timestamp: string): string {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}:${parts[2].toString().padStart(2, '0')}`;
  } else if (parts.length === 2) {
    return `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}`;
  }
  return timestamp;
}

/**
 * Format the description text, preserving line breaks and converting
 * bare URLs to clickable links, hashtags to styled spans, email addresses
 * to styled spans, --- or === to divider lines, and timestamps to styled,
 * clickable spans.
 */
function formatDescription(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-coral hover:underline break-all">$1</a>'
    )
    .replace(
      /(^|\s)(#[a-zA-Z0-9_\u0600-\u06FF]+)/g,
      '$1<span class="text-brand-pink hover:text-brand-coral transition-colors cursor-default">$2</span>'
    )
    .replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<span class="text-brand-purple hover:text-brand-coral transition-colors cursor-default underline">$1</span>'
    )
    .replace(
      /(^|\n)([\-\=]{3,})($|\n)/g,
      '$1<hr class="border-gray-200 dark:border-white/10 my-2" />$3'
    )
    .replace(/\n/g, '<br/>')
    .replace(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g, (match) => {
      const seconds = timestampToSeconds(match);
      return `<span class="timestamp-highlight cursor-pointer font-mono text-brand-coral hover:text-brand-pink transition-colors" data-seconds="${seconds}">${formatTimestamp(match)}</span>`;
    });
}

// ─── Description Component (lazy-rendered, collapsible) ───────────────────────

const DESCRIPTION_COLLAPSED_LINES = 3;

function VideoDescription({ description, t, onTimestampClick }: { description: string; t: (key: string) => string; onTimestampClick?: (seconds: number) => void }) {
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

  const handleTimestampClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const timestampSpan = target.closest('.timestamp-highlight') as HTMLElement;
    if (timestampSpan && onTimestampClick) {
      const seconds = parseInt(timestampSpan.dataset.seconds || '0', 10);
      onTimestampClick(seconds);
    }
  };

  return (
    <div className="relative" onClick={handleTimestampClick}>
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
          className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand-coral hover:text-brand-pink transition-colors"
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

// ─── Main Component ───────────────────────────────────────────────────────────

const MiniPlayerModal = memo(function MiniPlayerModal() {
  const { t, isRTL } = useLanguage();
  const { currentVideo, close } = usePlayer();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const playerRef = useRef<YTPlayer | null>(null);
  const playerReadyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [apiFailed, setApiFailed] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [closing, setClosing] = useState(false);

  // Check watch later status when video changes
  useEffect(() => {
    if (currentVideo) {
      setIsInWatchLater(loadWatchLater().some(item => item.video.link === currentVideo.link));
    }
  }, [currentVideo]);

  // YouTube Player setup
  useEffect(() => {
    if (!currentVideo) return;

    let videoId = extractVideoId(currentVideo.link);

    if (!videoId) {
      console.warn('[MiniPlayer] Cannot resolve videoId from:', currentVideo.link);
      setApiFailed(true);
      return;
    }

    setApiFailed(false);
    setPlayerReady(false);
    playerReadyRef.current = false;
    let destroyed = false;

    const timeout = setTimeout(() => {
      if (!destroyed && !playerReadyRef.current) {
        setApiFailed(true);
      }
    }, 5000);

    loadYouTubeAPI().then(() => {
      if (destroyed) return;
      clearTimeout(timeout);

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }

      if (!containerRef.current) return;

      try {
        const player = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              playerReadyRef.current = true;
              setPlayerReady(true);
            },
            onError: () => {
              setApiFailed(true);
            },
          },
        });
        playerRef.current = player;
      } catch {
        setApiFailed(true);
      }
    });

    return () => {
      destroyed = true;
      clearTimeout(timeout);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, [currentVideo]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (currentVideo) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [currentVideo]);

  // Trap Escape key
  useEffect(() => {
    if (!currentVideo) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentVideo]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      close();
    }, 250);
  }, [close]);

  const openAtCurrentTime = useCallback(() => {
    if (!currentVideo) return;

    const videoId = extractVideoId(currentVideo.link);
    if (!videoId) {
      window.open(currentVideo.link, '_blank');
      close();
      return;
    }

    const baseUrl = buildWatchUrl(videoId);
    window.open(baseUrl, '_blank');
    close();
  }, [currentVideo, close]);

  const jumpToTimestamp = useCallback((seconds: number) => {
    if (!currentVideo) return;

    try {
      if (playerRef.current && playerReadyRef.current) {
        playerRef.current.seekTo(seconds, true);
      }
      const timeStr = formatDuration(String(seconds));
      showToast(t('miniPlayer.jumpToTimestamp', { time: timeStr || seconds.toString() }), 'success');
    } catch {
      showToast(t('miniPlayer.jumpFailed'), 'error');
    }
  }, [currentVideo, showToast, t]);

  const handleWatchLater = useCallback(() => {
    if (!currentVideo) return;
    if (isInWatchLater) {
      const items = loadWatchLater();
      saveWatchLater(items.filter(item => item.video.link !== currentVideo.link));
      setIsInWatchLater(false);
      showToast(t('watchLater.removed'), 'info');
    } else {
      const items = loadWatchLater();
      items.push({
        id: `unknown_${Date.now()}`,
        video: currentVideo,
        channelName: currentVideo.channelName,
        channelId: '',
        savedAt: Date.now(),
        watched: false,
      });
      saveWatchLater(items);
      setIsInWatchLater(true);
      showToast(t('watchLater.saved'), 'success');
    }
  }, [currentVideo, isInWatchLater, showToast, t]);

  const handleFavorite = useCallback(() => {
    if (!currentVideo) return;
    const wasFav = isFavorite(currentVideo.link);
    toggleFavorite(currentVideo, currentVideo.channelName);
    showToast(wasFav ? t('favorites.removed') : t('favorites.saved'), wasFav ? 'info' : 'success');
  }, [currentVideo, isFavorite, toggleFavorite, showToast, t]);

  const handleShare = useCallback(() => {
    if (!currentVideo) return;
    if (navigator.share) {
      navigator.share({
        title: currentVideo.title,
        url: currentVideo.link,
      }).catch(() => { /* cancelled */ });
    } else {
      navigator.clipboard.writeText(currentVideo.link).then(() => {
        showToast(t('miniPlayer.linkCopied'), 'success');
      }).catch(() => { /* noop */ });
    }
  }, [currentVideo, showToast, t]);

  if (!currentVideo && !closing) return null;
  if (!currentVideo) return null;

  const videoId = extractVideoId(currentVideo.link);
  const channelInitial = (currentVideo.channelName || '?').charAt(0).toUpperCase();
  const formattedViews = formatViews(currentVideo.views);
  const formattedDuration = formatDuration(currentVideo.duration);
  const isFav = isFavorite(currentVideo.link);

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-start justify-center transition-opacity duration-250 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 backdrop-blur-md ${
          theme === 'dark' ? 'bg-black/85' : 'bg-black/60'
        }`}
        onClick={handleClose}
      />

      {/* Modal Container — full height, top-aligned */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full sm:max-w-3xl h-[100dvh] sm:h-[100dvh] sm:max-h-[100dvh] flex flex-col sm:rounded-none overflow-hidden shadow-2xl transition-transform duration-250 ${
          closing
            ? 'translate-y-8 sm:scale-95'
            : 'translate-y-0 sm:scale-100 animate-modal-enter'
        } ${
          theme === 'dark'
            ? 'bg-[#0f1729] ring-1 ring-white/10'
            : 'bg-white'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={currentVideo.title}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} z-20 rounded-full bg-black/50 backdrop-blur-sm p-2 text-white/90 hover:bg-black/70 hover:text-white transition-all active:scale-90`}
          aria-label={t('miniPlayer.close')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* ─── 1. Video Player ─────────────────────────────────────── */}
        <div className="relative aspect-[16/10] w-full flex-shrink-0 bg-black">
          {videoId ? (
            apiFailed ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title={currentVideo.title || 'YouTube video'}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              <>
                <div
                  ref={containerRef}
                  className="absolute inset-0 w-full h-full"
                />
                {!playerReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <div className="flex flex-col items-center gap-4 text-white">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-white/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-brand-coral rounded-full animate-spin border-t-transparent" />
                      </div>
                      <p className="text-sm text-white/70">{t('miniPlayer.loading')}</p>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-gray-900">
              <p className="text-sm">{t('miniPlayer.couldNotLoad')}</p>
              <button
                onClick={() => { window.open(currentVideo.link, '_blank'); close(); }}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {t('miniPlayer.openOnYoutube')}
              </button>
            </div>
          )}
        </div>

        {/* ─── Scrollable Content Area ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain modal-scroll">
          <div className="px-5 sm:px-6 py-4 space-y-4">

            {/* ─── 2. Video Title ────────────────────────────────────── */}
            <h2 className="text-lg sm:text-xl font-bold leading-snug text-gray-900 dark:text-white">
              {currentVideo.title}
            </h2>

            <div className="border-t border-gray-100 dark:border-white/10" />

            {/* ─── 3. Channel Info + 4. Publish Date & Stats ─────────── */}
              <div className="flex items-center gap-3">
              {/* Channel avatar */}
              {currentVideo.channelId ? (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/channel/${currentVideo.channelId}`); }}
                  className="flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 text-base font-bold text-white shadow-sm hover:opacity-80 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}
                  aria-label={t('miniPlayer.openChannel')}
                >
                  {channelInitial}
                </button>
              ) : (
                <span
                  className="flex items-center justify-center h-10 w-10 rounded-full flex-shrink-0 text-base font-bold text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}
                >
                  {channelInitial}
                </span>
              )}

              <div className="flex-1 min-w-0">
                {currentVideo.channelId ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/channel/${currentVideo.channelId}`); }}
                    className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate hover:text-brand-coral transition-colors"
                  >
                    {currentVideo.channelName}
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {currentVideo.channelName}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    {formatRelativeTime(currentVideo.publishedDate, t)}
                  </span>
                  {formattedViews && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                      {formattedViews} {t('miniPlayer.views')}
                    </span>
                  )}
                  {currentVideo.description && currentVideo.description.trim().length > 0 && formattedDuration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      {formattedDuration}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-white/10" />

            {/* ─── 5. Video Description ──────────────────────────────── */}
            {currentVideo.description && currentVideo.description.trim().length > 0 ? (
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-100 dark:border-white/10">
                <VideoDescription
                  description={currentVideo.description}
                  t={t}
                  onTimestampClick={jumpToTimestamp}
                />
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4 border border-gray-100 dark:border-white/10">
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {t('miniPlayer.noDescription')}
                </p>
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-white/10" />

            {/* ─── 6. Related Actions ────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); openAtCurrentTime(); }}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-all active:scale-95 shadow-sm shadow-red-600/20"
              >
                <ExternalLink className="h-4 w-4" />
                {t('miniPlayer.openOnYoutube')}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); handleWatchLater(); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 border ${
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
                onClick={(e) => { e.stopPropagation(); handleFavorite(); }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 border ${
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
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15 transition-all active:scale-95"
                aria-label={t('miniPlayer.share')}
              >
                <Share2 className="h-4 w-4" />
                {t('miniPlayer.share')}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const videoId = extractVideoId(currentVideo.link);
                  if (videoId) {
                    window.open(`https://www.youtube.com/embed/${videoId}`, '_blank');
                  }
                }}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/15 transition-all active:scale-95"
                aria-label={t('miniPlayer.fullscreen')}
              >
                <Maximize2 className="h-4 w-4" />
                {t('miniPlayer.fullscreen')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MiniPlayerModal;

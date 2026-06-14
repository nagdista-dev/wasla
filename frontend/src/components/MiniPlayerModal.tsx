import { memo, useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { extractVideoId, buildWatchUrl } from '../utils/videoUtils';

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

// ─── Component ────────────────────────────────────────────────────────────────

const MiniPlayerModal = memo(function MiniPlayerModal() {
  const { t, isRTL } = useLanguage();
  const { currentVideo, close } = usePlayer();
  const { theme } = useTheme();
  const playerRef = useRef<YTPlayer | null>(null);
  const playerReadyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Per-video state — reset whenever currentVideo changes
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    if (!currentVideo) return;

    // Task 5: Derive videoId from the (already-normalized) link.
    // The link is guaranteed to be watch?v= by PlayerContext, but we add
    // a second layer of extraction as a defensive fallback.
    let videoId = extractVideoId(currentVideo.link);

    if (!videoId) {
      // Final safeguard — log and skip gracefully (Task 5)
      console.warn('[MiniPlayer] Cannot resolve videoId from:', currentVideo.link);
      setApiFailed(true);
      return;
    }

    // Reset state for this video (Task 5 — correct state reset on video switch)
    setApiFailed(false);
    playerReadyRef.current = false;
    let destroyed = false;

    // 5-second API-load timeout → fall back to plain iframe embed
    const timeout = setTimeout(() => {
      if (!destroyed && !playerReadyRef.current) {
        setApiFailed(true);
      }
    }, 5000);

    loadYouTubeAPI().then(() => {
      if (destroyed) return;
      clearTimeout(timeout);

      // Destroy any previous player instance before creating a new one
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

  // Task 5: Safe open-at-current-time — builds URL from canonical watch link
  const openAtCurrentTime = () => {
    if (!currentVideo) return;

    let currentTime = 0;
    if (playerRef.current && playerReadyRef.current) {
      try {
        currentTime = Math.floor(playerRef.current.getCurrentTime());
      } catch { /* player may not be ready */ }
    }

    // Use the normalized link (always watch?v=...) — safe to parse
    const videoId = extractVideoId(currentVideo.link);
    const baseUrl = videoId ? buildWatchUrl(videoId) : currentVideo.link;

    try {
      const url = new URL(baseUrl);
      if (currentTime > 0) {
        url.searchParams.set('t', `${currentTime}s`);
      }
      window.open(url.toString(), '_blank');
    } catch {
      window.open(baseUrl, '_blank');
    }
    close();
  };

  if (!currentVideo) return null;

  // Task 3: ID resolution is purely from the video link — no origin check
  const videoId = extractVideoId(currentVideo.link);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className={`fixed inset-0 backdrop-blur-sm ${
          theme === 'dark' ? 'bg-black/90' : 'bg-white/90'
        }`}
        onClick={close}
      />
      <div className="relative z-10 w-full max-w-4xl rounded-xl overflow-hidden bg-black shadow-2xl flex flex-col">
        <button
          onClick={close}
          className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors`}
          aria-label={t('miniPlayer.close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative aspect-video w-full">
          {videoId ? (
            apiFailed ? (
              /* Fallback: plain iframe embed — always works */
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title={currentVideo.title || 'YouTube video'}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              /* Primary: YouTube IFrame Player API */
              <div
                ref={containerRef}
                className="absolute inset-0 w-full h-full"
              />
            )
          ) : (
            /* No usable video ID — graceful failure message */
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

        <div className="flex items-center justify-center gap-4 px-4 py-3 bg-black/80">
          <button
            onClick={openAtCurrentTime}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            aria-label={t('miniPlayer.openOnYoutube')}
          >
            <ExternalLink className="h-4 w-4" />
            {t('miniPlayer.openOnYoutube')}
          </button>
        </div>
      </div>
    </div>
  );
});

export default MiniPlayerModal;

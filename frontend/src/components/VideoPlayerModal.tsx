import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { LatestVideo } from '../types';

function getYoutubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

let ytLoadPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (ytLoadPromise) return ytLoadPromise;
  ytLoadPromise = new Promise((resolve) => {
    if ((window as any).YT?.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytLoadPromise;
}

export default function VideoPlayerModal({
  video,
  onClose,
}: {
  video: LatestVideo;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoId = getYoutubeVideoId(video.link);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    let intervalId: ReturnType<typeof setInterval>;

    const init = async () => {
      await loadYoutubeApi();
      if (!containerRef.current) return;

      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            intervalId = setInterval(() => {
              try {
                setCurrentTime(e.target.getCurrentTime());
              } catch {}
            }, 1000);
          },
        },
      });
    };

    init();

    return () => {
      clearInterval(intervalId);
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const handleOpenInYoutube = () => {
    const seconds = Math.floor(currentTime);
    window.open(`https://youtu.be/${videoId}?t=${seconds}`, '_blank');
    playerRef.current?.pauseVideo();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-black rounded-xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative pt-[56.25%]">
          <div ref={containerRef} className="absolute inset-0" />
        </div>
        <div className="p-4 bg-white dark:bg-dark-navy">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{video.title}</h3>
          <button
            onClick={handleOpenInYoutube}
            className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg bg-brand-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-pink transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in YouTube
          </button>
        </div>
      </div>
    </div>
  );
}

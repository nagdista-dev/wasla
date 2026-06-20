import React, { useState, useEffect, useRef, useCallback } from 'react';

export type CustomVideoPlayerProps = {
  videoId: string;
  startTime?: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onSpeedChange?: (speed: number) => void;
  onSeek?: (seconds: number) => void;
};

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  videoId,
  startTime = 0,
  onPlayStateChange,
  onSeek,
}) => {
  const [, setIsPlaying] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback(() => {
    document.body.classList.remove('youtube-hover');
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const style = document.createElement('style');
    style.textContent = `
      iframe[src*="youtube.com/embed/"] {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      iframe[src*="youtube.com/embed/"]:hover {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      iframe[src*="youtube.com/embed/"] * {
        pointer-events: none !important;
      }
      
      iframe[src*="youtube.com/embed/"]:hover * {
        pointer-events: none !important;
      }
      
      body.youtube-hover iframe[src*="youtube.com/embed/"] {
        pointer-events: none !important;
      }
      
      body.youtube-hover iframe[src*="youtube.com/embed/"] * {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    const handleMouseEnter = () => {
      document.body.classList.remove('youtube-hover');
    };

    const handleMouseMoveInner = () => {
      document.body.classList.remove('youtube-hover');
    };

    iframe.addEventListener('mouseenter', handleMouseEnter);
    iframe.addEventListener('mousemove', handleMouseMoveInner);

    return () => {
      document.head.removeChild(style);
      iframe.removeEventListener('mouseenter', handleMouseEnter);
      iframe.removeEventListener('mousemove', handleMouseMoveInner);
    };
  }, []);

  const sendMessage = useCallback((command: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: command,
        args: args,
      }), '*');
    }
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    sendMessage('seekTo', [seconds, true]);
    onSeek?.(seconds);
  }, [onSeek, sendMessage]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickTime < 300) {
      e.stopPropagation();
      return;
    }
    setLastClickTime(now);
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    overlayTimeoutRef.current = setTimeout(() => {
      // Previous state variables removed
    }, 3000);
  }, [lastClickTime]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const style = document.createElement('style');
    style.textContent = `
      iframe[src*="youtube.com/embed/"] {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      iframe[src*="youtube.com/embed/"]:hover {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      iframe[src*="youtube.com/embed/"] * {
        pointer-events: none !important;
      }
      
      iframe[src*="youtube.com/embed/"]:hover * {
        pointer-events: none !important;
      }
      
      body.youtube-hover iframe[src*="youtube.com/embed/"] {
        pointer-events: none !important;
      }
      
      body.youtube-hover iframe[src*="youtube.com/embed/"] * {
        pointer-events: none !important;
      }
      
      iframe[src*="youtube.com/embed/"]::-webkit-scrollbar {
        display: none !important;
      }
      
      iframe[src*="youtube.com/embed/"] {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
    `;
    document.head.appendChild(style);

    const handleMouseEnter = () => {
      document.body.classList.remove('youtube-hover');
    };

    const handleMouseMoveInner = () => {
      document.body.classList.remove('youtube-hover');
    };

    iframe.addEventListener('mouseenter', handleMouseEnter);
    iframe.addEventListener('mousemove', handleMouseMoveInner);

    return () => {
      document.head.removeChild(style);
      iframe.removeEventListener('mouseenter', handleMouseEnter);
      iframe.removeEventListener('mousemove', handleMouseMoveInner);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.info === 1) {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        } else if (data.info === 2) {
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }
      } catch (error) {
        console.error('Error parsing YouTube message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlayStateChange]);

  useEffect(() => {
    if (startTime > 0) {
      handleSeek(startTime);
    }
  }, [startTime, handleSeek]);

  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden rounded-xl"
      onClick={handleOverlayClick}
      onMouseMove={handleMouseMove}
    >
      <iframe
        ref={iframeRef}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&controls=1&disablekb=0&cc_load_policy=1&fs=1`}
        title="YouTube video player"
        className="absolute inset-0 w-full h-full"
        allow="autoplay; encrypted-media; fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        frameBorder="0"
        onMouseEnter={(e) => {
          e.stopPropagation();
          document.body.classList.remove('youtube-hover');
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          document.body.classList.remove('youtube-hover');
        }}
        onMouseMove={(e) => {
          e.stopPropagation();
          document.body.classList.remove('youtube-hover');
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};

export default CustomVideoPlayer;

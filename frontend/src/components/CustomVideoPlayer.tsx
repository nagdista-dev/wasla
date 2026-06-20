import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, SkipBack, SkipForward } from 'lucide-react';

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
  onSpeedChange,
  onSeek,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const handleMouseMove = useCallback(() => {
    document.body.classList.remove('youtube-hover');
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const sendMessage = (command: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: command,
        args: args,
      }), '*');
    }
  };

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      sendMessage('pause');
    } else {
      sendMessage('play');
    }
    setIsPlaying(!isPlaying);
    onPlayStateChange?.(!isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const handleSpeedChange = useCallback((speed: number) => {
    sendMessage('setPlaybackRate', [speed]);
    setPlaybackRate(speed);
    onSpeedChange?.(speed);
  }, [onSpeedChange]);

  const handleSeek = useCallback((seconds: number) => {
    sendMessage('seekTo', [seconds, true]);
    setCurrentTime(seconds);
    onSeek?.(seconds);
  }, [onSeek]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    sendMessage('setVolume', [newVolume]);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      sendMessage('unMute');
      setIsMuted(false);
      setVolume(1);
    } else {
      sendMessage('mute');
      setIsMuted(true);
      setVolume(0);
    }
  }, [isMuted]);

  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickTime < 300) {
      e.stopPropagation();
      return;
    }
    setLastClickTime(now);
    setIsOverlayVisible(!isOverlayVisible);
    setShowControls(true);
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    overlayTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      if (isOverlayVisible) {
        setIsOverlayVisible(false);
      }
    }, 3000);
  }, [isOverlayVisible, lastClickTime]);

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
        } else if (data.info === 3) {
          setCurrentTime(data.currentTime || 0);
        } else if (data.duration) {
          setDuration(data.duration);
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
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

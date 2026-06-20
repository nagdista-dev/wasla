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
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&showinfo=0&controls=0&disablekb=1&iv_load_policy=3&cc_load_policy=0&fs=0&widget_referrer=none`}
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

      <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-10 ${showControls || isOverlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>

      {isOverlayVisible && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="w-full max-w-md p-6">
            <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h3 className="text-white text-lg font-semibold mb-4 text-center">Video Controls</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSeek(Math.max(0, currentTime - 10)); }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                    aria-label="Skip back 10 seconds"
                  >
                    <SkipBack className="h-5 w-5" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                    className="p-4 bg-brand-coral hover:bg-brand-coral/90 rounded-full transition-all active:scale-95 text-white shadow-lg shadow-brand-coral/30"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleSeek(Math.min(duration, currentTime + 10)); }}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                    aria-label="Skip forward 10 seconds"
                  >
                    <SkipForward className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Playback Speed</label>
                  <div className="flex gap-2 justify-center">
                    {speedOptions.map((speed) => (
                      <button
                        key={speed}
                        onClick={(e) => { e.stopPropagation(); handleSpeedChange(speed); }}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${playbackRate === speed
                            ? 'bg-brand-coral text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Volume</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMuteToggle(); }}
                      className="p-2 text-gray-300 hover:text-white transition-colors"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => { e.stopPropagation(); handleVolumeChange(parseFloat(e.target.value)); }}
                      className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-brand-coral h-1.5 rounded-full transition-all duration-100"
                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleFullscreenToggle(); }}
                  className="w-full p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm text-gray-300 flex items-center justify-center gap-2"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 z-10 ${showControls || isOverlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
                className="p-2 text-white hover:text-brand-coral transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>

              <div className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="text-white/70 text-xs">
                {playbackRate}x
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleSpeedChange(speedOptions[Math.max(0, speedOptions.indexOf(playbackRate) - 1)] || playbackRate); }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
              >
                Speed -
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleSpeedChange(speedOptions[Math.min(speedOptions.length - 1, speedOptions.indexOf(playbackRate) + 1)] || playbackRate); }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white transition-colors"
              >
                Speed +
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default CustomVideoPlayer;


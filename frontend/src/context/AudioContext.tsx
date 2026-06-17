import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import type { LatestVideo } from '../types';
import { normalizeVideo } from '../utils/videoUtils';
import { useMediaManager } from './MediaContext';

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
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number; CUED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
  getPlayerState: () => number;
}

interface AudioContextType {
  currentVideo: (LatestVideo & { _videoId: string; channelId?: string }) | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null;
  playAudio: (video: LatestVideo, channelId?: string) => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  seekAudio: (time: number) => void;
  setVolume: (vol: number) => void;
  stopAudio: () => void;
  setSleepTimer: (minutes: number | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

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

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<(LatestVideo & { _videoId: string; channelId?: string }) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [sleepTimerEndTime, setSleepTimerEndTime] = useState<number | null>(null);

  const mediaManager = useMediaManager();

  const playerRef = useRef<YTPlayer | null>(null);
  const playerReadyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timePollRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  const destroyedRef = useRef(false);

  const pauseHandlerRef = useRef<() => void>(() => {});

  const clearTimePoll = useCallback(() => {
    if (timePollRef.current !== null) {
      clearInterval(timePollRef.current);
      timePollRef.current = null;
    }
  }, []);

  const startTimePoll = useCallback(() => {
    clearTimePoll();
    timePollRef.current = window.setInterval(() => {
      if (playerRef.current && playerReadyRef.current) {
        try {
          const ct = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          setCurrentTime(ct);
          if (dur && !isNaN(dur)) setDuration(dur);
        } catch {
          /* ignore */
        }
      }
    }, 250);
  }, [clearTimePoll]);

  const destroyPlayer = useCallback(() => {
    clearTimePoll();
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    }
    playerReadyRef.current = false;
  }, [clearTimePoll]);

  useEffect(() => {
    mediaManager.registerPauseHandler('audio', () => {
      pauseHandlerRef.current();
    });
    return () => mediaManager.unregisterPauseHandler('audio');
  }, [mediaManager]);

  useEffect(() => {
    return () => {
      destroyedRef.current = true;
      destroyPlayer();
      if (sleepTimerRef.current !== null) clearTimeout(sleepTimerRef.current);
    };
  }, [destroyPlayer]);

  const playAudio = useCallback((video: LatestVideo, channelId?: string) => {
    const normalized = normalizeVideo(video);
    if (!normalized) return;

    const videoId = normalized._videoId;

    mediaManager.requestPlay('audio');

    destroyedRef.current = false;
    setCurrentVideo({ ...normalized, channelId });
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setSleepTimerMinutes(null);
    setSleepTimerRemaining(null);
    setSleepTimerEndTime(null);
    if (sleepTimerRef.current !== null) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    loadYouTubeAPI().then(() => {
      if (destroyedRef.current) return;

      destroyPlayer();

      if (!containerRef.current) return;

      try {
        const player = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            rel: 0,
            controls: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event) => {
              playerReadyRef.current = true;
              event.target.setVolume(volume * 100);
              startTimePoll();
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                startTimePoll();
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                clearTimePoll();
              } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                clearTimePoll();
                setCurrentVideo(null);
                mediaManager.stopMedia('audio');
              }
            },
            onError: () => {
              setIsPlaying(false);
              clearTimePoll();
            },
          },
        });
        playerRef.current = player;
      } catch {
        setIsPlaying(false);
      }
    });
  }, [destroyPlayer, startTimePoll, clearTimePoll, volume, mediaManager]);

  const pauseAudio = useCallback(() => {
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        clearTimePoll();
      } catch { /* ignore */ }
    }
  }, [clearTimePoll]);

  useEffect(() => {
    pauseHandlerRef.current = pauseAudio;
  }, [pauseAudio]);

  const resumeAudio = useCallback(() => {
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.playVideo();
        setIsPlaying(true);
        startTimePoll();
      } catch { /* ignore */ }
    }
  }, [startTimePoll]);

  const seekAudio = useCallback((time: number) => {
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.seekTo(time, true);
        setCurrentTime(time);
      } catch { /* ignore */ }
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (playerRef.current && playerReadyRef.current) {
      try {
        playerRef.current.setVolume(clamped * 100);
      } catch { /* ignore */ }
    }
  }, []);

  const stopAudio = useCallback(() => {
    destroyPlayer();
    setCurrentVideo(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (sleepTimerRef.current !== null) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerMinutes(null);
    setSleepTimerRemaining(null);
    setSleepTimerEndTime(null);
    mediaManager.stopMedia('audio');
  }, [destroyPlayer, mediaManager]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current !== null) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerMinutes(minutes);
    if (minutes === null) {
      setSleepTimerRemaining(null);
      setSleepTimerEndTime(null);
      return;
    }
    const endTime = Date.now() + minutes * 60 * 1000;
    setSleepTimerEndTime(endTime);
    setSleepTimerRemaining(minutes * 60);

    sleepTimerRef.current = window.setTimeout(() => {
      pauseAudio();
      setSleepTimerMinutes(null);
      setSleepTimerRemaining(null);
      setSleepTimerEndTime(null);
    }, minutes * 60 * 1000);
  }, [pauseAudio]);

  useEffect(() => {
    if (sleepTimerEndTime === null || !isPlaying) return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((sleepTimerEndTime - Date.now()) / 1000));
      setSleepTimerRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime, isPlaying]);

  return (
    <AudioContext.Provider
      value={{
        currentVideo,
        isPlaying,
        currentTime,
        duration,
        volume,
        sleepTimerMinutes,
        sleepTimerRemaining,
        playAudio,
        pauseAudio,
        resumeAudio,
        seekAudio,
        setVolume,
        stopAudio,
        setSleepTimer,
      }}
    >
      {children}
      <div className="hidden" ref={containerRef} />
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

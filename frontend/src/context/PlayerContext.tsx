import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { LatestVideo } from '../types';
import { normalizeVideo } from '../utils/videoUtils';
import { useMediaManager } from './MediaContext';

interface PlayerContextType {
  currentVideo: (LatestVideo & { _videoId: string; channelId?: string }) | null;
  play: (video: LatestVideo, channelId?: string) => void;
  close: () => void;
  seekTo: (seconds: number) => void;
  registerSeekHandler: (handler: (seconds: number) => void) => void;
  unregisterSeekHandler: () => void;
  registerFullscreenContainer: (el: HTMLElement) => void;
  unregisterFullscreenContainer: () => void;
  toggleFullscreen: () => void;
  hasFullscreenContainer: boolean;
  isFullscreen: boolean;
  registerTogglePlayHandler: (handler: () => void) => void;
  unregisterTogglePlayHandler: () => void;
  togglePlay: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<(LatestVideo & { _videoId: string; channelId?: string }) | null>(null);
  const mediaManager = useMediaManager();
  const closeRef = useRef<() => void>(() => {});
  const seekHandlerRef = useRef<((seconds: number) => void) | null>(null);

  const close = useCallback(() => setCurrentVideo(null), []);
  closeRef.current = close;

  useEffect(() => {
    mediaManager.registerPauseHandler('video', () => {
      closeRef.current();
    });
    return () => mediaManager.unregisterPauseHandler('video');
  }, [mediaManager]);

  const play = useCallback((video: LatestVideo, channelId?: string) => {
    const normalized = normalizeVideo(video);
    if (!normalized) {
      console.warn('[Wasla Player] Skipping unplayable video:', video.title, video.link);
      return;
    }
    mediaManager.requestPlay('video');
    setCurrentVideo({ ...normalized, channelId });
  }, [mediaManager]);

  const seekTo = useCallback((seconds: number) => {
    seekHandlerRef.current?.(seconds);
  }, []);

  const registerSeekHandler = useCallback((handler: (seconds: number) => void) => {
    seekHandlerRef.current = handler;
  }, []);

  const unregisterSeekHandler = useCallback(() => {
    seekHandlerRef.current = null;
  }, []);

  const togglePlayHandlerRef = useRef<(() => void) | null>(null);

  const registerTogglePlayHandler = useCallback((handler: () => void) => {
    togglePlayHandlerRef.current = handler;
  }, []);

  const unregisterTogglePlayHandler = useCallback(() => {
    togglePlayHandlerRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    togglePlayHandlerRef.current?.();
  }, []);

  const fullscreenContainerRef = useRef<HTMLElement | null>(null);
  const [hasFullscreenContainer, setHasFullscreenContainer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const registerFullscreenContainer = useCallback((el: HTMLElement) => {
    fullscreenContainerRef.current = el;
    setHasFullscreenContainer(true);
  }, []);

  const unregisterFullscreenContainer = useCallback(() => {
    fullscreenContainerRef.current = null;
    setHasFullscreenContainer(false);
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = fullscreenContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.style.borderRadius = '0';
      el.requestFullscreen().catch(() => {
        el.style.borderRadius = '';
      });
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const isFS = document.fullscreenElement === fullscreenContainerRef.current;
      setIsFullscreen(isFS);
      if (!document.fullscreenElement && fullscreenContainerRef.current) {
        fullscreenContainerRef.current.style.borderRadius = '';
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <PlayerContext.Provider value={{ currentVideo, play, close, seekTo, registerSeekHandler, unregisterSeekHandler, registerFullscreenContainer, unregisterFullscreenContainer, toggleFullscreen, hasFullscreenContainer, isFullscreen, registerTogglePlayHandler, unregisterTogglePlayHandler, togglePlay }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { LatestVideo } from '../types';
import { normalizeVideo } from '../utils/videoUtils';
import { useMediaManager } from './MediaContext';

interface PlayerContextType {
  currentVideo: (LatestVideo & { _videoId: string; channelId?: string }) | null;
  play: (video: LatestVideo, channelId?: string) => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<(LatestVideo & { _videoId: string; channelId?: string }) | null>(null);
  const mediaManager = useMediaManager();
  const closeRef = useRef<() => void>(() => {});

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

  return (
    <PlayerContext.Provider value={{ currentVideo, play, close }}>
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

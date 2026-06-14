import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LatestVideo } from '../types';
import { normalizeVideo } from '../utils/videoUtils';

interface PlayerContextType {
  currentVideo: LatestVideo | null;
  play: (video: LatestVideo) => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<LatestVideo | null>(null);

  /**
   * Unified playback entry point (Task 6).
   * Normalizes every video to a consistent schema before storing it.
   * Silently skips unresolvable videos instead of crashing.
   */
  const play = useCallback((video: LatestVideo) => {
    const normalized = normalizeVideo(video);
    if (!normalized) {
      // Video ID could not be resolved — skip gracefully (Task 5)
      console.warn('[Wasla Player] Skipping unplayable video:', video.title, video.link);
      return;
    }
    setCurrentVideo(normalized);
  }, []);

  const close = useCallback(() => setCurrentVideo(null), []);

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

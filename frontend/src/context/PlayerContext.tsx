import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LatestVideo } from '../types';

interface PlayerContextType {
  currentVideo: LatestVideo | null;
  play: (video: LatestVideo) => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<LatestVideo | null>(null);

  const play = (video: LatestVideo) => setCurrentVideo(video);
  const close = () => setCurrentVideo(null);

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

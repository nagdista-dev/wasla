import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react';

export type MediaType = 'video' | 'audio' | 'none';

interface MediaContextType {
  activeMedia: MediaType;
  requestPlay: (type: 'video' | 'audio') => void;
  stopMedia: (type: 'video' | 'audio') => void;
  registerPauseHandler: (type: 'video' | 'audio', handler: () => void) => void;
  unregisterPauseHandler: (type: 'video' | 'audio') => void;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const [activeMedia, setActiveMedia] = useState<MediaType>('none');
  const pauseHandlersRef = useRef<{ video: (() => void) | null; audio: (() => void) | null }>({
    video: null,
    audio: null,
  });

  const registerPauseHandler = useCallback((type: 'video' | 'audio', handler: () => void) => {
    pauseHandlersRef.current[type] = handler;
  }, []);

  const unregisterPauseHandler = useCallback((type: 'video' | 'audio') => {
    pauseHandlersRef.current[type] = null;
  }, []);

  const requestPlay = useCallback((type: 'video' | 'audio') => {
    const otherType = type === 'video' ? 'audio' : 'video';
    const otherHandler = pauseHandlersRef.current[otherType];
    if (otherHandler) {
      otherHandler();
    }
    setActiveMedia(type);
  }, []);

  const stopMedia = useCallback((type: 'video' | 'audio') => {
    setActiveMedia(prev => prev === type ? 'none' : prev);
  }, []);

  return (
    <MediaContext.Provider value={{ activeMedia, requestPlay, stopMedia, registerPauseHandler, unregisterPauseHandler }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMediaManager() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMediaManager must be used within a MediaProvider');
  }
  return context;
}

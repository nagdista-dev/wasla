import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ChannelLatestVideo } from '../types';

interface FeedContextType {
  feedItems: ChannelLatestVideo[];
  setFeedItems: (items: ChannelLatestVideo[]) => void;
}

const FeedContext = createContext<FeedContextType>({
  feedItems: [],
  setFeedItems: () => {},
});

export function FeedProvider({ children }: { children: ReactNode }) {
  const [feedItems, setFeedItems] = useState<ChannelLatestVideo[]>([]);
  return (
    <FeedContext.Provider value={{ feedItems, setFeedItems }}>
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  return useContext(FeedContext);
}

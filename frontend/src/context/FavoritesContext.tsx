import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { FavoriteVideo, LatestVideo } from '../types';
import { loadFavorites, saveFavorites } from '../storage';

interface FavoritesContextValue {
  favorites: FavoriteVideo[];
  isFavorite: (videoUrl: string) => boolean;
  toggleFavorite: (video: LatestVideo, channelName?: string) => void;
  removeFavorite: (id: string) => void;
  updateFavorite: (id: string, title: string, category?: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function syncLoadFavorites(): FavoriteVideo[] {
  try {
    const stored = localStorage.getItem('wasla_favorites');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.id && item.videoUrl);
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteVideo[]>(syncLoadFavorites);

  useEffect(() => {
    loadFavorites().then((items) => {
      if (items.length > 0) setFavorites(items);
    });
  }, []);

  const persist = useCallback(async (next: FavoriteVideo[]) => {
    setFavorites(next);
    await saveFavorites(next);
  }, []);

  const isFavorite = useCallback(
    (videoUrl: string) => favorites.some((f) => f.videoUrl === videoUrl),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (video: LatestVideo, channelName?: string) => {
      const existing = favorites.find((f) => f.videoUrl === video.link);
      if (existing) {
        persist(favorites.filter((f) => f.id !== existing.id));
      } else {
        const newFav: FavoriteVideo = {
          id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          videoUrl: video.link,
          title: video.title,
          thumbnail: video.thumbnail,
          channelName: channelName || video.channelName,
          savedAt: Date.now(),
        };
        persist([...favorites, newFav]);
      }
    },
    [favorites, persist],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      persist(favorites.filter((f) => f.id !== id));
    },
    [favorites, persist],
  );

  const updateFavorite = useCallback(
    (id: string, title: string, category?: string) => {
      persist(
        favorites.map((f) =>
          f.id === id ? { ...f, title, category: category || undefined } : f,
        ),
      );
    },
    [favorites, persist],
  );

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, toggleFavorite, removeFavorite, updateFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}

import type { Channel, Playlist, WatchLaterItem, FavoriteVideo, Course } from './types';
import { getAll, replaceStoreItems, getItem, putItem, deleteItem } from './services/indexedDbService';

export const CHANNELS_STORAGE_KEY = 'wasla_channels';
export const PLAYLISTS_STORAGE_KEY = 'wasla_playlists';
export const WATCH_LATER_KEY = 'wasla_watch_later';
export const FAVORITES_KEY = 'wasla_favorites';
export const COURSES_KEY = 'wasla_courses';
export const HIDDEN_CATEGORIES_KEY = 'wasla_hidden_categories';

const SETTINGS_STORE = 'appSettings';
const CHANNELS_STORE = 'channels';
const PLAYLISTS_STORE = 'playlists';
const WATCH_LATER_STORE = 'watchLater';
const FAVORITES_STORE = 'favorites';
const COURSES_STORE = 'courses';

export function readStoredValue<T = string>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return localStorage.getItem(key) as T | null;
  }
}

export async function loadChannels(): Promise<Channel[]> {
  try {
    const items = await getAll<Channel>(CHANNELS_STORE);
    if (items.length > 0) {
      const seen = new Set<string>();
      return items.filter((ch) => {
        if (!ch || !ch.id || seen.has(ch.id)) return false;
        seen.add(ch.id);
        return true;
      });
    }
  } catch { /* fall through */ }
  const stored = localStorage.getItem(CHANNELS_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((ch) => {
      if (!ch || !ch.id || seen.has(ch.id)) return false;
      seen.add(ch.id);
      return true;
    });
  } catch {
    return [];
  }
}

export async function saveChannels(channels: Channel[]): Promise<void> {
  await replaceStoreItems(CHANNELS_STORE, channels);
  localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));
}

export async function loadPlaylists(): Promise<Playlist[]> {
  try {
    const items = await getAll<Playlist>(PLAYLISTS_STORE);
    if (items.length > 0) {
      const seenIds = new Set<string>();
      const seenUrls = new Set<string>();
      return items.filter((p) => {
        if (!p || !p.id || seenIds.has(p.id)) return false;
        if (p.url && seenUrls.has(p.url)) return false;
        seenIds.add(p.id);
        if (p.url) seenUrls.add(p.url);
        return true;
      });
    }
  } catch { /* fall through */ }
  const stored = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    return parsed.filter((p) => {
      if (!p || !p.id || seenIds.has(p.id)) return false;
      if (p.url && seenUrls.has(p.url)) return false;
      seenIds.add(p.id);
      if (p.url) seenUrls.add(p.url);
      return true;
    });
  } catch {
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await replaceStoreItems(PLAYLISTS_STORE, playlists);
  localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
}

export async function loadWatchLater(): Promise<WatchLaterItem[]> {
  try {
    const items = await getAll<WatchLaterItem>(WATCH_LATER_STORE);
    if (items.length > 0) return items.filter((item) => item && item.id && item.video);
  } catch { /* fall through */ }
  try {
    const stored = localStorage.getItem(WATCH_LATER_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.id && item.video);
  } catch {
    return [];
  }
}

export async function saveWatchLater(items: WatchLaterItem[]): Promise<void> {
  await replaceStoreItems(WATCH_LATER_STORE, items);
  localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(items));
}

export async function loadFavorites(): Promise<FavoriteVideo[]> {
  try {
    const items = await getAll<FavoriteVideo>(FAVORITES_STORE);
    if (items.length > 0) return items.filter((item) => item && item.id && item.videoUrl);
  } catch { /* fall through */ }
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.id && item.videoUrl);
  } catch {
    return [];
  }
}

export async function saveFavorites(items: FavoriteVideo[]): Promise<void> {
  await replaceStoreItems(FAVORITES_STORE, items);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

export async function loadCourses(): Promise<Course[]> {
  try {
    const items = await getAll<Course>(COURSES_STORE);
    if (items.length > 0) return items.filter((c) => c && c.id && c.name);
  } catch { /* fall through */ }
  try {
    const stored = localStorage.getItem(COURSES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && c.id && c.name);
  } catch {
    return [];
  }
}

export async function saveCourses(courses: Course[]): Promise<void> {
  await replaceStoreItems(COURSES_STORE, courses);
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}

export async function loadHiddenCategories(): Promise<string[]> {
  try {
    const entry = await getItem<{ key: string; value: string[] }>(SETTINGS_STORE, HIDDEN_CATEGORIES_KEY);
    if (entry && Array.isArray(entry.value)) return entry.value.filter((c): c is string => typeof c === 'string');
  } catch { /* fall through */ }
  try {
    const stored = localStorage.getItem(HIDDEN_CATEGORIES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === 'string');
  } catch {
    return [];
  }
}

export async function saveHiddenCategories(categories: string[]): Promise<void> {
  await putItem(SETTINGS_STORE, { key: HIDDEN_CATEGORIES_KEY, value: categories });
  localStorage.setItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(categories));
}

export async function loadSetting<T>(key: string): Promise<T | undefined> {
  try {
    const entry = await getItem<{ key: string; value: T }>(SETTINGS_STORE, key);
    if (entry) return entry.value;
  } catch { /* fall through */ }
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) return JSON.parse(stored) as T;
  } catch { /* ignore */ }
  return undefined;
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  await putItem(SETTINGS_STORE, { key, value });
  localStorage.setItem(key, JSON.stringify(value));
}

export async function deleteSetting(key: string): Promise<void> {
  await deleteItem(SETTINGS_STORE, key);
  localStorage.removeItem(key);
}

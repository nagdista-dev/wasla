import type { Channel, Playlist, WatchLaterItem } from './types';

export const CHANNELS_STORAGE_KEY = 'wasla_channels';
export const PLAYLISTS_STORAGE_KEY = 'wasla_playlists';
export const WATCH_LATER_KEY = 'wasla_watch_later';

export function loadChannels(): Channel[] {
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

export function saveChannels(channels: Channel[]): void {
  localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));
}

export function loadPlaylists(): Playlist[] {
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

export function savePlaylists(playlists: Playlist[]): void {
  localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
}

export function loadWatchLater(): WatchLaterItem[] {
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

export function saveWatchLater(items: WatchLaterItem[]): void {
  localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(items));
}

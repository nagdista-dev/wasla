import type { Channel } from './types';

export const CHANNELS_STORAGE_KEY = 'channels';

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

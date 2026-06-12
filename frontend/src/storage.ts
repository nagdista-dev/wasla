import type { Channel } from './types';

export const CHANNELS_STORAGE_KEY = 'channels';

export function loadChannels(): Channel[] {
  const stored = localStorage.getItem(CHANNELS_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChannels(channels: Channel[]): void {
  localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));
}

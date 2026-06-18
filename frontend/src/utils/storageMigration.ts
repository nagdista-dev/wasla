import { putItem, replaceStoreItems } from '../services/indexedDbService';
import type { Channel, Playlist, WatchLaterItem, FavoriteVideo, Course } from '../types';

const SETTINGS_STORE = 'appSettings';
const CHANNELS_STORE = 'channels';
const PLAYLISTS_STORE = 'playlists';
const WATCH_LATER_STORE = 'watchLater';
const FAVORITES_STORE = 'favorites';
const COURSES_STORE = 'courses';

interface KeyMapping {
  oldKey: string;
  newKey: string;
}

const KEY_MAPPINGS: KeyMapping[] = [
  { oldKey: 'theme', newKey: 'wasla_theme' },
  { oldKey: 'language', newKey: 'wasla_language' },
  { oldKey: 'channels', newKey: 'wasla_channels' },
  { oldKey: 'playlists', newKey: 'wasla_playlists' },
  { oldKey: 'prevCategories', newKey: 'wasla_prev_categories' },
];

const OLD_INSTALL_KEY = 'wasla_app_banner_dismissed';
const NEW_INSTALL_KEY = 'wasla_install_dismissed';

const SETTING_KEYS = [
  'wasla_theme',
  'wasla_language',
  'wasla_start_page',
  'wasla_viewMode',
  'wasla_selected_category',
  'wasla_time',
  'wasla_sort',
  'wasla_show_live_only',
  'wasla_channels_search',
  'wasla_channels_category',
  'wasla_playlists_search',
  'wasla_playlists_category',
  'wasla_contact_draft',
  'wasla_install_dismissed',
  'wasla_installed',
  'wasla_prev_categories',
  'wasla_hidden_categories',
];

function readLocalStorageValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function migrateStorageToIndexedDB(): Promise<void> {
  const migrated = localStorage.getItem('wasla_migrated_to_indexeddb');
  if (migrated === 'true') return;

  const writes: Promise<void>[] = [];

  for (const key of SETTING_KEYS) {
    const value = readLocalStorageValue(key);
    if (value !== null) {
      try {
        const parsed = JSON.parse(value);
        writes.push(putItem(SETTINGS_STORE, { key, value: parsed }));
      } catch {
        writes.push(putItem(SETTINGS_STORE, { key, value }));
      }
    }
  }

  const channelsRaw = readLocalStorageValue('wasla_channels');
  if (channelsRaw) {
    try {
      const channels = JSON.parse(channelsRaw) as Channel[];
      if (Array.isArray(channels) && channels.length > 0) {
        writes.push(replaceStoreItems(CHANNELS_STORE, channels));
      }
    } catch { /* ignore */ }
  }

  const playlistsRaw = readLocalStorageValue('wasla_playlists');
  if (playlistsRaw) {
    try {
      const playlists = JSON.parse(playlistsRaw) as Playlist[];
      if (Array.isArray(playlists) && playlists.length > 0) {
        writes.push(replaceStoreItems(PLAYLISTS_STORE, playlists));
      }
    } catch { /* ignore */ }
  }

  const watchLaterRaw = readLocalStorageValue('wasla_watch_later');
  if (watchLaterRaw) {
    try {
      const items = JSON.parse(watchLaterRaw) as WatchLaterItem[];
      if (Array.isArray(items) && items.length > 0) {
        writes.push(replaceStoreItems(WATCH_LATER_STORE, items));
      }
    } catch { /* ignore */ }
  }

  const favoritesRaw = readLocalStorageValue('wasla_favorites');
  if (favoritesRaw) {
    try {
      const items = JSON.parse(favoritesRaw) as FavoriteVideo[];
      if (Array.isArray(items) && items.length > 0) {
        writes.push(replaceStoreItems(FAVORITES_STORE, items));
      }
    } catch { /* ignore */ }
  }

  const coursesRaw = readLocalStorageValue('wasla_courses');
  if (coursesRaw) {
    try {
      const courses = JSON.parse(coursesRaw) as Course[];
      if (Array.isArray(courses) && courses.length > 0) {
        writes.push(replaceStoreItems(COURSES_STORE, courses));
      }
    } catch { /* ignore */ }
  }

  const oldInstall = readLocalStorageValue(OLD_INSTALL_KEY);
  if (oldInstall !== null) {
    const newInstall = readLocalStorageValue(NEW_INSTALL_KEY);
    if (newInstall === null) {
      writes.push(putItem(SETTINGS_STORE, { key: NEW_INSTALL_KEY, value: oldInstall }));
    }
  }

  const hiddenRaw = readLocalStorageValue('wasla_hidden_categories');
  if (hiddenRaw) {
    try {
      const parsed = JSON.parse(hiddenRaw);
      if (Array.isArray(parsed)) {
        writes.push(putItem(SETTINGS_STORE, { key: 'wasla_hidden_categories', value: parsed }));
      }
    } catch { /* ignore */ }
  }

  await Promise.all(writes);
  localStorage.setItem('wasla_migrated_to_indexeddb', 'true');
}

export function migrateLocalStorageKeys(): void {
  for (const { oldKey, newKey } of KEY_MAPPINGS) {
    const oldValue = readLocalStorageValue(oldKey);
    if (oldValue !== null) {
      const newValue = readLocalStorageValue(newKey);
      if (newValue === null) {
        try {
          localStorage.setItem(newKey, oldValue);
        } catch { /* ignore */ }
      }
      try {
        localStorage.removeItem(oldKey);
      } catch { /* ignore */ }
    }
  }

  const oldInstall = readLocalStorageValue(OLD_INSTALL_KEY);
  if (oldInstall !== null) {
    const newInstall = readLocalStorageValue(NEW_INSTALL_KEY);
    if (newInstall === null) {
      try {
        localStorage.setItem(NEW_INSTALL_KEY, oldInstall);
      } catch { /* ignore */ }
    }
    try {
      localStorage.removeItem(OLD_INSTALL_KEY);
    } catch { /* ignore */ }
  }
}
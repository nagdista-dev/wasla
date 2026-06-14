import React, { useState, useMemo } from 'react';
import { Settings, Download, Upload } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import type { Channel, Playlist } from '../types';

interface SettingsPageProps {
  channels: Channel[];
  playlists: Playlist[];
  onUpdate: (channels: Channel[]) => void;
  onUpdatePlaylists: (playlists: Playlist[]) => void;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function isChannelArray(data: unknown): data is Channel[] {
  return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'id' in data[0] && 'name' in data[0];
}

function isPlaylistArray(data: unknown): data is Playlist[] {
  return Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'id' in data[0] && 'name' in data[0] && 'timestamp' in data[0];
}

function isStringArray(data: unknown): data is string[] {
  return Array.isArray(data) && data.every((item) => typeof item === 'string');
}

export default function SettingsPage({ channels, playlists, onUpdate, onUpdatePlaylists }: SettingsPageProps) {
  const { language, setLanguage, isRTL } = useLanguage();
  const { showToast } = useToast();
  const [resolving, setResolving] = useState(false);

  const allCategories = useMemo(
    () => Array.from(new Set([
      ...channels.flatMap((c) => c.categories),
      ...playlists.flatMap((p) => p.categories),
    ])).sort((a, b) => a.localeCompare(b)),
    [channels, playlists],
  );

  const exportChannels = () => {
    downloadJson(channels, 'wasla_channels.json');
  };

  const importChannels = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || resolving) return;
    setResolving(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) {
          showToast('File must contain a JSON array', 'error');
          return;
        }
        if (data.length === 0) {
          showToast('File is empty', 'error');
          return;
        }
        if (isChannelArray(data)) {
          const merged = mergeChannels(channels, data);
          onUpdate(merged);
          showToast(`Imported ${data.length} channels (${merged.length - channels.length} new, ${merged.length} total)`, 'success');
        } else {
          showToast('File does not contain valid channel data', 'error');
        }
      } catch {
        showToast('Invalid JSON file', 'error');
      }
      setResolving(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const exportPlaylists = () => {
    downloadJson(playlists, 'wasla_playlists.json');
  };

  const importPlaylists = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || resolving) return;
    setResolving(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) {
          showToast('File must contain a JSON array', 'error');
          return;
        }
        if (data.length === 0) {
          showToast('File is empty', 'error');
          return;
        }
        if (isPlaylistArray(data)) {
          const merged = mergePlaylists(playlists, data);
          onUpdatePlaylists(merged);
          showToast(`Imported ${data.length} playlists (${merged.length - playlists.length} new, ${merged.length} total)`, 'success');
        } else {
          showToast('File does not contain valid playlist data', 'error');
        }
      } catch {
        showToast('Invalid JSON file', 'error');
      }
      setResolving(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const exportCategories = () => {
    downloadJson(allCategories, 'wasla_categories.json');
  };

  const importCategoriesFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || resolving) return;
    setResolving(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!isStringArray(data)) {
          showToast('File must contain a JSON array of category names', 'error');
          return;
        }
        if (data.length === 0) {
          showToast('File is empty', 'error');
          return;
        }
        const merged = Array.from(new Set([...allCategories, ...data])).sort((a, b) => a.localeCompare(b));
        showToast(`Categories updated: ${merged.length} total (${data.length} in file)`, 'success');
      } catch {
        showToast('Invalid JSON file', 'error');
      }
      setResolving(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-4xl font-bold text-gray-900 dark:text-white">
            <Settings className="h-8 w-8 text-brand-coral" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your app preferences, channels, playlists, and categories.
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Language & Direction</h2>
            <div className="flex items-center gap-4">
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL ? 'RTL' : 'LTR'} — {language === 'ar' ? 'Arabic' : 'English'}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Channels</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {channels.length} channel{channels.length !== 1 ? 's' : ''} in your feed. Export to back up your channels, or import from a previous export.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportChannels}
                className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                <Upload className="h-4 w-4" />
                Import
                <input type="file" accept=".json" className="hidden" onChange={importChannels} disabled={resolving} />
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Playlists</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {playlists.length} playlist{playlists.length !== 1 ? 's' : ''} saved. Export to back up your playlists, or import from a previous export.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportPlaylists}
                className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                <Upload className="h-4 w-4" />
                Import
                <input type="file" accept=".json" className="hidden" onChange={importPlaylists} disabled={resolving} />
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Categories</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {allCategories.length} categor{allCategories.length !== 1 ? 'ies' : 'y'} across your channels and playlists. Export to view or share your category structure.
            </p>
            {allCategories.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {allCategories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-brand-coral/10 px-2.5 py-0.5 text-xs font-medium text-brand-coral"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportCategories}
                className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                <Upload className="h-4 w-4" />
                Import
                <input type="file" accept=".json" className="hidden" onChange={importCategoriesFile} disabled={resolving} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function mergeChannels(existing: Channel[], incoming: Channel[]): Channel[] {
  const seen = new Set(existing.map((c) => c.id));
  const merged = [...existing];
  for (const ch of incoming) {
    if (!seen.has(ch.id)) {
      seen.add(ch.id);
      merged.push(ch);
    }
  }
  return merged;
}

function mergePlaylists(existing: Playlist[], incoming: Playlist[]): Playlist[] {
  const seenIds = new Set(existing.map((p) => p.id));
  const seenUrls = new Set(existing.filter((p) => p.url).map((p) => p.url));
  const merged = [...existing];
  for (const pl of incoming) {
    if (!seenIds.has(pl.id) && !(pl.url && seenUrls.has(pl.url))) {
      seenIds.add(pl.id);
      if (pl.url) seenUrls.add(pl.url);
      merged.push({ ...pl, timestamp: pl.timestamp || Date.now() });
    }
  }
  return merged;
}

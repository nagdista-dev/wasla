import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Download, Upload, Sun, Moon, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { exportAll, importAll, isClientSide } from '../services/indexedDbService';
import { loadSetting, saveSetting, deleteSetting, readStoredValue } from '../storage';
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

function getStartPagePath(page: string): string {
  const map: Record<string, string> = {
    home: '/',
    channels: '/channels',
    playlists: '/playlists',
    settings: '/settings',
  };
  return map[page] || '/';
}

export default function SettingsPage({ channels, playlists, onUpdate, onUpdatePlaylists }: SettingsPageProps) {
  const navigate = useNavigate();
  const { language, setLanguage, isRTL, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [resolving, setResolving] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [startPage, setStartPage] = useState<string>(() => {
    return readStoredValue<string>('wasla_start_page') || 'home';
  });

  useEffect(() => {
    loadSetting<string>('wasla_start_page').then((v) => { if (v) setStartPage(v); });
  }, []);

  const allCategories = useMemo(
    () => Array.from(new Set([
      ...channels.flatMap((c) => c.categories),
      ...playlists.flatMap((p) => p.categories),
    ])).sort((a, b) => a.localeCompare(b)),
    [channels, playlists],
  );

  const handleStartPageChange = (value: string) => {
    setStartPage(value);
    if (value === 'home') {
      deleteSetting('wasla_start_page');
    } else {
      saveSetting('wasla_start_page', getStartPagePath(value));
    }
  };

  const resetDefaults = () => {
    deleteSetting('wasla_start_page');
    deleteSetting('wasla_theme');
    deleteSetting('wasla_language');
    setStartPage('home');
    window.location.reload();
  };

  const handleResetClick = () => setShowResetConfirm(true);

  const exportSettings = async () => {
    const settings: Record<string, string | null> = {};
    const keys = ['wasla_language', 'wasla_theme', 'wasla_start_page'];
    for (const key of keys) {
      const val = await loadSetting<string>(key);
      settings[key] = val ?? localStorage.getItem(key);
    }
    downloadJson(settings, 'wasla_settings.json');
    showToast(t('settings.settingsExported'), 'success');
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || resolving) return;
    setResolving(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (typeof data !== 'object' || data === null) {
          showToast(t('settings.invalidSettingsFile'), 'error');
          return;
        }
        const keys = ['wasla_language', 'wasla_theme', 'wasla_start_page'];
        for (const key of keys) {
          if (data[key] !== undefined && data[key] !== null) {
            await saveSetting(key, data[key]);
          }
        }
        showToast(t('settings.settingsImported'), 'success');
        window.location.reload();
      } catch {
        showToast(t('settings.invalidSettingsFile'), 'error');
      }
      setResolving(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

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
          showToast(t('settings.mustBeArray'), 'error');
          return;
        }
        if (data.length === 0) {
          showToast(t('settings.fileEmpty'), 'error');
          return;
        }
        if (isChannelArray(data)) {
          const merged = mergeChannels(channels, data);
          onUpdate(merged);
          showToast(t('settings.importSuccess', { count: data.length, newCount: merged.length - channels.length, total: merged.length }), 'success');
        } else {
          showToast(t('settings.notChannelArray'), 'error');
        }
      } catch {
        showToast(t('settings.invalidJson'), 'error');
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
          showToast(t('settings.mustBeArray'), 'error');
          return;
        }
        if (data.length === 0) {
          showToast(t('settings.fileEmpty'), 'error');
          return;
        }
        if (isPlaylistArray(data)) {
          const merged = mergePlaylists(playlists, data);
          onUpdatePlaylists(merged);
          showToast(t('settings.importPlaylistSuccess', { count: data.length, newCount: merged.length - playlists.length, total: merged.length }), 'success');
        } else {
          showToast(t('settings.notPlaylistArray'), 'error');
        }
      } catch {
        showToast(t('settings.invalidJson'), 'error');
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
          showToast(t('settings.notStringArray'), 'error');
          return;
        }
        if (data.length === 0) {
          showToast(t('settings.fileEmpty'), 'error');
          return;
        }
        const merged = Array.from(new Set([...allCategories, ...data])).sort((a, b) => a.localeCompare(b));
        showToast(t('settings.importCategoriesSuccess', { total: merged.length, fileCount: data.length }), 'success');
      } catch {
        showToast(t('settings.invalidJson'), 'error');
      }
      setResolving(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const exportWatchHistory = async () => {
    if (!isClientSide()) {
      showToast(t('watchHistory.invalidFile'), 'error');
      return;
    }
    try {
      const data = await exportAll();
      const now = new Date().toISOString().slice(0, 10);
      downloadJson(data, `watch-history-${now}.json`);
      showToast(t('watchHistory.exportSuccess'), 'success');
    } catch {
      showToast(t('watchHistory.invalidFile'), 'error');
    }
  };

  const importWatchHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || resolving) return;
    if (!isClientSide()) return;
    setResolving(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          showToast(t('watchHistory.invalidFile'), 'error');
          return;
        }
        await importAll(data as Record<string, unknown[]>);
        showToast(t('watchHistory.importSuccess'), 'success');
      } catch {
        showToast(t('watchHistory.invalidFile'), 'error');
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
            {t('settings.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('settings.description')}
          </p>
        </div>

        <div className="space-y-6">

          {/* ===== Language ===== */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('settings.languageDirection')}</h2>
            <div className="flex items-center gap-4">
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
              >
                <option value="en">{t('settings.english')}</option>
                <option value="ar">{t('settings.arabic')}</option>
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.languageLabel', { direction: isRTL ? t('settings.rtl') : t('settings.ltr'), language: language === 'ar' ? t('settings.arabic') : t('settings.english') })}
              </span>
            </div>
          </div>

          {/* ===== Appearance ===== */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('settings.appearance')}</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('settings.theme')}</span>
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  theme === 'dark'
                    ? 'bg-gray-900 text-white ring-1 ring-gray-700'
                    : 'bg-white text-gray-700 ring-1 ring-gray-300'
                }`}
              >
                {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {t('settings.toggleHint')}
              </span>
            </div>
          </div>

          {/* ===== Startup Behavior ===== */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('settings.startupBehavior')}</h2>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {t('settings.startPageDesc')}
            </p>
            <select
              value={startPage}
              onChange={(e) => handleStartPageChange(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-300"
            >
              <option value="home">{t('nav.home')}</option>
              <option value="channels">{t('nav.channels')}</option>
              <option value="playlists">{t('nav.playlists')}</option>
              <option value="settings">{t('nav.settings')}</option>
            </select>
          </div>

          {/* ===== Advanced ===== */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('settings.advanced')}</h2>
            <div className="space-y-4">

              {/* Channels */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.channels')}</h3>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {channels.length === 1 ? t('settings.channelsDesc', { count: 1 }) : t('settings.channelsDescPlural', { count: channels.length })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportChannels} className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink">
                    <Download className="h-4 w-4" />
                    {t('settings.export')}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    {t('settings.import')}
                    <input type="file" accept=".json" className="hidden" onChange={importChannels} disabled={resolving} />
                  </label>
                </div>
              </div>

              {/* Playlists */}
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.playlists')}</h3>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {playlists.length === 1 ? t('settings.playlistsDesc', { count: 1 }) : t('settings.playlistsDescPlural', { count: playlists.length })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportPlaylists} className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink">
                    <Download className="h-4 w-4" />
                    {t('settings.export')}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    {t('settings.import')}
                    <input type="file" accept=".json" className="hidden" onChange={importPlaylists} disabled={resolving} />
                  </label>
                </div>
              </div>

              {/* Categories */}
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.categories')}</h3>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {allCategories.length === 1 ? t('settings.categoriesDesc', { count: 1 }) : t('settings.categoriesDescPlural', { count: allCategories.length })}
                </p>
                {allCategories.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {allCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => navigate(`/category/${encodeURIComponent(cat)}`)}
                        className="rounded-full bg-brand-coral/10 px-2.5 py-0.5 text-xs font-medium text-brand-coral cursor-pointer hover:bg-brand-coral/20 transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportCategories} className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink">
                    <Download className="h-4 w-4" />
                    {t('settings.export')}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    {t('settings.import')}
                    <input type="file" accept=".json" className="hidden" onChange={importCategoriesFile} disabled={resolving} />
                  </label>
                </div>
              </div>

              {/* Watch History Export/Import */}
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('watchHistory.exportTitle')}</h3>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('watchHistory.exportDesc')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportWatchHistory} className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink">
                    <Download className="h-4 w-4" />
                    {t('watchHistory.export')}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    {t('watchHistory.import')}
                    <input type="file" accept=".json" className="hidden" onChange={importWatchHistory} disabled={resolving} />
                  </label>
                </div>
              </div>

              {/* Settings Export/Import */}
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.appPreferences')}</h3>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.appPreferencesDesc')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportSettings} className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink">
                    <Download className="h-4 w-4" />
                    {t('settings.export')}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50 dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    {t('settings.import')}
                    <input type="file" accept=".json" className="hidden" onChange={importSettings} disabled={resolving} />
                  </label>
                </div>
              </div>

              {/* Reset */}
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                <button
                  onClick={handleResetClick}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/20 dark:text-red-400"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('settings.resetDefaults')}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={resetDefaults}
        title={t('settings.confirmResetTitle')}
        description={t('settings.confirmResetDesc')}
        confirmLabel={t('settings.resetDefaults')}
      />
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

import { useState, useMemo, useEffect } from 'react';
import { Heart, Search, X, Plus } from 'lucide-react';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import PlaylistCard from '../components/PlaylistCard';
import EditPlaylistModal from '../components/EditPlaylistModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import AddPlaylistModal from '../components/AddPlaylistModal';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { useDebounce } from '../hooks/useDebounce';
import { saveSetting, loadSetting } from '../storage';
import type { Playlist } from '../types';

interface PlaylistsPageProps {
  playlists: Playlist[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, description: string | undefined, categories: string[]) => void;
  onAdd: (playlist: Playlist) => void;
}

function syncLoadPref<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function PlaylistsPage({ playlists, onDelete, onUpdate, onAdd }: PlaylistsPageProps) {
  const { t } = useLanguage();
  useMeta({ title: t('playlists.title'), description: `${playlists.length} playlist${playlists.length !== 1 ? 's' : ''} saved.` });
  const [searchText, setSearchText] = useState(syncLoadPref<string>('wasla_playlists_search', ''));
  const debouncedSearch = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>(syncLoadPref<string>('wasla_playlists_category', ''));
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadSetting<string>('wasla_playlists_search').then((v) => { if (v) setSearchText(v); });
    loadSetting<string>('wasla_playlists_category').then((v) => { if (v) setSelectedCategory(v); });
  }, []);

  useEffect(() => { saveSetting('wasla_playlists_search', searchText); }, [searchText]);
  useEffect(() => { saveSetting('wasla_playlists_category', selectedCategory); }, [selectedCategory]);

  const allCategories = Array.from(new Set(playlists.flatMap((p) => p.categories))).sort((a, b) => a.localeCompare(b));

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return playlists.filter((pl) => {
      if (selectedCategory && !pl.categories.includes(selectedCategory)) return false;
      if (q && !pl.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [playlists, debouncedSearch, selectedCategory]);

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-6">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-4xl font-bold text-gray-900 dark:text-white">
            <Heart className="h-8 w-8 text-brand-coral" />
            {t('playlists.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('playlists.count', { count: filtered.length, total: playlists.length })}
            {(searchText || selectedCategory) && ` ${t('playlists.filtered')}`}
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('playlists.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-500"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {allCategories.length > 0 && (
              <CustomFilterDropdown
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: '', label: t('playlists.allCategories') },
                  ...allCategories.map((cat) => ({ value: cat, label: cat })),
                ]}
                className="min-w-[160px]"
                placeholder={t('playlists.category')}
              />
            )}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-pink transition-colors shadow-sm sticky top-0 z-10"
            >
              <Plus className="h-4 w-4" />
              <span>{t('playlists.add')}</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {playlists.length === 0 ? t('playlists.noPlaylistsYet') : t('playlists.noMatch')}
            </p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {playlists.length === 0 ? t('playlists.addPlaylistHint') : t('playlists.tryDifferentSearch')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pl) => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                onEdit={setEditingPlaylist}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {editingPlaylist && (
        <EditPlaylistModal
          playlist={editingPlaylist}
          onClose={() => setEditingPlaylist(null)}
          onUpdate={(name, description, categories) => {
            onUpdate(editingPlaylist.id, name, description, categories);
            setEditingPlaylist(null);
          }}
          existingCategories={allCategories}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
          title={t('playlists.deleteTitle')}
          description={t('playlists.deleteDescription', { name: deleteTarget.name })}
        />
      )}
      {showAddModal && (
        <AddPlaylistModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newPlaylist) => {
            onAdd({...newPlaylist, timestamp: Date.now()} as Playlist);
            setShowAddModal(false);
          }}
          existingCategories={allCategories}
        />
      )}
    </div>
  );
}
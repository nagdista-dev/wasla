import { useState, useMemo, useEffect } from 'react';
import { Search, Heart, Edit3, Trash2, X, ExternalLink, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import EditChannelModal from '../components/EditChannelModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { useDebounce } from '../hooks/useDebounce';
import { saveSetting, loadSetting } from '../storage';
import type { Channel } from '../types';

interface ChannelsPageProps {
  channels: Channel[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, categories: string[]) => void;
  onToggleFavorite: (id: string) => void;
}

function getLetter(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return /[A-Za-z]/.test(first) ? first : '#';
}

function syncLoadPref<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function ChannelsPage({ channels, onDelete, onUpdate, onToggleFavorite }: ChannelsPageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  useMeta({ title: t('channels.title'), description: `${channels.length} channel${channels.length !== 1 ? 's' : ''} in your collection.` });
  const [searchText, setSearchText] = useState(syncLoadPref<string>('wasla_channels_search', ''));
  const debouncedSearch = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>(syncLoadPref<string>('wasla_channels_category', ''));
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; channelId: string | null; channelName: string }>({
    isOpen: false,
    channelId: null,
    channelName: '',
  });

  useEffect(() => {
    loadSetting<string>('wasla_channels_category').then((v) => { if (v) setSelectedCategory(v); });
    loadSetting<string>('wasla_channels_search').then((v) => { if (v) setSearchText(v); });
  }, []);

  useEffect(() => { saveSetting('wasla_channels_category', selectedCategory); }, [selectedCategory]);
  useEffect(() => { saveSetting('wasla_channels_search', searchText); }, [searchText]);

  const allCategories = Array.from(new Set(channels.flatMap((c) => c.categories))).sort((a, b) => a.localeCompare(b));

  /** Detect if user typed something that matches a category — used for the hint pill */
  const matchedCategory = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return null;
    return allCategories.find((cat) => cat.toLowerCase().includes(q)) ?? null;
  }, [debouncedSearch, allCategories]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return channels.filter((ch) => {
      if (selectedCategory === '__uncategorized__') {
        if (ch.categories.length > 0) return false;
      } else if (selectedCategory) {
        if (!ch.categories.includes(selectedCategory)) return false;
      }
      if (q) {
        const name = ch.name.toLowerCase();
        const handle = ch.handle?.toLowerCase() || '';
        // Also match by category name so typing a category reveals related channels
        const cats = ch.categories.map((c) => c.toLowerCase());
        if (!name.includes(q) && !handle.includes(q) && !cats.some((c) => c.includes(q))) return false;
      }
      return true;
    });
  }, [channels, debouncedSearch, selectedCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, Channel[]>();
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    for (const ch of sorted) {
      const letter = getLetter(ch.name);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(ch);
    }
    return map;
  }, [filtered]);

  const letters = Array.from(grouped.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setShowEditModal(true);
  };

  const handleUpdate = (name: string, categories: string[]) => {
    if (editingChannel) {
      onUpdate(editingChannel.id, name, categories);
      setShowEditModal(false);
      setEditingChannel(null);
    }
  };

  const handleDeleteClick = (channel: Channel) => {
    setDeleteConfirmModal({
      isOpen: true,
      channelId: channel.id,
      channelName: channel.name,
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmModal.channelId) {
      onDelete(deleteConfirmModal.channelId);
      setDeleteConfirmModal({ isOpen: false, channelId: null, channelName: '' });
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModal({ isOpen: false, channelId: null, channelName: '' });
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6">

        {/* ── Header ── */}
        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
            {t('channels.title')}
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t('channels.count', { count: filtered.length, total: channels.length })}
            {(searchText || selectedCategory) && ` ${t('channels.filtered')}`}
          </p>
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('channels.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-500"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category dropdown */}
          <CustomFilterDropdown
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { value: '', label: t('channels.allCategories') },
              { value: '__uncategorized__', label: t('channels.uncategorized') },
              ...allCategories.map((cat) => ({ value: cat, label: cat })),
            ]}
            className="min-w-[160px] sm:min-w-[180px]"
            placeholder={t('channels.category')}
          />
        </div>

        {/* ── Category-search hint pill ── */}
        {matchedCategory && !selectedCategory && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('channels.categoryHint') ?? 'Showing channels in category:'}
            </span>
            <button
              onClick={() => { setSelectedCategory(matchedCategory); setSearchText(''); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-coral/10 px-3 py-1 text-xs font-semibold text-brand-coral hover:bg-brand-coral/20 transition-colors"
            >
              <Tag className="h-3 w-3" />
              {matchedCategory}
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 sm:p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {channels.length === 0 ? t('channels.noChannelsYet') : t('channels.noMatch')}
            </p>
            <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {channels.length === 0 ? t('channels.addChannelHint') : t('channels.tryDifferentSearch')}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {letters.map((letter) => (
              <section key={letter}>
                {/* Alphabet divider */}
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-coral text-sm font-bold text-white flex-shrink-0">
                    {letter}
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* ── Responsive grid ──
                    mobile  : 1 col
                    sm/md   : 2 cols
                    lg      : 3 cols
                    xl      : 4 cols
                    2xl     : 5 cols
                */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {grouped.get(letter)!.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex flex-col rounded-xl bg-white p-3 sm:p-4 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-dark-navy dark:ring-gray-700"
                    >
                      {/* Channel header row */}
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-pink to-brand-yellow text-sm font-bold text-white">
                          {channel.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Name + handle */}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                            {channel.name}
                          </h3>
                          {channel.handle && (
                            <p className="truncate text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              @{channel.handle}
                            </p>
                          )}
                        </div>

                        {/* Favorite toggle */}
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(channel.id)}
                          className="rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 transition hover:bg-gray-100 dark:hover:bg-white/10 flex-shrink-0"
                          aria-label={channel.favorite ? t('channels.removeFromFavorites') : t('channels.addToFavorites')}
                        >
                          <Heart
                            className={`h-5 w-5 transition-colors ${channel.favorite ? 'fill-red-500 text-red-500' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Category pills — clickable to filter by that category */}
                      {channel.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {channel.categories.map((cat) => (
                            <button
                              key={cat}
                              onClick={(e) => { e.stopPropagation(); navigate(`/category/${encodeURIComponent(cat)}`); }}
                              className="rounded-full bg-brand-coral/10 px-2.5 py-0.5 text-xs font-medium text-brand-coral cursor-pointer hover:bg-brand-coral/20 transition-colors"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/50">
                        {/* On mobile: icon-only buttons to save space; on sm+: show labels */}
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/channel/${channel.id}`)}
                            className="flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-brand-coral bg-brand-coral/10 hover:bg-brand-coral/20 transition"
                            aria-label={t('channels.openChannel')}
                          >
                            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="hidden sm:inline truncate">{t('channels.openChannel')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(channel)}
                            className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                            aria-label={t('channels.edit')}
                          >
                            <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">{t('channels.edit')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(channel)}
                            className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
                            aria-label={t('channels.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">{t('channels.delete')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showEditModal && editingChannel && (
        <EditChannelModal
          channel={editingChannel}
          onClose={() => {
            setShowEditModal(false);
            setEditingChannel(null);
          }}
          onUpdate={handleUpdate}
          existingCategories={Array.from(new Set(channels.flatMap(c => c.categories)))}
        />
      )}
      {deleteConfirmModal.isOpen && (
        <ConfirmDeleteModal
          isOpen={deleteConfirmModal.isOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title={t('channels.deleteTitle')}
          description={t('channels.deleteDescription', { name: deleteConfirmModal.channelName })}
        />
      )}
    </div>
  );
}

import { memo, useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from './Toast';

interface PlaylistEntry {
  id: string;
  name: string;
  url?: string;
  thumbnail?: string;
  channelName?: string;
  description?: string;
  categories: string[];
  timestamp?: number;
}

interface AddPlaylistModalProps {
  onClose: () => void;
  onAdd: (pl: PlaylistEntry) => void;
  existingCategories?: string[];
}

function extractPlaylistId(value: string): string | null {
  const trimmed = value.trim();

  const listMatch = trimmed.match(/[&?]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return listMatch[1];

  const plainMatch = trimmed.match(/^([a-zA-Z0-9_-]{13,42})$/);
  if (plainMatch) return plainMatch[1];

  return null;
}

interface PlaylistMetadata {
  title: string | null;
  thumbnail: string | null;
  authorName: string | null;
}

async function fetchPlaylistMetadata(playlistId: string): Promise<PlaylistMetadata> {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${playlistId}&format=json`,
    );
    if (!resp.ok) return { title: null, thumbnail: null, authorName: null };
    const data = await resp.json();
    return {
      title: data.title || null,
      thumbnail: data.thumbnail_url || null,
      authorName: data.author_name || null,
    };
  } catch {
    return { title: null, thumbnail: null, authorName: null };
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const AddPlaylistModal = memo(function AddPlaylistModal({ onClose, onAdd, existingCategories = [] }: AddPlaylistModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [input, setInput] = useState('');
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string | null>(null);
  const prevIdRef = useRef<string | null>(null);

  const debouncedInput = useDebounce(input, 600);

  useEffect(() => {
    const id = extractPlaylistId(debouncedInput);
    if (!id || id === prevIdRef.current) return;

    prevIdRef.current = id;
    setResolvedId(id);
    setIsResolving(true);

    fetchPlaylistMetadata(id).then((meta) => {
      if (meta.title) setCustomName(meta.title);
      setThumbnail(meta.thumbnail);
      setChannelName(meta.authorName);
      setIsResolving(false);
    });
  }, [debouncedInput]);

  const handleAdd = () => {
    const id = extractPlaylistId(input);
    if (!id) {
      showToast(t('addPlaylist.enterValid'), 'error');
      return;
    }

    const entry: PlaylistEntry = {
      id,
      name: customName || id,
      url: input.includes('youtube.com') || input.includes('youtu.be') ? input : `https://www.youtube.com/playlist?list=${id}`,
      thumbnail: thumbnail || undefined,
      channelName: channelName || undefined,
      description: description.trim() || undefined,
      categories: categoryInput ? categoryInput.split(',').map((c) => c.trim()).filter(Boolean) : [],
    };

    onAdd(entry);
    showToast(t('addPlaylist.added', { name: entry.name }), 'success');
    setInput('');
    setCustomName('');
    setDescription('');
    setCategoryInput('');
    setResolvedId(null);
    setThumbnail(null);
    setChannelName(null);
    prevIdRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 rtl:left-3 ltr:right-3 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-4 text-xl font-semibold dark:text-white">{t('addPlaylist.title')}</h2>
        <div className="mb-2 relative">
          <input
            placeholder={t('addPlaylist.inputPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400"
          />
          {isResolving && (
            <Loader2 className="absolute top-1/2 -translate-y-1/2 ltr:right-3 rtl:left-3 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        <input
          placeholder={t('addPlaylist.namePlaceholder')}
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="mb-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400"
        />
        <textarea
          placeholder={t('addPlaylist.descPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400 resize-none"
        />
        {resolvedId && (
          <p className="mb-2 text-xs text-green-600">{t('addPlaylist.detected', { id: resolvedId })}</p>
        )}
        <input
          placeholder={t('addPlaylist.categoriesPlaceholder')}
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && categoryInput.trim()) {
              e.preventDefault();
              setCategoryInput((prev) => prev + (prev ? ', ' : '') + categoryInput.trim());
            }
          }}
          className="mb-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400"
        />
        {existingCategories.length > 0 && (
          <div className="mb-2">
            <div className="modal-scroll flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {existingCategories.map((cat) => {
                const active = categoryInput.split(',').map((c) => c.trim()).includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const current = categoryInput ? categoryInput.split(',').map((c) => c.trim()).filter(Boolean) : [];
                      if (current.includes(cat)) {
                        setCategoryInput(current.filter((c) => c !== cat).join(', '));
                      } else {
                        setCategoryInput([...current, cat].join(', '));
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                      active
                        ? 'bg-brand-coral text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
                    }`}
                  >
                    {active ? null : <span className="text-base leading-none">+</span>}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!input.trim()}
          className="mt-4 w-full rounded bg-brand-coral py-2 text-white hover:bg-brand-pink disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          {t('addPlaylist.addButton')}
        </button>
      </div>
    </div>
  );
});

export default AddPlaylistModal;
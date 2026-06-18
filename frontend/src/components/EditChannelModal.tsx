import { memo, useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { X, Loader2, RefreshCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from './Toast';
import { saveSetting, loadSetting } from '../storage';
import type { Channel } from '../types';

type UpdateChannelResponse = {
  success: boolean;
  data?: {
    channelName: string;
    videos: Array<Record<string, unknown>>;
    latestVideo: Record<string, unknown>;
    cached?: boolean;
  };
  error?: string;
};

type ResolveResponse = {
  success: boolean;
  channelId?: string;
  error?: string;
};

const extractHandle = (value: string): string | null => {
  const trimmed = value.trim();
  
  const ucMatch = trimmed.match(/UC[\w-]{22,}/);
  if (ucMatch) return ucMatch[0];

  const handleMatch = trimmed.match(/^@([\w.-]+)$/);
  if (handleMatch) return handleMatch[1];

  const urlMatch = trimmed.match(/(?:youtube\.com\/)(?:@|channel\/|user\/|c\/)([^/?]+)/);
  if (urlMatch) return urlMatch[1];

  const plainHandleMatch = trimmed.match(/^[a-zA-Z0-9._-]+$/);
  if (plainHandleMatch && trimmed.length > 0) return trimmed;

  return null;
};

const EditChannelModal = memo(function EditChannelModal({ channel, onClose, onUpdate, existingCategories = [] }: {
  channel: Channel;
  onClose: () => void;
  onUpdate: (name: string, categories: string[]) => void;
  existingCategories?: string[];
}) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [name, setName] = useState(channel.name);
  const [categories, setCategories] = useState<string[]>(channel.categories);
  const [categoryInput, setCategoryInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedId, setResolvedId] = useState<string | null>(channel.handle || null);
  const [prevCategories, setPrevCategories] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('wasla_prev_categories');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    loadSetting<string[]>('wasla_prev_categories').then((v) => { if (v && v.length > 0) setPrevCategories(v); });
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const identifier = extractHandle(resolvedId || '');
      if (!identifier) {
        setName(channel.name);
        return;
      }

      setIsResolving(true);
      
      try {
        const resp = await api.get<ResolveResponse>(`/resolve/${encodeURIComponent(identifier)}`);
        if (resp.data.success && resp.data.channelId) {
          setResolvedId(resp.data.channelId);
          
          const nameResp = await api.get<UpdateChannelResponse>(`/channel/${resp.data.channelId}`);
          if (nameResp.data.success) {
            setName(nameResp.data.data?.channelName || channel.name);
          }
        } else {
          setResolvedId(null);
        }
      } catch (error) {
        showToast(t('editChannel.failedUpdate'), 'error');
        setResolvedId(null);
      } finally {
        setIsResolving(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [resolvedId, channel.name, t]);

  const handleAddCategory = () => {
    if (categoryInput.trim()) {
      const newCat = categoryInput.trim();
      const updatedCats = Array.from(new Set([...categories, newCat]));
      setCategories(updatedCats);
      const updatedPrev = Array.from(new Set([...prevCategories, newCat]));
      setPrevCategories(updatedPrev);
      saveSetting('wasla_prev_categories', updatedPrev);
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    const updated = categories.filter((cat) => cat !== categoryToRemove);
    setCategories(updated);
  };

  const refreshName = async () => {
    if (!resolvedId) return;

    setIsResolving(true);
    
    try {
      const resp = await api.get<ResolveResponse>(`/resolve/${encodeURIComponent(resolvedId)}`);
      if (resp.data.success && resp.data.channelId) {
        setResolvedId(resp.data.channelId);
        
        const nameResp = await api.get<UpdateChannelResponse>(`/channel/${resp.data.channelId}`);
        if (nameResp.data.success) {
          setName(nameResp.data.data?.channelName || channel.name);
        }
      }
    } catch (error) {
      showToast(t('editChannel.connectionError'), 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      return;
    }

    setIsUpdating(true);

    try {
      const response = await api.patch<UpdateChannelResponse>(`/channel/${channel.id}`, {
        name: name.trim(),
        categories,
      });

      if (response.data.success) {
        onUpdate(name.trim(), categories);
      } else {
        showToast(response.data.error || 'Failed to update channel.', 'error');
      }
    } catch (error) {
      showToast('Error updating channel. Check your connection.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <button type="button" onClick={onClose} className="absolute top-3 rtl:left-3 ltr:right-3 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-4 text-xl font-semibold dark:text-white">{t('editChannel.title')}</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">{t('editChannel.nameLabel')}</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
              placeholder={t('editChannel.nameLabel')}
              maxLength={100}
            />
            <button
              type="button"
              onClick={refreshName}
              disabled={isResolving}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              title={t('editChannel.refreshName')}
            >
              {isResolving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCcw className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('editChannel.maxChars')}</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">{t('editChannel.categoriesLabel')}</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
              placeholder={t('editChannel.addCategoryPlaceholder')}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex-shrink-0 rounded-md bg-brand-coral px-4 py-2 text-sm font-medium text-white hover:bg-brand-pink"
            >
              {t('editChannel.addButton')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <span
                key={category}
                className="flex items-center gap-1 rounded-full bg-brand-coral/10 px-3 py-1 text-sm font-medium text-brand-coral"
              >
                {category}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(category)}
                  className="text-brand-coral hover:text-brand-pink"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {existingCategories.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">{t('editChannel.allCategories')}</p>
              <div className="modal-scroll flex flex-wrap gap-1 max-h-28 min-w-0">
                {existingCategories.map((cat) => {
                  const active = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setCategories(categories.filter(c => c !== cat));
                        } else {
                          setCategories([...categories, cat]);
                        }
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? 'bg-brand-coral text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating || !name.trim()}
          className="w-full rounded-md bg-brand-coral px-4 py-2 font-medium text-white transition hover:bg-brand-pink disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700"
        >
          {isUpdating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('editChannel.updating')}
            </span>
          ) : (
            t('editChannel.updateButton')
          )}
        </button>
      </div>
    </div>
  );
});

export default EditChannelModal;

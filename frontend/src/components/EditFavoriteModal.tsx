import { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { FavoriteVideo } from '../types';

interface EditFavoriteModalProps {
  video: FavoriteVideo;
  onClose: () => void;
  onUpdate: (id: string, title: string, category?: string) => void;
  existingCategories?: string[];
}

export default function EditFavoriteModal({ video, onClose, onUpdate, existingCategories = [] }: EditFavoriteModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(video.title);
  const [category, setCategory] = useState(video.category || '');
  const [showExisting, setShowExisting] = useState(false);

  const handleUpdate = () => {
    if (!title.trim()) return;
    onUpdate(video.id, title.trim(), category.trim() || undefined);
    onClose();
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
        <h2 className="mb-4 text-xl font-semibold dark:text-white">{t('favorites.editTitle')}</h2>

        {video.thumbnail && (
          <div className="mb-4 overflow-hidden rounded-lg aspect-video">
            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('favorites.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
            placeholder={t('favorites.titleLabel')}
            maxLength={200}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('favorites.categoryLabel')}</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
            placeholder={t('favorites.categoryPlaceholder')}
            maxLength={100}
          />
        </div>

        {existingCategories.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowExisting(!showExisting)}
              className="text-sm font-medium text-brand-coral hover:underline"
            >
              {showExisting ? t('favorites.hideCategories') : t('favorites.showCategories')}
            </button>
            {showExisting && (
              <div className="modal-scroll mt-2 flex max-h-28 flex-wrap gap-1">
                {existingCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      category === cat
                        ? 'bg-brand-coral text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
          >
            {t('confirmAction.cancel')}
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={!title.trim()}
            className="flex-1 rounded-md bg-brand-coral px-4 py-2 font-medium text-white transition hover:bg-brand-pink disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            {t('favorites.saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Link2,
  Tag,
  Type,
  ChevronDown,
  PlayCircle,
  Check,
  Plus,
  ListVideo,
  User,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from './Toast';
import type { SharedYouTubeLink, SharedLinkType } from '../hooks/useShareReceiver';

interface YouTubeShareModalProps {
  sharedLink: SharedYouTubeLink;
  existingCategories: string[];
  onSave: (data: {
    rawUrl: string;
    type: SharedLinkType;
    extractedId: string | null;
    title: string;
    categories: string[];
  }) => void;
  onClose: () => void;
}

const YouTubeShareModal = memo(function YouTubeShareModal({
  sharedLink,
  existingCategories,
  onSave,
  onClose,
}: YouTubeShareModalProps) {
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [title, setTitle] = useState(sharedLink.sharedTitle || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-focus the title field on open
  useEffect(() => {
    const timer = setTimeout(() => titleRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const addCustomCategory = useCallback(() => {
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    setSelectedCategories((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed],
    );
    setCustomCategory('');
  }, [customCategory]);

  const handleSave = useCallback(() => {
    onSave({
      rawUrl: sharedLink.rawUrl,
      type: sharedLink.type,
      extractedId: sharedLink.extractedId,
      title: title.trim() || sharedLink.rawUrl,
      categories: selectedCategories,
    });
    setSaved(true);
    
    // Choose appropriate success message based on type
    const savedMessage = 
      sharedLink.type === 'channel' ? t('shareModal.savedChannel') :
      sharedLink.type === 'playlist' ? t('shareModal.savedPlaylist') :
      t('shareModal.saved');
      
    showToast(savedMessage, 'success');
    setTimeout(onClose, 800);
  }, [onSave, sharedLink, title, selectedCategories, onClose, showToast, t]);

  // Determine Thumbnail and Icons based on type
  let thumbnailSrc = null;
  let Icon = PlayCircle;
  let typeLabel = t('shareModal.videoIdDetected');
  let noIdLabel = t('shareModal.noVideoId');
  let titleLabel = t('shareModal.titleLabel');
  let saveButtonText = t('shareModal.saveButton');

  if (sharedLink.type === 'video') {
    thumbnailSrc = sharedLink.extractedId ? `https://i.ytimg.com/vi/${sharedLink.extractedId}/mqdefault.jpg` : null;
  } else if (sharedLink.type === 'playlist') {
    Icon = ListVideo;
    typeLabel = t('shareModal.playlistIdDetected');
    noIdLabel = t('shareModal.noPlaylistId');
    titleLabel = t('shareModal.playlistTitleLabel');
    saveButtonText = t('shareModal.savePlaylistButton');
  } else if (sharedLink.type === 'channel') {
    Icon = User;
    typeLabel = t('shareModal.channelIdDetected');
    noIdLabel = t('shareModal.noChannelId');
    titleLabel = t('shareModal.channelTitleLabel');
    saveButtonText = t('shareModal.saveChannelButton');
  }

  const allDisplayCategories = Array.from(
    new Set([...existingCategories, ...selectedCategories]),
  ).sort((a, b) => a.localeCompare(b));

  const modal = (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="yt-share-modal-title"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl
          dark:bg-[#0e1a30] dark:ring-1 dark:ring-white/10
          flex flex-col max-h-[92dvh] sm:max-h-[85dvh]
          animate-slide-up`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF0000]/10">
              <Icon className="h-5 w-5 text-[#FF0000]" />
            </span>
            <h2
              id="yt-share-modal-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              {t('shareModal.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100/70 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300 transition-all"
            aria-label={t('nav.closeMenu')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto modal-scroll px-5 pb-5 space-y-4">

          {/* Thumbnail + URL info card */}
          <div className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt=""
                className="h-16 w-28 flex-shrink-0 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-16 w-28 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-white/10">
                <Icon className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex min-w-0 flex-col justify-center gap-1">
              {/* ID badge */}
              {sharedLink.extractedId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit">
                  <Check className="h-2.5 w-2.5" />
                  {typeLabel}: {sharedLink.extractedId}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 w-fit">
                  {noIdLabel}
                </span>
              )}

              {/* Raw URL */}
              <div className="flex items-center gap-1 min-w-0">
                <Link2 className="h-3 w-3 flex-shrink-0 text-gray-400" />
                <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                  {sharedLink.rawUrl}
                </p>
              </div>
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Type className="h-3.5 w-3.5" />
              {titleLabel}
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('shareModal.titlePlaceholder')}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400
                focus:border-brand-coral focus:outline-none focus:ring-2 focus:ring-brand-coral/20
                dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:placeholder-gray-500
                dark:focus:border-brand-coral dark:focus:ring-brand-coral/20 transition"
              maxLength={200}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              {t('shareModal.titleHint')}
            </p>
          </div>

          {/* Category selector */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Tag className="h-3.5 w-3.5" />
              {t('shareModal.categoryLabel')}
            </label>

            {/* Selected chips */}
            {selectedCategories.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-coral/10 px-2.5 py-1 text-xs font-medium text-brand-coral"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="ml-0.5 hover:text-brand-pink transition-colors"
                      aria-label={`Remove ${cat}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dropdown trigger */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setCatDropdownOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm
                  text-gray-500 hover:border-brand-coral/50 hover:bg-gray-50
                  dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 transition"
              >
                <span>
                  {selectedCategories.length > 0
                    ? t('shareModal.categoriesSelected', { count: String(selectedCategories.length) })
                    : t('shareModal.categoryPlaceholder')}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${catDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {catDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1.5 rounded-xl border border-gray-100 bg-white shadow-xl dark:border-white/10 dark:bg-[#0e1a30]">
                  {/* Custom category input */}
                  <div className="border-b border-gray-100 p-2 dark:border-white/10">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); }
                        }}
                        placeholder={t('shareModal.newCategoryPlaceholder')}
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400
                          focus:border-brand-coral focus:outline-none
                          dark:border-white/10 dark:bg-white/10 dark:text-gray-100 dark:placeholder-gray-500"
                      />
                      <button
                        type="button"
                        onClick={addCustomCategory}
                        disabled={!customCategory.trim()}
                        className="rounded-lg bg-brand-coral px-2.5 py-1.5 text-white transition hover:bg-brand-pink disabled:opacity-40"
                        aria-label={t('shareModal.addCategory')}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Existing categories list */}
                  <div className="max-h-48 overflow-y-auto modal-scroll py-1">
                    {allDisplayCategories.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500">
                        {t('shareModal.noCategories')}
                      </p>
                    ) : (
                      allDisplayCategories.map((cat) => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors
                              ${isSelected
                                ? 'bg-brand-coral/10 text-brand-coral'
                                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5'
                              }`}
                          >
                            <span>{cat}</span>
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="flex gap-3 border-t border-gray-100 px-5 py-4 flex-shrink-0 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-medium
              text-gray-600 transition hover:bg-gray-50
              dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {t('confirmAction.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="flex-1 rounded-xl bg-brand-coral px-4 py-2.5 text-sm font-semibold text-white
              shadow-sm transition hover:bg-brand-pink active:scale-95
              disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saved ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check className="h-4 w-4" />
                {t('shareModal.savedLabel')}
              </span>
            ) : (
              saveButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
});

export default YouTubeShareModal;


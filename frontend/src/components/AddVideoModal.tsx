import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { extractVideoId } from '../utils/videoUtils';

interface AddVideoModalProps {
  onClose: () => void;
  onAdd: (videoUrl: string, title: string, thumbnail?: string) => void;
}

type OembedResponse = {
  title: string;
  thumbnail_url?: string;
  author_name?: string;
};

async function fetchVideoMetadata(videoId: string): Promise<OembedResponse | null> {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export default function AddVideoModal({ onClose, onAdd }: AddVideoModalProps) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const prevInputRef = useRef('');

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || trimmed === prevInputRef.current) return;
    prevInputRef.current = trimmed;

    const id = extractVideoId(trimmed);
    if (!id) {
      setResolvedId(null);
      setTitle('');
      setThumbnail('');
      return;
    }

    setResolvedId(id);
    setIsResolving(true);

    fetchVideoMetadata(id).then((meta) => {
      if (meta) {
        setTitle(meta.title);
        setThumbnail(meta.thumbnail_url || '');
      }
      setIsResolving(false);
    });
  }, [url]);

  const handleAdd = () => {
    if (!resolvedId) return;
    const videoUrl = `https://www.youtube.com/watch?v=${resolvedId}`;
    onAdd(videoUrl, title || t('general.untitled'), thumbnail || undefined);
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
        <h2 className="mb-4 text-xl font-semibold dark:text-white">{t('courses.addVideoTitle')}</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('courses.videoUrlLabel')}</label>
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
              placeholder={t('courses.videoUrlPlaceholder')}
              autoFocus
            />
            {isResolving && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('courses.videoUrlHint')}</p>
        </div>

        {resolvedId && (
          <>
            {thumbnail && (
              <div className="mb-4 overflow-hidden rounded-lg aspect-video">
                <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('courses.videoTitleLabel')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
                placeholder={t('courses.videoTitleLabel')}
                maxLength={200}
              />
            </div>
          </>
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
            onClick={handleAdd}
            disabled={!resolvedId}
            className="flex-1 rounded-md bg-brand-coral px-4 py-2 font-medium text-white transition hover:bg-brand-pink disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            {t('courses.addVideoButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Heart, Play, Trash2, Edit3, Clock, HeartOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { usePlayer } from '../context/PlayerContext';
import { useFavorites } from '../context/FavoritesContext';
import { useMeta } from '../hooks/useMeta';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';
import EditFavoriteModal from '../components/EditFavoriteModal';
import { useToast } from '../components/Toast';
import { extractVideoId } from '../utils/videoUtils';
import type { LatestVideo } from '../types';

export default function FavoritesPage() {
  const { t } = useLanguage();
  const { play } = usePlayer();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { favorites, removeFavorite, updateFavorite } = useFavorites();
  const [editing, setEditing] = useState<string | null>(null);

  useMeta({ title: t('favorites.title') });

  const editingVideo = editing ? favorites.find((f) => f.id === editing) : null;

  const handlePlay = (fav: typeof favorites[number]) => {
    const video: LatestVideo = {
      title: fav.title,
      link: fav.videoUrl,
      thumbnail: fav.thumbnail,
      publishedDate: new Date(fav.savedAt).toISOString(),
      channelName: fav.channelName || '',
    };
    play(video);
    const vidId = extractVideoId(video.link);
    if (vidId) {
      navigate(`/video/${vidId}`, { state: { video } });
    }
  };

  const handleRemove = (id: string) => {
    removeFavorite(id);
    showToast(t('favorites.removed'), 'info');
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <Heart className="h-6 w-6 fill-current" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('favorites.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {favorites.length} {favorites.length === 1 ? t('favorites.video') : t('favorites.videos')}
            </p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-dark-navy">
            <HeartOff className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('favorites.empty')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('favorites.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-dark-navy dark:ring-gray-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4">
                  {fav.thumbnail && (
                    <div className="relative w-full sm:w-40 sm:flex-shrink-0 aspect-video overflow-hidden rounded-t-xl sm:rounded-lg sm:mt-4 sm:ms-4">
                      <ThumbnailWithPlaceholder
                        src={fav.thumbnail}
                        alt={fav.title}
                      />
                      <button
                        onClick={() => handlePlay(fav)}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
                        aria-label={t('course.playVideo')}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg">
                          <Play className="h-5 w-5 pl-0.5" />
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="min-w-0 flex-1 p-4 sm:ps-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {fav.title}
                    </h3>
                    {fav.channelName && (
                      <p className="mt-1 text-xs font-medium text-brand-coral">
                        {fav.channelName}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeTime(new Date(fav.savedAt).toISOString(), t)}
                      </span>
                      {fav.category && (
                        <button
                          onClick={() => navigate(`/category/${encodeURIComponent(fav.category!)}`)}
                          className="rounded-full bg-brand-coral/10 px-2 py-0.5 text-xs font-medium text-brand-coral cursor-pointer hover:bg-brand-coral/20 transition-colors"
                        >
                          {fav.category}
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handlePlay(fav)}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-coral/10 px-3 py-1.5 text-xs font-medium text-brand-coral hover:bg-brand-coral/20 transition"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {t('course.playVideo')}
                      </button>
                      <button
                        onClick={() => setEditing(fav.id)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        {t('favorites.edit')}
                      </button>
                      <button
                        onClick={() => handleRemove(fav.id)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('favorites.remove')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingVideo && (
        <EditFavoriteModal
          video={editingVideo}
          onClose={() => setEditing(null)}
          onUpdate={updateFavorite}
        />
      )}
    </div>
  );
}

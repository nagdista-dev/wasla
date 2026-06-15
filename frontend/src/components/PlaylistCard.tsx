import { memo, useState } from 'react';
import { ExternalLink, ListVideo, Edit3, Trash2, Film, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import ConfirmActionModal from './ConfirmActionModal';
import ImageWithFallback from './ImageWithFallback';
import type { Playlist } from '../types';

interface PlaylistCardProps {
  playlist: Playlist;
  onEdit: (playlist: Playlist) => void;
  onDelete: (playlist: Playlist) => void;
}

const PlaylistCard = memo(function PlaylistCard({ playlist, onEdit, onDelete }: PlaylistCardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCardClick = () => {
    navigate(`/playlist/${encodeURIComponent(playlist.id)}`, { state: { playlist } });
  };

  const handlePlay = () => {
    navigate(`/playlist/${encodeURIComponent(playlist.id)}`, { state: { playlist } });
  };

  const handleOpenYoutube = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.url) {
      setShowConfirm(true);
    }
  };

  const confirmOpenYoutube = () => {
    if (playlist.url) {
      window.open(playlist.url, '_blank');
    }
    setShowConfirm(false);
  };

  return (
    <>
      <div
        className="flex flex-col h-full rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md active:scale-[0.98] dark:bg-dark-navy dark:ring-gray-700 cursor-pointer min-w-0"
        onClick={handleCardClick}
      >
        <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-brand-orange to-brand-yellow relative">
          <ImageWithFallback
            src={playlist.thumbnail}
            alt={playlist.name}
            className="h-full w-full object-cover"
            fallback={
              <div className="flex h-full items-center justify-center text-white">
                <ListVideo className="h-10 w-10" />
              </div>
            }
          />
          {playlist.videoCount !== undefined && (
            <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
              <Film className="h-3 w-3" />
              {playlist.videoCount}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4 gap-1.5">
          <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white leading-snug">
            {playlist.name}
          </h3>
          {playlist.channelName && (
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
              {playlist.channelName}
            </p>
          )}
          {playlist.description && (
            <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {playlist.description}
            </p>
          )}
          {playlist.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {playlist.categories.map((cat) => (
                <button
                  key={cat}
                  onClick={(e) => { e.stopPropagation(); navigate(`/category/${encodeURIComponent(cat)}`); }}
                  className="rounded-full bg-brand-coral/10 px-2.5 py-0.5 text-xs font-medium text-brand-coral truncate max-w-[120px] cursor-pointer hover:bg-brand-coral/20 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="mt-auto flex items-center gap-1.5 flex-wrap border-t border-gray-100 pt-3 dark:border-gray-700/50">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePlay(); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-coral bg-brand-coral/10 hover:bg-brand-coral/20 transition"
            >
              <Play className="h-4 w-4" />
              {t('course.playVideo')}
            </button>
            {playlist.url && (
              <button
                type="button"
                onClick={handleOpenYoutube}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                {t('playlistCard.youtube')}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(playlist); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
            >
              <Edit3 className="h-4 w-4" />
              {t('playlistCard.edit')}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(playlist); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
              {t('playlistCard.delete')}
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmActionModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmOpenYoutube}
          title={t('playlistCard.openYoutubeTitle')}
          description={t('playlistCard.openYoutubeDesc', { name: playlist.name })}
          confirmLabel={t('playlistCard.openYoutubeConfirm')}
        />
      )}
    </>
  );
});

export default PlaylistCard;
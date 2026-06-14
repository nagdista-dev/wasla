import { ListVideo, Edit3, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Playlist } from '../types';

interface PlaylistCardProps {
  playlist: Playlist;
  onEdit: (playlist: Playlist) => void;
  onDelete: (playlist: Playlist) => void;
}

export default function PlaylistCard({ playlist, onEdit, onDelete }: PlaylistCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-dark-navy dark:ring-gray-700">
      <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-brand-orange to-brand-yellow">
        {playlist.thumbnail && !imgError ? (
          <img
            src={playlist.thumbnail}
            alt={playlist.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white">
            <ListVideo className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
          {playlist.name}
        </h3>
        {playlist.channelName && (
          <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
            {playlist.channelName}
          </p>
        )}
        {playlist.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {playlist.categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-brand-coral/10 px-2.5 py-0.5 text-xs font-medium text-brand-coral"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700/50">
          <button
            type="button"
            onClick={() => onEdit(playlist)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(playlist)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
import { Clock, Edit3, Eye, Play } from 'lucide-react';
import type { Channel, LatestVideo } from '../types';

interface VideoCardProps {
  channel: Channel;
  video: LatestVideo;
  onEdit?: (channel: Channel) => void;
}

function formatViews(views?: number): string | undefined {
  if (views === undefined) return undefined;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return views.toString();
}

function formatDuration(duration?: string): string | undefined {
  if (!duration) return undefined;
  const total = parseInt(duration, 10);
  if (isNaN(total)) return undefined;
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoCard({ channel, video, onEdit }: VideoCardProps) {
  const channelName = video.channelName || channel.name;
  const initial = channelName.charAt(0).toUpperCase();

  return (
    <article
      className="group relative rounded-xl overflow-hidden bg-white shadow-md dark:bg-dark-navy transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
      onClick={() => window.open(video.link, '_blank')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') window.open(video.link, '_blank'); }}
    >
      <div className="relative aspect-video overflow-hidden">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow" />
        )}
        {formatDuration(video.duration) && (
          <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
        {formatViews(video.views) && (
          <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatViews(video.views)}
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <button
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 shadow-lg"
          onClick={(e) => { e.stopPropagation(); onEdit?.(channel); }}
          aria-label="Watch on YouTube"
        >
          <Play className="h-5 w-5 text-brand-coral" style={{ marginLeft: '1px' }} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex flex-0 items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow text-sm font-bold text-white shadow-sm">
            {initial}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {channelName}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(channel); }}
              className="flex-0 ml-auto p-1.5 rounded-lg text-gray-400 hover:text-brand-coral hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Edit channel"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {video.title}
        </h3>

        {video.relativeTime && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5 flex-0" />
            <span>{video.relativeTime}</span>
          </div>
        )}

        {channel.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {channel.categories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
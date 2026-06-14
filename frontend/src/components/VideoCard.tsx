import { memo } from 'react';
import { Clock, Edit3, ExternalLink, Eye, Play, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import type { Channel, LatestVideo } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { loadWatchLater, saveWatchLater } from '../storage';
import { useToast } from './Toast';
import ThumbnailWithPlaceholder from './ThumbnailWithPlaceholder';

interface VideoCardProps {
  channel: Channel;
  video: LatestVideo;
  onEdit?: (channel: Channel) => void;
}

function formatViews(views?: number | string): string | undefined {
  if (views === undefined || views === null) return undefined;
  const num = typeof views === 'string' ? parseInt(views, 10) : views;
  if (isNaN(num)) return undefined;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
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

const VideoCard = memo(function VideoCard({ channel, video, onEdit }: VideoCardProps) {
  const { t } = useLanguage();
  const { play } = usePlayer();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const channelName = video.channelName || channel.name;
  const initial = channelName.charAt(0).toUpperCase();

  const watchLaterItems = loadWatchLater();
  const isInWatchLater = watchLaterItems.some((item) => item.video.link === video.link);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    play(video);
  };

  const handleWatchLater = (e: React.MouseEvent) => {
    e.stopPropagation();
    const items = loadWatchLater();
    const existing = items.find((item) => item.video.link === video.link);
    if (existing) {
      const filtered = items.filter((item) => item.video.link !== video.link);
      saveWatchLater(filtered);
      showToast(t('watchLater.removed'), 'info');
    } else {
      items.push({
        id: `${channel.id}_${Date.now()}`,
        video,
        channelName,
        channelId: channel.id,
        savedAt: Date.now(),
        watched: false,
      });
      saveWatchLater(items);
      showToast(t('watchLater.saved'), 'success');
    }
  };

  const handleYoutube = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(video.link, '_blank');
  };

  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/channel/${channel.id}`);
  };

  const isLive = video.isLive ?? false;

  return (
    <article
      className={`group relative rounded-xl overflow-hidden bg-white shadow-md dark:bg-dark-navy transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex flex-col h-full ${
        isLive
          ? 'border-2 border-red-500 dark:border-red-400'
          : 'border border-gray-200 dark:border-gray-700'
      }`}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') play(video); }}
    >
      <div className="relative aspect-video overflow-hidden">
        <ThumbnailWithPlaceholder
          src={video.thumbnail}
          alt={video.title}
          className="group-hover:scale-105"
        />
        {isLive ? (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-white" />
            {t('videoCard.live')}
          </span>
        ) : (
          <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1 min-w-[48px] justify-center">
            <Clock className="h-3 w-3" />
            {formatDuration(video.duration) || '—'}
          </span>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 flex items-center justify-center hover:bg-white hover:scale-110 shadow-lg transition-all"
            onClick={handlePlay}
            aria-label={t('videoCard.playVideo')}
          >
            <Play className="h-5 w-5 text-brand-coral" style={{ marginLeft: '1px' }} />
          </button>
          <button
            className={`w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center hover:scale-110 shadow-lg transition-all ${
              isInWatchLater
                ? 'bg-brand-coral text-white'
                : 'bg-white/90 text-gray-700 hover:bg-white'
            }`}
            onClick={handleWatchLater}
            aria-label={isInWatchLater ? t('videoCard.removeWatchLater') : t('videoCard.watchLater')}
          >
            {isInWatchLater ? (
              <BookmarkCheck className="h-5 w-5" />
            ) : (
              <BookmarkPlus className="h-5 w-5" />
            )}
          </button>
          <button
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-700 flex items-center justify-center hover:bg-white hover:scale-110 shadow-lg transition-all"
            onClick={handleYoutube}
            aria-label={t('videoCard.watchOnYoutube')}
          >
            <ExternalLink className="h-5 w-5 text-red-600" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2.5 mb-2.5">
          <button
            onClick={handleChannelClick}
            className="flex items-center gap-2 min-w-0 flex-1 group/ch"
            aria-label={channelName}
          >
            <span className="flex justify-center items-center h-9 w-9 rounded-full flex-shrink-0 text-base font-bold text-white shadow-sm leading-none" style={{ lineHeight: 1, background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}>
              {initial}
            </span>
            <span className="text-sm font-semibold text-brand-coral dark:text-brand-coral group-hover/ch:underline truncate text-left">
              {channelName}
            </span>
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(channel); }}
              className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-brand-coral hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label={t('videoCard.editChannel')}
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2">
          {video.title}
        </h3>

        <div className="flex items-center gap-3 text-xs mb-2.5">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 min-w-0">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{formatRelativeTime(video.publishedDate, t)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 min-w-0">
            <Eye className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{formatViews(video.views) || '—'}</span>
          </span>
        </div>

        {channel.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
            {channel.categories.slice(0, 4).map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/15 text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-white/20 truncate max-w-[120px]"
              >
                {cat}
              </span>
            ))}
            {channel.categories.length > 4 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/15 text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-white/20">
                +{channel.categories.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

export default VideoCard;

import { useState, useCallback, useMemo } from 'react';
import { Search, X, Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useFeed } from '../context/FeedContext';
import { useDebounce } from '../hooks/useDebounce';
import { extractVideoId } from '../utils/videoUtils';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import ThumbnailWithPlaceholder from './ThumbnailWithPlaceholder';
import type { Channel, LatestVideo } from '../types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
}

export default function SearchOverlay({ isOpen, onClose, channels }: SearchOverlayProps) {
  const { feedItems } = useFeed();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchText, setSearchText] = useState('');

  const debouncedSearch = useDebounce(searchText, 300);

  const handleClose = useCallback(() => {
    setSearchText('');
    onClose();
  }, [onClose]);

  const q = debouncedSearch.toLowerCase().trim();

  const results = useMemo(() => {
    type VideoResult = { channel: Channel; video: LatestVideo; loading?: boolean };
    type ChannelResult = { channel: Channel; loading?: boolean };

    if (!q) return { videos: [] as VideoResult[], channels: [] as ChannelResult[] };

    const videos: VideoResult[] = [];
    const channelResults: ChannelResult[] = [];

    for (const ch of channels) {
      const item = feedItems?.find((i) => i.channel.id === ch.id);
      const video = item?.video;
      const loading = item?.loading;
      const name = ch.name.toLowerCase();
      const handle = ch.handle?.toLowerCase() || '';
      const title = video?.title?.toLowerCase() || '';
      const matchesChannel = name.includes(q) || handle.includes(q);
      const matchesVideo = title.includes(q);

      if (matchesVideo && video) {
        videos.push({ channel: ch, video, loading });
      }
      if (matchesChannel && !matchesVideo) {
        channelResults.push({ channel: ch, loading });
      }
    }

    return { videos, channels: channelResults };
  }, [q, channels, feedItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-2 pt-16 sm:p-4 sm:pt-20">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[80vh] sm:max-h-[70vh] flex flex-col rounded-xl bg-white shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <div className="flex items-center gap-3 border-b border-gray-200 px-3 py-3 sm:px-4 sm:py-4 dark:border-gray-700">
          <Search className="h-5 w-5 flex-0 text-gray-400" />
          <input
            type="text"
            placeholder={t('home.searchChannels')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400 dark:text-white text-sm sm:text-base"
            autoFocus
          />
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 sm:py-3">
          {!q ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.searchChannels')}</p>
            </div>
          ) : feedItems?.some((i) => i.loading) ? (
            <div className="space-y-2 px-3 sm:px-4">
              {[1,2,3].map((n) => (
                <div key={n} className="flex items-center gap-3 p-3 animate-fadein">
                  <div className="w-20 flex-shrink-0 aspect-video rounded-lg skeleton-shimmer" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                    <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                    <div className="h-3 w-1/4 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.videos.length === 0 && results.channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.noVideosMatch')}</p>
            </div>
          ) : (
            <div className="space-y-4 px-3 sm:px-4">
              {results.videos.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 mb-2">
                    {t('home.video')} — {results.videos.length}
                  </p>
                  <div className="space-y-2">
                    {results.videos.map(({ channel, video, loading }, idx) => (
                      <div
                        key={`video-${channel.id}-${idx}`}
                        onClick={() => {
                          const vidId = extractVideoId(video.link);
                          if (vidId) navigate(`/video/${vidId}`, { state: { video, channelId: channel.id } });
                          handleClose();
                        }}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 hover:border-brand-coral/30 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer animate-fadein"
                      >
                        <div className="w-20 flex-shrink-0 aspect-video overflow-hidden rounded-lg shadow-sm relative">
                          <ThumbnailWithPlaceholder src={video.thumbnail} alt="" className="group-hover:scale-105 transition-transform duration-300" />
                          {video.duration && (
                            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded leading-none">
                              {(() => {
                                const s = parseInt(video.duration!, 10);
                                if (isNaN(s)) return null;
                                const m = Math.floor(s / 60);
                                const sec = s % 60;
                                return `${m}:${sec.toString().padStart(2, '0')}`;
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-brand-coral transition-colors">
                            {video.title}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="flex justify-center items-center h-5 w-5 rounded-full flex-shrink-0 text-[8px] font-bold text-white shadow-sm leading-none" style={{ lineHeight: 1, background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}>
                              {video.channelName.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {video.channelName}
                              {loading && ' — ...'}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(video.publishedDate, t)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {(() => {
                                const num = typeof video.views === 'string' ? parseInt(video.views, 10) : video.views!;
                                if (isNaN(num)) return '—';
                                if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
                                if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
                                return num.toString();
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {results.channels.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 mb-2">
                    {t('home.channel')} — {results.channels.length}
                  </p>
                  <div className="space-y-2">
                    {results.channels.map(({ channel, loading }, idx) => (
                      <div
                        key={`channel-${channel.id}-${idx}`}
                        onClick={() => {
                          navigate(`/channel/${channel.id}`);
                          handleClose();
                        }}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-dark-navy border border-gray-200 dark:border-gray-700 hover:border-brand-coral/30 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer animate-fadein"
                      >
                        <div className="w-20 flex-shrink-0 aspect-video rounded-lg bg-gradient-to-br from-brand-pink via-brand-coral to-brand-yellow flex items-center justify-center text-white font-bold text-lg shadow-sm">
                          {channel.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-brand-coral transition-colors">
                            {channel.name}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="flex justify-center items-center h-5 w-5 rounded-full flex-shrink-0 text-[8px] font-bold text-white shadow-sm leading-none" style={{ lineHeight: 1, background: 'linear-gradient(135deg, #b51762, #e2436a, #f37345, #feb144)' }}>
                              {channel.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {channel.name}
                              {loading && ' — ...'}
                            </span>
                          </div>
                          {channel.categories.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {channel.categories.slice(0, 2).map((cat) => (
                                <span key={cat} className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/15 text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[80px]">
                                  {cat}
                                </span>
                              ))}
                              {channel.categories.length > 2 && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">+{channel.categories.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

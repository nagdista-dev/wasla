import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowUpDown, ExternalLink, Film, ListVideo, Loader2, Play, Edit3, Trash2, Share2 } from 'lucide-react';
import { api } from '../api';
import CustomFilterDropdown from '../components/CustomFilterDropdown';
import VideoCard from '../components/VideoCard';
import VideoCardSkeleton from '../components/VideoCardSkeleton';
import EditChannelModal from '../components/EditChannelModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ShareChannelDialog from '../components/ShareChannelDialog';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { getChannelShareUrl } from '../utils/shareUtils';
import type { Channel, ChannelDetailsData, LatestVideo, Playlist } from '../types';

// ─── Color helpers ───────────────────────────────────────────────────────────

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

function hexFromHsl(hsl: string): string {
  const m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return '226, 67, 106';
  const h = parseInt(m[1]) / 360;
  const s = parseInt(m[2]) / 100;
  const l = parseInt(m[3]) / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
}

function rgba(color: string, alpha: number): string {
  return `rgba(${color}, ${alpha})`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortMode = 'newest' | 'oldest' | 'most_viewed' | 'least_viewed';
type ActiveTab = 'videos' | 'playlists';

interface PlaylistSummary {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  videoCount?: number;
}

interface ChannelPlaylistsResponse {
  success: boolean;
  channelId?: string;
  channelName?: string;
  playlists: PlaylistSummary[];
}

// ─── Playlist mini-card ───────────────────────────────────────────────────────

function ChannelPlaylistCard({ item }: { item: PlaylistSummary }) {
  const navigate = useNavigate();

  // Convert PlaylistSummary → Playlist for navigation state
  const asPlaylist: Playlist = {
    id: item.id,
    name: item.title,
    url: item.url,
    thumbnail: item.thumbnail,
    videoCount: item.videoCount,
    categories: [],
    timestamp: Date.now(),
  };

  return (
    <div
      className="flex flex-col h-full rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md active:scale-[0.98] dark:bg-dark-navy dark:ring-gray-700 cursor-pointer min-w-0 group"
      onClick={() =>
        navigate(`/playlist/${encodeURIComponent(item.id)}`, { state: { playlist: asPlaylist } })
      }
    >
      {/* Thumbnail */}
      <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-brand-orange to-brand-yellow relative">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white">
            <ListVideo className="h-10 w-10" />
          </div>
        )}
        {item.videoCount !== undefined && (
          <span className="absolute bottom-2 end-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
            <Film className="h-3 w-3" />
            {item.videoCount}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white leading-snug">
          {item.title}
        </h3>
      </div>
    </div>
  );
}

// ─── Skeleton for playlist grid ────────────────────────────────────────────────

function PlaylistCardSkeleton() {
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700 overflow-hidden">
      <div className="aspect-video w-full skeleton-shimmer" />
      <div className="p-4 space-y-2">
        <div className="h-4 rounded skeleton-shimmer w-3/4" />
        <div className="h-3 rounded skeleton-shimmer w-1/2" />
      </div>
    </div>
  );
}

// ─── Memoized Videos Panel ─────────────────────────────────────────────────────

const VideosPanel = memo(function VideosPanel({
  sortedVideos,
  channelForVideo,
  sortBy,
  onSortChange,
}: {
  sortedVideos: LatestVideo[];
  channelForVideo: Channel;
  sortBy: SortMode;
  onSortChange: (v: SortMode) => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Play className="h-5 w-5 text-brand-coral" />
          {t('channel.videos')}
        </h2>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <CustomFilterDropdown
            value={sortBy}
            onChange={(v) => onSortChange(v as SortMode)}
            options={[
              { value: 'newest', label: t('channel.newest') },
              { value: 'oldest', label: t('channel.oldest') },
              { value: 'most_viewed', label: t('channel.mostViewed') },
              { value: 'least_viewed', label: t('channel.leastViewed') },
            ]}
            className="min-w-[130px]"
            placeholder={t('channel.sort')}
          />
        </div>
      </div>

      {sortedVideos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy/50">
          <Play className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">
            {t('channel.noVideosFound')}
          </p>
        </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {sortedVideos.map((video) => (
              <VideoCard
                key={video.link}
                channel={channelForVideo}
                video={video}
              />
            ))}
          </div>
        )}
    </>
  );
});

// ─── Memoized Playlists Panel ─────────────────────────────────────────────────

const PlaylistsPanel = memo(function PlaylistsPanel({
  playlists,
  playlistsLoading,
  playlistsError,
}: {
  playlists: PlaylistSummary[];
  playlistsLoading: boolean;
  playlistsError: string;
}) {
  const { t } = useLanguage();

  return (
    <>
      {playlistsLoading && (
        <>
          <div className="mb-5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('channel.loadingPlaylists')}
          </div>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {Array.from({ length: 8 }).map((_, i) => (
              <PlaylistCardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {!playlistsLoading && playlistsError && (
        <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-10 text-center dark:border-red-800 dark:bg-red-950/20">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="text-base font-medium text-red-600 dark:text-red-400">
            {playlistsError}
          </p>
        </div>
      )}

      {!playlistsLoading && !playlistsError && playlists.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy/50">
          <ListVideo className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">
            {t('channel.noPlaylistsFound')}
          </p>
        </div>
      )}

      {!playlistsLoading && !playlistsError && playlists.length > 0 && (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
          {playlists.map((item) => (
            <ChannelPlaylistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChannelPage({
  channels = [],
  onUpdate,
  onDelete,
}: {
  channels?: Channel[];
  onUpdate?: (id: string, name: string, categories: string[]) => void;
  onDelete?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const { channelId } = useParams<{ channelId: string }>();
  const { username } = useParams<{ username: string }>();
  const identifier = channelId || username;
  const navigate = useNavigate();

  const currentChannel = useMemo(
    () => channels?.find((c) => c.id === identifier || c.username === identifier),
    [channels, identifier]
  );

  const channelUsername = currentChannel?.username || identifier;

  const allCategories = useMemo(
    () => Array.from(new Set(channels?.flatMap((c) => c.categories) || [])).sort((a, b) => a.localeCompare(b)),
    [channels]
  );

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // ── Videos state ──────────────────────────────────────────────────────────
  const [data, setData] = useState<ChannelDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('newest');

  // ── Playlists state (fully independent) ───────────────────────────────────
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState('');
  const playlistsFetched = useRef(false);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('videos');

  // ── Scroll to top on mount ─────────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ── Fetch videos ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!identifier) return;
    const apiId = currentChannel?.id || identifier;
    setLoading(true);
    setError('');
    api
      .get<{ success: boolean; data?: ChannelDetailsData; error?: string }>(
        `/channel/${encodeURIComponent(apiId)}/videos`
      )
      .then((res) => {
        if (res.data.success && res.data.data) {
          setData(res.data.data);
        } else {
          setError(res.data.error || t('channel.failedToLoad'));
        }
      })
      .catch(() => setError(t('channel.failedToLoad')))
      .finally(() => setLoading(false));
  }, [identifier, currentChannel?.id, t]);

  // ── Lazy-fetch playlists (only when tab is opened for the first time) ──────
  useEffect(() => {
    if (activeTab !== 'playlists') return;
    if (playlistsFetched.current) return;
    playlistsFetched.current = true;
    const apiId = currentChannel?.id || identifier;

    setPlaylistsLoading(true);
    setPlaylistsError('');
    api
      .get<ChannelPlaylistsResponse>(`/channel/${encodeURIComponent(apiId!)}/playlists`)
      .then((res) => {
        if (res.data.success) {
          setPlaylists(res.data.playlists);
        } else {
          setPlaylistsError(t('channel.failedToLoadPlaylists'));
        }
      })
      .catch(() => setPlaylistsError(t('channel.failedToLoadPlaylists')))
      .finally(() => setPlaylistsLoading(false));
  }, [activeTab, currentChannel?.id, identifier, t]);

  // ── Meta ─────────────────────────────────────────────────────────────────
  useMeta(
    data
      ? {
          title: data.channelName,
          description: t('channel.videoCount', { count: data.videos.length }),
          image: data.avatar || data.banner || undefined,
          url: channelUsername ? getChannelShareUrl(channelUsername) : window.location.href,
        }
      : undefined
  );

  // ── Color ─────────────────────────────────────────────────────────────────
  const mainColor = useMemo(
    () => (data ? hashColor(data.channelName) : 'hsl(340, 72%, 55%)'),
    [data]
  );
  const rgb = useMemo(() => hexFromHsl(mainColor), [mainColor]);
  const bannerGradient = `linear-gradient(135deg, ${rgba(rgb, 1)}, ${rgba(rgb, 0.53)} 50%, ${rgba(rgb, 0.27)})`;

  // ── Sorted videos ─────────────────────────────────────────────────────────
  const sortedVideos = useMemo(() => {
    if (!data) return [];
    const videos = [...data.videos];
    switch (sortBy) {
      case 'newest':
        return videos.sort(
          (a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate)
        );
      case 'oldest':
        return videos.sort(
          (a, b) => Date.parse(a.publishedDate) - Date.parse(b.publishedDate)
        );
      case 'most_viewed':
        return videos.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      case 'least_viewed':
        return videos.sort((a, b) => (a.views ?? 0) - (b.views ?? 0));
    }
  }, [data, sortBy]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen dark:bg-dark-navy">
        <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 pb-6 pt-6">
          <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-xl skeleton-shimmer mb-8" />
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full skeleton-shimmer flex-shrink-0 border-4 border-white dark:border-gray-300" />
            <div className="flex-1 min-w-0 space-y-3 pb-1">
              <div className="h-8 w-64 rounded skeleton-shimmer" />
              <div className="h-4 w-32 rounded skeleton-shimmer" />
              <div className="h-4 w-48 rounded skeleton-shimmer" />
            </div>
          </div>
          {/* Tab skeleton */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="h-10 w-24 rounded skeleton-shimmer mb-[-1px]" />
            <div className="h-10 w-32 rounded skeleton-shimmer mb-[-1px]" />
          </div>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {Array.from({ length: 6 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen dark:bg-dark-navy">
        <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 p-6">
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {error || t('channel.notFound')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const channelForVideo: Channel = {
    id: identifier!,
    name: data.channelName,
    handle: data.handle,
    username: channelUsername,
    categories: [],
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      {/* ── Banner ── */}
      <div
        className="relative h-48 sm:h-64 w-full overflow-hidden"
        style={{ background: bannerGradient }}
      >
        {data.banner && (
          <img
            src={data.banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 pb-10">
        {/* ── Channel header ── */}
        <div className="-mt-12 sm:-mt-16 flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <div
            className="relative flex h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0 items-center justify-center rounded-full border-4 border-white text-2xl sm:text-4xl font-bold text-white shadow-lg dark:border-gray-800 overflow-hidden"
            style={{ backgroundColor: `rgb(${rgb})` }}
          >
            {data.avatar ? (
              <img
                src={data.avatar}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span>{data.channelName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-2 sm:pb-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  {data.channelName}
                </h1>
                {data.handle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{data.handle}</p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('channel.videoCount', { count: data.videos.length })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0">
                {currentChannel && (
                  <button
                    onClick={() => setShowShareDialog(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 bg-white hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/10 shadow-sm"
                  >
                    <Share2 className="h-4 w-4" />
                    {t('channel.share')}
                  </button>
                )}
                {currentChannel && onUpdate && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 bg-white hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/10 shadow-sm"
                  >
                    <Edit3 className="h-4 w-4" />
                    {t('channels.edit')}
                  </button>
                )}
                {currentChannel && onDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 bg-red-50 hover:bg-red-100 transition dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-900/40 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('channels.delete')}
                  </button>
                )}
                <a
                  href={data.handle ? `https://www.youtube.com/@${data.handle}` : `https://www.youtube.com/channel/${channelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 bg-white hover:bg-gray-50 transition dark:bg-dark-navy dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/10 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4 text-red-600" />
                  {t('playlists.youtube')}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-0" role="tablist" aria-label="Channel tabs">
            {/* Videos tab */}
            <button
              id="tab-videos"
              role="tab"
              aria-selected={activeTab === 'videos'}
              aria-controls="tabpanel-videos"
              onClick={() => setActiveTab('videos')}
              className={[
                'relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors duration-150 select-none',
                activeTab === 'videos'
                  ? 'text-brand-coral'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
              ].join(' ')}
            >
              <Play className="h-4 w-4" />
              {t('channel.videos')}
              {activeTab === 'videos' && (
                <span
                  className="absolute bottom-0 start-0 end-0 h-px bg-gray-200 dark:bg-gray-700"
                  aria-hidden="true"
                />
              )}
            </button>

            {/* Playlists tab */}
            <button
              id="tab-playlists"
              role="tab"
              aria-selected={activeTab === 'playlists'}
              aria-controls="tabpanel-playlists"
              onClick={() => setActiveTab('playlists')}
              className={[
                'relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors duration-150 select-none',
                activeTab === 'playlists'
                  ? 'text-brand-coral'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
              ].join(' ')}
            >
              <ListVideo className="h-4 w-4" />
              {t('channel.playlists')}
              {activeTab === 'playlists' && (
                <span
                  className="absolute bottom-0 start-0 end-0 h-px bg-gray-200 dark:bg-gray-700"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        {/* ── Videos panel ── */}
        <div
          id="tabpanel-videos"
          role="tabpanel"
          aria-labelledby="tab-videos"
          hidden={activeTab !== 'videos'}
        >
          <VideosPanel
            sortedVideos={sortedVideos}
            channelForVideo={channelForVideo}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        {/* ── Playlists panel ── */}
        <div
          id="tabpanel-playlists"
          role="tabpanel"
          aria-labelledby="tab-playlists"
          hidden={activeTab !== 'playlists'}
        >
          <PlaylistsPanel
            playlists={playlists}
            playlistsLoading={playlistsLoading}
            playlistsError={playlistsError}
          />
        </div>
      </div>
      
      {showEditModal && currentChannel && onUpdate && (
        <EditChannelModal
          channel={currentChannel}
          onClose={() => setShowEditModal(false)}
          onUpdate={(name, categories) => {
            onUpdate(currentChannel.id, name, categories);
            setShowEditModal(false);
          }}
          existingCategories={allCategories}
        />
      )}
      
      {showDeleteConfirm && currentChannel && onDelete && (
        <ConfirmDeleteModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            onDelete(currentChannel.id);
            navigate('/channels');
          }}
          title={t('channels.deleteTitle')}
          description={t('channels.deleteDescription', { name: currentChannel.name })}
        />
      )}

      {showShareDialog && currentChannel && (
        <ShareChannelDialog
          shareUrl={getChannelShareUrl(channelUsername)}
          channelName={data?.channelName || currentChannel.name}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  );
}

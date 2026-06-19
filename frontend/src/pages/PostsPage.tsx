import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, RefreshCcw, WifiOff } from 'lucide-react';
import type { Channel, CommunityPost } from '../types';
import { fetchCommunityPostsProgressive, loadCachedCommunityPosts } from '../services/communityPostsService';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import PostCard from '../components/PostCard';
import PostCardSkeleton from '../components/PostCardSkeleton';

interface PostsPageProps {
  channels: Channel[];
}

function sortPostsByDate(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export default function PostsPage({ channels }: PostsPageProps) {
  const { t } = useLanguage();
  const [allPosts, setAllPosts] = useState<CommunityPost[]>(() => {
    const cached = loadCachedCommunityPosts();
    return sortPostsByDate(cached);
  });
  const [loadingChannels, setLoadingChannels] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [networkError, setNetworkError] = useState(false);
  const mountedRef = useRef(true);

  useMeta({ title: t('posts.title'), description: t('posts.description') });

  const channelIdSet = useMemo(() => new Set(channels.map(c => c.id)), [channels]);

  const subscribedPosts = useMemo(
    () => sortPostsByDate(allPosts.filter(post => channelIdSet.has(post.channelId))),
    [allPosts, channelIdSet]
  );

  const channelsToLoad = useMemo(
    () => channels.filter(ch => {
      const cached = loadCachedCommunityPosts();
      return !cached.some(p => p.channelId === ch.id);
    }),
    [channels]
  );

  const loadPosts = useCallback(async (force = false) => {
    if (force) {
      setRefreshing(true);
      setErrors([]);
      setNetworkError(false);
    }

    const targetChannels = force ? channels : channelsToLoad;
    if (targetChannels.length === 0) {
      setInitialLoading(false);
      return;
    }

    setLoadingChannels(new Set(targetChannels.map(c => c.id)));

    try {
      await fetchCommunityPostsProgressive(
        targetChannels,
        (channelId, posts, error) => {
          if (!mountedRef.current) return;

          setAllPosts(prev => {
            const existing = prev.filter(p => p.channelId !== channelId);
            const merged = sortPostsByDate([...existing, ...posts]);
            return merged;
          });

          setLoadingChannels(prev => {
            const next = new Set(prev);
            next.delete(channelId);
            return next;
          });

          if (error) {
            setErrors(prev => prev.includes(error) ? prev : [...prev, error]);
          }
        },
        { force }
      );
    } catch {
      if (mountedRef.current) {
        setNetworkError(true);
      }
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingChannels(new Set());
      }
    }
  }, [channels, channelsToLoad]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => loadPosts(false), 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [loadPosts]);

  const allErrors = errors;
  const hasNetworkError = networkError;
  const pendingChannels = loadingChannels;
  const skeletonCount = Math.min(pendingChannels.size, 3);

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-0 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">{t('posts.title')}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('posts.count', { count: subscribedPosts.length, channels: channels.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadPosts(true)}
            disabled={refreshing || channels.length === 0}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-pink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            {refreshing ? t('posts.refreshing') : t('posts.refresh')}
          </button>
        </div>

        {allErrors.length > 0 && (
          <div className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-100">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              {hasNetworkError ? <WifiOff className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {hasNetworkError ? t('posts.networkError') : t('posts.partialError')}
            </div>
            <ul className="space-y-1">
              {allErrors.slice(0, 4).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
            {hasNetworkError && subscribedPosts.length > 0 && (
              <p className="mt-2 text-yellow-800 dark:text-yellow-200">
                Showing cached posts while offline
              </p>
            )}
            <button
              type="button"
              onClick={() => loadPosts(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-coral hover:text-brand-pink transition-colors"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('posts.noChannels')}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('posts.noChannelsHint')}</p>
          </div>
        ) : initialLoading && subscribedPosts.length === 0 && pendingChannels.size === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : subscribedPosts.length === 0 && pendingChannels.size === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('posts.empty')}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('posts.emptyHint')}</p>
            <button
              type="button"
              onClick={() => loadPosts(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-pink"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {subscribedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            {pendingChannels.size > 0 && (
              <div className="mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {Array.from({ length: skeletonCount }).map((_, i) => (
                    <PostCardSkeleton key={`skel-${i}`} />
                  ))}
                </div>
                <div className="flex items-center justify-center py-4 text-sm text-gray-400 dark:text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading {pendingChannels.size} more channel{pendingChannels.size > 1 ? 's' : ''}...
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

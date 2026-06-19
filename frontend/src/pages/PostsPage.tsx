import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, RefreshCcw, WifiOff } from 'lucide-react';
import type { Channel, CommunityPost } from '../types';
import { fetchCommunityPosts, loadCachedCommunityPosts } from '../services/communityPostsService';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import PostCard from '../components/PostCard';

interface PostsPageProps {
  channels: Channel[];
}

export default function PostsPage({ channels }: PostsPageProps) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<CommunityPost[]>(() => loadCachedCommunityPosts());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [networkError, setNetworkError] = useState(false);
  const mountedRef = useRef(true);

  useMeta({ title: t('posts.title'), description: t('posts.description') });

  const subscribedPosts = useMemo(() => {
    const channelIds = new Set(channels.map((channel) => channel.id));
    return posts.filter((post) => channelIds.has(post.channelId));
  }, [channels, posts]);

  const loadPosts = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetchCommunityPosts(channels, { force });
      if (!mountedRef.current) return;
      setPosts(result.posts);
      setErrors(result.errors);
      setNetworkError(result.errors.length === channels.length);
    } catch {
      if (!mountedRef.current) return;
      setNetworkError(true);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [channels]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => loadPosts(false), 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [loadPosts]);

  return (
    <div className="min-h-screen p-4 dark:bg-dark-navy sm:p-6">
      <div className="mx-auto max-w-3xl">
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

        {errors.length > 0 && (
          <div className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-100">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              {networkError ? <WifiOff className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {networkError ? t('posts.networkError') || 'Network error' : t('posts.partialError')}
            </div>
            <ul className="space-y-1">
              {errors.slice(0, 4).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
            {networkError && posts.length > 0 && (
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
        ) : loading && subscribedPosts.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm font-medium">{t('posts.loading')}</span>
            </div>
          </div>
        ) : subscribedPosts.length === 0 && !loading ? (
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
          <div className="space-y-5">
            {subscribedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

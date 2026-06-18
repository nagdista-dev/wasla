import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ImageIcon, Loader2, MessageSquareText, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Channel, CommunityPost } from '../types';
import { fetchCommunityPosts, loadCachedCommunityPosts } from '../services/communityPostsService';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { isYouTubeUrl } from '../utils/linkUtils';
import ConfirmLinkModal from '../components/ConfirmLinkModal';

interface PostsPageProps {
  channels: Channel[];
}

function PostPreview({ post }: { post: CommunityPost }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const previewImage = post.thumbnail || post.images[0];
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  const handleLinkClick = (url: string) => {
    if (isYouTubeUrl(url)) {
      setPendingLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirm = () => {
    if (pendingLink) {
      window.open(pendingLink, '_blank', 'noopener,noreferrer');
      setPendingLink(null);
    }
  };

  const handleCancel = () => {
    setPendingLink(null);
  };

  return (
    <article
      className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md dark:bg-dark-navy dark:ring-gray-700"
    >
      <button type="button" onClick={() => navigate(`/post/${post.id}`)} className="block w-full text-left rtl:text-right">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand-coral/10 text-brand-coral">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(post.publishedAt, t)}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
          {post.content.split(/\s+/).map((word, index) => {
            const urlRegex = /^(https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
            const isUrl = urlRegex.test(word);
            if (isUrl) {
              return (
                <a
                  key={index}
                  href={word}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(word);
                  }}
                  className="text-brand-coral hover:text-brand-pink hover:underline font-medium transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {word}
                </a>
              );
            }
            return <span key={index}>{word} </span>;
          })}
        </p>

        {previewImage && (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/5">
            <img src={previewImage} alt="" className="max-h-32 w-full object-cover" loading="lazy" />
          </div>
        )}

        {post.images.length > 1 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <ImageIcon className="h-4 w-4" />
            {t('posts.imageCount', { count: post.images.length })}
          </div>
        )}
      </button>

      {pendingLink && (
        <ConfirmLinkModal
          url={pendingLink}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </article>
  );
}

export default function PostsPage({ channels }: PostsPageProps) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<CommunityPost[]>(() => loadCachedCommunityPosts());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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
      setPosts(result.posts);
      setErrors(result.errors);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [channels]);

  useEffect(() => {
    void Promise.resolve().then(() => loadPosts(false));
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
          <div className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-950/30 dark:text-yellow-100">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" />
              {t('posts.partialError')}
            </div>
            <ul className="space-y-1">
              {errors.slice(0, 4).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {channels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('posts.noChannels')}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('posts.noChannelsHint')}</p>
          </div>
        ) : loading && subscribedPosts.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('posts.loading')}
            </div>
          </div>
        ) : subscribedPosts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('posts.empty')}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('posts.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscribedPosts.map((post) => (
              <PostPreview key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

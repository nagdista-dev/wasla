import { useMemo } from 'react';
import { ArrowLeft, Calendar, MessageSquareText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getCachedCommunityPost } from '../services/communityPostsService';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { formatRelativeTime } from '../utils/formatRelativeTime';

export default function PostDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const post = useMemo(() => (id ? getCachedCommunityPost(id) : undefined), [id]);

  useMeta({
    title: post ? `${post.channelName} ${t('posts.post')}` : t('posts.notFound'),
    description: post?.content || t('posts.description'),
    image: post?.thumbnail || post?.images[0],
  });

  if (!post) {
    return (
      <div className="min-h-screen p-6 dark:bg-dark-navy">
        <div className="mx-auto max-w-3xl">
          <Link to="/posts" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-coral">
            <ArrowLeft className="h-4 w-4" />
            {t('posts.backToPosts')}
          </Link>
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('posts.notFound')}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('posts.notFoundHint')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 dark:bg-dark-navy sm:p-6">
      <article className="mx-auto max-w-3xl">
        <Link to="/posts" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-coral">
          <ArrowLeft className="h-4 w-4" />
          {t('posts.backToPosts')}
        </Link>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-coral/10 text-brand-coral">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{post.channelName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.publishedAt}>{formatRelativeTime(post.publishedAt, t)}</time>
                <span>{new Date(post.publishedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {post.title && (
            <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">{post.title}</h2>
          )}

          <p className="mt-4 whitespace-pre-line text-base leading-8 text-gray-800 dark:text-gray-200">
            {post.content}
          </p>

          {post.images.length > 0 && (
            <div className="mt-6 grid gap-3">
              {post.images.map((image) => (
                <img
                  key={image}
                  src={image}
                  alt=""
                  className="max-h-[640px] w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

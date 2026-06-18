import { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, MessageSquareText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type { CommunityPost } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { isYouTubeUrl } from '../utils/linkUtils';
import ConfirmLinkModal from '../components/ConfirmLinkModal';

export default function PostDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  
  const post = useMemo(() => null as CommunityPost | null, [id]);

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

            <p className="mt-4 whitespace-pre-line text-base leading-8 text-gray-800 dark:text-gray-200">
              {post.content.split(/\s+/).map((word: string, index: number) => {
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

            {post.images.length > 0 && (
              <div className="mt-6 grid gap-3">
                {post.images.map((image: string) => (
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
        </div>
      </article>

      {pendingLink && (
        <ConfirmLinkModal
          url={pendingLink}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

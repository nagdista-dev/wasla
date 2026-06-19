import { memo, useMemo, useState } from 'react';
import { ImageIcon, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CommunityPost } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { isYouTubeUrl } from '../utils/linkUtils';
import ConfirmLinkModal from './ConfirmLinkModal';

function renderContentWithLinks(content: string, onLinkClick: (url: string) => void) {
  const urlRegex = /^(https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
  const words = content.split(/\s+/);

  return words.map((word, index) => {
    const isUrl = urlRegex.test(word);
    if (isUrl) {
      return (
        <a
          key={index}
          href={word}
          onClick={(e) => {
            e.preventDefault();
            onLinkClick(word);
          }}
          className="text-brand-coral hover:text-brand-pink hover:underline font-medium transition-colors break-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          {word}
        </a>
      );
    }
    return <span key={index}>{word} </span>;
  });
}

function PostCard({ post }: { post: CommunityPost }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const previewImage = post.thumbnail || post.images[0];
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const channelInitial = (post.channelName || '?').charAt(0).toUpperCase();

  const contentElements = useMemo(
    () => renderContentWithLinks(post.content, (url) => {
      if (isYouTubeUrl(url)) {
        setPendingLink(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }),
    [post.content]
  );

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
    <article className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:shadow-md hover:ring-brand-coral/30 dark:bg-dark-navy dark:ring-gray-700 dark:hover:ring-brand-coral/40">
      <div className="h-1 w-full flex-shrink-0 bg-gradient-to-r from-brand-pink via-brand-coral to-brand-yellow opacity-60" />

      {previewImage && (
        <div className="relative aspect-video overflow-hidden bg-gray-50 dark:bg-white/[0.03]">
          <img
            src={previewImage}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
          {post.images.length > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <ImageIcon className="h-3 w-3" />
              {post.images.length}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #b51762, #e2436a)' }}
          >
            {channelInitial}
          </span>
          <span className="truncate text-sm font-semibold text-brand-coral">
            {post.channelName}
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(post.publishedAt, t)}
          </span>
        </div>

        {post.content && (
          <div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700 dark:text-gray-300 line-clamp-4">
            {contentElements}
          </div>
        )}

        {post.channelCategories && post.channelCategories.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {post.channelCategories.slice(0, 3).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/category/${encodeURIComponent(cat)}`); }}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/15 text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-white/20 truncate max-w-[120px] hover:bg-brand-coral/10 hover:text-brand-coral hover:border-brand-coral/30 transition-colors flex-shrink-0"
              >
                {cat}
              </button>
            ))}
            {post.channelCategories.length > 3 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/15 text-xs font-medium text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-white/20 flex-shrink-0">
                +{post.channelCategories.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            type="button"
            onClick={() => navigate(`/post/${post.id}`)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-coral transition hover:text-brand-pink"
          >
            {t('posts.readMore')}
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>

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

export default memo(PostCard);

import { memo, useMemo, useState } from 'react';
import { ImageIcon, MessageSquareText, Clock, ChevronRight, Eye, Heart } from 'lucide-react';
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

function PostCard({ post, isListView }: { post: CommunityPost; isListView?: boolean }) {
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
    <article
      className={`group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all duration-200 hover:shadow-md hover:ring-brand-coral/30 dark:bg-dark-navy dark:ring-gray-700 dark:hover:ring-brand-coral/40 ${
        isListView ? 'flex flex-row' : ''
      }`}
    >
      <div className="h-1 w-full bg-gradient-to-r from-brand-pink via-brand-coral to-brand-yellow opacity-60 flex-shrink-0" />

      <div className={`${isListView ? 'flex flex-1 gap-4 p-4' : 'p-5 sm:p-6'}`}>
        <div className={`min-w-0 ${isListView ? 'flex-1' : ''}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink/10 to-brand-coral/10 text-brand-coral ring-1 ring-brand-coral/20">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #b51762, #e2436a)' }}>
                  {channelInitial}
                </span>
                <span className="truncate text-sm font-semibold text-brand-coral">
                  {post.channelName}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(post.publishedAt, t)}
                </span>
              </div>
            </div>
          </div>

          {post.content && (
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700 dark:text-gray-300 line-clamp-6">
              {contentElements}
            </div>
          )}

          {post.channelCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
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
        </div>

        {previewImage && (
          <div className={`flex-shrink-0 ${
            isListView
              ? 'w-32 h-24 sm:w-40 sm:h-28'
              : 'mt-4'
          }`}>
            <div className={`overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition group-hover:border-gray-200 dark:border-gray-800 dark:bg-white/[0.03] dark:group-hover:border-gray-700 ${
              isListView ? 'h-full w-full' : ''
            }`}>
              <img
                src={previewImage}
                alt=""
                className={`object-cover transition duration-300 group-hover:scale-[1.02] ${
                  isListView ? 'h-full w-full' : 'max-h-48 w-full'
                }`}
                loading="lazy"
              />
            </div>
          </div>
        )}
      </div>

      {!isListView && post.images.length > 1 && (
        <div className="px-5 sm:px-6 pb-1 -mt-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
            <ImageIcon className="h-3.5 w-3.5" />
            {t('posts.imageCount', { count: post.images.length })}
          </span>
        </div>
      )}

      <div className={`${isListView ? 'px-4 pb-4' : 'px-5 pb-5 sm:px-6 sm:pb-6'}`}>
        <div className="flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
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

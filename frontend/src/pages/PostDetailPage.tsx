import { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, ImageIcon, Loader2, MessageSquareText, RefreshCcw } from 'lucide-react';
import { Link, useParams, useLocation } from 'react-router-dom';
import type { CommunityPost } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useMeta } from '../hooks/useMeta';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { isYouTubeUrl } from '../utils/linkUtils';
import ConfirmLinkModal from '../components/ConfirmLinkModal';
import { getPostById, getPostByIdAsync } from '../services/communityPostsService';
import { api } from '../api';

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

export default function PostDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { t } = useLanguage();
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const retriedRef = useRef(false);

  useMeta({
    title: post ? `${post.channelName} ${t('posts.post')}` : t('posts.notFound'),
    description: post?.content || t('posts.description'),
    image: post?.thumbnail || post?.images[0],
  });

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const cached = getPostById(id);
      if (cached) {
        setPost(cached);
        setLoading(false);
        return;
      }

      const fromIdb = await getPostByIdAsync(id);
      if (!cancelled && fromIdb) {
        setPost(fromIdb);
        setLoading(false);
        return;
      }

      if (!cancelled && !retriedRef.current) {
        retriedRef.current = true;
        const stateData = location.state as { channelId?: string; channelName?: string } | undefined;
        const channelId = stateData?.channelId;

        if (channelId) {
          try {
            const res = await api.get<{ success: boolean; xml?: string; source?: string; error?: string }>(`/community/${encodeURIComponent(channelId)}`);
            if (cancelled) return;

            if (res.data.success && res.data.xml) {
              const doc = new DOMParser().parseFromString(res.data.xml, 'application/xml');
              const entries = Array.from(doc.querySelectorAll('item, entry'));
              for (const item of entries) {
                const guid = item.querySelector('guid')?.textContent || item.querySelector('id')?.textContent || '';
                const linkEl = item.querySelector('link[href]')?.getAttribute('href') || item.querySelector('link')?.textContent || '';
                const title = item.querySelector('title')?.textContent || '';
                const published = item.querySelector('pubDate')?.textContent || item.querySelector('published')?.textContent || '';
                const rawGuid = guid || linkEl || `${channelId}:${title}:${published}`;
                const computedId = hash(`${channelId}:${rawGuid}`);
                if (computedId === id) {
                  const content = item.querySelector('encoded')?.textContent || item.querySelector('content')?.textContent || item.querySelector('description')?.textContent || '';
                  const textContent = new DOMParser().parseFromString(content, 'text/html').body.textContent || '';
                  const images = Array.from(item.querySelectorAll('img')).map(img => img.getAttribute('src') || '').filter(Boolean);
                  const thumbnail = item.querySelector('thumbnail')?.getAttribute('url') || images[0];
                  const publishedDate = new Date(published);

                  const foundPost: CommunityPost = {
                    id,
                    channelId,
                    channelName: stateData?.channelName || '',
                    channelCategories: [],
                    content: textContent.trim(),
                    publishedAt: Number.isNaN(publishedDate.getTime()) ? new Date().toISOString() : publishedDate.toISOString(),
                    thumbnail: thumbnail || undefined,
                    images,
                    source: 'rsshub',
                    fetchedAt: Date.now(),
                  };
                  setPost(foundPost);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch {
            /* backend fallback failed */
          }
        }
      }

      if (!cancelled) {
        setError(t('posts.notFound'));
        setLoading(false);
      }
    };

    load();

    return () => { cancelled = true; };
  }, [id, location.state, t]);

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

  if (loading) {
    return (
      <div className="min-h-screen dark:bg-dark-navy">
        <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-4 sm:py-6">
          <Link to="/posts" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-coral transition hover:text-brand-pink">
            <ArrowLeft className="h-4 w-4" />
            {t('posts.backToPosts')}
          </Link>
          <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-white dark:bg-dark-navy">
            <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm font-medium">{t('posts.loading')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen dark:bg-dark-navy">
        <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-4 sm:py-6">
          <Link to="/posts" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-coral transition hover:text-brand-pink">
            <ArrowLeft className="h-4 w-4" />
            {t('posts.backToPosts')}
          </Link>
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-dark-navy">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('posts.notFound')}</p>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('posts.notFoundHint')}</p>
            <Link
              to="/posts"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-pink"
            >
              <RefreshCcw className="h-4 w-4" />
              {t('posts.backToPosts')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const contentElements = useMemo(
    () => renderContentWithLinks(post.content, handleLinkClick),
    [post.content]
  );

  const images = post.images.length > 0 ? post.images : (post.thumbnail ? [post.thumbnail] : []);

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-4 sm:py-6">
      <article>
        <Link to="/posts" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-coral transition hover:text-brand-pink">
          <ArrowLeft className="h-4 w-4" />
          {t('posts.backToPosts')}
        </Link>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
          <div className="h-1 w-full bg-gradient-to-r from-brand-pink via-brand-coral to-brand-yellow opacity-60" />

          <div className="p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink/10 to-brand-coral/10 text-brand-coral ring-1 ring-brand-coral/20">
                <MessageSquareText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                  {post.channelName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.publishedAt}>{formatRelativeTime(post.publishedAt, t)}</time>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(post.publishedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {post.channelCategories && post.channelCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {post.channelCategories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/category/${encodeURIComponent(cat)}`}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/15 text-xs font-medium text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-white/20 truncate max-w-[160px] hover:bg-brand-coral/10 hover:text-brand-coral hover:border-brand-coral/30 transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}

            {post.content && (
              <div className="mt-6 whitespace-pre-line text-base leading-8 text-gray-800 dark:text-gray-200">
                {contentElements}
              </div>
            )}

            {images.length > 0 && (
              <div className="mt-8">
                {images.length === 1 ? (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03]">
                    <img
                      src={images[0]}
                      alt=""
                      className="max-h-[600px] w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03]">
                      <img
                        src={images[galleryIndex]}
                        alt={`Image ${galleryIndex + 1}`}
                        className="max-h-[500px] w-full object-contain transition-opacity duration-300"
                        loading="lazy"
                      />
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setGalleryIndex(i => (i - 1 + images.length) % images.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setGalleryIndex(i => (i + 1) % images.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                            aria-label="Next image"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setGalleryIndex(i)}
                          className={`h-2 w-2 rounded-full transition-all ${
                            i === galleryIndex
                              ? 'w-6 bg-brand-coral'
                              : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
                          }`}
                          aria-label={`Go to image ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {galleryIndex + 1} / {images.length}
                    </div>
                  </div>
                )}
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
    </div>
  );
}

function hash(value: string): string {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result.toString(36);
}

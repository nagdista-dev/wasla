import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Play, BarChart3 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCourses } from '../context/CoursesContext';
import { usePlayer } from '../context/PlayerContext';
import { useMeta } from '../hooks/useMeta';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';
import type { LatestVideo } from '../types';

export default function CourseDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getCourse, toggleVideoComplete } = useCourses();
  const { play } = usePlayer();

  const course = id ? getCourse(id) : undefined;

  useMeta({ title: course ? `${t('courses.dashboardTitle')} — ${course.name}` : t('courses.title') });

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('courses.notFound')}</p>
        <button
          onClick={() => navigate('/courses')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('courses.backToCourses')}
        </button>
      </div>
    );
  }

  const total = course.videos.length;
  const completed = course.videos.filter((v) => v.completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handlePlayVideo = (videoUrl: string, title: string, thumbnail?: string) => {
    const video: LatestVideo = {
      title,
      link: videoUrl,
      thumbnail,
      publishedDate: new Date().toISOString(),
      channelName: '',
    };
    play(video);
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <button
          onClick={() => navigate('/courses')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('courses.backToCourses')}
        </button>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.name}</h1>
              {course.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{course.description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{total} {total === 1 ? t('courses.video') : t('courses.videos')}</span>
                {course.category && (
                  <>
                    <span>&middot;</span>
                    <button
                      onClick={() => navigate(`/category/${encodeURIComponent(course.category!)}`)}
                      className="font-medium text-brand-coral hover:underline"
                    >
                      {course.category}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/courses/${course.id}`)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
          >
            <Play className="h-4 w-4" />
            {t('courses.resumeCourse')}
          </button>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('courses.progress')}</h2>

          <div className="mb-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{progress}%</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {completed} {t('courses.completed')}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {total} {t('courses.totalVideos')}
              </span>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-pink via-brand-coral to-brand-yellow transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {total === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-dark-navy">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('courses.noVideos')}
            </p>
            <button
              onClick={() => navigate(`/courses/${course.id}`)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
            >
              {t('courses.addVideo')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('courses.videos')}
            </h3>
            {course.videos.map((video, index) => (
              <div
                key={video.id}
                className={`flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 transition dark:bg-dark-navy dark:ring-gray-700 ${
                  video.completed ? 'ring-green-200 dark:ring-green-800/30' : ''
                }`}
              >
                <button
                  onClick={() => toggleVideoComplete(course.id, video.id)}
                  className="mt-2 flex-shrink-0 text-gray-400 hover:text-green-500 transition-colors"
                  aria-label={video.completed ? t('courses.markIncomplete') : t('courses.markComplete')}
                >
                  {video.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <span className="mt-2 flex-shrink-0 text-xs font-bold text-gray-400 w-5 text-center">
                  {index + 1}
                </span>

                <div className="relative w-24 flex-shrink-0 aspect-video overflow-hidden rounded-lg">
                  <ThumbnailWithPlaceholder
                    src={video.thumbnail}
                    alt={video.title}
                  />
                  <button
                    onClick={() => handlePlayVideo(video.videoUrl, video.title, video.thumbnail)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100"
                    aria-label={t('course.playVideo')}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg">
                      <Play className="h-3.5 w-3.5 pl-0.5" />
                    </span>
                  </button>
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <h4 className={`line-clamp-2 text-sm font-medium ${
                    video.completed
                      ? 'text-gray-500 dark:text-gray-400 line-through'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {video.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 0 && completed === total && (
          <div className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-6 text-center ring-1 ring-emerald-500/20">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('course.completionTitle')}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('course.completionDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

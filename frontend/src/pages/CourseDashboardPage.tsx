import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, Play, BarChart3, Hourglass, Flag, TrendingUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCourses } from '../context/CoursesContext';
import { useMeta } from '../hooks/useMeta';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';

function getStatusLabel(progress: number, t: (key: string) => string): string {
  if (progress === 0) return t('courses.statusNotStarted');
  if (progress <= 33) return t('courses.statusJustStarted');
  if (progress <= 66) return t('courses.statusInProgress');
  if (progress < 100) return t('courses.statusAlmostDone');
  return t('courses.statusCompleted');
}

function getStatusIcon(progress: number) {
  if (progress === 0) return Hourglass;
  if (progress < 100) return TrendingUp;
  return Flag;
}

export default function CourseDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getCourse } = useCourses();

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
  const remaining = total - completed;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const StatusIcon = getStatusIcon(progress);

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
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 flex-shrink-0">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{course.name}</h1>
              {course.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{course.description}</p>
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
            className="flex items-center gap-1.5 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink flex-shrink-0"
          >
            <Play className="h-4 w-4" />
            {t('courses.resumeCourse')}
          </button>
        </div>

        {total > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                <BookOpen className="h-3.5 w-3.5" />
                {t('courses.totalVideos')}
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{total}</span>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {t('courses.completed')}
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{completed}</span>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                <Hourglass className="h-3.5 w-3.5 text-amber-500" />
                {t('courses.remaining')}
              </div>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{remaining}</span>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-dark-navy dark:ring-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{progress}%</span>
              <span className="flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-white/10 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                <StatusIcon className="h-3.5 w-3.5" />
                {getStatusLabel(progress, t)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t('courses.completed')}: {completed}
              </span>
              <span className="flex items-center gap-1.5">
                <Hourglass className="h-4 w-4 text-amber-500" />
                {t('courses.remaining')}: {remaining}
              </span>
            </div>
          </div>

          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
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
                <span className={`mt-1.5 flex h-5 w-5 flex-shrink-0 items-center justify-center ${
                  video.completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'
                }`}>
                  {video.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current" />
                  )}
                </span>

                <span className="mt-2 flex-shrink-0 text-xs font-bold text-gray-400 w-5 text-center">
                  {index + 1}
                </span>

                <div className="relative w-16 flex-shrink-0 aspect-video overflow-hidden rounded-lg">
                  <ThumbnailWithPlaceholder
                    src={video.thumbnail}
                    alt={video.title}
                  />
                </div>

                <div className="min-w-0 flex-1 pt-1.5">
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
            <Flag className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('course.completionTitle')}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('course.completionDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

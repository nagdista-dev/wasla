import { memo } from 'react';
import { BookOpen, ListVideo, Edit3, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Course } from '../types';

interface CourseCardProps {
  course: Course;
  onOpen: (id: string) => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}

const CourseCard = memo(function CourseCard({ course, onOpen, onEdit, onDelete }: CourseCardProps) {
  const { t } = useLanguage();

  return (
    <article
      className="group relative rounded-xl bg-white shadow-md ring-1 ring-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer dark:bg-dark-navy dark:ring-gray-700 flex flex-col"
      onClick={() => onOpen(course.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(course.id); }}
    >
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-coral/10 text-brand-coral flex-shrink-0">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {course.name}
              </h3>
              {course.category && (
                <span className="text-xs font-medium text-brand-coral">{course.category}</span>
              )}
            </div>
          </div>
        </div>

        {course.description && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {course.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <ListVideo className="h-3.5 w-3.5" />
            <span>
              {course.videos.length} {course.videos.length === 1 ? t('courses.video') : t('courses.videos')}
            </span>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onEdit(course)}
              className="rounded-lg p-1.5 text-gray-400 hover:text-brand-coral hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label={t('courses.edit')}
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(course)}
              className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label={t('courses.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

export default CourseCard;

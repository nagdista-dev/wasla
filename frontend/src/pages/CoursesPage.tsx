import { useState } from 'react';
import { BookOpen, Plus, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCourses } from '../context/CoursesContext';
import { useMeta } from '../hooks/useMeta';
import CourseCard from '../components/CourseCard';
import CreateCourseModal from '../components/CreateCourseModal';
import EditCourseModal from '../components/EditCourseModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import type { Course } from '../types';

export default function CoursesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { courses, deleteCourse } = useCourses();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  useMeta({ title: t('courses.title') });

  const handleDelete = () => {
    if (deleting) {
      deleteCourse(deleting.id);
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen dark:bg-dark-navy">
      <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-4 sm:px-4 lg:px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('courses.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {courses.length} {courses.length === 1 ? t('courses.course') : t('courses.courses')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
          >
            <Plus className="h-4 w-4" />
            {t('courses.createNew')}
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-dark-navy">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('courses.empty')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('courses.emptyHint')}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
            >
              <Plus className="h-4 w-4" />
              {t('courses.createNew')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onOpen={(id) => navigate(`/courses/${id}`)}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCourseModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => navigate(`/courses/${id}`)}
        />
      )}
      {editing && (
        <EditCourseModal
          course={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          isOpen={true}
          title={t('courses.deleteTitle')}
          description={t('courses.deleteDescription', { name: deleting.name })}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

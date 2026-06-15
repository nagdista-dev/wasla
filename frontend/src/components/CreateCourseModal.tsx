import { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCourses } from '../context/CoursesContext';

interface CreateCourseModalProps {
  onClose: () => void;
  onCreated: (courseId: string) => void;
}

export default function CreateCourseModal({ onClose, onCreated }: CreateCourseModalProps) {
  const { t } = useLanguage();
  const { createCourse } = useCourses();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = createCourse(name.trim(), description.trim() || undefined, category.trim() || undefined);
    onCreated(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-dark-navy dark:ring-1 dark:ring-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 rtl:left-3 ltr:right-3 rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-4 text-xl font-semibold dark:text-white">{t('courses.createTitle')}</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('courses.nameLabel')} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
            placeholder={t('courses.namePlaceholder')}
            maxLength={100}
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('courses.descriptionLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100 dark:placeholder-gray-400 resize-none"
            placeholder={t('courses.descriptionPlaceholder')}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('courses.categoryLabel')}</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-coral focus:ring-brand-coral dark:border-gray-600 dark:bg-dark-navy dark:text-gray-100"
            placeholder={t('courses.categoryPlaceholder')}
            maxLength={100}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
          >
            {t('confirmAction.cancel')}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 rounded-md bg-brand-coral px-4 py-2 font-medium text-white transition hover:bg-brand-pink disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            {t('courses.createButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Plus, Trash2, Edit3, GripVertical, BookOpen, ExternalLink, CheckCircle2, Circle, BarChart3 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCourses } from '../context/CoursesContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../components/Toast';
import { useMeta } from '../hooks/useMeta';
import { extractVideoId } from '../utils/videoUtils';
import EditCourseModal from '../components/EditCourseModal';
import AddVideoModal from '../components/AddVideoModal';
import ThumbnailWithPlaceholder from '../components/ThumbnailWithPlaceholder';
import type { LatestVideo } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableVideoItem({
  video,
  index,
  onPlay,
  onRemove,
  onOpenYoutube,
  onToggleComplete,
}: {
  video: { id: string; title: string; videoUrl: string; thumbnail?: string; notes?: string; completed?: boolean };
  index: number;
  onPlay: () => void;
  onRemove: () => void;
  onOpenYoutube: () => void;
  onToggleComplete: () => void;
}) {
  const { t } = useLanguage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 sm:gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200 transition dark:bg-dark-navy dark:ring-gray-700 ${
        isDragging ? 'z-50 ring-2 ring-brand-coral shadow-xl opacity-90' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-1 flex cursor-grab touch-none items-center rounded p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <button
        onClick={onToggleComplete}
        className="mt-1.5 flex-shrink-0 text-gray-400 hover:text-green-500 transition-colors min-w-[20px]"
        aria-label={video.completed ? t('course.markIncomplete') : t('course.markComplete')}
      >
        {video.completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      <span className="mt-2 flex-shrink-0 text-xs font-bold text-gray-400 w-5 text-center hidden sm:block">
        {index + 1}
      </span>

      <div className="relative w-16 sm:w-28 flex-shrink-0 aspect-video overflow-hidden rounded-lg">
        <ThumbnailWithPlaceholder
          src={video.thumbnail}
          alt={video.title}
        />
        <button
          onClick={onPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40"
          aria-label={t('course.playVideo')}
        >
          <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-brand-coral shadow-lg">
            <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 pl-0.5" />
          </span>
        </button>
      </div>

      <div className="min-w-0 flex-1 self-center">
        <h4 className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
          {video.title}
        </h4>
        {video.notes && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
            {video.notes}
          </p>
        )}
      </div>

      <div className="flex flex-row sm:flex-col gap-1 flex-shrink-0">
        <button
          onClick={onOpenYoutube}
          className="rounded-lg p-1.5 text-gray-400 hover:text-brand-coral hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label={t('courses.openYoutube')}
          title={t('courses.openYoutube')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label={t('courses.removeVideo')}
          title={t('courses.removeVideo')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { getCourse, addVideo, removeVideo, reorderVideos, toggleVideoComplete } = useCourses();
  const { play } = usePlayer();
  const { showToast } = useToast();

  const course = id ? getCourse(id) : undefined;
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useMeta({ title: course?.name || t('courses.title') });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !course || active.id === over.id) return;

      const oldIndex = course.videos.findIndex((v) => v.id === active.id);
      const newIndex = course.videos.findIndex((v) => v.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(course.videos, oldIndex, newIndex);
      reorderVideos(course.id, reordered);
    },
    [course, reorderVideos],
  );

  const handleAddVideo = useCallback(
    (videoUrl: string, title: string, thumbnail?: string) => {
      if (!course) return;
      const videoId = `cv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      addVideo(course.id, { id: videoId, videoUrl, title, thumbnail });
      showToast(t('courses.videoAdded'), 'success');
    },
    [course, addVideo, showToast, t],
  );

  const handleRemoveVideo = useCallback(
    (videoId: string) => {
      if (!course) return;
      removeVideo(course.id, videoId);
      showToast(t('courses.videoRemoved'), 'info');
    },
    [course, removeVideo, showToast, t],
  );

  const handlePlayVideo = useCallback(
    (videoUrl: string, title: string, thumbnail?: string) => {
      const video: LatestVideo = {
        title,
        link: videoUrl,
        thumbnail,
        publishedDate: new Date().toISOString(),
        channelName: '',
      };
      play(video);
      const vidId = extractVideoId(video.link);
      if (vidId) {
        navigate(`/video/${vidId}`, { state: { video } });
      }
    },
    [play, navigate],
  );

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
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.name}</h1>
              {course.description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{course.description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{course.videos.length} {course.videos.length === 1 ? t('courses.video') : t('courses.videos')}</span>
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
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/courses/${course.id}/dashboard`)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
            >
              <BarChart3 className="h-4 w-4" />
              {t('courses.dashboard')}
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
            >
              <Edit3 className="h-4 w-4" />
              {t('courses.edit')}
            </button>
            <button
              onClick={() => setShowAddVideo(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-coral px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
            >
              <Plus className="h-4 w-4" />
              {t('courses.addVideo')}
            </button>
          </div>
        </div>

        {course.videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-dark-navy">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('courses.noVideos')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('courses.noVideosHint')}
            </p>
            <button
              onClick={() => setShowAddVideo(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-pink"
            >
              <Plus className="h-4 w-4" />
              {t('courses.addVideo')}
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={course.videos.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {course.videos.map((video, index) => (
                  <SortableVideoItem
                    key={video.id}
                    video={video}
                    index={index}
                    onPlay={() => handlePlayVideo(video.videoUrl, video.title, video.thumbnail)}
                    onRemove={() => handleRemoveVideo(video.id)}
                    onOpenYoutube={() => window.open(video.videoUrl, '_blank', 'noopener')}
                    onToggleComplete={() => toggleVideoComplete(course.id, video.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showAddVideo && (
        <AddVideoModal
          onClose={() => setShowAddVideo(false)}
          onAdd={handleAddVideo}
        />
      )}
      {showEdit && (
        <EditCourseModal
          course={course}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

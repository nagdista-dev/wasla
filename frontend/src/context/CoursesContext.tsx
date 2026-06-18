import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Course, CourseVideo } from '../types';
import { loadCourses, saveCourses } from '../storage';

interface CoursesContextValue {
  courses: Course[];
  getCourse: (id: string) => Course | undefined;
  createCourse: (name: string, description?: string, category?: string) => string;
  updateCourse: (id: string, data: { name?: string; description?: string; category?: string }) => void;
  deleteCourse: (id: string) => void;
  addVideo: (courseId: string, video: CourseVideo) => void;
  removeVideo: (courseId: string, videoId: string) => void;
  reorderVideos: (courseId: string, videos: CourseVideo[]) => void;
  updateVideo: (courseId: string, videoId: string, data: { title?: string; notes?: string }) => void;
  toggleVideoComplete: (courseId: string, videoId: string) => void;
}

const CoursesContext = createContext<CoursesContextValue | null>(null);

function syncLoadCourses(): Course[] {
  try {
    const stored = localStorage.getItem('wasla_courses');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && c.id && c.name);
  } catch {
    return [];
  }
}

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(syncLoadCourses);

  useEffect(() => {
    loadCourses().then((items) => {
      if (items.length > 0) setCourses(items);
    });
  }, []);

  const persist = useCallback(async (next: Course[]) => {
    setCourses(next);
    await saveCourses(next);
  }, []);

  const getCourse = useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses],
  );

  const createCourse = useCallback(
    (name: string, description?: string, category?: string): string => {
      const id = `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const course: Course = {
        id,
        name,
        description,
        category,
        videos: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const next = [...courses, course];
      setCourses(next);
      saveCourses(next);
      return id;
    },
    [courses],
  );

  const updateCourse = useCallback(
    (id: string, data: { name?: string; description?: string; category?: string }) => {
      persist(
        courses.map((c) =>
          c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c,
        ),
      );
    },
    [courses, persist],
  );

  const deleteCourse = useCallback(
    (id: string) => {
      persist(courses.filter((c) => c.id !== id));
    },
    [courses, persist],
  );

  const addVideo = useCallback(
    (courseId: string, video: CourseVideo) => {
      persist(
        courses.map((c) =>
          c.id === courseId
            ? { ...c, videos: [...c.videos, video], updatedAt: Date.now() }
            : c,
        ),
      );
    },
    [courses, persist],
  );

  const removeVideo = useCallback(
    (courseId: string, videoId: string) => {
      persist(
        courses.map((c) =>
          c.id === courseId
            ? { ...c, videos: c.videos.filter((v) => v.id !== videoId), updatedAt: Date.now() }
            : c,
        ),
      );
    },
    [courses, persist],
  );

  const reorderVideos = useCallback(
    (courseId: string, videos: CourseVideo[]) => {
      persist(
        courses.map((c) =>
          c.id === courseId ? { ...c, videos, updatedAt: Date.now() } : c,
        ),
      );
    },
    [courses, persist],
  );

  const updateVideo = useCallback(
    (courseId: string, videoId: string, data: { title?: string; notes?: string }) => {
      persist(
        courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                videos: c.videos.map((v) =>
                  v.id === videoId ? { ...v, ...data } : v,
                ),
                updatedAt: Date.now(),
              }
            : c,
        ),
      );
    },
    [courses, persist],
  );

  const toggleVideoComplete = useCallback(
    (courseId: string, videoId: string) => {
      persist(
        courses.map((c) =>
          c.id === courseId
            ? {
                ...c,
                videos: c.videos.map((v) =>
                  v.id === videoId ? { ...v, completed: !v.completed } : v,
                ),
                updatedAt: Date.now(),
              }
            : c,
        ),
      );
    },
    [courses, persist],
  );

  return (
    <CoursesContext.Provider
      value={{ courses, getCourse, createCourse, updateCourse, deleteCourse, addVideo, removeVideo, reorderVideos, updateVideo, toggleVideoComplete }}
    >
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses(): CoursesContextValue {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses must be used within CoursesProvider');
  return ctx;
}

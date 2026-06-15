import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
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
}

const CoursesContext = createContext<CoursesContextValue | null>(null);

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(loadCourses);

  const persist = useCallback((next: Course[]) => {
    setCourses(next);
    saveCourses(next);
  }, []);

  const getCourse = useCallback(
    (id: string) => courses.find((c) => c.id === id),
    [courses],
  );

  const createCourse = useCallback(
    (name: string, description?: string, category?: string) => {
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
      persist([...courses, course]);
      return id;
    },
    [courses, persist],
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

  return (
    <CoursesContext.Provider
      value={{ courses, getCourse, createCourse, updateCourse, deleteCourse, addVideo, removeVideo, reorderVideos, updateVideo }}
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

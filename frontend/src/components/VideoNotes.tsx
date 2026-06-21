import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Play } from 'lucide-react';
import type { VideoNote } from '../types';
import { loadSetting, saveSetting } from '../storage';
import { useLanguage } from '../context/LanguageContext';

type VideoNotesProps = {
  videoId: string;
  currentTime: number;
  onSeek: (seconds: number) => void;
  t: (key: string) => string;
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
};

// Helper to format timestamp since it's used in VideoPage.tsx
function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const VideoNotes: React.FC<VideoNotesProps> = ({
  videoId,
  currentTime,
  onSeek,
  t,
  showToast,
}) => {
  const { language } = useLanguage();
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const STORAGE_KEY = `wasla_video_notes_${videoId}`;

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const storedNotes = await loadSetting<VideoNote[]>(STORAGE_KEY);
        if (storedNotes) {
          setNotes(storedNotes);
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
        showToast('Failed to load notes', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadNotes();
  }, [videoId, STORAGE_KEY, showToast]);

  const saveNotes = async (updatedNotes: VideoNote[]) => {
    try {
      await saveSetting(STORAGE_KEY, updatedNotes);
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Failed to save notes:', error);
      showToast('Failed to save notes', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const note: VideoNote = {
      id: `note_${Date.now()}`,
      timestamp: currentTime,
      content: newNote.trim(),
      createdAt: Date.now(),
    };

    const updatedNotes = [...notes, note].sort((a, b) => b.createdAt - a.createdAt);
    await saveNotes(updatedNotes);
    setNewNote('');
    showToast('Note added', 'success');
  };

  const handleDeleteNote = async (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    await saveNotes(updatedNotes);
    showToast('Note deleted', 'info');
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200/60 bg-gray-50/80 p-5 text-center dark:border-white/10 dark:bg-white/[0.04]">
        <div className="animate-pulse h-4 w-24 bg-gray-200 dark:bg-white/10 mx-auto rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <section className="rounded-xl border border-gray-200/60 bg-gray-50/80 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">{t('videoPage.notes')}</h2>
        
        <div className="flex flex-col gap-3">
          <div className="relative flex items-end gap-2">
            <div className="flex-1">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('videoPage.addNotePlaceholder')}
                className="w-full min-h-[80px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-coral focus:ring-1 focus:ring-brand-coral dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-coral dark:focus:ring-brand-coral outline-none resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-brand-coral px-4 py-2 text-sm font-semibold text-white hover:bg-brand-pink disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px]"
              >
                <Plus className="mr-1 h-4 w-4" />
                {t('videoPage.addNote')}
              </button>
              {language !== 'ar' && (
                <button
                  onClick={() => {
                    // Add note with current time
                    const note: VideoNote = {
                      id: `note_${Date.now()}`,
                      timestamp: currentTime,
                      content: t('videoPage.timestampNote'),
                      createdAt: Date.now(),
                    };
                    const updatedNotes = [...notes, note].sort((a, b) => b.createdAt - a.createdAt);
                    saveNotes(updatedNotes);
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 transition-colors min-h-[40px]"
                >
                  <Clock className="mr-1 h-4 w-4" />
                  {t('videoPage.addTimestamp')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {notes.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t('videoPage.noNotes')}
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-brand-coral/30 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex min-w-0 gap-3">
                  <button
                    onClick={() => onSeek(note.timestamp)}
                    className="mt-0.5 shrink-0 flex items-center gap-1 rounded-md bg-brand-coral/10 px-1.5 py-0.5 text-xs font-semibold text-brand-coral transition-colors hover:bg-brand-coral/20"
                  >
                    <Play className="h-3 w-3" />
                    {formatTime(note.timestamp)}
                  </button>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-200 break-words">
                      {note.content}
                    </p>
                    <span className="mt-1 text-[10px] text-gray-400">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 group-hover:opacity-100"
                  aria-label={t('videoPage.deleteNote')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default VideoNotes;
